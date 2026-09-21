// ─────────────────────────────────────────────────────────────────────────────
// RÉGLAGES DU PIPELINE
// Tout ce qui décide de la fabrication des cartes est ici. Après une modification,
// relancer « npm run pipeline » puis relire data/rapport.md.
// ─────────────────────────────────────────────────────────────────────────────

import type { Nature, Rarete } from '../src/partage/types.ts';

export const CONFIG = {
  // ── Rareté ────────────────────────────────────────────────────────────────
  rarete: {
    // Part de la base dans chaque rareté, de la plus rare à la plus courante.
    parts: [
      ['Légendaire', 0.03],
      ['Épique', 0.07],
      ['Rare', 0.15],
      ['Peu commune', 0.25],
      ['Commune', 0.5],
    ] as [Rarete, number][],
    // La rareté mélange deux mesures. Poids de chacune (leur somme n'a pas besoin de faire 1).
    poidsFrequence: 1, // le mot est-il peu utilisé ?
    poidsPrevalence: 1, // le mot est-il peu connu ?
    // La prévalence n'est prise en compte que si assez de personnes ont été interrogées.
    avisMinimum: 10,
  },

  // ── Définitions ───────────────────────────────────────────────────────────
  definitions: {
    maximumParCarte: 3,
    longueurMaximale: 200, // au-delà, la définition est coupée proprement
    longueurSurLaCarte: 150, // la définition imprimée sur la carte est plus courte que celle de la fiche
    longueurMinimalePourLeDuel: 25, // en dessous, c'est souvent un simple synonyme
  },

  // ── Défense : « richesse du mot » ─────────────────────────────────────────
  richesse: {
    poidsSens: 1,
    poidsSynonymes: 0.5,
    poidsDerives: 0.25,
  },

  // ── Édition ───────────────────────────────────────────────────────────────
  edition: {
    numero: 1,
    taille: 3000,
    // Comment répartir les cartes entre factions :
    //   1   = proportions réelles de la langue (le latin écrase tout)
    //   0   = toutes les factions de la même taille
    //   0.5 = entre les deux (les petites factions sont gonflées)
    exposantFactions: 0.5,
    // Aucune faction ne peut dépasser cette part de l'édition.
    plafondParFaction: 0.35,
    // Part visée pour chaque type de mot. Dans la langue, deux mots sur trois sont des noms ; or le
    // duel repose sur un triangle Nom > Adjectif > Verbe > Nom, qui a besoin des trois. Les adverbes
    // intéressants sont rares (la plupart sont des « -ment » dont la définition contient le mot).
    partsDesTypes: { Nom: 0.5, Adjectif: 0.22, Verbe: 0.22, Adverbe: 0.06 } as Record<Nature, number>,
    // Les notes d'attaque et de défense (1 à 10) sont calculées :
    //   'edition' = entre les cartes de l'édition (les 10 % de cartes les plus fortes du jeu ont 10)
    //   'base'    = entre toutes les cartes possibles (les cartes choisies étant plus riches que la
    //               moyenne, les défenses de l'édition seraient alors presque toutes élevées)
    notesCalculeesSur: 'edition' as 'edition' | 'base',
    // Nombre de fichiers de détails (chargés à la demande par le jeu).
    lots: 16,
    // Note de qualité d'une carte candidate : poids de chaque critère.
    qualite: {
      longueurDefinition: 3, // définition ni trop courte ni trop longue
      prevalenceIdeale: 3, // carte rare : mot « déjà entendu mais mal connu » ; carte commune : mot connu de tous
      saveur: 1, // mot littéraire ou vieilli
      plusieursDefinitions: 1,
      domaineTechnique: -3, // terme de médecine, de chimie, nom d'espèce… souvent terne
      motCompose: -1, // mot à trait d'union
    },
    // Fourchette de prévalence (en %) jugée idéale pour les cartes Rares, Épiques et Légendaires.
    prevalenceIdeale: [10, 60] as [number, number],
    // Domaines jugés trop techniques (étiquettes du Wiktionnaire).
    domainesTechniques: ['medicine', 'chemistry', 'botany', 'zoology', 'ornithology', 'anatomy', 'biology', 'mineralogy', 'entomology', 'ichthyology', 'pharmacology', 'biochemistry', 'mycology', 'pathology', 'geology', 'physics', 'mathematics', 'computing'],
  },
};

