// Atelier de direction artistique (écran provisoire) : la piste retenue par Raphaël — les timbres —,
// ses finitions, une proposition de rang ultime, et les pistes précédentes pour mémoire.
// Il disparaîtra quand la direction sera arrêtée et appliquée à tout le jeu.

import type { ReactNode } from 'react';
import '../da/da.css';
import '../da/timbre.css';
import { CarteAffiche } from '../da/CarteAffiche.tsx';
import { CarteEnluminure } from '../da/CarteEnluminure.tsx';
import { CartePasseport } from '../da/CartePasseport.tsx';
import { CarteTimbre } from '../da/CarteTimbre.tsx';
import type { Finition } from '../da/CarteTimbre.tsx';
import { Entete } from '../composants/Entete.tsx';
import { useChargement } from '../composants/useChargement.ts';
import type { CarteDetails, CarteIndex } from '../partage/types.ts';
import { chargerDetails, chargerEdition } from '../services/cartes.ts';

// Une carte de chaque rareté, des factions variées, un mot long et un mot familier.
const EXEMPLES = ['callipyge-adj', 'caravansérail-nom', 'truchement-nom', 'billevesée-nom', 'ersatz-nom', 'casquette-nom'];
const VIGNETTES = ['callipyge-adj', 'truchement-nom', 'casquette-nom'];

type Exemple = { carte: CarteIndex; details: CarteDetails | undefined };

async function chargerExemples(): Promise<Exemple[]> {
  const edition = await chargerEdition();
  const cartes = EXEMPLES.flatMap((id) => edition.cartes.find((c) => c.id === id) ?? []);
  return Promise.all(cartes.map(async (carte) => ({ carte, details: await chargerDetails(carte.id) })));
}

const FINITIONS: { finition: Finition; nom: string; chance: string }[] = [
  { finition: 'normale', nom: 'Normale', chance: 'le tirage ordinaire' },
  { finition: 'brillante', nom: 'Brillante', chance: 'par exemple 1 carte sur 12' },
  { finition: 'holographique', nom: 'Holographique', chance: 'par exemple 1 carte sur 80' },
];

// Proposition de rang ultime : les mots qui détiennent un record, trouvés automatiquement dans les données.
// (Exemples écrits à la main pour cette maquette ; les chiffres et les définitions sont les vrais.)
const HORS_SERIE: { carte: CarteIndex; attestation?: string; record: string }[] = [
  { record: 'Le plus long mot de la langue · 25 lettres', attestation: 'XIXᵉ siècle', carte: { id: 'anticonstitutionnellement-adv', mot: 'anticonstitutionnellement', type: 'Adverbe', rarete: 'Légendaire', attaque: 10, defense: 5, faction: 'Latin', registre: [], definition: 'Contrairement aux règles constitutionnelles de l’organisation des pouvoirs publics d’un gouvernement.' } },
  { record: 'Le plus vieux mot daté · Serments de Strasbourg', attestation: '842', carte: { id: 'amour-nom', mot: 'amour', type: 'Nom', rarete: 'Légendaire', attaque: 1, defense: 10, faction: 'Vieux français', registre: [], definition: 'Sentiment intense et agréable qui incite les êtres à s’unir.' } },
  { record: 'Le plus long palindrome · se lit dans les deux sens', carte: { id: 'ressasser-verbe', mot: 'ressasser', type: 'Verbe', rarete: 'Légendaire', attaque: 3, defense: 8, faction: 'Latin', registre: [], definition: 'Revenir constamment en esprit sur le même sujet ou revenir sans cesse sur les mêmes propos.' } },
];

type Piste = { nom: string; dessiner: (exemple: Exemple) => ReactNode };
const PISTES_PRECEDENTES: Piste[] = [
  { nom: 'Enluminure', dessiner: ({ carte }) => <CarteEnluminure carte={carte} /> },
  { nom: 'Affiche', dessiner: ({ carte }) => <CarteAffiche carte={carte} /> },
  { nom: 'Passeport', dessiner: ({ carte, details }) => <CartePasseport carte={carte} attestation={details?.attestation} /> },
];

