// REST Stripe versionnée : mêmes objets sur Node (tests) et Deno (Supabase).
export const VERSION_STRIPE = '2025-02-24.acacia';
export const PRIX = {
  necessaire: { id: 'price_1UIqsGKBKL3aSktUL2DDagCC', centimes: 599 },
  collectionneur: { id: 'price_1UIquSKBKL3aSktUxN8o68C5', centimes: 499 },
} as const;
export const PRIX_PRODUCTION = {
  necessaire: { id: 'price_1UJ6tHK2IFab5EhcM6zOoVai', centimes: 599 },
  collectionneur: { id: 'price_1UJ6tHK2IFab5EhcHMwpkEsQ', centimes: 499 },
} as const;
export type ModePaiement = 'test' | 'production';
export const prixDuMode = (mode: ModePaiement) => mode === 'production' ? PRIX_PRODUCTION : PRIX;
export type Offre = keyof typeof PRIX;
export type Objet = Record<string, any>; // Objets REST validés aux frontières ci-dessous.
export type Stripe = (path: string, body?: Record<string, string>, key?: string) => Promise<Objet>;

export function creerStripe(secret: string, requete: typeof fetch = fetch, mode: ModePaiement = 'test'): Stripe {
  const prefixe = mode === 'production' ? /^(sk|rk)_live_/ : /^(sk|rk)_test_/;
  if (!prefixe.test(secret)) throw new Error(`Clé Stripe incompatible avec le mode ${mode}.`);
  return async (path, body, key) => {
    const r = await requete(`https://api.stripe.com/v1/${path}`, {
      method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${secret}`, 'Stripe-Version': VERSION_STRIPE,
        ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}), ...(key ? { 'Idempotency-Key': key } : {}) },
      ...(body ? { body: new URLSearchParams(body) } : {}),
    });
    if (!r.ok) throw new Error(`Stripe indisponible (${r.status}).`);
    const data = await r.json();
    // Certaines réponses (listes, portail) n'ont pas de livemode. Vérifier aussi les objets imbriqués.
    const verifierMode = (objet: any): void => {
      if (!objet || typeof objet !== 'object') return;
      if ('livemode' in objet && objet.livemode !== (mode === 'production')) throw new Error('Objet Stripe du mauvais environnement.');
      for (const valeur of Object.values(objet)) verifierMode(valeur);
    };
    verifierMode(data);
    return data;
  };
}

export async function verifierSignature(corps: string, signature: string, secret: string, maintenant = Date.now()): Promise<boolean> {
  const champs = signature.split(',').map(s => s.split('='));
  const t = champs.find(([k]) => k === 't')?.[1];
  if (!t || !/^\d+$/.test(t) || Math.abs(maintenant / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  for (const [, v] of champs.filter(([k]) => k === 'v1')) {
    if (!/^[a-f0-9]{64}$/.test(v ?? '')) continue;
    const bytes = Uint8Array.from(v.match(/../g)!, n => parseInt(n, 16));
    if (await crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(`${t}.${corps}`))) return true;
  }
  return false;
}

export async function liste(stripe: Stripe, path: string): Promise<Objet[]> {
  const objets: Objet[] = [];
  let curseur = '';
  for (let page = 0; page < 20; page++) {
    const r = await stripe(`${path}${path.includes('?') ? '&' : '?'}limit=100${curseur ? `&starting_after=${encodeURIComponent(curseur)}` : ''}`);
    if (!Array.isArray(r.data)) throw new Error('Réponse Stripe invalide.');
    objets.push(...r.data);
    if (!r.has_more) return objets;
    if (!r.data.length) break;
    curseur = r.data.at(-1).id;
  }
  throw new Error('Historique Stripe trop long pour une synchronisation immédiate.');
}

export function verifierPrix(prix: Objet, offre: Offre, mode: ModePaiement = 'test'): void {
  const attendu = prixDuMode(mode)[offre];
  if (prix.livemode !== (mode === 'production') || prix.id !== attendu.id || prix.active !== true || prix.unit_amount !== attendu.centimes || prix.currency !== 'eur'
    || (offre === 'necessaire' ? prix.type !== 'one_time' : prix.type !== 'recurring' || prix.recurring?.interval !== 'month' || prix.recurring?.interval_count !== 1)) {
    throw new Error('Le tarif Stripe ne correspond pas à l’offre prévue.');
  }
}

export type Droits = { album: boolean; fin: string | null; ouvert: boolean };
// Lecture de l'état actuel, pas du contenu ancien d'un événement : doublons et
// notifications reçues dans le désordre produisent les mêmes droits.
export async function lireDroits(stripe: Stripe, client: string, compte: string, mode: ModePaiement = 'test'): Promise<Droits> {
  const prix = prixDuMode(mode);
  const reel = mode === 'production';
  const query = `customer=${encodeURIComponent(client)}`;
  const sessions = await liste(stripe, `checkout/sessions?${query}`);
  let album = false;
  const paiementValide = async (pi: unknown): Promise<boolean> => {
    if (typeof pi !== 'string' || !pi.startsWith('pi_')) return false;
    const charges = await liste(stripe, `charges?payment_intent=${encodeURIComponent(pi)}`);
    return charges.some(c => c.livemode === reel && c.customer === client && c.paid === true && c.status === 'succeeded'
      && c.disputed !== true && c.amount > 0 && c.amount_refunded < c.amount);
  };
  for (const s of sessions) {
    if (s.livemode !== reel || s.metadata?.compte !== compte || s.metadata?.offre !== 'necessaire'
      || s.mode !== 'payment' || s.status !== 'complete' || s.payment_status !== 'paid') continue;
    const lignes = await liste(stripe, `checkout/sessions/${s.id}/line_items`);
    if (lignes.length === 1 && lignes[0].price?.id === prix.necessaire.id && lignes[0].quantity === 1 && await paiementValide(s.payment_intent)) album = true;
  }
  const abonnements = (await liste(stripe, `subscriptions?${query}&status=all`))
    .filter(s => s.livemode === reel && s.metadata?.compte === compte && s.metadata?.offre === 'collectionneur');
  const ouverts = abonnements.filter(s => !['canceled', 'incomplete_expired'].includes(s.status));
  let fin = 0;
  for (const s of abonnements) {
    const factures = await liste(stripe, `invoices?subscription=${s.id}&status=paid`);
    for (const f of factures) {
      if (f.livemode !== reel || f.customer !== client || f.paid !== true || f.amount_paid <= 0 || !await paiementValide(f.payment_intent)) continue;
      const lignes = await liste(stripe, `invoices/${f.id}/lines`);
      for (const l of lignes) {
        if (l.price?.id !== prix.collectionneur.id || l.proration === true || l.quantity !== 1 || !Number.isFinite(l.period?.end)) continue;
        // Une résiliation immédiate coupe les droits ; à échéance, ended_at est la fin payée.
        fin = Math.max(fin, Math.min(l.period.end, s.ended_at ?? Infinity));
      }
    }
  }
  return { album, fin: fin ? new Date(fin * 1000).toISOString() : null, ouvert: ouverts.length > 0 };
}