// ── Langues d'origine ────────────────────────────────────────────────────────
// Mots-clés cherchés dans le texte d'étymologie. L'ordre n'a pas d'importance : c'est la
// première langue citée dans le texte qui gagne.
// Les motifs sont stricts sur la fin du mot : « grec » ne doit pas reconnaître l'ancien français
// « greche », ni « occitan » la région « Occitanie », ni « mandarin » la mandarine.
export const LANGUES: [string, RegExp][] = [
  ['Latin', /\blatine?s?\b/i],
  ['Grec', /\bgrec(?:que)?s?\b/i],
  ['Arabe', /\barabes?\b/i],
  ['Anglais', /\banglaise?s?\b|\banglo-|\baméricaine?s?\b|\banglicisme/i],
  ['Italien', /\bitalien(?:ne)?s?\b|\bvénitien|\bnapolitain|\bgénois\b|\bsicilien|\btoscan\b|\blombard\b/i],
  ['Espagnol', /\bespagnole?s?\b|\bcastillan/i],
  ['Portugais', /\bportugaise?s?\b/i],
  ['Allemand', /\ballemande?s?\b|\balémanique|\balsacien/i],
  ['Néerlandais', /\bnéerlandaise?s?\b|\bflamande?s?\b/i],
  ['Francique et germanique ancien', /francique|\bgermanique|\bnorrois|\bgotique|\bhaut[- ]allemand|\bsaxon\b|\bburgonde/i],
  ['Gaulois et celtique', /\bgaulois|\bceltique|\bbreton(?:ne)?s?\b|\bgaélique|\birlandais|\bgallois/i],
  ['Occitan', /\boccitane?s?\b|\bprovençal|\bgascon|\blanguedocien|\blimousin\b|\bbéarnais/i],
  ['Parlers régionaux', /\bpicarde?s?\b|\bnormande?s?\b|\bwallon(?:ne)?s?\b|\blorrain\b|\bfranco-?provençal|\bsavoyard|\blyonnais\b|\bchampenois\b|\bpoitevin|\bangevin|\bbourguignon|\bdialect/i],
  ['Onomatopée', /onomatop/i],
  ['Russe et langues slaves', /\brusses?\b|\bslaves?\b|\bpolonais|\btchèque|\bserbe|\bcroate|\bukrainien|\bbulgare/i],
  ['Turc et persan', /\bturcs?\b|\bturque|\bpersan/i],
  ['Hébreu et yiddish', /\bhébreu|\byiddish/i],
  ['Japonais', /\bjaponais/i],
  ['Chinois', /\bchinoise?s?\b|\bmandarin\b|\bcantonais/i],
  ["Langues de l'Inde et d'Asie", /\bsanskrit|\bsanscrit|\bhindi\b|\bourdou|\btamoul|\bmalais\b|\bindonésien|\btibétain|\bcoréen|\bvietnamien|\bthaï\b/i],
  ["Langues d'Amérique", /\bnahuatl|\btupi\b|\bquechua|\barawak|\bcaraïbe|\balgonqui|\binuktitut|\bguarani|\btaïno/i],
  ["Langues d'Afrique", /\bwolof|\bswahili|\bbantou|\bmalgache|\bberbère|\bbambara|\blingala/i],
  ['Langues scandinaves', /\bsuédois|\bdanois\b|\bnorvégien|\bislandais|\bscandinave/i],
  ['Autres langues', /\bbasque\b|\bcatalan|\bhongrois|\bfinnois|\broumain|\bromani\b|\btsigane|\bcréole|\bhawaïen|\btahitien|\bpolynésien/i],
];

// L'ancien français n'est qu'une étape : si l'étymologie cite une langue plus lointaine, c'est elle qui compte.
export const ANCIEN_FRANCAIS = /\bancien français|\bmoyen français|\bancien occitan/i;

// ── Des langues aux factions du jeu ──────────────────────────────────────────
// Découpage retenu par défaut. D'autres découpages sont chiffrés dans le rapport.
export const LANGUES_D_AILLEURS = "Langues d'ailleurs";

export const FACTION_PAR_LANGUE: Record<string, string> = {
  'Latin': 'Latin',
  'Grec': 'Grec',
  'Anglais': 'Anglais',
  'Italien': 'Italien',
  'Espagnol': 'Espagnol et portugais',
  'Portugais': 'Espagnol et portugais',
  'Allemand': 'Allemand et néerlandais',
  'Néerlandais': 'Allemand et néerlandais',
  'Francique et germanique ancien': 'Francique',
  'Gaulois et celtique': 'Gaulois',
  'Occitan': 'Occitan',
  'Arabe': 'Arabe',
  'Onomatopée': 'Onomatopée',
  'Ancien français': 'Vieux français',
  'Parlers régionaux': 'Vieux français',
  // Toutes les autres langues reconnues vont dans « Langues d'ailleurs ».
};

// Résultats qui ne sont pas de vraies origines : ces mots ne peuvent pas entrer dans une édition.
export const FORMATION_FRANCAISE = 'Formation française';
export const ORIGINE_INCONNUE = 'Origine inconnue';

export const FACTIONS = new Set([...Object.values(FACTION_PAR_LANGUE), LANGUES_D_AILLEURS]);

export function factionDeLaLangue(langue: string): string {
  if (langue === FORMATION_FRANCAISE || langue === ORIGINE_INCONNUE) return langue;
  // Dans data/corrections-factions.txt, Raphaël peut écrire directement le nom d'une faction.
  return FACTION_PAR_LANGUE[langue] ?? (FACTIONS.has(langue) ? langue : LANGUES_D_AILLEURS);
}

// Une correction manuelle est valable si elle nomme une langue détectable ou une faction du jeu.
export function estUneOrigineConnue(nom: string): boolean {
  return FACTIONS.has(nom) || nom === 'Ancien français' || LANGUES.some(([langue]) => langue === nom);
}
