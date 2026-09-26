// Ce qui entoure le rendu des pages par mot : l'en-tête (titre, description, aperçu de partage, données pour Google),
// le choix des timbres voisins et le plan du site. Sans lecture ni écriture de fichier : testé par assemblage.test.ts.

import type { TexteDUnePage } from '../partage/pagesDesMots.ts';
import type { CarteDetails, CarteIndex } from '../partage/types.ts';

export const ADRESSE_DU_SITE = 'https://philamots.fr/';
const NATURE: Record<CarteIndex['type'], string> = { Nom: 'nom', Verbe: 'verbe', Adjectif: 'adjectif', Adverbe: 'adverbe' };

export const echapper = (texte: string): string => texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const majuscule = (mot: string): string => mot.charAt(0).toLocaleUpperCase('fr-FR') + mot.slice(1);

// La description que Google affiche sous le titre : la première définition, coupée vers 155 caractères.
export function descriptionDuMot(carte: CarteIndex, premiere: string): string {
  const debut = `${majuscule(carte.mot)} (${NATURE[carte.type]}) : `;
  const place = 155 - debut.length;
  if (premiere.length <= place) return debut + premiere;
  const coupe = premiere.slice(0, place - 1);
  return `${debut}${coupe.slice(0, Math.max(coupe.lastIndexOf(' '), place * 0.6)).replace(/[,;:\s]+$/, '')}…`;
}

// Ce qui va dans <head>, à la place de <!--tete--> dans mot.html.
export function enteteDeLaPage(carte: CarteIndex, details: CarteDetails, texte: TexteDUnePage | undefined, adresse: string): string {
  const url = `${ADRESSE_DU_SITE}mot/${adresse}/`;
  const titre = `${majuscule(carte.mot)} : définition et origine — Philamots`;
  const premiere = (texte?.definitions[0] ?? details.definitions[0])?.texte ?? carte.definition;
  const description = descriptionDuMot(carte, premiere);
  // Un terme défini, dans un ensemble : ce que Google sait lire d'une page de dictionnaire.
  const donnees = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: carte.mot,
    description: premiere,
    url,
    inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'Philamots — Édition 1', url: `${ADRESSE_DU_SITE}mots/` },
  };
  return [
    `<title>${echapper(titre)}</title>`,
    `<meta name="description" content="${echapper(description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    '<meta property="og:type" content="article" />',
    '<meta property="og:site_name" content="Philamots" />',
    '<meta property="og:locale" content="fr_FR" />',
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${echapper(titre)}" />`,
    `<meta property="og:description" content="${echapper(description)}" />`,
    `<meta property="og:image" content="${ADRESSE_DU_SITE}identite/vignette-partage.jpg" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    // « < » échappé : une définition ne peut pas refermer la balise.
    `<script type="application/ld+json">${JSON.stringify(donnees).replace(/</g, '\\u003c')}</script>`,
  ].join('\n    ');
}

export function enteteDeLaListe(nombre: number): string {
  const titre = 'Tous les mots de Philamots';
  const description = `Les ${nombre.toLocaleString('fr-FR')} mots de la langue française du jeu Philamots, de A à Z, avec leur définition et leur origine.`;
  return [
    `<title>${titre}</title>`,
    `<meta name="description" content="${echapper(description)}" />`,
    `<link rel="canonical" href="${ADRESSE_DU_SITE}mots/" />`,
    `<meta property="og:title" content="${titre}" />`,
    `<meta property="og:image" content="${ADRESSE_DU_SITE}identite/vignette-partage.jpg" />`,
  ].join('\n    ');
}

// Un ordre mélangé, mais toujours le même pour un mot donné : les pages ne changent pas d'une mise en ligne à l'autre.
function melange(texte: string): number {
  let h = 2166136261;
  for (let i = 0; i < texte.length; i++) h = Math.imul(h ^ texte.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Six timbres de la même faction, pour passer d'une page à l'autre.
export function voisinsDe<T extends Pick<CarteIndex, 'id' | 'faction'>>(carte: T, cartes: T[], nombre = 6): T[] {
  return cartes.filter((c) => c.faction === carte.faction && c.id !== carte.id)
    .map((c) => ({ c, rang: melange(c.id + carte.id) }))
    .sort((a, b) => a.rang - b.rang)
    .slice(0, nombre)
    .map(({ c }) => c);
}

export function planDuSite(adresses: string[], jour: string): string {
  const url = (chemin: string): string => `  <url>\n    <loc>${ADRESSE_DU_SITE}${chemin}</loc>\n    <lastmod>${jour}</lastmod>\n  </url>`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!-- Fabriqué par scripts/fabriquer-les-pages.ts : l\'accueil, la liste des mots et une page par mot. -->',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    url(''),
    url('mots/'),
    ...adresses.map((a) => url(`mot/${a}/`)),
    '</urlset>',
    '',
  ].join('\n');
}

// Les guillochis (rosaces de milliers de points) pèsent jusqu'à 30 Ko chacun : sur neuf timbres, une page en ferait
// 300. Le grand timbre les garde, au dixième près au lieu du centième (invisible à l'œil) ; les petits timbres, où
// l'on ne les distingue pas, s'en passent.
const GUILLOCHIS = /<path\b[^>]*?\sd="(M[-\d.]+ [-\d.]+(?:L[-\d.]+ [-\d.]+){100,}Z)"[^>]*>(?:<\/path>)?/g;
const auDixieme = (nombre: string): string => String(Math.round(Number(nombre) * 10) / 10);

export function allegerLesTimbres(html: string, finDuGrandTimbre: string): string {
  const coupure = html.indexOf(finDuGrandTimbre);
  if (coupure === -1) return html.replace(GUILLOCHIS, '');
  const grand = html.slice(0, coupure).replace(GUILLOCHIS, (balise, d: string) => balise.replace(d, d.replace(/-?\d+\.\d+/g, auDixieme).replace(/L/g, ' ')));
  return grand + html.slice(coupure).replace(GUILLOCHIS, '');
}

// Le modèle construit par Vite (dist/mot.html) vit à la racine ; les pages, deux niveaux plus bas (ou un seul pour la
// liste). Le script du modèle n'apporte que les feuilles de style : on le retire, les pages n'ont aucun code.
export function adapterLeModele(modele: string, profondeur: number): string {
  const remonter = '../'.repeat(profondeur);
  return modele
    .replace(/<script type="module"[^>]*><\/script>\s*/g, '')
    .replace(/<link rel="modulepreload"[^>]*>\s*/g, '')
    .replace(/<!-- Le modèle des pages[\s\S]*?-->\s*/, '')
    .replace(/(href|src)="\.\//g, `$1="${remonter}`);
}
