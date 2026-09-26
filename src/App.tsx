import './theme/stylesDesEcrans.ts'; // en premier : l'ordre des feuilles de style en dépend
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { Recompenses } from './composants/Recompenses.tsx';
import { FiletDErreur } from './composants/FiletDErreur.tsx';
import { HoteDesConfirmations } from './composants/Confirmation.tsx';
import { Navigation } from './composants/Navigation.tsx';
import { usePartie } from './composants/usePartie.ts';
import { usePresence } from './composants/usePresence.ts';
import { Accueil } from './ecrans/Accueil.tsx';
import { profilVisible } from './jeu/personnalisation.ts';
import { useRoute } from './navigation/useRoute.ts';
import { titreDeLaRoute } from './navigation/routes.ts';
import type { Route } from './navigation/routes.ts';
import { pseudoDuJoueur } from './services/identite.ts';
import { repereDesRecompenses } from './services/partie.ts';

// Une nouvelle version du site remplace les fichiers de l'ancienne : un écran pas encore chargé ne se trouve plus.
// La page se recharge alors, une seule fois par minute (pas de boucle si c'est le réseau qui manque) ; sinon le filet
// d'erreur prend le relais, avec son bouton « Recharger la page ».
function rechargerUneFois(): void {
  try {
    if (Date.now() - Number(sessionStorage.getItem('mots.rechargement') ?? 0) < 60_000) return;
    sessionStorage.setItem('mots.rechargement', String(Date.now()));
  } catch { return; }
  window.location.reload();
}

// Les écrans autres que l'accueil se chargent à la demande : le premier fichier du jeu s'allège, la page arrive plus
// vite (audit du 25/09/2026). Un écran déjà chargé (préchargé, ou déjà vu) s'affiche sans attendre ; chaque affichage
// garde le même composant du début à la fin, pour ne jamais perdre ce que le joueur y a commencé.
function aLaDemande<P extends object>(charger: () => Promise<ComponentType<P>>) {
  let pret: ComponentType<P> | null = null;
  let enCours: Promise<ComponentType<P>> | null = null;
  const precharger = (): Promise<ComponentType<P>> => (enCours ??= charger().then(
    (composant) => (pret = composant),
    (erreur: unknown) => { enCours = null; throw erreur; },
  ));
  const Differe = lazy(async () => {
    try { return { default: await precharger() }; } catch (erreur) { rechargerUneFois(); throw erreur; }
  });
  function Ecran(props: P) {
    const [Composant] = useState<ComponentType<P>>(() => pret ?? Differe);
    return <Composant {...props} />;
  }
  return Object.assign(Ecran, { precharger });
}

const Collection = aLaDemande(() => import('./ecrans/Collection.tsx').then((m) => m.Collection));
const FicheCarte = aLaDemande(() => import('./ecrans/FicheCarte.tsx').then((m) => m.FicheCarte));
const OuverturePaquet = aLaDemande(() => import('./ecrans/OuverturePaquet.tsx').then((m) => m.OuverturePaquet));
const Duel = aLaDemande(() => import('./ecrans/Duel.tsx').then((m) => m.Duel));
const Deck = aLaDemande(() => import('./ecrans/Deck.tsx').then((m) => m.Deck));
const Marche = aLaDemande(() => import('./ecrans/Marche.tsx').then((m) => m.Marche));
const JoutesDirectes = aLaDemande(() => import('./ecrans/JoutesDirectes.tsx').then((m) => m.JoutesDirectes));
const Classement = aLaDemande(() => import('./ecrans/Classement.tsx').then((m) => m.Classement));
const Equipe = aLaDemande(() => import('./ecrans/Equipe.tsx').then((m) => m.Equipe));
const Amis = aLaDemande(() => import('./ecrans/Amis.tsx').then((m) => m.Amis));
const Profil = aLaDemande(() => import('./ecrans/Profil.tsx').then((m) => m.Profil));
const Compte = aLaDemande(() => import('./ecrans/Compte.tsx').then((m) => m.Compte));
const Reglages = aLaDemande(() => import('./ecrans/Reglages.tsx').then((m) => m.Reglages));
const Confidentialite = aLaDemande(() => import('./ecrans/Confidentialite.tsx').then((m) => m.Confidentialite));
const Boutique = aLaDemande(() => import('./ecrans/Boutique.tsx').then((m) => m.Boutique));
const Formules = aLaDemande(() => import('./ecrans/Formules.tsx').then((m) => m.Formules));
// Les écrans d'essai n'existent qu'en développement : ils ne partent même pas en production.
const Galerie = import.meta.env.DEV ? aLaDemande(() => import('./ecrans/Galerie.tsx').then((m) => m.Galerie)) : null;
const EssaiTimbre = import.meta.env.DEV ? aLaDemande(() => import('./ecrans/EssaiTimbre.tsx').then((m) => m.EssaiTimbre)) : null;
const EssaiPaquets = import.meta.env.DEV ? aLaDemande(() => import('./ecrans/EssaiPaquets.tsx').then((m) => m.EssaiPaquets)) : null;

// Les onglets et l'ouverture d'un paquet, préchargés dès que la page est prête : y aller ne fait rien attendre.
const PRECHARGES = [Collection, FicheCarte, OuverturePaquet, Duel, Marche];

