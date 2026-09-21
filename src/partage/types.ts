// Format des cartes, partagé entre le pipeline (qui les fabrique) et le jeu (qui les affiche).

export type Nature = 'Nom' | 'Verbe' | 'Adjectif' | 'Adverbe';
export type Rarete = 'Commune' | 'Peu commune' | 'Rare' | 'Épique' | 'Légendaire';
export type Registre = 'Familier' | 'Injurieux' | 'Littéraire' | 'Vieilli';

// De la moins rare à la plus rare.
export const RARETES: Rarete[] = ['Commune', 'Peu commune', 'Rare', 'Épique', 'Légendaire'];

// Ce que le jeu charge au démarrage : une ligne courte par carte.
export type CarteIndex = {
  id: string; // stable d'une génération à l'autre, par exemple « callipyge-adj »
  mot: string;
  type: Nature;
  rarete: Rarete;
  attaque: number; // 1 à 10, valeur des lettres
  defense: number; // 1 à 10, richesse du mot (hors bonus de rareté, appliqué par le jeu)
  faction: string;
  registre: Registre[];
  definition: string; // le sens principal, raccourci pour tenir sur la carte (la fiche donne les définitions complètes)
};

export type Definition = {
  texte: string;
  quiz: boolean; // utilisable comme question de duel (ne contient pas le mot lui-même)
  registre?: Registre[];
};

// Ce que le jeu charge à la demande (fiche carte, duel).
export type CarteDetails = {
  definitions: Definition[];
  etymologie: string;
  langueOrigine: string;
  frequence: number; // occurrences par million de mots
  prevalence: number | null; // part des gens qui connaissent le mot, en %
  attestation?: string; // date de première apparition du mot, quand elle est connue
};

export type IndexEdition = {
  meta: {
    edition: number;
    version: string;
    cartes: number;
    lots: number; // nombre de fichiers de détails
    sources: string;
    licence: string;
  };
  cartes: CarteIndex[];
};

export const SUFFIXE_ID: Record<Nature, string> = { Nom: 'nom', Verbe: 'verbe', Adjectif: 'adj', Adverbe: 'adv' };

export function idDeCarte(mot: string, type: Nature): string {
  return `${mot}-${SUFFIXE_ID[type]}`;
}
