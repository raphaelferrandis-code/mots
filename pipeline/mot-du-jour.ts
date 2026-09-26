// Le calendrier du « mot du jour » : un an de mots, pour l'accueil du jeu et les réseaux sociaux.
// Usage : npm run motdujour:choisir   (une fois ; ensuite, data/mot-du-jour.txt se retouche à la main)
//
// Choisit des mots « déjà entendus mais mal connus » (connus de 15 à 75 % des gens), avec une définition courte et
// claire, et les ordonne pour varier : jamais deux fois de suite la même nature, pas la même faction trois jours de
// suite. Quelques dates ont leur mot (Halloween, Saint-Valentin, Noël), dont deux injures bon enfant (pignouf, conchier).

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { TextesDesPages } from '../src/partage/pagesDesMots.ts';
import { lotDeLaCarte, nomDuLot } from '../src/partage/lots.ts';
import type { CarteDetails, CarteIndex, IndexEdition } from '../src/partage/types.ts';

const RACINE = path.join(import.meta.dirname, '..');
const lire = (...morceaux: string[]): string => readFileSync(path.join(RACINE, ...morceaux), 'utf8');
const SORTIE = path.join(RACINE, 'data', 'mot-du-jour.txt');
const DEBUT = '2026-09-27';
const JOURS = 365;

// Des insultes, seules celles qu'un réseau social laisse passer : les autres (racistes, homophobes, sexistes) valent
// un retrait de publication, voire du compte, même présentées comme un mot du dictionnaire.
const INJURIEUX_ADMIS = new Set(['pignouf', 'conchier']);
const DATES: Record<string, string> = { '10-31': 'fantasmagorie-nom', '02-14': 'amour-nom', '12-25': 'cadeau-nom', '10-09': 'pignouf-nom', '11-20': 'conchier-verbe' };

if (existsSync(SORTIE) && !process.argv.includes('--refaire')) {
  console.error('data/mot-du-jour.txt existe déjà (et a peut-être été retouché). Pour le refaire : npm run motdujour:choisir -- --refaire');
  process.exit(1);
}

const edition = JSON.parse(lire('public', 'data', 'edition-1.index.json')) as IndexEdition;
const lots = Array.from({ length: edition.meta.lots }, (_, lot) => JSON.parse(lire('public', 'data', 'details', nomDuLot(lot))) as Record<string, CarteDetails>);
const textes = JSON.parse(lire('data', 'pages-des-mots.json')) as TextesDesPages;
const detailsDe = (c: CarteIndex): CarteDetails => lots[lotDeLaCarte(c.id, edition.meta.lots)][c.id];

const POIDS_RARETE: Record<CarteIndex['rarete'], number> = { 'Commune': 0, 'Peu commune': 1, 'Rare': 2, 'Épique': 2.5, 'Légendaire': 3, 'Hors-série': 3 };

function note(c: CarteIndex): number | null {
  const d = detailsDe(c);
  if (c.registre.includes('Injurieux') && !INJURIEUX_ADMIS.has(c.mot)) return null;
  if (d.prevalence === null || d.prevalence < 15 || d.prevalence > 75) return null;
  const premiere = d.definitions[0];
  if (!premiere?.quiz || premiere.texte.length < 35 || premiere.texte.length > 160) return null;
  if (c.mot.length < 4 || c.mot.includes('-') || c.mot.includes(' ')) return null;
  // « Relatif à l'ovale » : une définition qui n'apprend rien ne fait pas un bon mot du jour.
  if (/^(?:relatif|relative|qui (?:a rapport|concerne|se rapporte))/i.test(premiere.texte)) return null;
  const origine = textes.mots[c.id]?.etymologies[0] ?? d.etymologie;
  return POIDS_RARETE[c.rarete]
    - Math.abs(d.prevalence - 40) / 20 // le mot que l'on a « déjà entendu » sans savoir le définir
    + (c.registre.some((r) => r === 'Littéraire' || r === 'Vieilli') ? 1 : 0)
    + (origine.length > 80 ? 0.5 : 0) // une origine qui se raconte
    + (c.faction === "Langues d'ailleurs" || c.faction === 'Arabe' || c.faction === 'Onomatopée' ? 0.5 : 0);
}

const candidats = edition.cartes
  .map((c) => ({ c, n: note(c) }))
  .filter((x): x is { c: CarteIndex; n: number } => x.n !== null)
  .sort((a, b) => b.n - a.n || a.c.id.localeCompare(b.c.id));

const jour = (i: number): Date => new Date(Date.parse(`${DEBUT}T12:00:00Z`) + i * 86_400_000);
const reserves = new Set(Object.values(DATES));
const restants = candidats.filter((x) => !reserves.has(x.c.id)).slice(0, 700);
const choisis: CarteIndex[] = [];
// Aucune origine ne dépasse un cinquième de l'année (le latin, à lui seul, en prendrait plus d'un tiers).
const parFaction = new Map<string, number>();
const plafond = Math.ceil(JOURS * 0.2);
for (let i = 0; i < JOURS; i++) {
  const date = jour(i).toISOString().slice(5, 10);
  const impose = DATES[date] && edition.cartes.find((c) => c.id === DATES[date]);
  if (impose) { choisis.push(impose); continue; }
  const [avant, avantAvant] = [choisis.at(-1), choisis.at(-2)];
  const rang = restants.findIndex(({ c }) => (parFaction.get(c.faction) ?? 0) < plafond
    && c.type !== avant?.type
    && !(c.faction === avant?.faction && c.faction === avantAvant?.faction)
    && c.mot[0] !== avant?.mot[0]);
  const choisi = restants.splice(Math.max(rang, 0), 1)[0].c;
  parFaction.set(choisi.faction, (parFaction.get(choisi.faction) ?? 0) + 1);
  choisis.push(choisi);
}

writeFileSync(SORTIE, [
  '# Le mot du jour : un mot par ligne (son identifiant de carte), dans l\'ordre des jours.',
  `# Premier jour : ${DEBUT}. Retirer une ligne décale les suivants d'un jour ; en ajouter une, c'est l'inverse.`,
  '# Fabriqué par « npm run motdujour:choisir », puis retouché à la main.',
  ...choisis.map((c) => c.id),
  '',
].join('\n'));
console.log(`${choisis.length} mots écrits dans data/mot-du-jour.txt (${candidats.length} candidats).`);
