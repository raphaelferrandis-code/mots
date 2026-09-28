// L'installation du jeu sur l'écran d'accueil : le bouton « Installer Philamots » du menu du joueur (décision de Raphaël
// du 28/09/2026, après l'essai sur son téléphone).
//
// · Chrome, Edge… : le navigateur annonce qu'il sait installer (« beforeinstallprompt ») ; le bouton ouvre sa fenêtre.
//   Sa petite bannière automatique est retenue : le bouton du menu la remplace, et l'accueil reste calme.
// · Samsung Internet : l'application qu'il fabrique vise une vieille version d'Android, et Google Play Protect la bloque
//   (« Appli non sécurisée bloquée » ; signalé chez Samsung en avril 2026, pas corrigé). Le manifeste ne lui est donc
//   pas montré — il ne propose plus d'installer, « Ajouter à l'écran d'accueil » reste un simple raccourci — et le bouton
//   ouvre le jeu dans Chrome, qui installe proprement.
// · iPhone et iPad : aucune installation par programme ; le bouton explique le geste (Partager, puis « Sur l'écran
//   d'accueil »).
// · Déjà installé (le jeu tourne dans sa propre fenêtre), ou navigateur qui n'installe pas : pas de bouton.
// Une partie ne passe pas toute seule d'un navigateur à l'autre : avant Chrome (ou sur iPhone), la fenêtre dit comment
// retrouver sa collection (compte relié, code de secours), et envoie d'abord l'invité sans code créer le sien.

export type ModeDInstallation = 'fenetre' | 'chrome' | 'iphone' | 'aucun';
export type Appareil = { agent: string; marques?: readonly string[]; tactileMac?: boolean; installe: boolean; fenetreProposee: boolean };
// Ce qui protège la collection du joueur : un compte relié (Google, e-mail), un code de secours, ou rien (invité).
export type Protection = 'compte' | 'code' | 'aucune';
export type Conseil = { surtitre: 'Installation'; titre: string; message: string; confirmer: string; annuler?: string; seul?: boolean; suite: 'chrome' | 'compte' | null };

export const estSamsungInternet = (agent: string, marques: readonly string[] = []): boolean =>
  /SamsungBrowser/i.test(agent) || marques.some((marque) => /Samsung Internet/i.test(marque));

export function modeDInstallation(appareil: Appareil): ModeDInstallation {
  if (appareil.installe) return 'aucun';
  if (estSamsungInternet(appareil.agent, appareil.marques)) return 'chrome';
  if (/iPhone|iPad|iPod/.test(appareil.agent) || appareil.tactileMac) return 'iphone';
  return appareil.fenetreProposee ? 'fenetre' : 'aucun';
}

// L'adresse qui ouvre le jeu dans Chrome depuis un autre navigateur d'Android (sans Chrome : sa page du Play Store).
export const adresseDansChrome = (hote: string, chemin: string): string =>
  `intent://${hote}${chemin}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=com.android.chrome')};end`;

export function conseilDInstallation(mode: 'chrome' | 'iphone', protection: Protection): Conseil {
  if (mode === 'chrome') {
    const titre = 'Installer avec Chrome';
    const pourquoi = 'Samsung Internet ne sait pas encore installer Philamots proprement : Google bloque l’application qu’il fabrique. Chrome, lui, l’installe sans souci.';
    if (protection === 'aucune') return { surtitre: 'Installation', titre, suite: 'compte', confirmer: 'Créer mon code', annuler: 'Plus tard',
      message: `${pourquoi} Mais ta collection ne passe pas toute seule d’un navigateur à l’autre : crée d’abord ton code de secours dans Mon compte, pour la retrouver dans Chrome.` };
    const retrouver = protection === 'compte' ? 'reconnecte-toi depuis Mon compte' : 'entre ton code de secours dans Mon compte';
    return { surtitre: 'Installation', titre, suite: 'chrome', confirmer: 'Ouvrir dans Chrome', annuler: 'Pas maintenant',
      message: `${pourquoi} Ta collection ne passe pas toute seule d’un navigateur à l’autre : dans Chrome, ${retrouver}, puis touche à nouveau « Installer Philamots ».` };
  }
  const titre = 'Sur ton écran d’accueil';
  const geste = 'Touche le bouton Partager de ton navigateur (le carré et sa flèche vers le haut), puis « Sur l’écran d’accueil ».';
  if (protection === 'aucune') return { surtitre: 'Installation', titre, suite: 'compte', confirmer: 'Créer mon code', annuler: 'Plus tard',
    message: `${geste} Crée d’abord ton code de secours dans Mon compte : il te servira si l’application s’ouvre sans ta collection.` };
  const retrouver = protection === 'compte' ? 'reconnecte-toi depuis Mon compte' : 'entre ton code de secours dans Mon compte';
  return { surtitre: 'Installation', titre, suite: null, confirmer: 'Compris', seul: true,
    message: `${geste} Si l’application s’ouvre sans ta collection, ${retrouver}.` };
}

// ── Dans le navigateur ────────────────────────────────────────────────────────────────────────────────────────────
type PropositionDuNavigateur = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

let proposition: PropositionDuNavigateur | null = null;
let installe = false;
const abonnes = new Set<() => void>();
const prevenir = (): void => { for (const abonne of abonnes) abonne(); };

const marques = (): string[] | undefined =>
  (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData?.brands?.map((b) => b.brand);

// Au démarrage (main.tsx) : le manifeste, sauf pour Samsung Internet, et l'écoute du navigateur.
export function preparerLInstallation(): void {
  if (!estSamsungInternet(navigator.userAgent, marques())) {
    const manifeste = document.createElement('link');
    manifeste.rel = 'manifest';
    manifeste.href = `${import.meta.env?.BASE_URL ?? './'}manifest.webmanifest`;
    document.head.append(manifeste);
  }
  window.addEventListener('beforeinstallprompt', (evenement) => {
    evenement.preventDefault();
    proposition = evenement as PropositionDuNavigateur;
    prevenir();
  });
  window.addEventListener('appinstalled', () => { proposition = null; installe = true; prevenir(); });
}

export function ecouterLInstallation(abonne: () => void): () => void {
  abonnes.add(abonne);
  return () => { abonnes.delete(abonne); };
}

export const modeActuel = (): ModeDInstallation => modeDInstallation({
  agent: navigator.userAgent,
  marques: marques(),
  tactileMac: navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1,
  installe: installe || matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
  fenetreProposee: proposition !== null,
});

// La fenêtre d'installation du navigateur (une proposition ne sert qu'une fois ; il en refait une s'il le juge bon).
export async function ouvrirLaFenetre(): Promise<void> {
  const courante = proposition;
  if (!courante) return;
  proposition = null;
  prevenir();
  await courante.prompt();
  await courante.userChoice;
}

export function ouvrirDansChrome(): void {
  location.href = adresseDansChrome(location.host, location.pathname);
}
