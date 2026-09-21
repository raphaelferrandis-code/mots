// Étape 5 bis — Hors-série : le rang ultime. Ce sont les mots qui détiennent un record, trouvés
// automatiquement dans les données (le plus long mot, le plus long palindrome, le plus vieux mot daté…),
// plus ceux que Raphaël ajoute à la main dans data/hors-serie.txt. Chaque carte porte son titre.

import { sansAccents } from '../../src/partage/lettres.ts';
import type { CarteComplete } from './cartes.ts';

type Concours = {
  // Les mots qui peuvent concourir, et leur performance (la plus haute gagne).
  candidat: (c: CarteComplete) => boolean;
  performance: (c: CarteComplete) => number;
  titre: (c: CarteComplete) => string;
};

const lettres = (c: CarteComplete): string => sansAccents(c.index.mot).replace(/[^a-z]/g, '');
const estSimple = (c: CarteComplete): boolean => !c.index.mot.includes('-');
const estUnPalindrome = (c: CarteComplete): boolean => { const l = lettres(c); return l.length >= 5 && l === [...l].reverse().join(''); };
const virgule = (n: number): string => String(n).replace('.', ',');

const CONCOURS: Concours[] = [
  { candidat: estSimple, performance: (c) => lettres(c).length, titre: (c) => `Le plus long mot de la langue · ${lettres(c).length} lettres` },
  { candidat: (c) => estSimple(c) && estUnPalindrome(c), performance: (c) => lettres(c).length, titre: () => 'Le plus long palindrome · il se lit dans les deux sens' },
  // (Le plus vieux mot daté n'est pas un concours : cinq mots sont à égalité en 842. Raphaël a choisi « amour » dans data/hors-serie.txt.)
  { candidat: () => true, performance: (c) => c.nombreDeSens, titre: (c) => `Le mot aux sens les plus nombreux · ${c.nombreDeSens} sens` },
  { candidat: () => true, performance: (c) => c.derives, titre: (c) => `La plus grande famille · ${c.derives.toLocaleString('fr-FR')} mots dérivés` },
  { candidat: () => true, performance: (c) => c.synonymes, titre: (c) => `Le mot aux synonymes les plus nombreux · ${c.synonymes}` },
  { candidat: () => true, performance: (c) => c.details.frequence, titre: () => 'Le mot le plus employé de la langue' },
  { candidat: estSimple, performance: (c) => c.valeurLettres, titre: (c) => `Les lettres les plus chères · ${c.valeurLettres} points` },
  { candidat: (c) => estSimple(c) && lettres(c).length >= 4, performance: (c) => c.valeurLettres / lettres(c).length, titre: (c) => `La plus forte valeur par lettre · ${virgule(Math.round((c.valeurLettres / lettres(c).length) * 10) / 10)} points en moyenne` },
  { candidat: (c) => estSimple(c) && [...'aeiou'].every((v) => lettres(c).includes(v)), performance: (c) => -lettres(c).length, titre: (c) => `Les cinq voyelles en ${lettres(c).length} lettres seulement` },
  { candidat: (c) => estSimple(c) && new Set(lettres(c)).size === lettres(c).length, performance: (c) => lettres(c).length, titre: (c) => `Le plus long mot sans lettre répétée · ${lettres(c).length} lettres` },
  { candidat: (c) => !estSimple(c), performance: (c) => lettres(c).length, titre: (c) => `Le plus long mot composé · ${lettres(c).length} lettres` },
  { candidat: (c) => c.prevalenceMesuree, performance: (c) => -(c.details.prevalence as number), titre: (c) => `Le mot que presque personne ne connaît · connu de ${c.details.prevalence} % des gens` },
];

export type Records = {
  titres: Map<string, string>; // identifiant de carte → titre du record
  introuvables: string[]; // mots de la liste manuelle absents de la base
};

export function trouverLesRecords(cartes: CarteComplete[], manuels: Map<string, string>): Records {
  const titres = new Map<string, string>();
  const introuvables: string[] = [];

  // La liste de Raphaël passe d'abord : elle peut aussi réserver un mot avant qu'un concours ne l'attribue.
  for (const [mot, titre] of manuels) {
    const trouvees = cartes.filter((c) => c.index.mot === mot);
    if (trouvees.length === 0) { introuvables.push(mot); continue; }
    // Un mot qui existe sous plusieurs natures (« sourire ») : on garde la plus courante.
    const carte = trouvees.reduce((a, b) => (b.details.frequence > a.details.frequence ? b : a));
    titres.set(carte.index.id, titre);
  }

  const dejaPris = new Set([...titres.keys()].map((id) => cartes.find((c) => c.index.id === id)!.index.mot));
  for (const concours of CONCOURS) {
    const classement = cartes
      // Un record est une vitrine : pas de mot injurieux, et un mot ne détient qu'un seul record.
      .filter((c) => concours.candidat(c) && !c.index.registre.includes('Injurieux') && !dejaPris.has(c.index.mot))
      // À performance égale, le mot le plus employé l'emporte : c'est celui que le joueur reconnaîtra.
      .sort((a, b) => concours.performance(b) - concours.performance(a) || b.details.frequence - a.details.frequence || a.index.id.localeCompare(b.index.id));
    const gagnante = classement[0];
    if (!gagnante) continue;
    titres.set(gagnante.index.id, concours.titre(gagnante));
    dejaPris.add(gagnante.index.mot);
  }
  return { titres, introuvables };
}
