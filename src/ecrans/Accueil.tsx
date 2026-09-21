import { Entete } from '../composants/Entete.tsx';
import { useChargement } from '../composants/useChargement.ts';
import { enMinutesEtSecondes, usePartie, useStockDePaquets } from '../composants/usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { registresMasques } from '../jeu/partie.ts';
import { lien } from '../navigation/routes.ts';
import { chargerEdition } from '../services/cartes.ts';

export function Accueil() {
  const partie = usePartie();
  const paquets = useStockDePaquets(partie);
  const edition = useChargement(chargerEdition, 'edition');

  if (partie.etat === 'erreur') return <main className="ecran"><p role="alert">La partie n'a pas pu être chargée. {partie.message}</p></main>;
  if (partie.etat !== 'prete' || !paquets) return <main className="ecran"><p className="texte-doux">Chargement…</p></main>;

  const { sauvegarde } = partie;
  const prix = EQUILIBRAGE.paquets.prixEnEncre;

  // Progression : seules comptent les cartes visibles (celles que le joueur n'a pas choisi de masquer).
  const masques = registresMasques(sauvegarde);
  const visibles = edition.etat === 'pret' ? edition.donnees.cartes.filter((c) => !c.registre.some((r) => masques.includes(r))) : [];
  const possedees = visibles.filter((c) => c.id in sauvegarde.cartes).length;

  const depuisLExport = sauvegarde.paquets.ouverts - (sauvegarde.dernierExport?.paquetsOuverts ?? 0);
  const rappelerLExport = depuisLExport >= EQUILIBRAGE.paquetsEntreDeuxRappelsDExport || (sauvegarde.dernierExport === null && sauvegarde.paquets.ouverts >= 20);

  return (
    <main className="ecran">
      <Entete surtitre="Jeu de cartes à collectionner" titre="MOTS">
        Chaque carte est un vrai mot de la langue française. Plus le mot est rare, plus la carte l'est aussi.
      </Entete>

      <section className="bloc paquets" aria-live="polite">
        <h2>Tes paquets</h2>
        <p className="paquets__stock"><strong>{paquets.stock}</strong> / {paquets.maximum}</p>
        <p className="texte-doux">
          {paquets.attente === null ? 'Stock plein : ouvre un paquet pour relancer le compte à rebours.' : <>Prochain paquet dans <strong>{enMinutesEtSecondes(paquets.attente)}</strong></>}
        </p>
        {paquets.stock > 0
          ? <a className="bouton" href={lien({ ecran: 'paquet' })}>Ouvrir un paquet</a>
          : <span className="bouton bouton--inactif" aria-disabled="true">Aucun paquet pour l'instant</span>}
      </section>

      <section className="bloc">
        <h2>Ton Encre : {sauvegarde.encre.toLocaleString('fr-FR')}</h2>
        <p className="texte-doux petit">Chaque carte reçue en double se change en Encre. Avec {prix} Encre, tu obtiens un paquet tout de suite, sans attendre.</p>
        {sauvegarde.encre >= prix
          ? <a className="bouton bouton--discret" href={lien({ ecran: 'paquet' })}>Un paquet tout de suite — {prix} Encre</a>
          : <span className="texte-doux petit">Encore {(prix - sauvegarde.encre).toLocaleString('fr-FR')} Encre avant de pouvoir t'offrir un paquet.</span>}
      </section>

      <section className="bloc">
        <h2>Ta collection</h2>
        {edition.etat === 'pret'
          ? <p><strong>{possedees.toLocaleString('fr-FR')}</strong> / {visibles.length.toLocaleString('fr-FR')} cartes · {sauvegarde.paquets.ouverts.toLocaleString('fr-FR')} {sauvegarde.paquets.ouverts > 1 ? 'paquets ouverts' : 'paquet ouvert'}</p>
          : <p className="texte-doux">Chargement des cartes…</p>}
        <a className="bouton bouton--discret" href={lien({ ecran: 'collection' })}>Voir ma collection</a>
      </section>

      {rappelerLExport && (
        <section className="bloc bloc--alerte">
          <h2>Pense à mettre ta collection à l'abri</h2>
          <p className="petit">Ta collection est enregistrée sur cet appareil seulement. Un fichier de sauvegarde te permet de la retrouver si les données du navigateur sont effacées.</p>
          <a className="bouton bouton--discret" href={lien({ ecran: 'reglages' })}>Exporter ma sauvegarde</a>
        </section>
      )}

      {partie.emplacement === 'mémoire seulement' && (
        <section className="bloc bloc--alerte" role="alert">
          <p className="petit">Ce navigateur refuse d'enregistrer des données (navigation privée ?). Ta partie sera perdue à la fermeture de la page.</p>
        </section>
      )}

      <section className="bloc bloc--a-venir">
        <span className="entete__surtitre">Provisoire</span>
        <p className="texte-doux petit">Trois pistes pour le dessin des cartes, essayées sur les mêmes mots.</p>
        <a className="bouton bouton--discret" href={lien({ ecran: 'atelier' })}>Atelier de direction artistique</a>
      </section>
    </main>
  );
}
