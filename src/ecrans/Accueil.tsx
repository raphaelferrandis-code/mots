import { Identite } from '../composants/Identite.tsx';
import { useMemo } from 'react';
import { DuelsAccueil } from '../composants/accueil/DuelsAccueil.tsx';
import { NouvellesDuParrainage } from '../composants/accueil/NouvellesDuParrainage.tsx';
import { PaquetsAccueil } from '../composants/accueil/PaquetsAccueil.tsx';
import { ResumeCollection } from '../composants/accueil/ResumeCollection.tsx';
import { preparerAccueil } from '../composants/accueil/modeleAccueil.ts';
import { Carte } from '../composants/carte/Carte.tsx';
import { meilleureFinition } from '../jeu/sauvegarde.ts';
import { useChargement } from '../composants/useChargement.ts';
import { usePartie } from '../composants/usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { SITE } from '../config/site.ts';
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
      <h1 className="visuellement-cache">{SITE.nom} — ton bureau de collectionneur</h1>
      <a className="accueil-profil" href={lien({ ecran: 'profil' })}><Identite profil={partie.sauvegarde.profil} pseudo={partie.sauvegarde.joutes.pseudo} /></a>
      <NouvellesDuParrainage />
      <div className="accueil__poles">
        <PaquetsAccueil partie={partie} />
        <DuelsAccueil deck={vue?.deck ?? null} sauvegarde={partie.sauvegarde} erreur={edition.etat === 'erreur'} />
      </div>
      <ResumeCollection collection={vue?.collection ?? null} erreur={edition.etat === 'erreur' ? edition.message : undefined} />
      {vue && vue.recentes.length > 0 && (
        <section className="accueil-trouvailles" aria-labelledby="titre-trouvailles">
          <h2 id="titre-trouvailles">Dernières trouvailles</h2>
          <div className="accueil-trouvailles__timbres">
            {vue.recentes.map((carte) => <Carte key={carte.id} carte={carte} finition={meilleureFinition(partie.sauvegarde.cartes[carte.id])} maitriseeLe={partie.sauvegarde.cartes[carte.id].maitriseeLe} />)}
          </div>
        </section>
      )}
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
