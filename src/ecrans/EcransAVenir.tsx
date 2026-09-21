// Écrans dont le contenu arrive dans les phases suivantes. Ils existent déjà pour que la navigation
// soit complète ; chacun dit ce qu'il contiendra.

import { AVenir, Entete } from '../composants/Entete.tsx';
import { useChargement } from '../composants/useChargement.ts';
import { chargerEdition } from '../services/cartes.ts';

export function OuverturePaquet() {
  return (
    <main className="ecran">
      <Entete surtitre="Paquets" titre="Ouverture d'un paquet">Cinq cartes face cachée, retournées une à une.</Entete>
      <AVenir phase="phase 2">
        Tirage des cinq cartes selon leur rareté, garantie d'une Légendaire, animation d'ouverture avec un effet
        plus marqué pour les cartes rares, bouton « tout retourner » et enchaînement sur le paquet suivant.
      </AVenir>
    </main>
  );
}

export function Collection() {
  const edition = useChargement(chargerEdition, 'edition');
  const factions = new Map<string, number>();
  if (edition.etat === 'pret') for (const carte of edition.donnees.cartes) factions.set(carte.faction, (factions.get(carte.faction) ?? 0) + 1);

  return (
    <main className="ecran ecran--large">
      <Entete surtitre="Collection" titre="Tes cartes">Tu ne possèdes encore aucune carte : les paquets arrivent en phase 2.</Entete>
      <AVenir phase="phase 2">
        Grille de tes cartes avec filtres (rareté, type, faction, registre), tri, recherche, et ta progression par faction.
        Les cartes que tu n'as pas restent secrètes : seuls les compteurs sont visibles.
      </AVenir>
      {edition.etat === 'pret' && (
        <section className="bloc">
          <h2>Les {factions.size} factions de l'Édition 1</h2>
          <ul className="liste-nue">
            {[...factions].sort((a, b) => b[1] - a[1]).map(([faction, nombre]) => (
              <li key={faction}>{faction} <span className="texte-doux">— 0 / {nombre}</span></li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

export function Deck() {
  return (
    <main className="ecran">
      <Entete surtitre="Deck" titre="Ton deck de duel">Dix cartes choisies dans ta collection.</Entete>
      <AVenir phase="phase 3">Choix des dix cartes, avec un rappel du triangle des types (Nom &gt; Adjectif &gt; Verbe &gt; Nom) et des bonus de faction.</AVenir>
    </main>
  );
}

export function Duel() {
  return (
    <main className="ecran">
      <Entete surtitre="Duel" titre="Duel contre l'ordinateur">Tu choisis ta carte, puis tu prouves que tu connais le mot.</Entete>
      <AVenir phase="phase 3">
        Trois niveaux de difficulté, 20 points de vie, 3 cartes en main. Pour attaquer, il faut retrouver la définition
        de son mot parmi quatre, en 15 secondes.
      </AVenir>
    </main>
  );
}
