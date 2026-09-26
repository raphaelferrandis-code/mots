// Le tirage d'un paquet : d'abord la rareté de chaque emplacement, puis un mot au hasard dans cette rareté,
// puis la finition de la carte. Règles pures : pas d'écran, pas de sauvegarde, et le hasard est fourni par l'appelant.

import { RARETES } from '../partage/types.ts';
import type { CarteIndex, Finition, Rarete, Registre } from '../partage/types.ts';
import type { ChancesParRarete } from '../config/equilibrage.ts';
import { choisir } from './hasard.ts';
import type { Hasard } from './hasard.ts';

// Un paquet d'exception (« god pack ») : toutes ses cartes sont des Légendaires holographiques, ou des Hors-série.
export type PaquetDException = 'Légendaire' | 'Hors-série';

export type ReglagesDesPaquets = {
  emplacements: ChancesParRarete[];
  paquetsAvantLegendaireGarantie: number;
  chanceHorsSerie: number;
  paquetsDException: Record<PaquetDException, number>;
};

export type ReglagesDesFinitions = {
  chances: Partial<Record<Finition, number>>;
  encre: Record<Finition, number>;
};

// Une carte sortie d'un paquet, avec la finition que le sort lui a donnée.
export type CarteTiree = { carte: CarteIndex; finition: Finition };

// Les cartes rangées par rareté une fois pour toutes (le simulateur ouvre des millions de paquets).
export type Reserve = Record<Rarete, CarteIndex[]>;

// « masques » : les registres que le joueur a choisi de masquer (familiers, injurieux) ne tombent plus dans les paquets.
export function preparerReserve(cartes: readonly CarteIndex[], masques: readonly Registre[] = []): Reserve {
  const reserve: Reserve = { 'Commune': [], 'Peu commune': [], 'Rare': [], 'Épique': [], 'Légendaire': [], 'Hors-série': [] };
  for (const carte of cartes) {
    if (!carte.registre.some((r) => masques.includes(r))) reserve[carte.rarete].push(carte);
  }
  return reserve;
}

export function tirerRarete(chances: ChancesParRarete, hasard: Hasard): Rarete {
  const total = RARETES.reduce((somme, r) => somme + (chances[r] ?? 0), 0);
  let seuil = hasard() * total;
  for (const rarete of RARETES) {
    seuil -= chances[rarete] ?? 0;
    if (seuil < 0) return rarete;
  }
  return RARETES.findLast((r) => (chances[r] ?? 0) > 0) ?? 'Commune';
}

export function tirerFinition(chances: ReglagesDesFinitions['chances'], hasard: Hasard): Finition {
  let seuil = hasard();
  // De la plus rare à la plus courante ; ce qui reste est « Normale ».
  for (const finition of ['Holographique', 'Brillante'] as const) {
    seuil -= chances[finition] ?? 0;
    if (seuil < 0) return finition;
  }
  return 'Normale';
}

// Une carte de la rareté voulue, hors cartes interdites. Si la rareté n'a plus rien à offrir
// (réserve minuscule, beaucoup de cartes masquées), on descend d'une rareté, puis on remonte.
function tirerCarte(reserve: Reserve, rarete: Rarete, interdites: ReadonlySet<string>, hasard: Hasard): CarteIndex | undefined {
  const rang = RARETES.indexOf(rarete);
  const ordre = [rarete, ...RARETES.slice(0, rang).reverse(), ...RARETES.slice(rang + 1)];
  for (const r of ordre) {
    // Une carte Hors-série ne remplace jamais une carte ordinaire : elle ne vient que de son propre tirage.
    if (r === 'Hors-série' && rarete !== 'Hors-série') continue;
    const groupe = reserve[r];
    if (groupe.length === 0) continue;
    // Presque toujours, quelques essais suffisent ; sinon on trie vraiment.
    for (let essai = 0; essai < 8; essai++) {
      const carte = choisir(groupe, hasard);
      if (!interdites.has(carte.id)) return carte;
    }
    const permises = groupe.filter((c) => !interdites.has(c.id));
    if (permises.length > 0) return choisir(permises, hasard);
  }
  return undefined;
}

export type OptionsDOuverture = {
  hasard: Hasard;
  paquetsSansLegendaire: number; // paquets ouverts d'affilée sans Légendaire, avant celui-ci
  exclure?: ReadonlySet<string>; // cartes à ne pas tirer (paquets de départ : celles déjà possédées)
};

