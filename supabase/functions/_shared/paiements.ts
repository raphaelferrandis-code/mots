import { creerStripe, liste, lireDroits, prixDuMode, verifierPrix, verifierSignature } from './stripe.ts';
import type { Droits, ModePaiement, Objet, Offre, Stripe } from './stripe.ts';
import { EQUILIBRAGE } from '../../../src/config/equilibrage.ts';

export type Configuration = { supabase: string; service: string; stripe: string; signature: string; site: string; testeurs: string[]; mode?: ModePaiement; achatsOuverts?: boolean };
type Liaison = { id: string; utilisateur: string; client_stripe: string | null; cree_le: string; verrou: string; sessions: Record<string, { cle: string; cree: number; id?: string }>;
  abonnement_ouvert?: boolean; abonnement_renouvele?: boolean; synchronise_le?: string | null };
// Une réponse prévue, montrée telle quelle au joueur. Toute autre erreur reste dans les journaux de Supabase et le
// joueur lit un message général (jamais le détail technique d'une panne).
class Refus extends Error {
  statut: number;
  constructor(message: string, statut = 400) { super(message); this.statut = statut; }
}
// Passé ce délai, une création qui a pu réussir chez Stripe sans que la réponse arrive y est retrouvable (la recherche
// de Stripe voit un nouvel objet en moins d'une minute) : on la cherche avant d'en créer une autre.
const DELAI_AVANT_DE_CHERCHER = 10 * 60_000;
// Une vérification des droits auprès de Stripe coûte une dizaine d'appels : pas deux de suite pour le même joueur.
const DELAI_ENTRE_DEUX_VERIFICATIONS = 20_000;
// 18 ans révolus, au mois près (décision du 25/09/2026) : le premier jour du mois qui suit celui de ses 18 ans.
export function majeur(annee: unknown, mois: unknown, maintenant = Date.now()): boolean {
  return Number.isInteger(annee) && Number.isInteger(mois) && (mois as number) >= 1 && (mois as number) <= 12
    && Date.UTC((annee as number) + EQUILIBRAGE.payant.ageMinimumPourPayer, mois as number, 1) <= maintenant;
}

