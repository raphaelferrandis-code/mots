// Étape 2 — Wiktionnaire : pour chaque lemme de Lexique, ses définitions, son étymologie, ses étiquettes.

import { createReadStream } from 'node:fs';
import { createGunzip } from 'node:zlib';
import type { Nature } from '../../src/partage/types.ts';
import { cle } from './lexique.ts';
import type { InfoLexique } from './lexique.ts';
import { estRenvoi, estUneDefinitionVide, nettoyerTexte } from './nettoyage.ts';

export type SensBrut = {
  definition: string;
  etiquettes: string[]; // registre et usage : « familiar », « offensive », « dated »…
  domaines: string[]; // « medicine », « botany »…
};

// Un mot du jeu : toutes les entrées du Wiktionnaire pour un même (mot, nature), regroupées.
export type MotBrut = {
  mot: string;
  nature: Nature;
  entrees: number; // 2 ou plus : homographes (« avocat » le juriste, le fruit, la couleur)
  etymologies: string[];
  sens: SensBrut[];
  // Sens que le Wiktionnaire n'a pas encore rédigés (« Définition manquante ou à compléter ») : le mot a bien ces
  // sens, ils comptent dans sa richesse, mais il n'y a rien à en montrer.
  sensARediger: number;
  synonymes: number;
  derives: number;
  attestation: string | null;
  lexique: InfoLexique;
};

export type Compteurs = {
  lignes: number;
  francais: number;
  retenues: number;
  flexions: number;
  renvois: number;
  vides: number; // sens pas encore rédigés : « Définition manquante ou à compléter »
};

const NATURE_PAR_POS: Record<string, Nature> = { noun: 'Nom', verb: 'Verbe', adj: 'Adjectif', adv: 'Adverbe' };

// Chaque ligne commence toujours par ces quatre champs : on les lit sans décoder toute la ligne,
// ce qui évite de décoder les 7 millions d'entrées qui ne nous intéressent pas.
const ENTETE = /^\{"word": "((?:[^"\\]|\\.)*)", "lang_code": "([^"]*)", "lang": "[^"]*", "pos": "([^"]*)"/;

export function analyserLigne(ligne: string, lemmes: Map<string, InfoLexique>, compteurs: Compteurs): MotBrut | null {
  if (!ligne) return null;
  compteurs.lignes++;

  let mot: string;
  let langue: string;
  let pos: string;
  const entete = ENTETE.exec(ligne);
  if (entete) {
    mot = entete[1].includes('\\') ? JSON.parse(`"${entete[1]}"`) : entete[1];
    langue = entete[2];
    pos = entete[3];
  } else {
    const e = JSON.parse(ligne);
    mot = e.word ?? '';
    langue = e.lang_code ?? '';
    pos = e.pos ?? '';
  }
  if (langue !== 'fr') return null;
  compteurs.francais++;

  const nature = NATURE_PAR_POS[pos];
  if (!nature) return null;
  const lexique = lemmes.get(cle(mot, nature));
  if (!lexique) return null;

  const entree = JSON.parse(ligne);
  if (Array.isArray(entree.tags) && entree.tags.includes('form-of')) { compteurs.flexions++; return null; }
  compteurs.retenues++;

  const sens: SensBrut[] = [];
  let sensARediger = 0;
  for (const s of entree.senses ?? []) {
    const definition = nettoyerTexte(s.glosses?.[s.glosses.length - 1] ?? '');
    if (!definition || s.form_of || s.alt_of || estRenvoi(definition)) { compteurs.renvois++; continue; }
    if (estUneDefinitionVide(definition)) { compteurs.vides++; sensARediger++; continue; }
    sens.push({ definition, etiquettes: [...(s.tags ?? []), ...(s.raw_tags ?? [])], domaines: s.topics ?? [] });
  }

  const etymologie = nettoyerTexte((entree.etymology_texts ?? []).join(' '));
  return {
    mot,
    nature,
    entrees: 1,
    etymologies: etymologie ? [etymologie] : [],
    sens,
    sensARediger,
    synonymes: entree.synonyms?.length ?? 0,
    derives: entree.derived?.length ?? 0,
    attestation: entree.attestations?.[0]?.date ? nettoyerTexte(String(entree.attestations[0].date)) : null,
    lexique,
  };
}

// Regroupe les homographes : une seule carte par (mot, nature).
export function fusionner(mots: Map<string, MotBrut>, nouveau: MotBrut): void {
  const c = cle(nouveau.mot, nouveau.nature);
  const existant = mots.get(c);
  if (!existant) { mots.set(c, nouveau); return; }
  existant.entrees++;
  existant.etymologies.push(...nouveau.etymologies);
  existant.sens.push(...nouveau.sens);
  existant.sensARediger += nouveau.sensARediger;
  existant.synonymes += nouveau.synonymes;
  existant.derives += nouveau.derives;
  existant.attestation ??= nouveau.attestation;
}

export async function lireWiktionnaire(
  chemin: string,
  lemmes: Map<string, InfoLexique>,
  progression?: (lignes: number) => void,
): Promise<{ mots: Map<string, MotBrut>; compteurs: Compteurs }> {
  const mots = new Map<string, MotBrut>();
  const compteurs: Compteurs = { lignes: 0, francais: 0, retenues: 0, flexions: 0, renvois: 0, vides: 0 };
  const traiter = (ligne: string): void => {
    const mot = analyserLigne(ligne, lemmes, compteurs);
    if (mot) fusionner(mots, mot);
  };

  const flux = createReadStream(chemin).pipe(createGunzip());
  flux.setEncoding('utf8');
  let reste = '';
  let prochainSignal = 1_000_000;
  for await (const morceau of flux) {
    const texte = reste + morceau;
    let debut = 0;
    let fin = texte.indexOf('\n', debut);
    while (fin !== -1) {
      traiter(texte.slice(debut, fin));
      debut = fin + 1;
      fin = texte.indexOf('\n', debut);
    }
    reste = texte.slice(debut);
    if (progression && compteurs.lignes >= prochainSignal) { progression(compteurs.lignes); prochainSignal += 1_000_000; }
  }
  traiter(reste);
  return { mots, compteurs };
}
