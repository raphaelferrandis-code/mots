// Étape 8 — Rapport de génération : ce que Raphaël relit pour valider que le jeu « sonne juste ».

import { RARETES } from '../../src/partage/types.ts';
import type { Nature, Rarete } from '../../src/partage/types.ts';
import { defenseEnJeu } from '../../src/config/equilibrage.ts';
import { CONFIG, FORMATION_FRANCAISE, LANGUES_D_AILLEURS, ORIGINE_INCONNUE, factionDeLaLangue } from '../config.ts';
import type { CarteComplete } from './cartes.ts';
import { estEligible, partsDesFactions } from './edition.ts';
import type { JournalEdition } from './edition.ts';
import type { ResultatLexique } from './lexique.ts';
import type { PoidsDesFichiers } from './sortie.ts';
import { creerHasard, echantillon } from './stats.ts';
import type { Compteurs } from './wiktionnaire.ts';

export type DonneesDuRapport = {
  lexique: ResultatLexique;
  compteurs: Compteurs;
  motsCroises: number;
  cartes: CarteComplete[];
  edition: CarteComplete[];
  journal: JournalEdition;
  exclusions: Set<string>;
  corrections: Map<string, string>;
  correctionsIllisibles: string[];
  poids: PoidsDesFichiers;
  dureeSecondes: number;
  version: string;
};

const NATURES: Nature[] = ['Nom', 'Adjectif', 'Verbe', 'Adverbe'];
const RARETES_DECROISSANTES: Rarete[] = [...RARETES].reverse();

const nombre = (n: number): string => n.toLocaleString('fr-FR');
const pourcent = (part: number, total: number): string => (total === 0 ? '—' : `${((part / total) * 100).toFixed(1).replace('.', ',')} %`);
const moyenne = (valeurs: number[]): string => (valeurs.length === 0 ? '—' : (valeurs.reduce((a, b) => a + b, 0) / valeurs.length).toFixed(1).replace('.', ','));
const enKo = (octets: number): string => `${nombre(Math.round(octets / 1024))} Ko`;

function compter<T>(liste: T[], cle: (element: T) => string | string[]): Map<string, number> {
  const table = new Map<string, number>();
  for (const element of liste) for (const k of [cle(element)].flat()) table.set(k, (table.get(k) ?? 0) + 1);
  return table;
}

function tableau(titres: string[], lignes: (string | number)[][]): string[] {
  return [
    `| ${titres.join(' | ')} |`,
    `|${titres.map(() => '---').join('|')}|`,
    ...lignes.map((l) => `| ${l.map((c) => (typeof c === 'number' ? nombre(c) : c.replace(/\|/g, '/'))).join(' | ')} |`),
    '',
  ];
}

const parTailleDecroissante = (table: Map<string, number>): [string, number][] => [...table].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'));

function fiche(c: CarteComplete): string {
  const connu = c.details.prevalence === null ? 'prévalence non mesurée' : `connu de ${c.details.prevalence} %`;
  const badges = c.index.registre.length ? ` · ${c.index.registre.join(', ')}` : '';
  const date = c.details.attestation ? ` · attesté : ${c.details.attestation}` : '';
  const definition = c.details.definitions.find((d) => d.quiz)?.texte ?? c.details.definitions[0].texte;
  return `- **${c.index.mot}** *(${c.index.type}, ${c.index.faction}, ${c.index.attaque}/${c.index.defense}, ${connu}${badges}${date})* — ${definition.length > 130 ? `${definition.slice(0, 127)}…` : definition}`;
}

function tableauParRarete(cartes: CarteComplete[]): string[] {
  return tableau(
    ['Rareté', 'Cartes', 'Part', 'Attaque moyenne', 'Défense moyenne (brute)', 'Défense moyenne (avec le bonus de rareté)', 'Connu de… (moyenne)'],
    RARETES_DECROISSANTES.map((r) => {
      const groupe = cartes.filter((c) => c.index.rarete === r);
      const mesurees = groupe.filter((c) => c.details.prevalence !== null);
      return [r, groupe.length, pourcent(groupe.length, cartes.length), moyenne(groupe.map((c) => c.index.attaque)), moyenne(groupe.map((c) => c.index.defense)), moyenne(groupe.map((c) => defenseEnJeu(c.index.defense, r))), mesurees.length ? `${moyenne(mesurees.map((c) => c.details.prevalence as number))} %` : '—'];
    }),
  );
}

