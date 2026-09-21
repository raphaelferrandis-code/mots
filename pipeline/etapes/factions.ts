// Étape 3 — Origine des mots : de quelle langue vient chaque mot, et donc à quelle faction il appartient.
//
// 1. On lit le début de l'étymologie : « Du latin… », « De l'anglais… » → la langue est trouvée.
// 2. Sinon le mot est construit à partir d'un autre mot français (« Dérivé de danser… ») :
//    il hérite de l'origine de ce mot, sur deux niveaux au plus (dansotter → danseur → danser).
// 3. À défaut, on utilise le mot d'origine indiqué par Lexique.
//
// La détection se trompe parfois (homonymes, étymologies discutées). Raphaël peut corriger un mot
// à la main dans data/corrections-factions.txt.

import { ANCIEN_FRANCAIS, FORMATION_FRANCAISE, LANGUES, ORIGINE_INCONNUE, factionDeLaLangue } from '../config.ts';

export type Piste =
  | { type: 'langue'; langue: string }
  | { type: 'derive'; candidats: string[]; repli: string | null }
  | { type: 'inconnue' };

export type Origine = {
  langue: string;
  faction: string;
  reconnue: boolean; // faux pour « Formation française » et « Origine inconnue »
  via: string | null; // mot dont l'origine a été héritée
};

const ETYMOLOGIE_VIDE = /manquante ou incomplète/i;
const OUVERTURE = 45; // pour être l'origine directe, la langue doit être citée dès le début du texte
const PORTEE = 160;
const NIVEAUX_D_HERITAGE = 2;