export function Atelier() {
  const exemples = useChargement(chargerExemples, 'atelier');

  return (
    <main className="ecran ecran--large">
      <Entete surtitre="Écran provisoire" titre="Atelier de direction artistique">
        La piste des timbres, avec ses finitions brillantes et une proposition de rang ultime. Aucune illustration n'est faite
        à la main : la rosace de chaque timbre est calculée à partir du mot. Les polices sont celles de cet appareil ; les
        polices définitives seront livrées avec le jeu.
      </Entete>

      {exemples.etat === 'en cours' && <p className="texte-doux">Chargement des cartes…</p>}
      {exemples.etat === 'erreur' && <p role="alert">Les cartes n'ont pas pu être chargées. {exemples.message}</p>}
      {exemples.etat === 'pret' && (
        <>
          <section className="atelier__piste">
            <h2>Les timbres</h2>
            <p>
              Chaque mot est un timbre émis par sa langue d'origine : dentelure, attaque et défense dans les coins comme des
              valeurs faciales, rosace gravée unique au centre, et cachet d'origine daté de la première apparition du mot.
              La collection devient un album de timbres.
            </p>
            <div className="atelier__cartes">
              {exemples.donnees.map(({ carte, details }) => <div key={carte.id}><CarteTimbre carte={carte} attestation={details?.attestation} /></div>)}
            </div>
            <ul className="atelier__points texte-doux petit">
              <li>Rareté : la qualité de l'impression — une encre, deux encres, double cadre et fond teinté, encre argentée (Épique), dorure (Légendaire).</li>
              <li>Faction : la couleur de l'encre, et le nom de la langue en haut du timbre comme un pays émetteur.</li>
              <li>En tout petit, comme dans la grille de la collection :</li>
            </ul>
            <div className="atelier__vignettes">
              {exemples.donnees.filter((e) => VIGNETTES.includes(e.carte.id)).map(({ carte, details }) => <div key={carte.id}><CarteTimbre carte={carte} attestation={details?.attestation} /></div>)}
            </div>
          </section>

          <section className="atelier__piste">
            <h2>Les finitions : la même carte, avec ou sans effet</h2>
            <p>
              La finition est tirée au sort à part, pour chaque carte de chaque paquet, quelle que soit sa rareté : une Commune
              peut être holographique, une Légendaire peut ne pas l'être. Passe le doigt ou la souris sur une carte : le reflet suit.
            </p>
            {[exemples.donnees[0], exemples.donnees[exemples.donnees.length - 1]].filter(Boolean).map(({ carte, details }) => (
              <div key={carte.id} className="atelier__cartes">
                {FINITIONS.map(({ finition, nom, chance }) => (
                  <figure key={finition} className="atelier__figure">
                    <CarteTimbre carte={carte} attestation={details?.attestation} finition={finition} />
                    <figcaption className="texte-doux petit"><strong>{nom}</strong> — {chance}</figcaption>
                  </figure>
                ))}
              </div>
            ))}
          </section>

          <section className="atelier__piste">
            <h2>Proposition de rang ultime : les « Hors-série »</h2>
            <p>
              Des mots qui détiennent un record, trouvés automatiquement dans les données : chaque carte porte son titre.
              Papier noir, impression irisée, finition prismatique.
            </p>
            <div className="atelier__cartes">
              {HORS_SERIE.map(({ carte, attestation, record }) => <div key={carte.id}><CarteTimbre carte={carte} attestation={attestation} finition="prismatique" horsSerie={record} /></div>)}
            </div>
          </section>

          <details className="bloc repliable">
            <summary><h2>Les trois premières pistes, pour mémoire</h2></summary>
            {PISTES_PRECEDENTES.map((piste) => (
              <section key={piste.nom} className="atelier__piste">
                <h2>{piste.nom}</h2>
                <div className="atelier__cartes">
                  {exemples.donnees.slice(0, 4).map((exemple) => <div key={exemple.carte.id}>{piste.dessiner(exemple)}</div>)}
                </div>
              </section>
            ))}
          </details>
        </>
      )}
    </main>
  );
}
