// Atelier de direction artistique (écran provisoire) : les mêmes cartes, dessinées selon trois pistes,
// pour que Raphaël puisse choisir sur pièces. Il disparaîtra quand la direction sera arrêtée.

import type { ReactNode } from 'react';
import '../da/da.css';
import { CarteAffiche } from '../da/CarteAffiche.tsx';
import { CarteEnluminure } from '../da/CarteEnluminure.tsx';
import { CartePasseport } from '../da/CartePasseport.tsx';
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

type Piste = {
  nom: string;
  idee: string;
  points: string[];
  dessiner: (exemple: Exemple) => ReactNode;
};

const PISTES: Piste[] = [
  {
    nom: '1 — Enluminure',
    idee: "La carte est une entrée de manuscrit. L'illustration, c'est la lettrine : la première lettre du mot, posée sur un fond ornemental calculé à partir du mot, dans le pigment de sa faction.",
    points: [
      'Rareté : la richesse du cadre — filet simple, double filet, écoinçons, cordelière, puis feuille d’or qui miroite.',
      'Faction : la couleur du pigment (rouge pour le latin, bleu lapis pour le grec, vert pour l’arabe…).',
      'Détails : stats en chiffres romains, définition justifiée comme dans un vieux dictionnaire.',
      'Ton : précieux, littéraire, chaleureux. Le plus « naturel » pour un jeu de mots — donc le moins surprenant des trois.',
    ],
    dessiner: ({ carte }) => <CarteEnluminure carte={carte} />,
  },
  {
    nom: '2 — Affiche',
    idee: "La carte est une affiche typographique. Le mot, en capitales énormes, remplit la carte et joue avec des formes géométriques propres à chaque mot.",
    points: [
      'Rareté : la richesse de l’impression — une encre, deux encres, fond de couleur, surimpression, puis encre irisée sur fond noir.',
      'Faction : un duo de couleurs franches par faction ; une collection triée par faction devient un mur d’affiches.',
      'Ton : moderne, graphique, très lisible même en tout petit. Le plus éloigné de l’imagerie habituelle des jeux de cartes.',
      'Limite : les mots très longs sont coupés sur deux ou trois lignes.',
    ],
    dessiner: ({ carte }) => <CarteAffiche carte={carte} />,
  },
  {
    nom: '3 — Passeport',
    idee: "Les mots sont des voyageurs. Chaque carte est le papier d’identité d’un mot entré en français : tampon de sa langue d’origine, date d’entrée (sa première apparition connue), rosace de sécurité unique comme sur un billet de banque.",
    points: [
      'Rareté : le niveau de sécurité du document — rosace plus dense, micro-texte, bande irisée, puis papier et encres dorés.',
      'Faction : le tampon d’origine, dans l’encre de la faction. C’est la seule piste qui raconte l’étymologie au lieu de simplement la colorer.',
      'Détails : la « date d’entrée en français » exploite une donnée que nous avons déjà ; les stats sont reprises dans la ligne « lisible par une machine ».',
      'Ton : ludique, original, plein de petits détails à découvrir. Le plus chargé des trois : à alléger si on le retient.',
    ],
    dessiner: ({ carte, details }) => <CartePasseport carte={carte} attestation={details?.attestation} />,
  },
];

export function Atelier() {
  const exemples = useChargement(chargerExemples, 'atelier');

  return (
    <main className="ecran ecran--large">
      <Entete surtitre="Écran provisoire" titre="Atelier de direction artistique">
        Trois pistes pour les cartes, essayées sur les six mêmes mots. Aucune illustration n'est faite à la main :
        tout le décor est calculé à partir du mot, donc chaque carte est unique. Les polices sont celles de cet
        ordinateur ; la piste retenue aura ses propres polices, livrées avec le jeu.
      </Entete>

      {exemples.etat === 'en cours' && <p className="texte-doux">Chargement des cartes…</p>}
      {exemples.etat === 'erreur' && <p role="alert">Les cartes n'ont pas pu être chargées. {exemples.message}</p>}
      {exemples.etat === 'pret' && PISTES.map((piste) => (
        <section key={piste.nom} className="atelier__piste">
          <h2>{piste.nom}</h2>
          <p>{piste.idee}</p>
          <div className="atelier__cartes">
            {exemples.donnees.map((exemple) => <div key={exemple.carte.id}>{piste.dessiner(exemple)}</div>)}
          </div>
          <ul className="atelier__points texte-doux petit">
            {piste.points.map((point) => <li key={point}>{point}</li>)}
          </ul>
          <p className="texte-doux petit">En tout petit, comme dans la grille de la collection (la définition s'efface, le mot grossit) :</p>
          <div className="atelier__vignettes">
            {exemples.donnees.filter((e) => VIGNETTES.includes(e.carte.id)).map((exemple) => <div key={exemple.carte.id}>{piste.dessiner(exemple)}</div>)}
          </div>
        </section>
      ))}
    </main>
  );
}
