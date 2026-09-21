import { useEffect } from 'react';
import { Navigation } from './composants/Navigation.tsx';
import { usePartie } from './composants/usePartie.ts';
import { Accueil } from './ecrans/Accueil.tsx';
import { Atelier } from './ecrans/Atelier.tsx';
import { Collection } from './ecrans/Collection.tsx';
import { Deck, Duel } from './ecrans/EcransAVenir.tsx';
import { FicheCarte } from './ecrans/FicheCarte.tsx';
import { OuverturePaquet } from './ecrans/OuverturePaquet.tsx';
import { Reglages } from './ecrans/Reglages.tsx';
import { useRoute } from './navigation/useRoute.ts';
import type { Route } from './navigation/routes.ts';

function Ecran({ route }: { route: Route }) {
  switch (route.ecran) {
    case 'accueil': return <Accueil />;
    case 'paquet': return <OuverturePaquet />;
    case 'collection': return <Collection />;
    case 'carte': return <FicheCarte id={route.id} />;
    case 'deck': return <Deck />;
    case 'duel': return <Duel />;
    case 'reglages': return <Reglages />;
    case 'atelier': return <Atelier />;
  }
}

export function App() {
  const route = useRoute();
  const partie = usePartie();
  const cle = route.ecran === 'carte' ? `carte/${route.id}` : route.ecran;

  // À chaque changement d'écran, on repart du haut de la page.
  useEffect(() => { window.scrollTo(0, 0); }, [cle]);

  // Le réglage « réduire les animations » s'applique à tout le site (voir la fin de styles.css).
  const animationsReduites = partie.etat === 'prete' && partie.sauvegarde.reglages.reduireAnimations;
  useEffect(() => { document.documentElement.toggleAttribute('data-animations-reduites', animationsReduites); }, [animationsReduites]);

  return (
    <div className="application">
      <Navigation ecran={route.ecran} />
      <Ecran key={cle} route={route} />
    </div>
  );
}