// Autres façons de regrouper les langues en factions, pour aider Raphaël à choisir.
const DECOUPAGE_RESSERRE: Record<string, string> = {
  'Latin': 'Latin', 'Grec': 'Grec', 'Anglais': 'Anglais',
  'Italien': 'Langues romanes', 'Espagnol': 'Langues romanes', 'Portugais': 'Langues romanes', 'Occitan': 'Langues romanes',
  'Francique et germanique ancien': 'Langues germaniques', 'Allemand': 'Langues germaniques', 'Néerlandais': 'Langues germaniques', 'Langues scandinaves': 'Langues germaniques',
  'Ancien français': 'Vieux français et gaulois', 'Parlers régionaux': 'Vieux français et gaulois', 'Gaulois et celtique': 'Vieux français et gaulois',
  'Arabe': 'Arabe et Orient', 'Turc et persan': 'Arabe et Orient', 'Hébreu et yiddish': 'Arabe et Orient',
  'Onomatopée': 'Onomatopée',
};

export function redigerRapport(d: DonneesDuRapport): string {
  const hasard = creerHasard(20260921);
  const { cartes, edition, journal } = d;
  const L: string[] = [];

  L.push('# Rapport de génération des cartes', '');
  L.push(`*Généré par \`npm run pipeline\` en ${Math.round(d.dureeSecondes)} secondes — version des données : ${d.version}. Ne pas modifier à la main. Les réglages sont dans \`pipeline/config.ts\`.*`, '');

  // ── 1
  L.push('## 1. En bref', '');
  L.push(`- Base complète : **${nombre(cartes.length)} cartes possibles**.`);
  L.push(`- Édition ${CONFIG.edition.numero} : **${nombre(edition.length)} cartes**, choisies parmi ${nombre(journal.eligibles)} cartes éligibles.`);
  L.push(`- Poids pour le jeu : ${enKo(d.poids.index)} chargés au démarrage, plus ${enKo(d.poids.details)} de détails répartis en ${d.poids.lots} fichiers chargés à la demande.`);
  if (journal.manques.length) L.push(`- ⚠️ Cartes manquantes : ${journal.manques.join(' ; ')}.`);
  L.push('');

  // ── 2
  L.push('## 2. Du fichier brut aux cartes', '');
  L.push(...tableau(['Étape', 'Nombre'], [
    ['Lignes de Lexique 4', d.lexique.lignes],
    ...parTailleDecroissante(d.lexique.ecartes).map(([raison, n]) => [`— écartées : ${raison}`, n] as [string, number]),
    ['Lemmes de Lexique retenus (mot + nature)', d.lexique.lemmes.size],
    ['Entrées du Wiktionnaire, toutes langues', d.compteurs.lignes],
    ['— dont entrées françaises', d.compteurs.francais],
    ['— dont entrées correspondant à un lemme de Lexique', d.compteurs.retenues],
    ['— écartées : simples formes fléchies', d.compteurs.flexions],
    ['Définitions écartées (simples renvois : « Pluriel de… »)', d.compteurs.renvois],
    ['Mots présents dans les deux sources', d.motsCroises],
    ['— écartés : aucune définition utilisable', d.motsCroises - cartes.length],
    ['**Cartes de la base complète**', cartes.length],
  ]));

  // ── 3
  L.push('## 3. La base complète', '');
  L.push(...tableauParRarete(cartes));
  const parType = compter(cartes, (c) => c.index.type);
  L.push(...tableau(['Type', 'Cartes', 'Part'], NATURES.map((n) => [n, parType.get(n) ?? 0, pourcent(parType.get(n) ?? 0, cartes.length)])));
  const sansOrigine = cartes.filter((c) => !c.factionReconnue).length;
  L.push(`**Mots sans faction reconnue : ${nombre(sansOrigine)} (${pourcent(sansOrigine, cartes.length)})** — ils restent dans la base complète mais ne peuvent pas entrer dans une édition.`, '');
  L.push(...tableau(['Faction', 'Cartes', 'Part'], parTailleDecroissante(compter(cartes, (c) => c.index.faction)).map(([f, n]) => [f, n, pourcent(n, cartes.length)])));
  const herites = cartes.filter((c) => c.herite).length;
  L.push(`Origine héritée d'un autre mot (« danseur » prend l'origine de « danser ») : ${nombre(herites)} mots (${pourcent(herites, cartes.length)}).`, '');
  L.push(...tableau(['Badge de registre', 'Cartes', 'Part'], parTailleDecroissante(compter(cartes, (c) => c.index.registre)).map(([r, n]) => [r, n, pourcent(n, cartes.length)])));
  const mesurees = cartes.filter((c) => c.prevalenceMesuree).length;
  const avecDuel = cartes.filter((c) => c.definitionsDeDuel > 0).length;
  const avecDate = cartes.filter((c) => c.details.attestation).length;
  L.push(`- Prévalence mesurée : ${nombre(mesurees)} cartes (${pourcent(mesurees, cartes.length)})`);
  L.push(`- Au moins une définition utilisable en duel : ${nombre(avecDuel)} cartes (${pourcent(avecDuel, cartes.length)})`);
  L.push(`- Date de première apparition connue : ${nombre(avecDate)} cartes (${pourcent(avecDate, cartes.length)})`);
  const homographes = cartes.filter((c) => c.homographes > 1);
  L.push(`- Homographes regroupés en une seule carte : ${nombre(homographes.length)}, par exemple ${echantillon(homographes, 25, hasard).map((c) => c.index.mot).join(', ')}`, '');

  // ── 4
  L.push(`## 4. L'Édition ${CONFIG.edition.numero}`, '');
  L.push(`Pour être éligible, une carte doit avoir une faction reconnue, une prévalence mesurée (au moins ${CONFIG.rarete.avisMinimum} personnes interrogées) et au moins une définition utilisable en duel. **${nombre(journal.eligibles)} cartes éligibles.**`, '');
  L.push(...tableauParRarete(edition));
  L.push(CONFIG.edition.notesCalculeesSur === 'edition'
    ? "*Les notes d'attaque et de défense sont calculées entre les cartes de l'édition : les 10 % de cartes les plus fortes du jeu ont 10, les 10 % les plus faibles ont 1.*"
    : "*Les notes d'attaque et de défense sont calculées entre toutes les cartes de la base complète.*", '');
  const parFaction = compter(edition, (c) => c.index.faction);
  L.push(...tableau(
    ['Faction', 'Mots éligibles', 'Part réelle', "Cartes dans l'édition", "Part dans l'édition", 'dont Légendaires', 'dont Épiques'],
    parTailleDecroissante(parFaction).map(([f, n]) => [f, journal.eligiblesParFaction.get(f) ?? 0, pourcent(journal.eligiblesParFaction.get(f) ?? 0, journal.eligibles), n, pourcent(n, edition.length), edition.filter((c) => c.index.faction === f && c.index.rarete === 'Légendaire').length, edition.filter((c) => c.index.faction === f && c.index.rarete === 'Épique').length]),
  ));
  const typesEdition = compter(edition, (c) => c.index.type);
  L.push(...tableau(['Type', 'Cartes', 'Part'], NATURES.map((n) => [n, typesEdition.get(n) ?? 0, pourcent(typesEdition.get(n) ?? 0, edition.length)])));
  L.push(...tableau(['Badge de registre', 'Cartes', 'Part'], parTailleDecroissante(compter(edition, (c) => c.index.registre)).map(([r, n]) => [r, n, pourcent(n, edition.length)])));
  const datees = edition.filter((c) => c.details.attestation).length;
  L.push(`Cartes avec une date de première apparition : ${nombre(datees)} (${pourcent(datees, edition.length)}).`, '');
  L.push(`Coups de cœur ajoutés : ${journal.coupsDeCoeurAjoutes.length ? journal.coupsDeCoeurAjoutes.join(', ') : 'aucun'}.`);
  if (journal.coupsDeCoeurImpossibles.length) L.push('', 'Coups de cœur impossibles à ajouter :', ...journal.coupsDeCoeurImpossibles.map((m) => `- ${m}`));
  L.push('', `Corrections d'origine faites à la main (\`data/corrections-factions.txt\`) : ${d.corrections.size ? [...d.corrections].map(([mot, origine]) => `${mot} → ${origine}`).join(', ') : 'aucune'}.`);
  if (d.correctionsIllisibles.length) L.push('', '⚠️ Lignes ignorées dans ce fichier (faction inconnue ?) :', ...d.correctionsIllisibles.map((l) => `- ${l}`));
  L.push('');

  // ── 5
  L.push("## 5. Exemples tirés au hasard dans l'édition", '');
  L.push("*Lecture : (type, faction, attaque/défense brute, part des gens qui connaissent le mot). C'est ici que l'on juge si la répartition « sonne juste ».*", '');
  for (const r of RARETES_DECROISSANTES) {
    L.push(`### ${r}`, '', ...echantillon(edition.filter((c) => c.index.rarete === r), 20, hasard).map(fiche), '');
  }
  L.push('### Par faction', '');
  for (const [f] of parTailleDecroissante(parFaction)) {
    L.push(`**${f}** : ${echantillon(edition.filter((c) => c.index.faction === f), 14, hasard).map((c) => `${c.index.mot} *(${c.index.rarete.toLowerCase()})*`).join(', ')}`, '');
  }

  // ── 6
  L.push('## 6. Origines des mots et choix des factions', '');
  const eligibles = cartes.filter((c) => estEligible(c, d.exclusions));
  L.push('### Langues détectées (base complète)', '');
  L.push(...tableau(["Langue d'origine détectée", 'Cartes de la base', 'dont éligibles', 'Faction par défaut'], parTailleDecroissante(compter(cartes, (c) => c.details.langueOrigine)).map(([l, n]) => [l, n, eligibles.filter((c) => c.details.langueOrigine === l).length, factionDeLaLangue(l)])));

  L.push('### Trois découpages possibles', '');
  L.push(`*Pour chaque découpage : le nombre de mots éligibles, puis le nombre de cartes que la faction aurait dans une édition de ${nombre(CONFIG.edition.taille)} (avec les réglages actuels : petites factions gonflées, plafond à ${Math.round(CONFIG.edition.plafondParFaction * 100)} %).*`, '');
  const languesFrequentes = new Set(parTailleDecroissante(compter(eligibles, (c) => c.details.langueOrigine)).filter(([, n]) => n >= 60).map(([l]) => l));
  const decoupages: [string, (langue: string) => string][] = [
    ['A — par défaut (celui utilisé pour cette génération)', factionDeLaLangue],
    ['B — resserré', (l) => DECOUPAGE_RESSERRE[l] ?? LANGUES_D_AILLEURS],
    ["C — détaillé (une faction par langue d'au moins 60 mots éligibles)", (l) => (languesFrequentes.has(l) ? l : LANGUES_D_AILLEURS)],
  ];
  for (const [nom, factionDe] of decoupages) {
    const tailles = compter(eligibles.filter((c) => ![FORMATION_FRANCAISE, ORIGINE_INCONNUE].includes(c.details.langueOrigine)), (c) => factionDe(c.details.langueOrigine));
    const parts = partsDesFactions(tailles, CONFIG.edition.exposantFactions, CONFIG.edition.plafondParFaction);
    L.push(`**Découpage ${nom}** — ${tailles.size} factions`, '');
    L.push(...tableau(['Faction', 'Mots éligibles', "Cartes dans l'édition (environ)"], parTailleDecroissante(tailles).map(([f, n]) => [f, n, Math.round((parts.get(f) ?? 0) * CONFIG.edition.taille)])));
  }

  L.push("### Échantillon de contrôle de la détection", '');
  L.push("*60 cartes de l'édition au hasard : la faction trouvée, et le début de l'étymologie du Wiktionnaire. Sert à mesurer le taux d'erreur.*", '');
  L.push(...tableau(['Mot', 'Faction', 'Héritée de', "Début de l'étymologie"], echantillon(edition, 60, hasard).map((c) => [c.index.mot, c.index.faction, c.herite ?? '', c.details.etymologie.slice(0, 120) || '(aucune)'])));

  return `${L.join('\n')}\n`;
}

