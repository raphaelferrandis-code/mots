// Les textes des posts de la devinette du jour (réseaux sociaux) : le post du jour (question du jour et réponse
// d'hier en images), la réponse publiée sous le post de la veille, les descriptions des images pour les lecteurs
// d'écran, et les liens et mots-dièse que Bluesky veut repérés à l'octet près. Fonctions pures, testées.

import type { Devinette } from '../jeu/devinette.ts';
import { bonneDefinition } from '../jeu/devinette.ts';

export const SITE_DES_POSTS = 'philamots.fr';
export const LIMITE_BLUESKY = 300; // en caractères visibles (graphèmes)
const LETTRES = ['A', 'B', 'C', 'D'];
const MOTS_DIESE = '#devinette #motdujour #languefrançaise';

export const graphemes = (texte: string): number => [...new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(texte)].length;
const pageDuMot = (adresse: string): string => `${SITE_DES_POSTS}/mot/${adresse}/`;

// Coupe au dernier mot entier qui tient, avec des points de suspension.
function couper(texte: string, limite: number): string {
  if (graphemes(texte) <= limite) return texte;
  const morceaux = [...new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(texte)].map((s) => s.segment).slice(0, limite - 1).join('');
  return `${morceaux.slice(0, Math.max(morceaux.lastIndexOf(' '), 1)).replace(/[,;:\s]+$/, '')}…`;
}

// Le post du jour. « hier » : la devinette de la veille (absente le premier jour), et l'adresse de sa page.
export function texteDuPost(aujourdhui: Devinette, hier: { devinette: Devinette; adresse: string } | null): string {
  const question = aujourdhui.format === 'definition'
    ? `Devinette du jour : que veut dire « ${aujourdhui.mot} » ?\nA, B, C ou D : réponds en commentaire.`
    : `Devinette du jour : quel est ce mot de ${aujourdhui.lettres} lettres, qui commence par ${aujourdhui.initiale} ?\nRéponds en commentaire.`;
  return [
    question,
    `Solution demain, ou tout de suite sur ${SITE_DES_POSTS}`,
    ...(hier ? [`\nHier, c'était « ${hier.devinette.mot} » : ${pageDuMot(hier.adresse)}`] : []),
    `\n${MOTS_DIESE}`,
  ].join('\n');
}

// La réponse, publiée sous le post de la veille : ceux qui ont répondu en sont prévenus.
export function texteDeLaReponse(devinette: Devinette, adresse: string): string {
  const tete = devinette.format === 'definition' ? `Réponse ${LETTRES[devinette.bonne]} : « ${devinette.mot} »` : `Réponse : « ${devinette.mot} »`;
  const lien = `\n${pageDuMot(adresse)}`;
  return `${couper(`${tete}, ${bonneDefinition(devinette).replace(/^\p{Lu}/u, (l) => l.toLowerCase())}`, LIMITE_BLUESKY - graphemes(lien))}${lien}`;
}

// Les descriptions des images (texte alternatif) : tout ce que l'image dit, pour qui ne la voit pas.
export function descriptionDeLaQuestion(d: Devinette): string {
  return d.format === 'definition'
    ? `La devinette du jour. Que veut dire « ${d.mot} » ? ${d.propositions.map((p, i) => `${LETTRES[i]} : ${p}`).join(' ')}`
    : `La devinette du jour. Quel est ce mot de ${d.lettres} lettres, qui commence par ${d.initiale} ? Définition : « ${d.definition} »`;
}

export function descriptionDeLaReponse(d: Devinette): string {
  return `La réponse d'hier : « ${d.mot} ». ${bonneDefinition(d)}`;
}

// Les liens et mots-dièse d'un texte, repérés en octets (UTF-8), comme Bluesky les attend.
export type Facette = { index: { byteStart: number; byteEnd: number }; features: ({ $type: 'app.bsky.richtext.facet#link'; uri: string } | { $type: 'app.bsky.richtext.facet#tag'; tag: string })[] };

export function facettes(texte: string): Facette[] {
  const octets = (fin: number): number => new TextEncoder().encode(texte.slice(0, fin)).length;
  const resultat: Facette[] = [];
  for (const m of texte.matchAll(new RegExp(`${SITE_DES_POSTS.replace('.', '\\.')}(?:/[^\\s]*)?`, 'g'))) {
    const index = m.index ?? 0;
    resultat.push({ index: { byteStart: octets(index), byteEnd: octets(index + m[0].length) }, features: [{ $type: 'app.bsky.richtext.facet#link', uri: `https://${m[0]}` }] });
  }
  for (const m of texte.matchAll(/(?<=^|\s)#([\p{L}\p{N}_]+)/gu)) {
    const index = m.index ?? 0;
    resultat.push({ index: { byteStart: octets(index), byteEnd: octets(index + m[0].length) }, features: [{ $type: 'app.bsky.richtext.facet#tag', tag: m[1] }] });
  }
  return resultat.sort((a, b) => a.index.byteStart - b.index.byteStart);
}
