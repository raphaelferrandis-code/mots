// Exploration des données réelles (phase 0a).
// Lit Lexique 4 et l'extraction du Wiktionnaire, les croise, puis écrit des chiffres
// et des exemples dans data/exploration/chiffres.md.
// Ce script sert à comprendre les données avant d'écrire le vrai pipeline : il ne produit aucune carte.
//
// Usage : npm run exploration   (après « npm run sources »)

import { createReadStream, createWriteStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import path from 'node:path';

const RACINE = path.join(import.meta.dirname, '..', '..');
const LEXIQUE = path.join(RACINE, 'data', 'brut', 'Lexique4', 'Lexique4.tsv');
const WIKTIONNAIRE = path.join(RACINE, 'data', 'brut', 'raw-wiktextract-data.jsonl.gz');
const SORTIE_CANDIDATS = path.join(RACINE, 'data', 'intermediaire', 'candidats.jsonl');
const SORTIE_CHIFFRES = path.join(RACINE, 'data', 'exploration', 'chiffres.md');

// ---------------------------------------------------------------------------
// Petits outils
// ---------------------------------------------------------------------------

function compter(table: Map<string, number>, cle: string, n = 1): void {
  table.set(cle, (table.get(cle) ?? 0) + n);
}

function palmares(table: Map<string, number>, limite: number): [string, number][] {
  return [...table.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limite);
}

// Hasard reproductible : les mêmes exemples sortent à chaque exécution.
function creerHasard(graine: number): () => number {
  return () => {
    graine = (graine + 0x6d2b79f5) | 0;
    let t = Math.imul(graine ^ (graine >>> 15), 1 | graine);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function echantillon<T>(liste: T[], n: number, hasard: () => number): T[] {
  const copie = [...liste];
  const taille = Math.min(n, copie.length);
  for (let i = 0; i < taille; i++) {
    const j = i + Math.floor(hasard() * (copie.length - i));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie.slice(0, taille);
}

function pourcent(part: number, total: number): string {
  return total === 0 ? '—' : `${((part / total) * 100).toFixed(1)} %`;
}

function nombre(n: number): string {
  return n.toLocaleString('fr-FR');
}

// ---------------------------------------------------------------------------
// Lexique 4
// ---------------------------------------------------------------------------

type InfoLexique = {
  frequence: number; // occurrences par million de mots, toutes formes du mot confondues
  prevalence: number | null; // part des gens qui connaissent le mot, en %
  avis: number; // nombre de personnes interrogées pour la prévalence
  base: string; // mot dont celui-ci est dérivé, d'après Lexique (« danseur » → « danser »)
};

const NATURES_LEXIQUE = new Set(['NOM', 'VER', 'ADJ', 'ADV']);
const NATURE_WIKTIONNAIRE: Record<string, string> = { noun: 'NOM', verb: 'VER', adj: 'ADJ', adv: 'ADV' };

const lemmes = new Map<string, InfoLexique>();
const ecartesLexique = new Map<string, number>();
let lignesLexique = 0;
let clesFusionnees = 0;

function chargerLexique(): void {
  const lignes = readFileSync(LEXIQUE, 'utf8').split(/\r?\n/);
  const entetes = lignes[0].split('\t');
  const col = (nom: string): number => {
    const i = entetes.findIndex((e) => e.replace(/^\d+_/, '') === nom);
    if (i < 0) throw new Error(`Colonne ${nom} absente de Lexique`);
    return i;
  };
  const [cMot, cCgram, cFreq, cEstLemme, cBase, cPreval, cAvis] = ['Mot', 'Cgram', 'FreqLemme', 'IsLem', 'MorphoBase', 'Preval', 'PrevalNb'].map(col);

  for (let i = 1; i < lignes.length; i++) {
    if (!lignes[i]) continue;
    lignesLexique++;
    const c = lignes[i].split('\t');
    if (c[cEstLemme] !== '1') { compter(ecartesLexique, 'forme fléchie (pas un lemme)'); continue; }
    if (!NATURES_LEXIQUE.has(c[cCgram])) { compter(ecartesLexique, 'nature non retenue (pronom, préposition…)'); continue; }
    const mot = c[cMot];
    if (/^\p{Lu}/u.test(mot)) { compter(ecartesLexique, 'commence par une majuscule (nom propre)'); continue; }
    if (/[ '’]/.test(mot)) { compter(ecartesLexique, 'contient une espace ou une apostrophe'); continue; }

    const cle = `${mot}|${c[cCgram]}`;
    const info: InfoLexique = {
      frequence: Number(c[cFreq]) || 0,
      prevalence: c[cPreval] === '' ? null : Number(c[cPreval]),
      avis: Number(c[cAvis]) || 0,
      base: c[cBase] ?? '',
    };
    const existant = lemmes.get(cle);
    if (existant) {
      // Même mot et même nature sur deux lignes (« livre » masculin et féminin) : on additionne.
      clesFusionnees++;
      existant.frequence += info.frequence;
      if (existant.prevalence === null) { existant.prevalence = info.prevalence; existant.avis = info.avis; }
    } else {
      lemmes.set(cle, info);
    }
  }
}

// ---------------------------------------------------------------------------
// Étymologie : premier essai de détection des factions
// ---------------------------------------------------------------------------

const LANGUES: [string, RegExp][] = [
  ['Latin', /\blatin/i],
  ['Grec', /\bgrec/i],
  ['Arabe', /\barabe/i],
  ['Anglais', /\banglais|\banglo-/i],
  ['Italien', /\bitalien/i],
  ['Espagnol', /\bespagnol|\bcastillan/i],
  ['Allemand', /\ballemand/i],
  ['Néerlandais', /\bnéerlandais|\bflamand/i],
  ['Germanique / francique', /francique|\bgermanique|\bnorrois|\bgotique|\bscandinave/i],
  ['Gaulois / celtique', /\bgaulois|\bceltique|\bbreton/i],
  ['Occitan / provençal', /\boccitan|\bprovençal|\bgascon/i],
  ['Portugais', /\bportugais/i],
  ['Russe / slave', /\brusse|\bslave|\bpolonais|\btchèque/i],
  ['Turc / persan', /\bturc|\bpersan/i],
  ['Hébreu', /\bhébreu/i],
  ['Japonais / chinois', /\bjaponais|\bchinois|\bmandarin/i],
  ['Inde (sanskrit, hindi…)', /\bsanskrit|\bsanscrit|\bhindi|\btamoul|\bmalais/i],
  ["Langues d'Amérique", /\bnahuatl|\btupi|\bquechua|\barawak|\bcaraïbe|\balgonquin/i],
  ['Onomatopée', /onomatop/i],
];
const ANCIEN_FRANCAIS = /\bancien français|\bmoyen français/i;
const FORMATION_FRANCAISE = /dérivé|composé|déverbal|dénominal|apocope|aphérèse|abréviation|mot-valise|verlan|suffixe|préfixe|substantiv|participe|diminutif|féminin de|→ voir|\bvoir /i;
const ETYMOLOGIE_VIDE = /manquante ou incomplète/i;

function sansParenthesesInitiales(texte: string): string {
  return texte.replace(/^\s*(?:\([^)]*\)\s*[:,.;]?\s*)+/, '').trim();
}

function devinerFaction(etymologie: string): string {
  if (!etymologie || ETYMOLOGIE_VIDE.test(etymologie)) return '(aucune étymologie)';
  const debut = sansParenthesesInitiales(etymologie).slice(0, 160);
  let meilleure = '';
  let position = Infinity;
  for (const [faction, motif] of LANGUES) {
    const trouve = motif.exec(debut);
    if (trouve && trouve.index < position) { position = trouve.index; meilleure = faction; }
  }
  if (meilleure) return meilleure;
  if (ANCIEN_FRANCAIS.test(debut)) return 'Ancien français (sans origine plus lointaine)';
  if (FORMATION_FRANCAISE.test(debut)) return 'Formation française (dérivé, composé…)';
  return '(non reconnue)';
}

// ---------------------------------------------------------------------------
// Lecture du Wiktionnaire
// ---------------------------------------------------------------------------

type Resume = {
  mot: string;
  nature: string;
  entrees: number; // nombre d'entrées du Wiktionnaire pour ce (mot, nature) : 2 ou plus = homographes
  sens: number; // définitions utilisables (hors renvois du type « Pluriel de… »)
  premiereDefinition: string;
  etymologie: string;
  faction: string;
  synonymes: number;
  derives: number;
  lexique: InfoLexique;
};

const resumes = new Map<string, Resume>();

const langues = new Map<string, number>();
const naturesFrancais = new Map<string, number>();
const titresNature = new Map<string, number>();
const clesEntree = new Map<string, number>();
const clesSens = new Map<string, number>();
const etiquettesSens = new Map<string, number>();
const etiquettesBrutesSens = new Map<string, number>();
const domainesSens = new Map<string, number>();
const etiquettesEntree = new Map<string, number>();
const debutsEtymologie = new Map<string, number>();
const exemplesAttestations: string[] = [];

let lignesTotal = 0;
let entreesFrancais = 0;
let entreesCandidates = 0;
let entreesFlexion = 0;
let sensRenvois = 0;
let sensTotal = 0;
let etymologiesAvecParenthese = 0;
let etymologiesPresentes = 0;

const ENTETE = /^\{"word": "((?:[^"\\]|\\.)*)", "lang_code": "([^"]*)", "lang": "[^"]*", "pos": "([^"]*)"/;

function traiterLigne(ligne: string, sortie: NodeJS.WritableStream): void {
  if (!ligne) return;
  lignesTotal++;

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
    langue = e.lang_code ?? '?';
    pos = e.pos ?? '?';
  }

  compter(langues, langue);
  if (langue !== 'fr') return;
  entreesFrancais++;
  compter(naturesFrancais, pos);

  const nature = NATURE_WIKTIONNAIRE[pos];
  if (!nature) return;
  const cle = `${mot}|${nature}`;
  const lexique = lemmes.get(cle);
  if (!lexique) return;

  const entree = JSON.parse(ligne);
  if (Array.isArray(entree.tags) && entree.tags.includes('form-of')) { entreesFlexion++; return; }

  entreesCandidates++;
  compter(titresNature, entree.pos_title ?? '(absent)');
  for (const k of Object.keys(entree)) compter(clesEntree, k);
  for (const t of entree.tags ?? []) compter(etiquettesEntree, t);
  for (const t of entree.raw_tags ?? []) compter(etiquettesEntree, `${t} (brut)`);
  if (entree.attestations && exemplesAttestations.length < 4) exemplesAttestations.push(`${mot} : ${JSON.stringify(entree.attestations).slice(0, 200)}`);

  const sensUtiles: { definition: string; etiquettes: string[] }[] = [];
  for (const sens of entree.senses ?? []) {
    sensTotal++;
    for (const k of Object.keys(sens)) compter(clesSens, k);
    for (const t of sens.tags ?? []) compter(etiquettesSens, t);
    for (const t of sens.raw_tags ?? []) compter(etiquettesBrutesSens, t);
    for (const t of sens.topics ?? []) compter(domainesSens, t);
    if (sens.form_of || sens.alt_of || !sens.glosses?.length) { sensRenvois++; continue; }
    sensUtiles.push({
      definition: sens.glosses[sens.glosses.length - 1],
      etiquettes: [...(sens.tags ?? []), ...(sens.raw_tags ?? [])],
    });
  }

  const etymologie = (entree.etymology_texts ?? []).join(' ').trim();
  if (etymologie && !ETYMOLOGIE_VIDE.test(etymologie)) {
    etymologiesPresentes++;
    if (/^\s*\(/.test(etymologie)) etymologiesAvecParenthese++;
    const debut = sansParenthesesInitiales(etymologie).split(/\s+/).slice(0, 2).join(' ').toLowerCase();
    compter(debutsEtymologie, debut);
  }

  sortie.write(`${JSON.stringify({
    mot,
    nature,
    titre: entree.pos_title,
    etymologie,
    sens: sensUtiles,
    synonymes: (entree.synonyms ?? []).map((s: { word: string }) => s.word),
    derives: (entree.derived ?? []).map((s: { word: string }) => s.word),
    etiquettes: entree.tags ?? [],
  })}\n`);

  const faction = devinerFaction(etymologie);
  const existant = resumes.get(cle);
  if (existant) {
    existant.entrees++;
    existant.sens += sensUtiles.length;
    existant.synonymes += entree.synonyms?.length ?? 0;
    existant.derives += entree.derived?.length ?? 0;
    if (!existant.premiereDefinition && sensUtiles[0]) existant.premiereDefinition = sensUtiles[0].definition;
    if (existant.faction.startsWith('(') && !faction.startsWith('(')) { existant.faction = faction; existant.etymologie = etymologie; }
  } else {
    resumes.set(cle, {
      mot,
      nature,
      entrees: 1,
      sens: sensUtiles.length,
      premiereDefinition: sensUtiles[0]?.definition ?? '',
      etymologie,
      faction,
      synonymes: entree.synonyms?.length ?? 0,
      derives: entree.derived?.length ?? 0,
      lexique,
    });
  }
}

async function lireWiktionnaire(): Promise<void> {
  mkdirSync(path.dirname(SORTIE_CANDIDATS), { recursive: true });
  const sortie = createWriteStream(SORTIE_CANDIDATS);
  const flux = createReadStream(WIKTIONNAIRE).pipe(createGunzip());
  flux.setEncoding('utf8');

  let reste = '';
  for await (const morceau of flux) {
    const texte = reste + morceau;
    let debut = 0;
    let fin = texte.indexOf('\n', debut);
    while (fin !== -1) {
      traiterLigne(texte.slice(debut, fin), sortie);
      debut = fin + 1;
      fin = texte.indexOf('\n', debut);
    }
    reste = texte.slice(debut);
    if (lignesTotal % 500000 < 50 && lignesTotal > 0) process.stdout.write(`\r  ${nombre(lignesTotal)} entrées lues…`);
  }
  traiterLigne(reste, sortie);
  await new Promise<void>((fini) => sortie.end(fini));
  process.stdout.write('\n');
}

// ---------------------------------------------------------------------------
// Rapport
// ---------------------------------------------------------------------------

function tableau(titres: string[], lignes: (string | number)[][]): string[] {
  return [
    `| ${titres.join(' | ')} |`,
    `|${titres.map(() => '---').join('|')}|`,
    ...lignes.map((l) => `| ${l.map((c) => (typeof c === 'number' ? nombre(c) : String(c).replace(/\|/g, '/'))).join(' | ')} |`),
  ];
}

function ficheCourte(r: Resume): string {
  const prevalence = r.lexique.prevalence === null ? 'prévalence inconnue' : `connu de ${r.lexique.prevalence} %`;
  const definition = r.premiereDefinition.length > 110 ? `${r.premiereDefinition.slice(0, 107)}…` : r.premiereDefinition;
  return `- **${r.mot}** (${r.nature}, ${r.faction}, fréquence ${r.lexique.frequence}, ${prevalence}) — ${definition || '*aucune définition utilisable*'}`;
}

function rangs(liste: Resume[], valeur: (r: Resume) => number): Map<Resume, number> {
  // Rang ramené entre 0 et 1 ; les ex æquo partagent le même rang moyen.
  const tries = [...liste].sort((a, b) => valeur(a) - valeur(b));
  const resultat = new Map<Resume, number>();
  let i = 0;
  while (i < tries.length) {
    let j = i;
    while (j + 1 < tries.length && valeur(tries[j + 1]) === valeur(tries[i])) j++;
    const rangMoyen = (i + j) / 2 / Math.max(1, tries.length - 1);
    for (let k = i; k <= j; k++) resultat.set(tries[k], rangMoyen);
    i = j + 1;
  }
  return resultat;
}

function ecrireRapport(dureeSecondes: number): void {
  const hasard = creerHasard(20260921);
  const tous = [...resumes.values()];
  const jouables = tous.filter((r) => r.sens > 0);
  const L: string[] = [];

  L.push('# Exploration des données — chiffres bruts', '');
  L.push(`*Fichier généré par \`npm run exploration\` en ${Math.round(dureeSecondes)} secondes. Ne pas modifier à la main.*`, '');

  L.push('## 1. Lexique 4', '');
  L.push(`- Lignes dans le fichier : **${nombre(lignesLexique)}**`);
  L.push(`- Lemmes retenus (nom, verbe, adjectif, adverbe) : **${nombre(lemmes.size)}** couples (mot, nature), dont ${nombre(clesFusionnees)} lignes fusionnées (même mot et même nature sur deux lignes)`);
  const avecPrevalence = [...lemmes.values()].filter((l) => l.prevalence !== null).length;
  L.push(`- Lemmes retenus qui ont une mesure de prévalence : **${nombre(avecPrevalence)}** (${pourcent(avecPrevalence, lemmes.size)})`, '');
  L.push(...tableau(['Lignes écartées', 'Nombre'], palmares(ecartesLexique, 10)), '');

  L.push('## 2. Wiktionnaire', '');
  L.push(`- Entrées dans le fichier (toutes langues) : **${nombre(lignesTotal)}**`);
  L.push(`- Entrées de langue française : **${nombre(entreesFrancais)}** (${pourcent(entreesFrancais, lignesTotal)})`, '');
  L.push(...tableau(['Langue (code)', 'Entrées'], palmares(langues, 8)), '');
  L.push(...tableau(['Nature des entrées françaises (champ `pos`)', 'Entrées'], palmares(naturesFrancais, 15)), '');

  L.push('## 3. Croisement Lexique × Wiktionnaire', '');
  L.push(`- Entrées du Wiktionnaire correspondant à un lemme de Lexique : **${nombre(entreesCandidates)}** (+ ${nombre(entreesFlexion)} écartées car ce sont de simples formes fléchies)`);
  L.push(`- Couples (mot, nature) distincts trouvés dans les deux sources : **${nombre(tous.length)}** sur ${nombre(lemmes.size)} lemmes de Lexique (${pourcent(tous.length, lemmes.size)})`);
  L.push(`- Dont avec au moins une définition utilisable : **${nombre(jouables.length)}** → c'est la taille approximative de la base complète de cartes`);
  const homographes = tous.filter((r) => r.entrees > 1);
  L.push(`- Homographes de même nature (plusieurs entrées pour le même couple) : **${nombre(homographes.length)}**, par exemple : ${echantillon(homographes, 15, hasard).map((r) => r.mot).join(', ')}`, '');

  const parNature = new Map<string, number>();
  for (const r of jouables) compter(parNature, r.nature);
  L.push(...tableau(['Nature', 'Cartes possibles'], palmares(parNature, 4)), '');
  L.push(...tableau(['Intitulé de nature dans le Wiktionnaire (`pos_title`)', 'Entrées'], palmares(titresNature, 12)), '');

  const absents: string[] = [];
  const absentsParNature = new Map<string, number>();
  for (const [cle, info] of lemmes) {
    if (resumes.has(cle)) continue;
    compter(absentsParNature, cle.split('|')[1]);
    absents.push(`${cle.replace('|', ' (')}, fréq. ${info.frequence})`);
  }
  L.push(`### Lemmes de Lexique absents du Wiktionnaire (${nombre(absents.length)})`, '');
  L.push(...tableau(['Nature', 'Absents'], palmares(absentsParNature, 4)), '');
  L.push(`Exemples : ${echantillon(absents, 40, hasard).join(' · ')}`, '');

  L.push('## 4. Champs réellement disponibles', '');
  L.push(...tableau(["Champ d'une entrée", 'Présent dans', 'Part'], palmares(clesEntree, 30).map(([k, n]) => [`\`${k}\``, n, pourcent(n, entreesCandidates)])), '');
  L.push(...tableau(["Champ d'un sens", 'Présent dans', 'Part'], palmares(clesSens, 20).map(([k, n]) => [`\`${k}\``, n, pourcent(n, sensTotal)])), '');
  L.push(`Sens au total : ${nombre(sensTotal)}, dont ${nombre(sensRenvois)} simples renvois (« Pluriel de… », « Variante de… ») écartés.`, '');
  if (exemplesAttestations.length) L.push('Exemples du champ `attestations` :', '', ...exemplesAttestations.map((a) => `- ${a}`), '');

  L.push('## 5. Étiquettes (registre, domaine)', '');
  L.push(...tableau(['Étiquette de sens (`tags`)', 'Sens'], palmares(etiquettesSens, 45)), '');
  L.push(...tableau(['Étiquette de sens non normalisée (`raw_tags`)', 'Sens'], palmares(etiquettesBrutesSens, 45)), '');
  L.push(...tableau(['Domaine (`topics`)', 'Sens'], palmares(domainesSens, 25)), '');
  L.push(...tableau(["Étiquette d'entrée", 'Entrées'], palmares(etiquettesEntree, 20)), '');

  L.push('## 6. Définitions', '');
  const repartitionSens = new Map<string, number>();
  for (const r of tous) {
    const tranche = r.sens === 0 ? '0' : r.sens === 1 ? '1' : r.sens === 2 ? '2' : r.sens === 3 ? '3' : r.sens <= 5 ? '4 à 5' : r.sens <= 9 ? '6 à 9' : '10 et plus';
    compter(repartitionSens, tranche);
  }
  L.push(...tableau(['Nombre de sens', 'Mots', 'Part'], ['0', '1', '2', '3', '4 à 5', '6 à 9', '10 et plus'].map((t) => [t, repartitionSens.get(t) ?? 0, pourcent(repartitionSens.get(t) ?? 0, tous.length)])), '');
  const longueurs = new Map<string, number>();
  let contientLeMot = 0;
  for (const r of jouables) {
    const n = r.premiereDefinition.length;
    compter(longueurs, n < 30 ? 'moins de 30 caractères' : n <= 80 ? '30 à 80' : n <= 200 ? '81 à 200' : 'plus de 200');
    const racine = r.mot.slice(0, Math.max(4, r.mot.length - 3)).toLowerCase();
    if (r.premiereDefinition.toLowerCase().includes(racine)) contientLeMot++;
  }
  L.push(...tableau(['Longueur de la première définition', 'Mots', 'Part'], ['moins de 30 caractères', '30 à 80', '81 à 200', 'plus de 200'].map((t) => [t, longueurs.get(t) ?? 0, pourcent(longueurs.get(t) ?? 0, jouables.length)])), '');
  L.push(`Première définition qui contient le mot lui-même ou sa racine (inutilisable telle quelle en duel) : **${nombre(contientLeMot)}** (${pourcent(contientLeMot, jouables.length)})`, '');
  const avecSynonymes = jouables.filter((r) => r.synonymes > 0).length;
  const avecDerives = jouables.filter((r) => r.derives > 0).length;
  L.push(`Mots avec au moins un synonyme : ${nombre(avecSynonymes)} (${pourcent(avecSynonymes, jouables.length)}) · avec au moins un dérivé : ${nombre(avecDerives)} (${pourcent(avecDerives, jouables.length)})`, '');

  L.push('## 7. Étymologie et factions (premier essai)', '');
  L.push(`- Entrées avec une étymologie rédigée : **${nombre(etymologiesPresentes)}** (${pourcent(etymologiesPresentes, entreesCandidates)})`);
  L.push(`- Dont commençant par une parenthèse (date, siècle) : **${nombre(etymologiesAvecParenthese)}** (${pourcent(etymologiesAvecParenthese, etymologiesPresentes)})`, '');
  L.push(...tableau(["Deux premiers mots de l'étymologie (hors parenthèses)", 'Entrées'], palmares(debutsEtymologie, 40)), '');

  const factions = new Map<string, number>();
  for (const r of jouables) compter(factions, r.faction);
  L.push('### Répartition par faction, sans héritage', '');
  L.push(...tableau(['Faction devinée', 'Mots', 'Part'], palmares(factions, 30).map(([f, n]) => [f, n, pourcent(n, jouables.length)])), '');

  // Héritage : un mot sans langue d'origine reçoit la faction du mot dont il dérive selon Lexique.
  const factionParMot = new Map<string, string>();
  for (const r of jouables) if (!r.faction.startsWith('(') && !r.faction.startsWith('Formation')) factionParMot.set(r.mot, r.faction);
  const factionsHeritees = new Map<string, number>();
  let herites = 0;
  for (const r of jouables) {
    let faction = r.faction;
    if (faction.startsWith('(') || faction.startsWith('Formation')) {
      const base = r.lexique.base;
      const heritee = base && base !== r.mot ? factionParMot.get(base) : undefined;
      if (heritee) { faction = heritee; herites++; }
    }
    compter(factionsHeritees, faction);
  }
  L.push(`### Répartition par faction, avec héritage par la « base » de Lexique (${nombre(herites)} mots reclassés)`, '');
  L.push(...tableau(['Faction', 'Mots', 'Part'], palmares(factionsHeritees, 30).map(([f, n]) => [f, n, pourcent(n, jouables.length)])), '');
  const nonReconnues = jouables.filter((r) => r.faction === '(non reconnue)');
  L.push('Exemples d\'étymologies non reconnues :', '', ...echantillon(nonReconnues, 25, hasard).map((r) => `- **${r.mot}** : ${r.etymologie.slice(0, 160)}`), '');

  L.push('## 8. Aperçu de la rareté', '');
  const frequences = new Map<string, number>();
  for (const r of jouables) compter(frequences, String(r.lexique.frequence));
  const plusBasses = [...frequences.entries()].sort((a, b) => Number(a[0]) - Number(b[0])).slice(0, 5);
  L.push('Les fréquences les plus basses, et le nombre de mots ex æquo à chacune :', '');
  L.push(...tableau(['Fréquence (par million)', 'Mots ex æquo', 'Part de la base'], plusBasses.map(([f, n]) => [f, n, pourcent(n, jouables.length)])), '');

  const seuil = Math.round(jouables.length * 0.03);
  const parFrequence = [...jouables].sort((a, b) => a.lexique.frequence - b.lexique.frequence || a.mot.localeCompare(b.mot));
  L.push(`### Option A — fréquence seule : 25 mots au hasard parmi les 3 % les plus rares (${nombre(seuil)} mots)`, '');
  L.push(...echantillon(parFrequence.slice(0, seuil), 25, hasard).map(ficheCourte), '');

  const mesures = jouables.filter((r) => r.lexique.prevalence !== null && r.lexique.avis >= 10);
  const rangFrequence = rangs(mesures, (r) => r.lexique.frequence);
  const rangPrevalence = rangs(mesures, (r) => r.lexique.prevalence ?? 100);
  const parScore = [...mesures].sort((a, b) => (rangFrequence.get(a)! + rangPrevalence.get(a)!) - (rangFrequence.get(b)! + rangPrevalence.get(b)!) || a.mot.localeCompare(b.mot));
  const seuilB = Math.round(mesures.length * 0.03);
  L.push(`### Option B — fréquence + prévalence, sur les ${nombre(mesures.length)} mots dont la prévalence est mesurée : 25 mots au hasard parmi les 3 % les plus rares (${nombre(seuilB)} mots)`, '');
  L.push(...echantillon(parScore.slice(0, seuilB), 25, hasard).map(ficheCourte), '');

  L.push('### Pour comparer : 15 mots au hasard dans la moitié la plus fréquente (futures Communes)', '');
  L.push(...echantillon(parFrequence.slice(Math.floor(jouables.length / 2)), 15, hasard).map(ficheCourte), '');

  const repartitionPrevalence = new Map<string, number>();
  for (const r of mesures) {
    const p = r.lexique.prevalence ?? 0;
    compter(repartitionPrevalence, p >= 100 ? '100 %' : p >= 90 ? '90 à 99 %' : p >= 75 ? '75 à 89 %' : p >= 50 ? '50 à 74 %' : p >= 25 ? '25 à 49 %' : 'moins de 25 %');
  }
  L.push('### Combien de gens connaissent les mots (prévalence)', '');
  L.push(...tableau(['Connu de…', 'Mots', 'Part'], ['100 %', '90 à 99 %', '75 à 89 %', '50 à 74 %', '25 à 49 %', 'moins de 25 %'].map((t) => [t, repartitionPrevalence.get(t) ?? 0, pourcent(repartitionPrevalence.get(t) ?? 0, mesures.length)])), '');

  mkdirSync(path.dirname(SORTIE_CHIFFRES), { recursive: true });
  writeFileSync(SORTIE_CHIFFRES, `${L.join('\n')}\n`);
}

// ---------------------------------------------------------------------------

const depart = Date.now();
console.log('Lecture de Lexique 4…');
chargerLexique();
console.log(`  ${nombre(lemmes.size)} lemmes retenus`);
console.log('Lecture du Wiktionnaire (plusieurs minutes)…');
await lireWiktionnaire();
ecrireRapport((Date.now() - depart) / 1000);
console.log(`Terminé : ${path.relative(process.cwd(), SORTIE_CHIFFRES)}`);
