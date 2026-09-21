import { useMemo } from 'react';
import { DuelsAccueil } from '../composants/accueil/DuelsAccueil.tsx';
import { PaquetsAccueil } from '../composants/accueil/PaquetsAccueil.tsx';
import { ResumeCollection } from '../composants/accueil/ResumeCollection.tsx';
import { preparerAccueil } from '../composants/accueil/modeleAccueil.ts';
import { useChargement } from '../composants/useChargement.ts';
import { usePartie } from '../composants/usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { lien } from '../navigation/routes.ts';
import { chargerEdition } from '../services/cartes.ts';
import '../composants/accueil/accueil.css';

// Cet écran assemble les blocs. Présentation et données dérivées : composants/accueil/.
export function Accueil() {
  const partie = usePartie();
  const edition = useChargement(chargerEdition, 'edition');
  const sauvegarde = partie.etat === 'prete' ? partie.sauvegarde : null;
  const cartes = edition.etat === 'pret' ? edition.donnees.cartes : null;
  const vue = useMemo(() => sauvegarde && cartes ? preparerAccueil(sauvegarde, cartes) : null, [sauvegarde, cartes]);

  if (partie.etat === 'erreur') return <main className="ecran"><h1>Accueil</h1><p role="alert">La partie n’a pas pu être chargée. {partie.message}</p></main>;
  if (partie.etat !== 'prete') return <main className="ecran"><h1 className="visuellement-cache">Accueil</h1><p role="status">Chargement…</p></main>;

  const depuisLExport = partie.sauvegarde.paquets.ouverts - (partie.sauvegarde.dernierExport?.paquetsOuverts ?? 0);
  const rappelerLExport = depuisLExport >= EQUILIBRAGE.paquetsEntreDeuxRappelsDExport || (partie.sauvegarde.dernierExport === null && partie.sauvegarde.paquets.ouverts >= 20);

  return (
    <main className="ecran accueil">
      <h1 className="visuellement-cache">MOTS — ton bureau de collectionneur</h1>
      <div className="accueil__poles">
        <PaquetsAccueil partie={partie} />
        <DuelsAccueil deck={vue?.deck ?? null} sauvegarde={partie.sauvegarde} erreur={edition.etat === 'erreur'} />
      </div>
      <ResumeCollection collection={vue?.collection ?? null} paquetsOuverts={partie.sauvegarde.paquets.ouverts} erreur={edition.etat === 'erreur' ? edition.message : undefined} />
      {rappelerLExport && (
        <aside className="accueil__rappel">
          <div><h2>Mets ta collection à l’abri</h2><p>Ta partie est enregistrée sur cet appareil. Garde une copie pour la retrouver ailleurs.</p></div>
          <a className="accueil-lien" href={lien({ ecran: 'reglages' })}>Exporter ma sauvegarde</a>
        </aside>
      )}
      {partie.emplacement === 'mémoire seulement' && (
        <aside className="bloc bloc--alerte" role="alert"><p>Ce navigateur refuse d’enregistrer des données. Ta partie sera perdue à la fermeture de la page.</p></aside>
      )}
    </main>
  );
}