function Ecran({ route }: { route: Route }) {
  switch (route.ecran) {
    case 'joutes': return <JoutesDirectes />;
    case 'equipe': return <Equipe />;
    case 'amis': return <Amis />;
    case 'compte': return <Compte />;
    case 'classement': return <Classement />;
    case 'profil': return <Profil />;
    case 'accueil': return <Accueil />;
    case 'paquet': return <OuverturePaquet />;
    case 'collection': return <Collection />;
    case 'carte': return <FicheCarte id={route.id} />;
    case 'deck': return <Deck />;
    case 'duel': return <Duel />;
    case 'reglages': return <Reglages />;
    case 'confidentialite': return <Confidentialite />;
    case 'marche': return <Marche />;
    case 'boutique': return <Boutique />;
    case 'formules': return <Formules />;
    case 'galerie': return Galerie ? <Galerie /> : <Accueil />;
    case 'timbres': return EssaiTimbre ? <EssaiTimbre /> : <Accueil />;
    case 'maquettes': return EssaiPaquets ? <EssaiPaquets /> : <Accueil />;
  }
}

const EcranEnChargement = () => <main className="ecran"><p className="texte-doux">Chargement…</p></main>;

// Donne la main au titre de l'écran (ou, à défaut, à son contenu) : la touche Tab repart de là, et un lecteur
// d'écran lit où l'on est arrivé.
// Un écran qui charge encore ses cartes n'a pas tout de suite son titre : on l'attend un instant, sans jamais
// reprendre la main à un joueur qui l'aurait déjà déplacée entre-temps.
function allerAuContenu(essaisRestants = 60, depuis: Element | null = document.activeElement): void {
  if (document.activeElement !== depuis) return;
  const titre = document.querySelector<HTMLElement>('main h1');
  if (!titre && essaisRestants > 0) { setTimeout(() => allerAuContenu(essaisRestants - 1, depuis), 50); return; }
  const cible = titre ?? document.querySelector<HTMLElement>('main');
  if (!cible) return;
  cible.tabIndex = -1;
  cible.focus({ preventScroll: true });
}

// La sauvegarde de l'appareil n'a pas pu être lue : tous les écrans en ont besoin, on le dit une fois pour toutes
// (sinon chaque écran affichait « Chargement… » pour toujours).
function PartieIllisible({ message }: { message: string }) {
  return (
    <main className="ecran">
      <h1>Le jeu n’a pas pu s’ouvrir</h1>
      <section className="bloc bloc--alerte" role="alert">
        <p>Le navigateur n’a pas réussi à lire les données du jeu sur cet appareil. Recharge la page ; si le problème revient, écris à <a href="mailto:contact@philamots.fr">contact@philamots.fr</a>.</p>
        <button type="button" className="bouton" onClick={() => window.location.reload()}>Recharger la page</button>
        <details className="texte-doux petit"><summary>Détails pour le support</summary><p>{message}</p></details>
      </section>
    </main>
  );
}

export function App() {
  const route = useRoute();
  const partie = usePartie();
  const cle = route.ecran === 'carte' ? `carte/${route.id}` : route.ecran;
  usePresence();

  // À chaque changement d'écran : on repart du haut de la page, l'onglet du navigateur change de titre, et le
  // clavier repart du titre du nouvel écran (sauf au tout premier affichage, où l'on ne dérange pas le navigateur).
  const ecranPrecedent = useRef(cle);
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = titreDeLaRoute(route);
    if (ecranPrecedent.current === cle) return;
    ecranPrecedent.current = cle;
    allerAuContenu();
  }, [cle]); // « cle » résume la route

  // Les onglets se préchargent quand la page est au calme (un échec n'est pas grave : l'écran se chargera à la visite).
  useEffect(() => {
    const precharger = () => { for (const ecran of PRECHARGES) void ecran.precharger().catch(() => undefined); };
    // (Safari n'a pas requestIdleCallback : une petite attente le remplace.)
    if (typeof window.requestIdleCallback === 'function') { const id = window.requestIdleCallback(precharger, { timeout: 4000 }); return () => window.cancelIdleCallback(id); }
    const minuterie = window.setTimeout(precharger, 1500);
    return () => window.clearTimeout(minuterie);
  }, []);

  // Le réglage « réduire les animations » s'applique à tout le site (voir la fin de styles.css).
  const animationsReduites = partie.etat === 'prete' && partie.sauvegarde.reglages.reduireAnimations;
  useEffect(() => { document.documentElement.toggleAttribute('data-animations-reduites', animationsReduites); }, [animationsReduites]);

  return (
    <Recompenses profil={partie.etat === 'prete' ? partie.sauvegarde.profil : null} repere={repereDesRecompenses()}><div className="application">
      <button type="button" className="evitement" onClick={() => allerAuContenu()}>Aller au contenu</button>
      <Navigation ecran={route.ecran} encre={partie.etat === 'prete' ? partie.sauvegarde.encre : null} xp={partie.etat === 'prete' ? partie.sauvegarde.profil.xp : null}
        pseudo={partie.etat === 'prete' ? pseudoDuJoueur(partie.sauvegarde) : ''} portrait={partie.etat === 'prete' ? profilVisible(partie.sauvegarde.profil, partie.compte?.formule ?? null) : null}
        protegee={partie.etat !== 'prete' || partie.serveur.etat === 'appareil' || partie.compte === null || partie.compte.codeDeSecoursLe !== null} />
      {partie.etat === 'erreur' ? <PartieIllisible message={partie.message} /> : <FiletDErreur key={cle}><Suspense fallback={<EcranEnChargement />}><Ecran route={route} /></Suspense></FiletDErreur>}
      <HoteDesConfirmations />
    </div></Recompenses>
  );
}