// Un seul jet par paquet : d'abord le paquet Hors-série, sinon le paquet Légendaire. Il faut assez de cartes
// différentes pour remplir tout le paquet (le joueur a pu en masquer).
function tirerLException(reserve: Reserve, reglages: ReglagesDesPaquets, hasard: Hasard): PaquetDException | null {
  const jet = hasard();
  const taille = reglages.emplacements.length;
  let seuil = 0;
  for (const rarete of ['Hors-série', 'Légendaire'] as const) {
    seuil += reglages.paquetsDException[rarete];
    if (jet < seuil) return reserve[rarete].length >= taille ? rarete : null;
  }
  return null;
}

// Un paquet d'exception se reconnaît à son contenu : aucun autre paquet ne peut être plein de Légendaires
// holographiques ou de Hors-série (le cadeau de l'achat unique, une seule Hors-série, n'en est pas un).
export function paquetDException(paquet: readonly Pick<CarteTiree, 'carte' | 'finition'>[], taille: number): PaquetDException | null {
  if (paquet.length !== taille || taille < 2) return null;
  if (paquet.every((t) => t.carte.rarete === 'Hors-série')) return 'Hors-série';
  if (paquet.every((t) => t.carte.rarete === 'Légendaire' && t.finition === 'Holographique')) return 'Légendaire';
  return null;
}

export function ouvrirPaquet(reserve: Reserve, options: OptionsDOuverture, reglages: ReglagesDesPaquets, finitions: ReglagesDesFinitions): CarteTiree[] {
  const { hasard } = options;
  const garantie = options.paquetsSansLegendaire + 1 >= reglages.paquetsAvantLegendaireGarantie;
  const interdites = new Set(options.exclure);
  const paquet: CarteTiree[] = [];

  // Le paquet d'exception, jamais parmi les paquets de départ (ceux qui excluent les cartes déjà possédées).
  const exception = options.exclure ? null : tirerLException(reserve, reglages, hasard);
  if (exception) {
    for (let i = 0; i < reglages.emplacements.length; i++) {
      const carte = tirerCarte(reserve, exception, interdites, hasard)!;
      paquet.push({ carte, finition: exception === 'Légendaire' ? 'Holographique' : 'Normale' });
      interdites.add(carte.id);
    }
    return paquet;
  }

  reglages.emplacements.forEach((chances, position) => {
    const dernier = position === reglages.emplacements.length - 1;
    let rarete = tirerRarete(chances, hasard);
    if (dernier) {
      // La garantie de Légendaire passe avant tout ; sinon, une toute petite chance de carte Hors-série.
      if (garantie) rarete = 'Légendaire';
      else if (reserve['Hors-série'].length > 0 && hasard() < reglages.chanceHorsSerie) rarete = 'Hors-série';
    }
    const carte = tirerCarte(reserve, rarete, interdites, hasard);
    if (!carte) return;
    // Les cartes Hors-série ont leur propre impression : elles n'ont pas de finition.
    paquet.push({ carte, finition: carte.rarete === 'Hors-série' ? 'Normale' : tirerFinition(finitions.chances, hasard) });
    interdites.add(carte.id); // jamais deux fois la même carte dans un paquet
  });
  return paquet;
}

export const contientUneLegendaire = (paquet: readonly CarteTiree[]): boolean => paquet.some((t) => t.carte.rarete === 'Légendaire');

// Encre que rapporterait en moyenne un paquet dont toutes les cartes seraient des doublons :
// le maximum de ce qu'un paquet peut rendre. Sert à vérifier que l'économie ne s'emballe pas.
export function encreMaximaleMoyenneParPaquet(reglages: ReglagesDesPaquets, finitions: ReglagesDesFinitions, encreParDoublon: Record<Rarete, number>): number {
  const parCarte = reglages.emplacements.reduce((somme, chances) => {
    const total = RARETES.reduce((s, r) => s + (chances[r] ?? 0), 0);
    return somme + RARETES.reduce((s, r) => s + ((chances[r] ?? 0) / total) * encreParDoublon[r], 0);
  }, 0);
  const brillante = finitions.chances.Brillante ?? 0;
  const holographique = finitions.chances.Holographique ?? 0;
  const multiplicateurMoyen = (1 - brillante - holographique) * finitions.encre.Normale + brillante * finitions.encre.Brillante + holographique * finitions.encre.Holographique;
  const ordinaire = parCarte * multiplicateurMoyen + reglages.chanceHorsSerie * encreParDoublon['Hors-série'];
  // Les paquets d'exception remplacent un paquet ordinaire.
  const { 'Légendaire': legendaire, 'Hors-série': horsSerie } = reglages.paquetsDException;
  const taille = reglages.emplacements.length;
  return (1 - legendaire - horsSerie) * ordinaire
    + legendaire * taille * encreParDoublon['Légendaire'] * finitions.encre.Holographique
    + horsSerie * taille * encreParDoublon['Hors-série'];
}
