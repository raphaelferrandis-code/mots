import { useMemo, useState } from 'react';
import { Carte } from '../composants/Carte.tsx';
import { AVenir, Entete } from '../composants/Entete.tsx';
import { useChargement } from '../composants/useChargement.ts';
import { lien } from '../navigation/routes.ts';
import { RARETES } from '../partage/types.ts';
import type { CarteIndex } from '../partage/types.ts';
import { chargerEdition } from '../services/cartes.ts';

// Une carte au hasard par rareté, de la plus rare à la plus courante : un simple aperçu du contenu,
// sans rapport avec le futur tirage des paquets (qui aura ses propres règles et ses propres tests).
function tirerUnApercu(cartes: CarteIndex[]): CarteIndex[] {
  return [...RARETES].reverse().flatMap((rarete) => {
    const groupe = cartes.filter((c) => c.rarete === rarete);
    return groupe.length ? [groupe[Math.floor(Math.random() * groupe.length)]] : [];
  });
}

export function Accueil() {
  const edition = useChargement(chargerEdition, 'edition');
  const [tirage, setTirage] = useState(0);
  // Le tirage ne change que lorsqu'on le demande, pas à chaque rafraîchissement de l'écran.
  const apercu = useMemo(() => (edition.etat === 'pret' ? tirerUnApercu(edition.donnees.cartes) : []), [edition, tirage]);

  return (
    <main className="ecran">
      <Entete surtitre="Jeu de cartes à collectionner" titre="MOTS">
        Chaque carte est un vrai mot de la langue française. Plus le mot est rare, plus la carte l'est aussi.
      </Entete>

      <AVenir phase="phase 2">
        Ici : ton stock de paquets (un nouveau toutes les 10 minutes, 10 au maximum), le compte à rebours
        avant le prochain, et ton Encre. <a href={lien({ ecran: 'paquet' })}>Voir l'écran d'ouverture</a>.
      </AVenir>

      <section className="bloc" aria-live="polite">
        <h2>Aperçu de l'Édition 1</h2>
        {edition.etat === 'en cours' && <p className="texte-doux">Chargement des cartes…</p>}
        {edition.etat === 'erreur' && <p role="alert">Les cartes n'ont pas pu être chargées. {edition.message}</p>}
        {edition.etat === 'pret' && (
          <>
            <p className="texte-doux petit">
              {edition.donnees.meta.cartes.toLocaleString('fr-FR')} cartes. En voici une de chaque rareté, au hasard — touche une carte pour ouvrir sa fiche.
            </p>
            <div className="rangee-de-cartes">
              {apercu.map((carte) => <Carte key={carte.id} carte={carte} />)}
            </div>
            <button type="button" className="bouton bouton--discret" onClick={() => setTirage((n) => n + 1)}>Tirer d'autres cartes</button>
          </>
        )}
      </section>
    </main>
  );
}
