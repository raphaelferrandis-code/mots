import { lien } from '../../navigation/routes.ts';
import { Icone } from '../Icone.tsx';
import type { VueAccueil } from './modeleAccueil.ts';

export function ResumeCollection({ collection, paquetsOuverts, erreur }: { collection: VueAccueil['collection'] | null; paquetsOuverts: number; erreur?: string }) {
  const pourcentage = collection && collection.total > 0 ? collection.possedees / collection.total * 100 : 0;
  return (
    <section className="resume-collection" aria-labelledby="titre-collection">
      <h2 id="titre-collection"><Icone nom="album" /> Ta collection</h2>
      <div className="resume-collection__progression">
        {collection ? <>
          <p><strong>{collection.possedees.toLocaleString('fr-FR')}</strong><span> / {collection.total.toLocaleString('fr-FR')} timbres</span></p>
          <div className="resume-collection__jauge">
            <progress value={collection.possedees} max={Math.max(1, collection.total)} aria-label="Progression de la collection" />
            <span>{pourcentage.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %</span>
          </div>
          <p className="resume-collection__details">{collection.horsSeriePossedees} / {collection.horsSerieTotal} hors-série · {collection.maitrisees} mot{collection.maitrisees > 1 ? 's' : ''} maîtrisé{collection.maitrisees > 1 ? 's' : ''} · {paquetsOuverts} paquet{paquetsOuverts > 1 ? 's' : ''} ouvert{paquetsOuverts > 1 ? 's' : ''}</p>
        </> : <p role={erreur ? 'alert' : 'status'}>{erreur ? `Cartes indisponibles. ${erreur}` : 'Chargement de la collection…'}</p>}
      </div>
      <a className="accueil-lien resume-collection__lien" href={lien({ ecran: 'collection' })}>Ouvrir l’album <Icone nom="fleche" /></a>
    </section>
  );
}
