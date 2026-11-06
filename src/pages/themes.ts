// Les listes par thème (/mots/<adresse>/) : les mots du jeu regroupés selon ce que seules ses données disent — leur
// origine (la faction du timbre), la part des gens qui les connaissent (Lexique 4) et les records de l'édition.
// Décision de Raphaël du 06/11/2026, pour que Google trouve sur Philamots ce que les dictionnaires n'ont pas.
// Fonctions pures, testées par themes.test.ts ; les pages sont fabriquées par scripts/fabriquer-les-pages.ts.

import { RARETES } from '../partage/types.ts';
import type { CarteDetails, CarteIndex } from '../partage/types.ts';

export type MotDuTheme = { carte: CarteIndex; prevalence: number | null; frequence: number; langue: string };
// Un palier sans titre : la liste se lit d'un trait (les mots rares, les records).
export type Palier = { titre: string; mots: MotDuTheme[] };
export type Theme = {
  adresse: string; // la page vit dans mots/<adresse>/
  titre: string; // le grand titre de la page
  titreGoogle: string; // celui de l'onglet et des résultats de recherche
  description: string;
  chapeau: string; // la phrase sous le titre, tirée des chiffres
  genre: 'origine' | 'rares' | 'records';
  montrerLangue: boolean; // la langue de chaque mot, quand la liste en mêle plusieurs (« venus d'ailleurs »)
  paliers: Palier[];
  nombre: number;
};
export type Liste = { adresse: string; titre: string };

// Une page par faction (l'origine portée par le cachet du timbre). « venus » : la phrase du chapeau.
const ORIGINES: Record<string, { adresse: string; titre: string; recherche: string; venus: string }> = {
  Latin: { adresse: 'origine-latine', titre: 'Les mots venus du latin', recherche: 'Mots d’origine latine', venus: 'viennent du latin' },
  'Vieux français': { adresse: 'ancien-francais', titre: 'Les mots nés en ancien français', recherche: 'Mots nés en ancien français', venus: 'sont nés en ancien français' },
  Anglais: { adresse: 'origine-anglaise', titre: 'Les mots venus de l’anglais', recherche: 'Mots d’origine anglaise', venus: 'viennent de l’anglais' },
  Grec: { adresse: 'origine-grecque', titre: 'Les mots venus du grec', recherche: 'Mots d’origine grecque', venus: 'viennent du grec' },
  Italien: { adresse: 'origine-italienne', titre: 'Les mots venus de l’italien', recherche: 'Mots d’origine italienne', venus: 'viennent de l’italien' },
  Francique: { adresse: 'origine-francique', titre: 'Les mots venus du francique', recherche: 'Mots d’origine francique', venus: 'viennent du francique, la langue des Francs' },
  'Allemand et néerlandais': { adresse: 'origine-allemande-et-neerlandaise', titre: 'Les mots venus de l’allemand et du néerlandais', recherche: 'Mots d’origine allemande et néerlandaise', venus: 'viennent de l’allemand ou du néerlandais' },
  "Langues d'ailleurs": { adresse: 'venus-d-ailleurs', titre: 'Les mots venus d’ailleurs', recherche: 'Mots venus du turc, du russe, du japonais…', venus: 'viennent de langues plus lointaines' },
  'Espagnol et portugais': { adresse: 'origine-espagnole-et-portugaise', titre: 'Les mots venus de l’espagnol et du portugais', recherche: 'Mots d’origine espagnole et portugaise', venus: 'viennent de l’espagnol ou du portugais' },
  Occitan: { adresse: 'origine-occitane', titre: 'Les mots venus de l’occitan', recherche: 'Mots d’origine occitane', venus: 'viennent de l’occitan' },
  Arabe: { adresse: 'origine-arabe', titre: 'Les mots venus de l’arabe', recherche: 'Mots d’origine arabe', venus: 'viennent de l’arabe' },
  Onomatopée: { adresse: 'onomatopees', titre: 'Les mots nés d’un bruit', recherche: 'Onomatopées', venus: 'sont nés d’un bruit' },
  Gaulois: { adresse: 'origine-gauloise', titre: 'Les mots venus du gaulois', recherche: 'Mots d’origine gauloise', venus: 'viennent du gaulois' },
};

