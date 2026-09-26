import { DevinetteDuJour } from '../composants/accueil/DevinetteDuJour.tsx';
import { DuelsDuBureau } from '../composants/accueil/DuelsDuBureau.tsx';
import { FilDActivite } from '../composants/accueil/FilDActivite.tsx';
import { FondAnime } from '../composants/accueil/FondAnime.tsx';
import { NouvellesDuParrainage } from '../composants/accueil/NouvellesDuParrainage.tsx';
import { Comptoir } from '../composants/ceremonie/Comptoir.tsx';
import { usePartie } from '../composants/usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { lien } from '../navigation/routes.ts';
import '../composants/accueil/accueil.css';
import '../composants/accueil/refonte.css';

// L'accueil de la refonte (maquette de la cérémonie) : le comptoir des paquets, l'album en aperçu et les duels,
// la devinette du jour, le fil d'activité des collectionneurs, sur le fond vivant.
export function Accueil() {
  const partie = usePartie();

  if (partie.etat === 'erreur') return <main className="ecran"><h1>Accueil</h1><p role="alert">La partie n’a pas pu être chargée. {partie.message}</p></main>;
  if (partie.etat !== 'prete') return <main className="ecran"><h1 className="visuellement-cache">Accueil</h1><p role="status">Chargement…</p></main>;

  const { sauvegarde } = partie;
  const depuisLExport = sauvegarde.paquets.ouverts - (sauvegarde.dernierExport?.paquetsOuverts ?? 0);
  const rappelerLExport = depuisLExport >= EQUILIBRAGE.paquetsEntreDeuxRappelsDExport || (sauvegarde.dernierExport === null && sauvegarde.paquets.ouverts >= 20);
  const deck = sauvegarde.deck.filter((id) => id in sauvegarde.cartes).length;

  return (
    <main className="ecran ecran--large accueil-refonte">
      <FondAnime />
      <NouvellesDuParrainage />
      <Comptoir aCote={<DuelsDuBureau sauvegarde={sauvegarde} deck={deck} />} />
      <DevinetteDuJour />
      <FilDActivite />
      {rappelerLExport && (
        <aside className="accueil__rappel">
          <div><h2>Garde une copie de ta partie</h2><p>Elle est enregistrée uniquement sur cet appareil.</p></div>
          <a className="accueil-lien" href={lien({ ecran: 'reglages' })}>Exporter ma sauvegarde</a>
        </aside>
      )}
      {partie.emplacement === 'mémoire seulement' && (
        <aside className="bloc bloc--alerte" role="alert"><p>Ce navigateur refuse d’enregistrer des données. Ta partie sera perdue à la fermeture de la page.</p></aside>
      )}
    </main>
  );
}
