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
  sessionExclusive?: <T>(action: () => Promise<T>) => Promise<T>;
  // Le contrôle anti-robot exigé par Supabase avant d'ouvrir un compte (voir antiRobot.ts). Absent : pas de contrôle.
  jetonAntiRobot?: () => Promise<string | undefined>;
};

// Une erreur que l'on peut montrer au joueur : soit le refus motivé d'une fonction de la base
// (« Ce pseudonyme est déjà pris. »), soit une panne.
export class ErreurDuServeur extends Error {
  readonly refus: boolean;
  readonly statut?: number;
  constructor(message: string, refus: boolean, statut?: number) {
    super(message);
    this.refus = refus;
    this.statut = statut;
  }
}

const PANNE = 'Le serveur du jeu ne répond pas. Réessaie dans un moment.';
const ANTI_ROBOT = "La vérification anti-robot n'a pas abouti. Recharge la page pour réessayer.";
const MARGE_AVANT_EXPIRATION = 60_000;

export function creerLeClient(adresse: string, clePublique: string, exterieur: Exterieur) {
  const base = adresse.replace(/\/+$/, '');
  const enTetes = { apikey: clePublique, 'Content-Type': 'application/json' };
  let ouverture: Promise<Session> | null = null; // une seule ouverture de session à la fois : jamais deux comptes pour un joueur
  let enMemoire: Session | null = null;

  async function demanderUneSession(chemin: string, corps: object): Promise<Session | 'refusee'> {
    let reponse: Response;
    try { reponse = await exterieur.requete(`${base}/auth/v1/${chemin}`, { method: 'POST', headers: enTetes, body: JSON.stringify(corps), signal: AbortSignal.timeout(20_000) }); } catch { throw new ErreurDuServeur(PANNE, false); }
    if (reponse.status === 400 || reponse.status === 401 || reponse.status === 403 || reponse.status === 422) return 'refusee';
    if (!reponse.ok) throw new ErreurDuServeur(PANNE, false);
    const lue = await reponse.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number } | null;
    if (!lue?.access_token || !lue.refresh_token) throw new ErreurDuServeur(PANNE, false);
    const session: Session = { acces: lue.access_token, renouvellement: lue.refresh_token, expireLe: exterieur.maintenant() + (lue.expires_in ?? 3600) * 1000 };
    enMemoire = session;
    exterieur.ecrireLaSession(session);
    return session;
  }

  // Un renouvellement refusé ne doit jamais remplacer silencieusement la collection.
  // Seule la récupération explicitement demandée peut créer une session de destination.
  // « rejete » : le jeton que le serveur vient de refuser (401) ; il en faut un autre.
  function session(rejete: string | null = null, conserverCompte = false, recuperation = false): Promise<Session> {
    const obtenir = async () => {
      const gardee = exterieur.lireLaSession() ?? enMemoire;
      // (Un autre onglet a pu renouveler la session entre-temps : son jeton suffit, s'il n'est pas celui qui a été refusé.)
      if (gardee && gardee.acces !== rejete && gardee.expireLe - exterieur.maintenant() > MARGE_AVANT_EXPIRATION) return gardee;
      if (gardee) {
        const renouvelee = await demanderUneSession('token?grant_type=refresh_token', { refresh_token: gardee.renouvellement });
        if (renouvelee !== 'refusee') return renouvelee;
        if (!recuperation) throw new ErreurDuServeur('Session expirée. Reconnecte-toi depuis Mon compte, ou utilise ton code de secours dans le Profil.', true, 401);
      }
      if (conserverCompte) throw new ErreurDuServeur('Recharge ton compte avant de reprendre le duel.', true, 401);
      const jeton = exterieur.jetonAntiRobot ? await exterieur.jetonAntiRobot() : undefined;
      const nouvelle = await demanderUneSession('signup', { data: {}, gotrue_meta_security: jeton ? { captcha_token: jeton } : {} });
      if (nouvelle === 'refusee') throw new ErreurDuServeur(exterieur.jetonAntiRobot ? ANTI_ROBOT : "Le serveur des joutes n'accepte pas de nouveau joueur pour l'instant.", false);
      return nouvelle;
    };
    // Une ouverture déjà en cours, commencée avant le refus, peut rendre le jeton refusé : on l'attend, puis on en relance
    // une qui renouvelle vraiment (sinon la nouvelle tentative repartait avec le même jeton, et l'appareil passait hors ligne).
    if (rejete !== null && ouverture) {
      const ensuite = () => session(rejete, conserverCompte, recuperation);
      return ouverture.then((s) => (s.acces !== rejete ? s : ensuite()), ensuite);
    }
    ouverture ??= (exterieur.sessionExclusive ? exterieur.sessionExclusive(obtenir) : obtenir()).finally(() => { ouverture = null; });
    return ouverture;
  }

  // Appelle une fonction de la base. Un refus motivé par la fonction (pseudonyme pris, trop de joutes…) arrive
  // sous forme d'ErreurDuServeur dont le message peut être montré tel quel au joueur.
  async function appeler<T>(fonction: string, parametres: object = {}, rejete: string | null = null): Promise<T> {
    const { acces } = await session(rejete, false, fonction === 'recuperer_par_code');
    let reponse: Response;
    try {
      reponse = await exterieur.requete(`${base}/rest/v1/rpc/${fonction}`, { method: 'POST', headers: { ...enTetes, Authorization: `Bearer ${acces}` }, body: JSON.stringify(parametres), signal: AbortSignal.timeout(20_000) });
    } catch { throw new ErreurDuServeur(PANNE, false); }
    if (reponse.status === 401 && rejete === null) return appeler<T>(fonction, parametres, acces);
    if (!reponse.ok) {
      const erreur = await reponse.json().catch(() => null) as { code?: string; message?: string } | null;
      // « P0001 » : une exception levée exprès par nos fonctions, avec un message écrit pour le joueur.
      if (erreur?.code === 'P0001' && erreur.message) throw new ErreurDuServeur(erreur.message, true);
      // « PGRST202 » : la fonction n'existe pas encore sur le serveur (script pas recollé) — ce n'est pas une panne.
      if (reponse.status === 404 && erreur?.code === 'PGRST202') throw new ErreurDuServeur("Le serveur du jeu n'est pas à jour : cette fonction n'y est pas encore installée.", true, 404);
      throw new ErreurDuServeur(PANNE, false);
    }
    // Une fonction qui ne rend rien (supprimer_mon_profil) répond sans contenu. Une page HTML glissée par un intermédiaire
    // (portail Wi-Fi, proxy) n'est pas une réponse du jeu : c'est une panne, pas « Unexpected token < ».
    try {
      const texte = reponse.status === 204 ? '' : await reponse.text();
      return (texte === '' ? null : JSON.parse(texte)) as T;
    } catch { throw new ErreurDuServeur(PANNE, false); }
  }

  // Cet appareil a-t-il un compte ? Tant qu'il n'en a pas, rien n'a jamais été envoyé au serveur.
  const aUneSession = (): boolean => exterieur.lireLaSession() !== null || enMemoire !== null;
  // Après la suppression du compte : l'appareil oublie sa session (la prochaine visite en ouvrirait un neuf).
  const oublierLaSession = (): void => { enMemoire = null; exterieur.ecrireLaSession(null); };

  // Pour payer, ne jamais ouvrir silencieusement un nouveau compte si la session
  // a disparu : l'achat doit appartenir à la collection que le joueur regarde.
  async function appelerPaiement<T>(corps: object, mode: 'test' | 'production' = 'test'): Promise<T> {
    const gardee = exterieur.lireLaSession() ?? enMemoire;
    if (!gardee || gardee.expireLe <= exterieur.maintenant()) throw new ErreurDuServeur('Session expirée. Recharge le jeu et vérifie ta collection avant de payer.', true);
    let reponse: Response;
    try {
      reponse = await exterieur.requete(`${base}/functions/v1/${mode === 'production' ? 'paiement-production' : 'paiement'}`, {
        method: 'POST', headers: { ...enTetes, Authorization: `Bearer ${gardee.acces}` },
        body: JSON.stringify(corps), signal: AbortSignal.timeout(60_000),
      });
    } catch { throw new ErreurDuServeur('Paiement indisponible. Réessaie dans un instant.', false); }
    const resultat = await reponse.json().catch(() => null);
    if (!reponse.ok) throw new ErreurDuServeur(resultat?.erreur ?? 'Paiement indisponible.', true);
    if (resultat === null) throw new ErreurDuServeur('Paiement indisponible. Réessaie dans un instant.', false);
    return resultat as T;
  }

  async function appelerCombat<T>(corps: object, rejete: string | null = null): Promise<T> {
    const { acces } = await session(rejete, true);
    let reponse: Response;
    try {
      reponse = await exterieur.requete(`${base}/functions/v1/combats`, {
        method: 'POST', headers: { ...enTetes, Authorization: `Bearer ${acces}` },
        body: JSON.stringify(corps), signal: AbortSignal.timeout(20_000),
      });
    } catch { throw new ErreurDuServeur(PANNE, false); }
    if (reponse.status === 401 && rejete === null) return appelerCombat<T>(corps, acces);
    const resultat = await reponse.json().catch(() => null);
    if (!reponse.ok) throw new ErreurDuServeur(resultat?.erreur ?? 'Le serveur des combats est indisponible. Réessaie.', reponse.status < 500, reponse.status);
    if (!resultat || !('combat' in resultat) || !resultat.etat) throw new ErreurDuServeur(PANNE, false);
    return resultat as T;
  }

  async function appelerDirect<T>(corps: object, rejete: string | null = null): Promise<T> {
    const { acces } = await session(rejete, true);
    let reponse: Response;
    try {
      reponse = await exterieur.requete(`${base}/functions/v1/joutes-direct`, {
        method:'POST', headers:{...enTetes,Authorization:`Bearer ${acces}`}, body:JSON.stringify(corps), signal:AbortSignal.timeout(20_000),
      });
    } catch { throw new ErreurDuServeur(PANNE,false); }
    if (reponse.status === 401 && rejete === null) return appelerDirect<T>(corps,acces);
    const resultat = await reponse.json().catch(() => null);
    if (!reponse.ok) throw new ErreurDuServeur(resultat?.erreur ?? 'Joutes en direct indisponibles.',reponse.status<500,reponse.status);
    if (!resultat || !('partie' in resultat) || typeof resultat.maintenant !== 'number') throw new ErreurDuServeur(PANNE,false);
    return resultat as T;
  }

  // Une lecture publique (le fil d'activité de l'accueil) : sans session, donc sans jamais ouvrir de compte.
  async function lireSansCompte<T>(fonction: string): Promise<T> {
    let reponse: Response;
    try {
      reponse = await exterieur.requete(`${base}/rest/v1/rpc/${fonction}`, { method: 'POST', headers: enTetes, body: '{}', signal: AbortSignal.timeout(20_000) });
    } catch { throw new ErreurDuServeur(PANNE, false); }
    if (!reponse.ok) throw new ErreurDuServeur(PANNE, false, reponse.status);
    try { return await reponse.json() as T; } catch { throw new ErreurDuServeur(PANNE, false); }
  }

  // L'authentification utilise la même session que les collections et les achats.
  const lireSession = () => session(null, true);
  return { appeler, appelerPaiement, appelerCombat, appelerDirect, lireSansCompte, aUneSession, oublierLaSession, lireSession };
}

export type ClientSupabase = ReturnType<typeof creerLeClient>;