// Un mot tiré d'un nom propre ou d'une marque n'a pas de langue d'origine exploitable.
const NOM_PROPRE = /^(?:du |de |d[’'])?(?:le )?nom\b|marque (?:déposée|commerciale)|nom de marque|\bantonomase\b/i;
// Une langue citée pour comparaison n'est pas une origine : « apparenté à l'espagnol… ».
const COMPARAISON = /apparent|compar|rapproch|\bcf\b|cognat|influenc|analog|toutefois|aurait|selon |peut-être|pourrait|à l[’']instar|de même que|tandis que|le modèle/i;
// Loin du début du texte, une langue ne compte que si elle est introduite comme une origine : « …, du latin… ».
const INTRODUIT_UNE_ORIGINE = /(?:\bdu|\bde l[’']|\bde la|\bdes|\bau|\bà l[’']|\bd[’'])\s*(?:(?:bas|haut|moyen|vieux|vieil|ancien)[\s-]+)*$/i;

const OUVREURS = new Set(['de', 'du', 'des', 'd', 'dérivé', 'dérivée', 'composé', 'composée', 'déverbal', 'dénominal', 'apocope', 'aphérèse', 'abréviation', 'participe', 'substantivation', 'adjectivation', 'diminutif', 'féminin', 'variante', 'altération', 'contraction', 'redoublement', 'réduplication', '→', 'voir', 'voyez', 'même']);
const MOTS_VIDES = new Set([...OUVREURS, 'l', 'la', 'le', 'les', 'un', 'une', 'et', 'avec', 'sur', 'par', 'sans', 'au', 'aux', 'à', 'mot', 'verbe', 'nom', 'adjectif', 'adverbe', 'substantif', 'passé', 'présent', 'substantivé', 'adjectivé', 'masculin', 'forme', 'suffixe', 'préfixe', 'radical', 'que', 'ancien', 'français']);

export function preparerEtymologie(texte: string): string {
  return texte
    .replace(/^[\s,;:.]+/, '') // ponctuation parasite en tête
    .replace(/^(?:\([^)]*\)\s*[:,.;]?\s*)+/, '') // parenthèses initiales : « (Adjectif) De l'anglais… »
    .replace(/^(?:Mot|Verbe|Nom|Adjectif|Adverbe)\s*(?=dérivé|composé)/i, '') // résidu de l'extraction : « Motdérivé de »
    .trim();
}

function clauseAvant(texte: string, position: number): string {
  const debut = Math.max(texte.lastIndexOf('.', position - 1), texte.lastIndexOf(';', position - 1)) + 1;
  return texte.slice(debut, position);
}

const MOTIFS_DES_LANGUES: [string, RegExp][] = LANGUES.map(([langue, motif]) => [langue, new RegExp(motif.source, 'gi')]);

// Première langue citée dans le segment. « exigeante » : la langue doit être introduite comme une origine.
function premiereLangue(texte: string, fin: number, exigeante: boolean): string | null {
  const trouvailles: [number, string][] = [];
  for (const [langue, motif] of MOTIFS_DES_LANGUES) {
    motif.lastIndex = 0;
    for (let t = motif.exec(texte); t && t.index < fin; t = motif.exec(texte)) trouvailles.push([t.index, langue]);
  }
  trouvailles.sort((a, b) => a[0] - b[0]);
  for (const [position, langue] of trouvailles) {
    if (COMPARAISON.test(clauseAvant(texte, position))) continue;
    if (exigeante && !INTRODUIT_UNE_ORIGINE.test(texte.slice(Math.max(0, position - 30), position))) continue;
    return langue;
  }
  return null;
}

// Le ou les mots français dont celui-ci est tiré : « Dérivé de danser, avec… » → danser ; « De re- et nommer » → nommer.
function motsCandidats(texte: string): string[] {
  const jetons = texte.split(/[\s’']+/).slice(0, 10);
  if (!OUVREURS.has(jetons[0].toLowerCase().replace(/[.,;:]+$/, ''))) return [];
  const candidats: string[] = [];
  for (const brut of jetons) {
    const jeton = brut.replace(/^[«»"“”([*]+|[.,;:«»"“”)\]*]+$/g, '').toLowerCase();
    const estUnAffixe = jeton.startsWith('-') || jeton.endsWith('-');
    if (jeton.length >= 2 && !MOTS_VIDES.has(jeton) && !estUnAffixe) {
      if (!/^[a-zàâäéèêëîïôöùûüçœæ-]+$/.test(jeton)) break; // mot étranger, graphie non latine : on s'arrête
      candidats.push(jeton);
      if (candidats.length === 2) break;
    }
    // La proposition s'arrête à la première ponctuation : ce qui suit n'est plus le mot d'origine.
    if (/[.,;:()]$/.test(brut) && (candidats.length > 0 || !estUnAffixe)) break;
  }
  return candidats;
}

export function analyserEtymologie(texteBrut: string): Piste {
  if (!texteBrut || ETYMOLOGIE_VIDE.test(texteBrut)) return { type: 'inconnue' };
  const texte = preparerEtymologie(texteBrut);
  if (!texte) return { type: 'inconnue' };

  const langueDOuverture = premiereLangue(texte, OUVERTURE, false);
  if (langueDOuverture) return { type: 'langue', langue: langueDOuverture };

  const langueLointaine = premiereLangue(texte, PORTEE, true);
  const passeParLAncienFrancais = ANCIEN_FRANCAIS.test(texte.slice(0, OUVERTURE));
  if (passeParLAncienFrancais && langueLointaine) return { type: 'langue', langue: langueLointaine };
  if (NOM_PROPRE.test(texte.slice(0, PORTEE))) return langueLointaine ? { type: 'langue', langue: langueLointaine } : { type: 'inconnue' };

  // « En ancien français mespriser, dérivé de priser… » : le mot d'origine est cité plus loin.
  const deriveCite = /dérivée? d(?:e |u |[’'])(?:l[’'])?([a-zàâäéèêëîïôöùûüçœæ-]{2,})/i.exec(texte.slice(0, PORTEE));
  const candidats = passeParLAncienFrancais ? (deriveCite ? [deriveCite[1].toLowerCase()] : []) : motsCandidats(texte);
  const repli = langueLointaine ?? (passeParLAncienFrancais ? 'Ancien français' : null);
  if (candidats.length) return { type: 'derive', candidats, repli };
  if (repli) return { type: 'langue', langue: repli };
  if (ANCIEN_FRANCAIS.test(texte.slice(0, PORTEE))) return { type: 'langue', langue: 'Ancien français' };
  return { type: 'inconnue' };
}

export type MotAOrigine = { cle: string; mot: string; etymologies: string[]; base: string };

export function resoudreOrigines(mots: MotAOrigine[], corrections: Map<string, string> = new Map()): Map<string, Origine> {
  const pistes = new Map<string, Piste>();
  const clesParMot = new Map<string, string[]>();
  for (const m of mots) {
    // Homographes : la première étymologie exploitable l'emporte.
    let piste: Piste = { type: 'inconnue' };
    for (const etymologie of m.etymologies) {
      piste = analyserEtymologie(etymologie);
      if (piste.type !== 'inconnue') break;
    }
    const correction = corrections.get(m.mot);
    pistes.set(m.cle, correction ? { type: 'langue', langue: correction } : piste);
    clesParMot.set(m.mot, [...(clesParMot.get(m.mot) ?? []), m.cle]);
  }
  const parCle = new Map(mots.map((m) => [m.cle, m]));

  const langueDe = (cle: string, niveau: number): { langue: string; via: string | null } | null => {
    const piste = pistes.get(cle)!;
    if (piste.type === 'langue') return { langue: piste.langue, via: null };
    if (niveau >= NIVEAUX_D_HERITAGE) return null;

    const mot = parCle.get(cle)!;
    const parents = [...(piste.type === 'derive' ? piste.candidats : []), mot.base].filter((p) => p && p !== mot.mot);
    for (const parent of parents) {
      for (const cleParent of clesParMot.get(parent) ?? []) {
        const trouve = langueDe(cleParent, niveau + 1);
        if (trouve) return { langue: trouve.langue, via: parent };
      }
    }
    if (piste.type === 'derive' && piste.repli) return { langue: piste.repli, via: null };
    return null;
  };

  const origines = new Map<string, Origine>();
  for (const m of mots) {
    const trouve = langueDe(m.cle, 0);
    const langue = trouve?.langue ?? (pistes.get(m.cle)!.type === 'derive' ? FORMATION_FRANCAISE : ORIGINE_INCONNUE);
    origines.set(m.cle, { langue, faction: factionDeLaLangue(langue), reconnue: Boolean(trouve), via: trouve?.via ?? null });
  }
  return origines;
}