// Une origine sûre : la langue est nommée dès la première phrase de l'étymologie (« De l’arabe… »), ou le mot vient
// d'un autre mot de la même origine, lui-même sûr (« Dérivé de goudron »). Le jeu range « accabler » parmi les mots
// arabes parce que le Wiktionnaire cite, plus loin, une hypothèse arabe : une liste « venus de l'arabe » ne le montre pas.
const LANGUES: Record<string, RegExp> = {
  Latin: /latin/i,
  'Vieux français': /ancien français|moyen français|vieux français|picard|normand|wallon|champenois|lorrain|bourguignon|dialect|régional|patois/i,
  Anglais: /anglais/i,
  Grec: /grec/i,
  Italien: /italien|vénitien|toscan|napolitain|génois|lombard|milanais|sicilien|piémontais/i,
  Francique: /francique|germanique|gotique|haut allemand|bas francique|norrois|frison|saxon/i,
  'Allemand et néerlandais': /allemand|néerlandais|flamand|hollandais|alsacien|yiddish/i,
  "Langues d'ailleurs": /turc|persan|ottoman|russe|slave|polonais|tchèque|hongrois|roumain|serbe|croate|japonais|chinois|coréen|vietnamien|mongol|tibétain|hindi|hindoustani|sanskrit|tamoul|bengali|malais|javanais|tagalog|polynésien|tahitien|maori|nahuatl|aztèque|quechua|tupi|guarani|caraïbe|taïno|algonquin|inuit|amérindien|africain|bantou|wolof|swahili|malgache|hébreu|yiddish|araméen|arménien|géorgien|scandinave|suédois|norvégien|danois|islandais|finnois|basque|tsigane|romani/i,
  'Espagnol et portugais': /espagnol|castillan|portugais|catalan|galicien/i,
  Occitan: /occitan|provençal|languedocien|gascon|limousin|auvergnat|niçois|béarnais/i,
  Arabe: /arabe/i,
  Onomatopée: /onomatop|imitation|imitatif|expressif|bruit|cri/i,
  Gaulois: /gaulois|celtique|celte|breton|gaélique|irlandais|gallois/i,
};
// La première phrase de l'étymologie, sans l'étiquette « (Verbe 1) » des mots à plusieurs entrées.
const premierePhrase = (etymologie: string): string => etymologie.trim().replace(/^\([^)]*\)\s*/, '').split(/(?<=[.;])\s/)[0] ?? '';
// Les mots dont celui-ci est tiré (« Dérivé de barre », « Participe passé de achever », « Composé de anti- et de choc »).
function basesNommees(etymologie: string): string[] {
  const phrase = premierePhrase(etymologie);
  if (!/^(?:dérivé|composé|déverbal|dénominal|participe|féminin|diminutif|variante|forme|apocope|aphérèse|abréviation|contraction|nominalisation|substantivation)/i.test(phrase)) return [];
  return [...phrase.matchAll(/\b(?:de|d’|d')\s*(\p{L}[\p{L}-]*)/gu)].map((m) => m[1].toLowerCase());
}

export function originesSures(cartes: readonly CarteIndex[], detailsDe: (id: string) => CarteDetails): Set<string> {
  const parMot = new Map<string, CarteIndex[]>();
  for (const c of cartes) parMot.set(c.mot.toLowerCase(), [...(parMot.get(c.mot.toLowerCase()) ?? []), c]);
  const verdicts = new Map<string, boolean>();
  const sure = (carte: CarteIndex, chemin: ReadonlySet<string>): boolean => {
    const connu = verdicts.get(carte.id);
    if (connu !== undefined) return connu;
    const etymologie = detailsDe(carte.id).etymologie ?? '';
    let verdict = LANGUES[carte.faction]?.test(premierePhrase(etymologie)) ?? false;
    if (!verdict && chemin.size < 4) {
      const suite = new Set([...chemin, carte.id]);
      verdict = basesNommees(etymologie).some((base) => (parMot.get(base) ?? [])
        .some((autre) => autre.faction === carte.faction && !suite.has(autre.id) && sure(autre, suite)));
    }
    if (chemin.size === 0) verdicts.set(carte.id, verdict); // un verdict pris à mi-chemin dépend du chemin : on ne le garde pas
    return verdict;
  };
  return new Set(cartes.filter((c) => sure(c, new Set())).map((c) => c.id));
}

export const SEUIL_DES_MOTS_RARES = 20; // connus de moins d'une personne sur cinq
const RARES: Liste = { adresse: 'mots-rares', titre: 'Les mots que presque personne ne connaît' };
const RECORDS: Liste = { adresse: 'records', titre: 'Les records de la langue française' };

const alphabetique = (a: MotDuTheme, b: MotDuTheme): number => a.carte.mot.localeCompare(b.carte.mot, 'fr');
const estRare = (prevalence: number | null): boolean => prevalence !== null && prevalence < SEUIL_DES_MOTS_RARES;

// Les listes où figure chaque mot, pour le lien « Dans les listes » de sa page : son origine, puis les mots rares et
// les records.
export function listesParMot(themes: readonly Theme[]): Map<string, Liste[]> {
  const ordre: Theme['genre'][] = ['origine', 'rares', 'records'];
  const listes = new Map<string, Liste[]>();
  for (const theme of [...themes].sort((a, b) => ordre.indexOf(a.genre) - ordre.indexOf(b.genre))) {
    for (const m of theme.paliers.flatMap((p) => p.mots)) {
      listes.set(m.carte.id, [...(listes.get(m.carte.id) ?? []), { adresse: theme.adresse, titre: theme.titre }]);
    }
  }
  return listes;
}

// Du plus connu au moins connu, en trois paliers (et les mots que Lexique 4 n'a pas mesurés, à part).
function paliersDeNotoriete(mots: MotDuTheme[]): Palier[] {
  const entre = (min: number, max: number) => mots.filter((m) => m.prevalence !== null && m.prevalence >= min && m.prevalence < max);
  return [
    { titre: 'Connus de presque tous', mots: entre(80, Infinity) },
    { titre: 'Connus d’une partie des gens', mots: entre(40, 80) },
    { titre: 'Connus de peu de gens', mots: entre(-Infinity, 40) },
    { titre: 'Non mesurés', mots: mots.filter((m) => m.prevalence === null) },
  ].filter((p) => p.mots.length > 0).map((p) => ({ ...p, mots: p.mots.sort(alphabetique) }));
}

// Le plus connu (à notoriété égale, le plus employé) et le moins connu des mots mesurés.
function extremes(mots: MotDuTheme[]): { plusConnu: MotDuTheme; moinsConnu: MotDuTheme } | null {
  const mesures = mots.filter((m) => m.prevalence !== null);
  if (mesures.length === 0) return null;
  const tries = [...mesures].sort((a, b) => b.prevalence! - a.prevalence! || b.frequence - a.frequence || alphabetique(a, b));
  return { plusConnu: tries[0], moinsConnu: tries[tries.length - 1] };
}

const nombreEnClair = (n: number): string => n.toLocaleString('fr-FR');
// « de « hasard » », mais « d’« alcool » » (pas d'élision devant un h : « hasard » l'a aspiré).
const deMot = (mot: string): string => `${/^[aeiouyàâéèêëîïôûü]/i.test(mot) ? 'd’' : 'de '}« ${mot} »`;

export function themesDeLEdition(cartes: readonly CarteIndex[], detailsDe: (id: string) => CarteDetails): Theme[] {
  const mots: MotDuTheme[] = cartes.map((carte) => {
    const d = detailsDe(carte.id);
    return { carte, prevalence: d.prevalence, frequence: d.frequence, langue: d.langueOrigine };
  });

  const records = mots.filter((m) => m.carte.rarete === 'Hors-série').sort(alphabetique);
  const rares = mots.filter((m) => estRare(m.prevalence)).sort((a, b) => a.prevalence! - b.prevalence! || alphabetique(a, b));
  const themes: Theme[] = [];
  if (records.length > 0) themes.push({
    ...RECORDS,
    titreGoogle: 'Records des mots français : le plus long, le plus vieux… — Philamots',
    description: `Le plus long mot, le plus vieux mot daté, le plus long palindrome… Les ${records.length} records de la langue française, avec leur définition.`,
    chapeau: `${records.length} mots du jeu détiennent un record : ce sont les timbres Hors-série.`,
    genre: 'records', montrerLangue: false, paliers: [{ titre: '', mots: records }], nombre: records.length,
  });
  if (rares.length > 0) {
    const plusRare = rares[0];
    themes.push({
      ...RARES,
      titreGoogle: `Mots rares : ${rares.length} mots que presque personne ne connaît — Philamots`,
      description: `${rares.length} mots français connus de moins d’une personne sur cinq, ${deMot(plusRare.carte.mot)} à « ${rares[rares.length - 1].carte.mot} », avec leur définition.`,
      chapeau: `Ces ${rares.length} mots du jeu sont connus de moins d’une personne sur cinq. Le moins connu : ${plusRare.carte.mot}, connu de ${plusRare.prevalence} % des gens interrogés.`,
      genre: 'rares', montrerLangue: false, paliers: [{ titre: '', mots: rares }], nombre: rares.length,
    });
  }

  const sures = originesSures(cartes, detailsDe);
  const origines = Object.entries(ORIGINES)
    .map(([faction, origine]) => ({ origine, mots: mots.filter((m) => m.carte.faction === faction && sures.has(m.carte.id)) }))
    .filter((o) => o.mots.length > 0)
    .sort((a, b) => b.mots.length - a.mots.length);
  for (const { origine, mots: deLOrigine } of origines) {
    const n = deLOrigine.length;
    const bornes = extremes(deLOrigine);
    themes.push({
      adresse: origine.adresse,
      titre: origine.titre,
      titreGoogle: `${origine.recherche} : ${nombreEnClair(n)} mots et leur sens — Philamots`,
      description: bornes
        ? `${origine.titre} : ${nombreEnClair(n)} mots, ${deMot(bornes.plusConnu.carte.mot)} à « ${bornes.moinsConnu.carte.mot} », avec leur sens et la part des gens qui les connaissent.`
        : `${origine.titre} : ${nombreEnClair(n)} mots, avec leur sens.`,
      chapeau: `Ces ${nombreEnClair(n)} mots du jeu ${origine.venus}.${bornes ? ` Le plus connu : ${bornes.plusConnu.carte.mot} ; le moins connu : ${bornes.moinsConnu.carte.mot}, connu de ${bornes.moinsConnu.prevalence} % des gens interrogés.` : ''}`,
      genre: 'origine',
      montrerLangue: new Set(deLOrigine.map((m) => m.langue)).size > 1,
      paliers: paliersDeNotoriete(deLOrigine),
      nombre: n,
    });
  }
  return themes;
}

// Les trois timbres de l'éventail : les plus rares de la liste.
export function timbresDuTheme(theme: Theme): CarteIndex[] {
  return theme.paliers.flatMap((p) => p.mots).map((m) => m.carte)
    .sort((a, b) => RARETES.indexOf(b.rarete) - RARETES.indexOf(a.rarete) || a.mot.localeCompare(b.mot, 'fr'))
    .slice(0, 3);
}
