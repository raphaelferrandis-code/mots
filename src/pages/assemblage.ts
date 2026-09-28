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

const IMAGE_DE_PARTAGE_ALT = 'Philamots, le jeu des mots de la langue française imprimés comme des timbres';
// Des données pour Google, dans une balise qu'une définition ne peut pas refermer (« < » échappé).
const donneesStructurees = (donnees: object): string => `<script type="application/ld+json">${JSON.stringify(donnees).replace(/</g, '\\u003c')}</script>`;

// Ce qui va dans <head>, à la place de <!--tete--> dans mot.html. « homonyme » : un autre timbre porte le même mot
// (« beau » nom et adjectif) ; la nature entre alors dans le titre, pour que les deux pages ne se confondent pas.
export function enteteDeLaPage(carte: CarteIndex, details: CarteDetails, texte: TexteDUnePage | undefined, adresse: string, homonyme = false): string {
  const url = `${ADRESSE_DU_SITE}mot/${adresse}/`;
  const titre = `${majuscule(carte.mot)}${homonyme ? ` (${NATURE[carte.type]})` : ''} : définition et origine — Philamots`;
  const premiere = (texte?.definitions[0] ?? details.definitions[0])?.texte ?? carte.definition;
  const description = descriptionDuMot(carte, premiere);
  // Un terme défini, dans un ensemble : ce que Google sait lire d'une page de dictionnaire.
  const terme = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: carte.mot,
    description: premiere,
    inLanguage: 'fr',
    url,
    inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'Philamots — Édition 1', url: `${ADRESSE_DU_SITE}mots/` },
  };
  // Le fil d'Ariane : Philamots › Tous les mots › le mot.
  const fil = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Philamots', item: ADRESSE_DU_SITE },
      { '@type': 'ListItem', position: 2, name: 'Tous les mots', item: `${ADRESSE_DU_SITE}mots/` },
      { '@type': 'ListItem', position: 3, name: carte.mot, item: url },
    ],
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
    `<meta property="og:image:alt" content="${IMAGE_DE_PARTAGE_ALT}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    donneesStructurees(terme),
    donneesStructurees(fil),
  ].join('\n    ');
}

export function enteteDeLaCarte(carte: CarteIndex, genre: 'question' | 'reponse'): string {
  return [`<title>${echapper(carte.mot)} — ${genre === 'question' ? 'devinette' : 'réponse'} du jour</title>`, '<meta name="robots" content="noindex" />'].join('\n    ');
}

export function enteteDeLaListe(nombre: number): string {
  const titre = 'Tous les mots de Philamots';
  const description = `Les ${nombre.toLocaleString('fr-FR')} mots de la langue française du jeu Philamots, de A à Z, avec leur définition et leur origine.`;
  const url = `${ADRESSE_DU_SITE}mots/`;
  return [
    `<title>${titre}</title>`,
    `<meta name="description" content="${echapper(description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Philamots" />',
    '<meta property="og:locale" content="fr_FR" />',
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${titre}" />`,
    `<meta property="og:description" content="${echapper(description)}" />`,
    `<meta property="og:image" content="${ADRESSE_DU_SITE}identite/vignette-partage.jpg" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${IMAGE_DE_PARTAGE_ALT}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
  ].join('\n    ');
}

// Une page légale fixe (/mentions-legales/, /confidentialite/, /conditions/).
export function enteteDeLaPageLegale(chemin: string, titre: string, description: string): string {
  const url = `${ADRESSE_DU_SITE}${chemin}/`;
  return [
    `<title>${echapper(titre)} — Philamots</title>`,
    `<meta name="description" content="${echapper(description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    '<meta property="og:site_name" content="Philamots" />',
    '<meta property="og:locale" content="fr_FR" />',
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${echapper(titre)} — Philamots" />`,
    `<meta property="og:description" content="${echapper(description)}" />`,
  ].join('\n    ');
}

