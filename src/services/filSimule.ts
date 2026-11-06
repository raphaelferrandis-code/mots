// Les joueurs simulés dans le fil d'activité de l'accueil (décision de Raphaël du 06/11/2026) : tant qu'il y a peu de
// monde, leurs trouvailles et leurs victoires en joute se mêlent à celles des vrais joueurs, sans mention dans le fil
// (les Conditions d'utilisation le disent). Jamais d'arrivée : on n'invente pas de nouveaux venus. Leurs victoires ne
// donnent pas de cote, celle des joueurs simulés ne bouge pas au classement.
// Le rythme d'un vrai jeu : davantage le soir, presque rien la nuit (heure de Paris). Le même hasard pour tous : chaque
// tranche de dix minutes tire ses événements de son numéro, si bien que deux visiteurs voient le même fil et qu'un
// rechargement ne le change pas. Les pseudonymes sont ceux des joueurs maison installés sur le serveur.

import { fabriquerLesJoueursMaison } from '../jeu/joueursMaison.ts';
import { hasardReproductible } from '../jeu/hasard.ts';
import type { Hasard } from '../jeu/hasard.ts';
import type { CarteIndex, Rarete } from '../partage/types.ts';
import type { EvenementDuFil } from './activite.ts';

const TRANCHE = 10 * 60_000;
// Les événements par heure, selon l'heure de Paris (de minuit à 23 h).
export const RYTHME_PAR_HEURE = [1.5, 0.5, 0.2, 0.2, 0.2, 0.2, 0.2, 1, 2, 2, 2, 2, 3, 3, 2.5, 2.5, 2.5, 2.5, 5, 5, 5, 5, 5, 3];
const PART_DES_TROUVAILLES = 0.6; // le reste : des victoires en joute
const PART_DES_LEGENDAIRES = 0.7; // parmi les trouvailles ; le reste : une finition holographique
const HOLOGRAPHIQUES: [Rarete, number][] = [['Commune', 40], ['Peu commune', 30], ['Rare', 20], ['Épique', 10]];

const heureAParis = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: 'numeric', hourCycle: 'h23' });
// (« formatToParts » : en français, l'heure seule s'écrit « 04 h ».)
const heureDe = (instant: number): number => Number(heureAParis.formatToParts(instant).find((p) => p.type === 'hour')?.value ?? 0) % 24;

// Les joueurs maison et les timbres à trouver, fabriqués une fois par édition.
const prepares = new WeakMap<readonly CarteIndex[], { pseudos: string[]; parRarete: Map<Rarete, CarteIndex[]> }>();
function preparer(cartes: readonly CarteIndex[]) {
  let p = prepares.get(cartes);
  if (!p) {
    // Les mots familiers ou injurieux restent hors du fil simulé : l'accueil est la vitrine du jeu.
    const sages = cartes.filter((c) => c.registre.length === 0);
    p = {
      pseudos: fabriquerLesJoueursMaison(cartes).map((j) => j.pseudo),
      parRarete: new Map(['Légendaire', ...HOLOGRAPHIQUES.map(([r]) => r)].map((r) => [r as Rarete, sages.filter((c) => c.rarete === r)])),
    };
    prepares.set(cartes, p);
  }
  return p;
}

function rareteHolographique(hasard: Hasard): Rarete {
  let tirage = hasard() * 100;
  for (const [rarete, part] of HOLOGRAPHIQUES) if ((tirage -= part) < 0) return rarete;
  return 'Commune';
}

// Les événements simulés des dernières heures, du plus récent au plus ancien.
export function evenementsSimules(maintenant: number, cartes: readonly CarteIndex[], heures = 12): EvenementDuFil[] {
  const { pseudos, parRarete } = preparer(cartes);
  if (pseudos.length === 0) return [];
  const evenements: EvenementDuFil[] = [];
  const derniere = Math.floor(maintenant / TRANCHE);
  for (let tranche = derniere; tranche > derniere - (heures * 60_000 * 60) / TRANCHE; tranche--) {
    const debut = tranche * TRANCHE;
    const hasard = hasardReproductible(Math.imul(tranche, 2654435761) ^ 0x5eed);
    if (hasard() >= RYTHME_PAR_HEURE[heureDe(debut)] / 6) continue;
    const le = debut + Math.floor(hasard() * TRANCHE);
    if (le > maintenant) continue;
    // Des habitués : les premiers joueurs maison reviennent plus souvent que les autres.
    const pseudo = pseudos[Math.floor(hasard() ** 2 * pseudos.length)];
    if (hasard() >= PART_DES_TROUVAILLES) {
      evenements.push({ genre: 'victoire', pseudo, mot: null, rarete: null, finition: null, cote: null, le });
      continue;
    }
    const legendaire = hasard() < PART_DES_LEGENDAIRES;
    const rarete: Rarete = legendaire ? 'Légendaire' : rareteHolographique(hasard);
    const candidates = parRarete.get(rarete) ?? [];
    if (candidates.length === 0) continue;
    const carte = candidates[Math.floor(hasard() * candidates.length)];
    evenements.push({ genre: 'trouvaille', pseudo, mot: carte.mot, rarete, finition: legendaire ? 'Normale' : 'Holographique', cote: null, le });
  }
  return evenements;
}
