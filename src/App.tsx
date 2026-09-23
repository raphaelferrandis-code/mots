import { Profil } from './ecrans/Profil.tsx';
import { Recompenses } from './composants/Recompenses.tsx';
import { personnaliser } from './services/partie.ts';
import { Classement } from './ecrans/Classement.tsx';
import { useEffect, useRef } from 'react';
import { Navigation } from './composants/Navigation.tsx';
import { usePartie } from './composants/usePartie.ts';
import { Accueil } from './ecrans/Accueil.tsx';
import { Collection } from './ecrans/Collection.tsx';
import { Confidentialite } from './ecrans/Confidentialite.tsx';
import { Deck } from './ecrans/Deck.tsx';
import { Duel } from './ecrans/Duel.tsx';
import { FicheCarte } from './ecrans/FicheCarte.tsx';
import { Galerie } from './ecrans/Galerie.tsx';
import { Formules } from './ecrans/Formules.tsx';
import { Marche } from './ecrans/Marche.tsx';
import { OuverturePaquet } from './ecrans/OuverturePaquet.tsx';
import { Reglages } from './ecrans/Reglages.tsx';
import { useRoute } from './navigation/useRoute.ts';
import { titreDeLaRoute } from './navigation/routes.ts';
import type { Route } from './navigation/routes.ts';

function Ecran({ route }: { route: Route }) {
  switch (route.ecran) {
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
    case 'formules': return <Formules />;
    case 'galerie': return import.meta.env.DEV ? <Galerie /> : <Accueil />;
  }
}

// Donne la main au titre de l'écran (ou, à défaut, à son contenu) : la touche Tab repart de là, et un lecteur
// d'écran lit où l'on est arrivé.
// Un écran qui charge encore ses cartes n'a pas tout de suite son titre : on l'attend un instant, sans jamais
// reprendre la main à un joueur qui l'aurait déjà déplacée entre-temps.
function allerAuContenu(essaisRestants = 20, depuis: Element | null = document.activeElement): void {
  if (document.activeElement !== depuis) return;
  const titre = document.querySelector<HTMLElement>('main h1');
  if (!titre && essaisRestants > 0) { setTimeout(() => allerAuContenu(essaisRestants - 1, depuis), 50); return; }
  const cible = titre ?? document.querySelector<HTMLElement>('main');
  if (!cible) return;
  cible.tabIndex = -1;
  cible.focus({ preventScroll: true });
}

export function App() {
  const route = useRoute();
  const partie = usePartie();
  const cle = route.ecran === 'carte' ? `carte/${route.id}` : route.ecran;

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

  // Le réglage « réduire les animations » s'applique à tout le site (voir la fin de styles.css).
  const animationsReduites = partie.etat === 'prete' && partie.sauvegarde.reglages.reduireAnimations;
  useEffect(() => { document.documentElement.toggleAttribute('data-animations-reduites', animationsReduites); }, [animationsReduites]);

  return (
    <Recompenses profil={partie.etat === 'prete' ? partie.sauvegarde.profil : null} onEquiper={id => personnaliser('titre', id)}><div className="application">
      <button type="button" className="evitement" onClick={() => allerAuContenu()}>Aller au contenu</button>
      <Navigation ecran={route.ecran} encre={partie.etat === 'prete' ? partie.sauvegarde.encre : null} />
      <Ecran key={cle} route={route} />
    </div></Recompenses>
  );
}