// La page introuvable : hors des résultats de recherche.
export function enteteDeLaPageIntrouvable(): string {
  return ['<title>Page introuvable — Philamots</title>', '<meta name="robots" content="noindex" />'].join('\n    ');
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

// Des dates que Google peut croire (audit de finition, E07) : l'accueil et la liste changent à chaque mise en ligne
// (« site », le jour de la fabrication) ; les pages des mots, avec leurs textes (« mots », la version des textes) ;
// les pages légales, avec leur contenu (« legales »).
export function planDuSite(adresses: string[], jours: { mots: string; site: string; legales: string }, pagesFixes: readonly string[] = []): string {
  const url = (chemin: string, jour: string): string => `  <url>\n    <loc>${ADRESSE_DU_SITE}${chemin}</loc>\n    <lastmod>${jour}</lastmod>\n  </url>`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    url('', jours.site),
    url('mots/', jours.site),
    ...pagesFixes.map((p) => url(`${p}/`, jours.legales)),
    ...adresses.map((a) => url(`mot/${a}/`, jours.mots)),
    '</urlset>',
    '',
  ].join('\n');
}

// L'année d'attestation, dite en clair (« 842 » seul ne se comprend pas) : « attesté en 842 », « attesté au XVIᵉ
// siècle », « attesté vers 1540 ». Rien pour une date « à déterminer ».
export function attestationEnClair(brut: string | null | undefined): string | null {
  const a = brut?.trim() ?? '';
  if (!a || /^à déterminer$/i.test(a)) return null;
  if (/^attesté/i.test(a)) return `a${a.slice(1)}`;
  if (/^\d{3,4}(?:-\d{2,4})?(?:,.*)?$/.test(a)) return `attesté en ${a}`;
  if (/^\d{1,2}(?:er)? \p{L}+ \d{3,4}$/u.test(a)) return `attesté le ${a}`;
  const vers = /^(?:vers|v\.|c\.|ca)\s*(\d{3,4})$/i.exec(a);
  if (vers) return `attesté vers ${vers[1]}`;
  if (/^(?:avant|depuis) \d/i.test(a)) return `attesté ${a.charAt(0).toLowerCase()}${a.slice(1)}`;
  if (/^années \d/i.test(a)) return `attesté dans les ${a.charAt(0).toLowerCase()}${a.slice(1)}`;
  if (/^[IVXLC]+(?:ᵉ|e)(?: siècle)?$/.test(a)) return `attesté au ${a}`;
  return `attesté : ${a.charAt(0).toLowerCase()}${a.slice(1)}`;
}

// Les renvois du Wiktionnaire (« → voir babiller et babine ») : chaque mot renvoyé qui a sa page chez Philamots
// devient un lien ; le reste reste du texte. « liens » : un mot → l'adresse de sa page.
export type MorceauDeTexte = { texte: string; adresse?: string };
export function avecLesRenvois(texte: string, liens: ReadonlyMap<string, string>): MorceauDeTexte[] {
  const morceaux: MorceauDeTexte[] = [];
  let reste = 0;
  const pousser = (t: string, adresse?: string) => { if (t) morceaux.push(adresse ? { texte: t, adresse } : { texte: t }); };
  for (const renvoi of texte.matchAll(/→ voir ((?:[\p{L}’'-]+)(?:(?:, | et )[\p{L}’'-]+)*)/gu)) {
    const debut = renvoi.index + renvoi[0].length - renvoi[1].length;
    pousser(texte.slice(reste, debut));
    for (const partie of renvoi[1].split(/(, | et )/)) {
      pousser(partie, /^(?:, | et )$/.test(partie) ? undefined : liens.get(partie) ?? liens.get(partie.toLowerCase()));
    }
    reste = renvoi.index + renvoi[0].length;
  }
  pousser(texte.slice(reste));
  // Les morceaux de texte voisins se rejoignent.
  return morceaux.reduce<MorceauDeTexte[]>((tous, m) => {
    const dernier = tous[tous.length - 1];
    if (dernier && !dernier.adresse && !m.adresse) dernier.texte += m.texte; else tous.push({ ...m });
    return tous;
  }, []);
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
// « absolu » : pour la page introuvable, que l'hébergeur sert à n'importe quelle profondeur (chemins depuis « / »).
export function adapterLeModele(modele: string, profondeur: number | 'absolu'): string {
  const remonter = profondeur === 'absolu' ? '/' : '../'.repeat(profondeur);
  return modele
    .replace(/<script type="module"[^>]*><\/script>\s*/g, '')
    .replace(/<link rel="modulepreload"[^>]*>\s*/g, '')
    .replace(/<!-- Le modèle des pages[\s\S]*?-->\s*/, '')
    .replace(/(href|src)="\.\//g, `$1="${remonter}`);
}