export function creerPaiements(config: Configuration, requete: typeof fetch = fetch) {
  const mode = config.mode ?? 'test';
  const reel = mode === 'production';
  const prix = prixDuMode(mode);
  const suffixe = reel ? 'production' : 'test';
  const application = `philamots-${suffixe}`;
  const stripe: Stripe = creerStripe(config.stripe, requete, mode);
  const site = new URL(config.site);
  if (site.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(site.hostname)) throw new Error('Adresse du site invalide.');
  if (reel && (site.origin !== 'https://philamots.fr' || site.pathname !== '/' || site.search || site.hash || site.username || site.password)) throw new Error('La production doit utiliser https://philamots.fr.');
  const retour = `${site.origin}${site.pathname.replace(/\/$/, '')}/`;
  const cors = { 'Access-Control-Allow-Origin': site.origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', Vary: 'Origin' };
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  async function db(path: string, body?: unknown): Promise<any> {
    const r = await requete(`${config.supabase}/rest/v1/${path}`, {
      method: body === undefined ? 'GET' : 'POST', signal: AbortSignal.timeout(15_000),
      headers: { apikey: config.service, Authorization: `Bearer ${config.service}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!r.ok) throw new Refus('Synchronisation du paiement indisponible. Réessaie dans un instant.', 503);
    const texte = await r.text();
    return texte ? JSON.parse(texte) : null;
  }
  const rpc = (nom: string, body: unknown) => db(`rpc/${nom.replace(/_test$/, `_${suffixe}`)}`, body);
  async function sousVerrou<T>(id: string, action: (l: Liaison) => Promise<T>): Promise<T> {
    const l = await rpc('verrouiller_paiement_test', { p_id: id }) as Liaison;
    try { return await action(l); }
    finally { await rpc('liberer_paiement_test', { p_id: id, p_verrou: l.verrou }).catch(() => undefined); }
  }
  const enregistrer = (l: Liaison) => rpc('enregistrer_paiement_test', { p_id: l.id, p_verrou: l.verrou, p_client: l.client_stripe, p_sessions: l.sessions });
  async function synchroniser(l: Liaison): Promise<Droits> {
    if (!l.client_stripe) return { album: false, fin: null, ouvert: false, renouvele: false };
    const droits = await lireDroits(stripe, l.client_stripe, l.id, mode);
    await rpc('appliquer_paiement_test', { p_id: l.id, p_verrou: l.verrou, p_album: droits.album, p_fin: droits.fin, p_ouvert: droits.ouvert, p_renouvele: droits.renouvele });
    return droits;
  }
  // Le client Stripe de ce compte, créé lors d'un premier essai dont la réponse s'est perdue.
  async function clientDejaCree(compte: string): Promise<Objet | null> {
    const r = await stripe(`customers/search?query=${encodeURIComponent(`metadata['compte']:'${compte}'`)}`);
    return (Array.isArray(r.data) ? r.data : []).find((c: Objet) => c.metadata?.application === application && c.metadata?.compte === compte) ?? null;
  }

  async function paiement(req: Request): Promise<Response> {
    // État public, sans identité ni secret. Les achats restent contrôlés à chaque POST.
    if (req.method === 'GET' && new URL(req.url).searchParams.get('action') === 'etat') {
      return json({ version: 'philamots-paiements-v1', mode, achatsOuverts: reel ? config.achatsOuverts === true : false });
    }
    if (req.headers.get('origin') !== site.origin) return json({ erreur: 'Origine non autorisée.' }, 403);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors, status: 204 });
    if (req.method !== 'POST') return json({ erreur: 'Méthode non autorisée.' }, 405);
    const authorization = req.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return json({ erreur: 'Connexion requise.' }, 401);
    try {
      // Vérifie le jeton auprès d'Auth. Aucun identifiant joueur envoyé dans le JSON n'est utilisé.
      const auth = await requete(`${config.supabase}/auth/v1/user`, { headers: { apikey: config.service, Authorization: authorization }, signal: AbortSignal.timeout(15_000) });
      if (!auth.ok) return json({ erreur: 'Session expirée. Retrouve ton compte avant de payer.' }, 401);
      const user = await auth.json();
      if (!reel && !config.testeurs.includes(user.id)) return json({ erreur: 'Les paiements sont réservés aux comptes de test autorisés.' }, 403);
      let body: { action?: unknown; offre?: unknown };
      try { body = await req.json(); } catch { return json({ erreur: 'Demande illisible.' }, 400); }
      if (!body || typeof body !== 'object' || typeof body.action !== 'string' || !['achat', 'portail', 'synchroniser'].includes(body.action)) return json({ erreur: 'Action inconnue.' }, 400);
      if (body.action === 'achat' && reel && config.achatsOuverts !== true) return json({ erreur: 'Les achats ne sont pas encore ouverts.' }, 403);
      if (body.action === 'achat' && (typeof body.offre !== 'string' || !Object.hasOwn(prix, body.offre))) return json({ erreur: 'Offre inconnue.' }, 400);
      const comptes = await db(`comptes?utilisateur=eq.${encodeURIComponent(user.id)}&select=annee_de_naissance,mois_de_naissance,code_defini_le`);
      if (comptes.length !== 1) return json({ erreur: 'Ouvre ta collection avant de continuer.' }, 409);
      if (body.action === 'achat' && (!comptes[0].code_defini_le || !majeur(comptes[0].annee_de_naissance, comptes[0].mois_de_naissance))) {
        return json({ erreur: 'Déclare ton mois et ton année de naissance, et crée ton code de secours dans les Réglages, avant l’achat.' }, 403);
      }
      // La consultation du portail ou des droits ne crée jamais un client Stripe.
      // Même avec les achats fermés, les clients existants doivent pouvoir résilier.
      const existantes = body.action === 'achat' ? null : await db(`paiements_${suffixe}?utilisateur=eq.${encodeURIComponent(user.id)}&select=*`);
      if (existantes && !existantes[0]?.client_stripe) return json({ erreur: 'Aucun paiement associé à ce compte dans cet environnement.' }, 409);
      const liaison = (existantes ? existantes[0] : await rpc('preparer_paiement_test', { p_utilisateur: user.id })) as Liaison;
      const action = body.action;
      return await sousVerrou(liaison.id, async l => {
        if (!l.client_stripe) {
          const age = Date.now() - Date.parse(l.cree_le);
          // Un premier essai a pu créer le client sans que la réponse arrive : au-delà du délai, on le cherche ; s'il
          // n'existe pas, une nouvelle clé d'idempotence (l'ancienne a pu garder une erreur de Stripe pendant 24 h).
          const retrouve = age > DELAI_AVANT_DE_CHERCHER ? await clientDejaCree(l.id) : null;
          const customer = retrouve ?? await stripe('customers', { 'metadata[compte]': l.id, 'metadata[application]': application },
            age > DELAI_AVANT_DE_CHERCHER ? `client-${l.id}-${crypto.randomUUID()}` : `client-${l.id}`);
          l.client_stripe = customer.id;
          await enregistrer(l);
        }
        if (action === 'synchroniser') {
          // Juste vérifié (par le joueur ou par Stripe) : on rend ce qui est enregistré, sans rappeler Stripe.
          if (l.synchronise_le && Date.now() - Date.parse(l.synchronise_le) < DELAI_ENTRE_DEUX_VERIFICATIONS) {
            const [c] = await db(`comptes?utilisateur=eq.${encodeURIComponent(user.id)}&select=achat_unique,abonnement_jusqu_au`);
            return json({ album: !!c?.achat_unique, fin: c?.abonnement_jusqu_au ?? null, ouvert: !!l.abonnement_ouvert, renouvele: !!l.abonnement_renouvele, recent: true });
          }
          return json(await synchroniser(l));
        }
        if (action === 'portail') {
          const configuration = await stripe('billing_portal/configurations', {
            'business_profile[headline]': reel ? 'Philamots' : 'Philamots — environnement de test',
            'features[subscription_cancel][enabled]': 'true', 'features[subscription_cancel][mode]': 'at_period_end',
            'features[payment_method_update][enabled]': 'true', 'features[invoice_history][enabled]': 'true',
          }, `philamots-portail-${suffixe}-v1`);
          const portal = await stripe('billing_portal/sessions', { customer: l.client_stripe!, configuration: configuration.id, return_url: `${retour}#/formules` });
          return json({ url: portal.url });
        }
        const offre = body.offre as Offre;
        const droits = await synchroniser(l);
        if (offre === 'necessaire' ? droits.album : droits.ouvert) return json({ erreur: 'Cette offre est déjà souscrite. Utilise « Gérer mon abonnement ».' }, 409);
        verifierPrix(await stripe(`prices/${prix[offre].id}`), offre, mode);
        const ancienne = l.sessions[offre];
        if (ancienne?.id) {
          const s = await stripe(`checkout/sessions/${ancienne.id}`);
          if (s.status === 'open') return json({ url: s.url });
          delete l.sessions[offre];
        } else if (ancienne && Date.now() - ancienne.cree > DELAI_AVANT_DE_CHERCHER) {
          // Une session a pu être créée sans que la réponse arrive : si elle est encore ouverte, on la reprend ;
          // sinon, nouvelle tentative (une session expire d'elle-même après 24 h, et un achat conclu est vu plus haut).
          const ouverte = (await liste(stripe, `checkout/sessions?customer=${encodeURIComponent(l.client_stripe!)}&status=open`))
            .find((s: Objet) => s.metadata?.compte === l.id && s.metadata?.offre === offre);
          if (ouverte?.url) {
            ancienne.id = ouverte.id;
            await enregistrer(l);
            return json({ url: ouverte.url });
          }
          delete l.sessions[offre];
        }
        if (!l.sessions[offre]) {
          l.sessions[offre] = { cle: crypto.randomUUID(), cree: Date.now() };
          await enregistrer(l);
        }
        const tentative = l.sessions[offre];
        const modeCheckout = offre === 'necessaire' ? 'payment' : 'subscription';
        const prefixe = modeCheckout === 'payment' ? 'payment_intent_data' : 'subscription_data';
        const session = await stripe('checkout/sessions', {
          mode: modeCheckout, customer: l.client_stripe!, client_reference_id: l.id,
          'line_items[0][price]': prix[offre].id, 'line_items[0][quantity]': '1',
          'payment_method_types[0]': 'card', locale: 'fr',
          success_url: `${retour}?paiement=retour#/formules`, cancel_url: `${retour}?paiement=annule#/formules`,
          'metadata[compte]': l.id, 'metadata[offre]': offre,
          [`${prefixe}[metadata][compte]`]: l.id, [`${prefixe}[metadata][offre]`]: offre,
        }, `achat-${tentative.cle}`);
        tentative.id = session.id;
        await enregistrer(l);
        return json({ url: session.url });
      });
    } catch (erreur) {
      if (erreur instanceof Refus) return json({ erreur: erreur.message }, erreur.statut);
      console.error('Paiement :', erreur);
      return json({ erreur: 'Le paiement est indisponible pour l’instant. Réessaie dans un moment.' }, 503);
    }
  }

  async function webhook(req: Request): Promise<Response> {
    if (req.method !== 'POST') return json({ erreur: 'Méthode non autorisée.' }, 405);
    const corps = await req.text();
    if (!await verifierSignature(corps, req.headers.get('stripe-signature') ?? '', config.signature)) return json({ erreur: 'Signature invalide.' }, 400);
    try {
      const evt = JSON.parse(corps);
      if (evt.livemode !== reel) return json({ erreur: 'Événement du mauvais environnement.' }, 400);
      if (!/^(checkout\.session\.|invoice\.|customer\.subscription\.|charge\.)/.test(evt.type)) return json({ ignore: true });
      let objet: Objet = evt.data.object;
      if (evt.type.startsWith('charge.dispute.')) objet = await stripe(`charges/${typeof objet.charge === 'string' ? objet.charge : objet.charge.id}`);
      const client = typeof objet.customer === 'string' ? objet.customer : objet.customer?.id;
      if (!client) return json({ ignore: true });
      const customer = await stripe(`customers/${encodeURIComponent(client)}`);
      if (customer.metadata?.application !== application) return json({ ignore: true });
      const liens = await db(`paiements_${suffixe}?id=eq.${encodeURIComponent(customer.metadata.compte)}&select=*`);
      if (liens.length !== 1 || liens[0].client_stripe !== client) throw new Error('Liaison Stripe pas encore enregistrée.');
      await sousVerrou(liens[0].id, synchroniser);
      return json({ recu: true });
    } catch {
      // Stripe retentera : aucun 200 si les droits n'ont pas été enregistrés.
      return json({ erreur: 'Synchronisation à réessayer.' }, 503);
    }
  }
  return { paiement, webhook };
}
