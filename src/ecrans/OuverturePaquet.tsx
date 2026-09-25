import { FondAnime } from '../composants/accueil/FondAnime.tsx';
import { Comptoir } from '../composants/ceremonie/Comptoir.tsx';
import '../composants/accueil/refonte.css';

// L'écran des paquets : le comptoir de la refonte, d'où part la cérémonie d'ouverture.
export function OuverturePaquet() {
  return <main className="ecran ecran--large accueil-refonte"><FondAnime /><Comptoir /></main>;
}
