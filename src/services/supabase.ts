// Un client Supabase réduit à ce dont le jeu a besoin : ouvrir un compte anonyme, garder la session en vie,
// et appeler les fonctions de la base (celles de serveur/supabase.sql). Il parle directement à l'interface web
// de Supabase, sans bibliothèque à installer. Tout ce qui touche au monde extérieur (réseau, stockage, horloge)
// est fourni par l'appelant : le client se teste sans serveur.

export type Session = { acces: string; renouvellement: string; expireLe: number };

export type Exterieur = {
  requete: typeof fetch;
  lireLaSession: () => Session | null;
  ecrireLaSession: (session: Session | null) => void;
  maintenant: () => number;
};

// Une erreur que l'on peut montrer au joueur : soit le refus motivé d'une fonction de la base
// (« Ce pseudonyme est déjà pris. »), soit une panne.
export class ErreurDuServeur extends Error {
  readonly refus: boolean;
  constructor(message: string, refus: boolean) {
    super(message);
    this.refus = refus;
  }
}

const PANNE = 'Le serveur des joutes ne répond pas. Réessaie dans un moment.';
const MARGE_AVANT_EXPIRATION = 60_000;

export function creerLeClient(adresse: string, clePublique: string, exterieur: Exterieur) {
  const base = adresse.replace(/\/+$/, '');
  const enTetes = { apikey: clePublique, 'Content-Type': 'application/json' };
  let ouverture: Promise<Session> | null = null; // une seule ouverture de session à la fois : jamais deux comptes pour un joueur

  async function demanderUneSession(chemin: string, corps: object): Promise<Session | 'refusee'> {
    let reponse: Response;
    try { reponse = await exterieur.requete(`${base}/auth/v1/${chemin}`, { method: 'POST', headers: enTetes, body: JSON.stringify(corps) }); } catch { throw new ErreurDuServeur(PANNE, false); }
    if (reponse.status === 400 || reponse.status === 401 || reponse.status === 403 || reponse.status === 422) return 'refusee';
    if (!reponse.ok) throw new ErreurDuServeur(PANNE, false);
    const lue = await reponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!lue.access_token || !lue.refresh_token) throw new ErreurDuServeur(PANNE, false);
    const session: Session = { acces: lue.access_token, renouvellement: lue.refresh_token, expireLe: exterieur.maintenant() + (lue.expires_in ?? 3600) * 1000 };
    exterieur.ecrireLaSession(session);
    return session;
  }

  // La session du joueur : celle que l'on a gardée si elle est encore bonne, sinon renouvelée ; et, à défaut
  // (première visite, ou session refusée par le serveur), un nouveau compte anonyme.
  function session(forcerLeRenouvellement = false): Promise<Session> {
    ouverture ??= (async () => {
      const gardee = exterieur.lireLaSession();
      if (gardee && !forcerLeRenouvellement && gardee.expireLe - exterieur.maintenant() > MARGE_AVANT_EXPIRATION) return gardee;
      if (gardee) {
        const renouvelee = await demanderUneSession('token?grant_type=refresh_token', { refresh_token: gardee.renouvellement });
        if (renouvelee !== 'refusee') return renouvelee;
      }
      const nouvelle = await demanderUneSession('signup', { data: {}, gotrue_meta_security: {} });
      if (nouvelle === 'refusee') throw new ErreurDuServeur("Le serveur des joutes n'accepte pas de nouveau joueur pour l'instant.", false);
      return nouvelle;
    })().finally(() => { ouverture = null; });
    return ouverture;
  }

  // Appelle une fonction de la base. Un refus motivé par la fonction (pseudonyme pris, trop de joutes…) arrive
  // sous forme d'ErreurDuServeur dont le message peut être montré tel quel au joueur.
  async function appeler<T>(fonction: string, parametres: object = {}, dejaRenouvelee = false): Promise<T> {
    const { acces } = await session(dejaRenouvelee);
    let reponse: Response;
    try {
      reponse = await exterieur.requete(`${base}/rest/v1/rpc/${fonction}`, { method: 'POST', headers: { ...enTetes, Authorization: `Bearer ${acces}` }, body: JSON.stringify(parametres) });
    } catch { throw new ErreurDuServeur(PANNE, false); }
    if (reponse.status === 401 && !dejaRenouvelee) return appeler<T>(fonction, parametres, true);
    if (!reponse.ok) {
      const erreur = await reponse.json().catch(() => null) as { code?: string; message?: string } | null;
      // « P0001 » : une exception levée exprès par nos fonctions, avec un message écrit pour le joueur.
      if (erreur?.code === 'P0001' && erreur.message) throw new ErreurDuServeur(erreur.message, true);
      throw new ErreurDuServeur(PANNE, false);
    }
    // Une fonction qui ne rend rien (supprimer_mon_profil) répond sans contenu.
    const texte = reponse.status === 204 ? '' : await reponse.text();
    return (texte === '' ? null : JSON.parse(texte)) as T;
  }

  // Cet appareil a-t-il un compte ? Tant qu'il n'en a pas, rien n'a jamais été envoyé au serveur.
  const aUneSession = (): boolean => exterieur.lireLaSession() !== null;
  // Après la suppression du compte : l'appareil oublie sa session (la prochaine visite en ouvrirait un neuf).
  const oublierLaSession = (): void => exterieur.ecrireLaSession(null);

  return { appeler, aUneSession, oublierLaSession };
}

export type ClientSupabase = ReturnType<typeof creerLeClient>;