// Liste, pour information, des mots familiers les plus crus et des mots injurieux présents dans l'édition.
export function redigerMotsSensibles(edition: CarteComplete[]): string {
  const injurieux = edition.filter((c) => c.index.registre.includes('Injurieux') || c.details.definitions.some((d) => d.registre?.includes('Injurieux')));
  const vulgaires = edition.filter((c) => c.etiquettesDuPremierSens.includes('vulgar'));
  const pejoratifs = edition.filter((c) => c.etiquettesDuPremierSens.includes('pejorative'));
  const liste = (cartes: CarteComplete[]): string => (cartes.length ? cartes.map((c) => c.index.mot).sort((a, b) => a.localeCompare(b, 'fr')).join(', ') : 'aucun');
  return [
    `# Mots sensibles présents dans l'Édition ${CONFIG.edition.numero}`,
    '',
    "*Fichier généré, pour information. Décision de Raphaël : tous les mots sont dans le jeu, y compris les mots injurieux ; ils sont étiquetés pour que le joueur puisse les masquer depuis les Réglages. Pour retirer un mot précis malgré tout, l'ajouter à `data/exclusions.txt`.*",
    '',
    `## Mots ayant au moins un sens étiqueté « injurieux » (${injurieux.length})`,
    '',
    liste(injurieux),
    '',
    `## Mots dont le sens principal est « vulgaire » (${vulgaires.length}) — ils portent le badge « Familier »`,
    '',
    liste(vulgaires),
    '',
    `## Mots dont le sens principal est « péjoratif » (${pejoratifs.length}) — sans badge particulier`,
    '',
    liste(pejoratifs),
    '',
  ].join('\n');
}
