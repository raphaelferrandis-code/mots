// L'image d'un timbre, pour la partager ou l'enregistrer : le timbre tel que le jeu l'affiche (Timbre.tsx et
// timbre.css), posé sur le bleu nuit du jeu, avec son mot, sa définition et l'adresse du site.
//
// Comment : le vrai timbre est monté hors de l'écran, en grand, le temps de lire ce que le navigateur en a calculé
// (places, couleurs, dégradés, ombres, lettres, dessins) ; puis tout est repeint sur un canevas. On ne
// « photographie » pas l'écran : un navigateur comme Safari ne sait pas mettre du HTML dans un canevas, et l'image
// doit être la même partout. Mais comme on lit les styles calculés, l'image suit d'elle-même les réglages de
// timbre.css (couleurs de rareté, filets, finitions…). Ce que le peintre sait dessiner est listé plus bas
// (peindreUnElement, peindreDuSvg) : une nouvelle sorte d'effet dans timbre.css (un flou, un masque d'une autre
// forme…) demande d'être ajoutée ici, sinon elle manquera sur l'image.

import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { SITE } from '../../config/site.ts';
import type { CarteIndex, Finition } from '../../partage/types.ts';
import { chiffresPlaces } from '../timbre/chiffresAlignes.ts';
import { Timbre } from '../timbre/Timbre.tsx';
import { couperEnLignes } from './miseEnLignes.ts';
import {
  cadrer, decouper, ecrireCouleur, lecteurDeBordureImage, lecteurDeCouche, lettresLeLongDuChemin, lireCouleur,
  lireLesAdresses, lireLesFonds, lireLesOmbres, lireLongueur, lisserLesAplats, peindreLeFond, placerLesLettres, preparerLeBruit, resoudre, turbulence,
} from './pinceaux.ts';
import type { Couche, Degrade, Rvba } from './pinceaux.ts';

export type Habillage = { finition: Finition; obtenuLe?: number | null };

type Contexte = CanvasRenderingContext2D;
type Boite = { x: number; y: number; l: number; h: number };

// Le timbre est lu à cette largeur (px) : les arrondis du navigateur (épaisseur des bordures, lignes de texte)
// y deviennent invisibles, puis tout est réduit à la taille de l'image.
const LARGEUR_SONDE = 3000;

// Le timbre lu est figé : pas d'animation (rosaces des Hors-série, poussières), et les poussières gardent l'éclat
// qu'elles ont quand les animations sont réduites (timbre.css).
const STYLE_SONDE = '.sonde-du-partage *, .sonde-du-partage *::before, .sonde-du-partage *::after { animation: none !important; transition: none !important; }'
  + ' .sonde-du-partage .tb__grain { opacity: .5 !important; }';

// L'effet moyen du grain du papier (texture --grain-papier, fondue en « multiply ») si l'on ne peut pas le mesurer :
// assombrissement par canal pour une opacité de 1. Un vrai grain alourdirait l'image sans se voir à cette taille.
const GRAIN_MOYEN: [number, number, number] = [0.0896, 0.1052, 0.125];

// ── L'atelier : la sonde (le timbre monté hors de l'écran) et les toiles de travail ─────────────────────────

type Atelier = {
  sonde: HTMLElement; // le conteneur de la sonde : les identifiants (filtres, chemins) se cherchent dedans
  timbre: HTMLElement; // l'élément .tb de la sonde
  origine: DOMRect; // sa place à l'écran, pour ramener les mesures au coin du timbre
  k: number; // de la sonde (px) à l'image (px)
  largeur: number;
  hauteur: number;
  grains: Map<string, [number, number, number]>; // effet moyen des textures (url) de fond, par adresse
  toiles: HTMLCanvasElement[]; // réserve de toiles de la taille du timbre
};

function nouvelleToile(largeur: number, hauteur: number): HTMLCanvasElement {
  const toile = document.createElement('canvas');
  toile.width = largeur;
  toile.height = hauteur;
  return toile;
}

function contexteDe(toile: HTMLCanvasElement): Contexte {
  const ctx = toile.getContext('2d');
  if (!ctx) throw new Error("Ce navigateur ne sait pas dessiner l'image.");
  return ctx;
}

function emprunterUneToile(at: Atelier): Contexte {
  const toile = at.toiles.pop() ?? nouvelleToile(at.largeur, at.hauteur);
  const ctx = contexteDe(toile);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, at.largeur, at.hauteur);
  return ctx;
}

function rendreLaToile(at: Atelier, ctx: Contexte): void {
  at.toiles.push(ctx.canvas);
}

// Pose une toile de travail sur une autre, avec une opacité et un mode de fusion (mix-blend-mode).
function poser(cible: Contexte, source: HTMLCanvasElement, opacite = 1, mode = 'normal'): void {
  cible.save();
  cible.setTransform(1, 0, 0, 1, 0, 0);
  cible.globalAlpha = opacite;
  cible.globalCompositeOperation = (mode === 'normal' ? 'source-over' : mode) as GlobalCompositeOperation;
  cible.drawImage(source, 0, 0);
  cible.restore();
}

const px = (valeur: string): number => parseFloat(valeur) || 0;

// Un élément de la sonde par son identifiant (ceux de React, rendus uniques à la sonde par leur préfixe).
const parIdentifiant = (at: Atelier, id: string): Element | null => at.sonde.querySelector(`#${CSS.escape(id)}`);
const transparente = (couleur: Rvba | null): boolean => !couleur || couleur[3] === 0;

// ── Places et transformations ────────────────────────────────────────────────

// La place d'un élément dans le timbre, sans ses transformations (rotate, transform…), en px de la sonde.
function placeDe(el: Element, at: Atelier): Boite {
  if (el instanceof HTMLElement) {
    let x = 0;
    let y = 0;
    let e: HTMLElement | null = el;
    while (e && e !== at.timbre) {
      x += e.offsetLeft;
      y += e.offsetTop;
      e = e.offsetParent as HTMLElement | null;
    }
    return { x, y, l: el.offsetWidth, h: el.offsetHeight };
  }
  // Un dessin SVG posé dans le HTML : sa place se lit dans ses styles (left, top, largeur, hauteur calculées),
  // depuis le bloc qui le contient.
  const s = getComputedStyle(el);
  const parent = el.parentElement ? placeDe(el.parentElement, at) : { x: 0, y: 0, l: 0, h: 0 };
  const absolu = s.position === 'absolute' || s.position === 'fixed';
  return {
    x: parent.x + (absolu ? px(s.left) : 0) + px(s.marginLeft),
    y: parent.y + (absolu ? px(s.top) : 0) + px(s.marginTop),
    l: px(s.width),
    h: px(s.height),
  };
}

// La transformation CSS propre à un élément (translate, rotate, scale, puis transform, autour de transform-origin).
function transformationDe(el: Element, boite: Boite): DOMMatrix | null {
  const s = getComputedStyle(el);
  const m = new DOMMatrix();
  let transforme = false;
  const [ox = 0, oy = 0] = s.transformOrigin.split(/\s+/).map(px);
  if (s.translate && s.translate !== 'none') {
    const [tx = '0', ty = '0'] = s.translate.split(/\s+/);
    const l = (v: string, ref: number): number => { const lu = lireLongueur(v); return lu ? resoudre(lu, ref) : 0; };
    m.translateSelf(l(tx, boite.l), l(ty, boite.h));
    transforme = true;
  }
  if (s.rotate && s.rotate !== 'none') {
    const angle = s.rotate.match(/(-?[\d.]+)deg\s*$/);
    if (angle) { m.translateSelf(ox, oy).rotateSelf(parseFloat(angle[1])).translateSelf(-ox, -oy); transforme = true; }
  }
  if (s.scale && s.scale !== 'none') {
    const [sx, sy = sx] = s.scale.split(/\s+/).map(parseFloat);
    m.translateSelf(ox, oy).scaleSelf(sx, sy).translateSelf(-ox, -oy);
    transforme = true;
  }
  if (s.transform && s.transform !== 'none') {
    m.translateSelf(ox, oy).multiplySelf(new DOMMatrix(s.transform)).translateSelf(-ox, -oy);
    transforme = true;
  }
  return transforme ? m : null;
}

// La matrice qui mène du repère d'un élément (coin haut gauche de sa boîte) au repère du timbre, transformations
// de l'élément et de ses parents comprises.
function matriceDe(el: Element, at: Atelier): DOMMatrix {
  const chaine: Element[] = [];
  for (let e: Element | null = el; e && e !== at.timbre; e = e.parentElement) chaine.unshift(e);
  const m = new DOMMatrix();
  let precedente = { x: 0, y: 0, l: 0, h: 0 };
  for (const e of chaine) {
    const place = placeDe(e, at);
    m.translateSelf(place.x - precedente.x, place.y - precedente.y);
    const t = transformationDe(e, place);
    if (t) m.multiplySelf(t);
    precedente = place;
  }
  return m;
}

const sansRotation = (m: DOMMatrix): boolean => Math.abs(m.b) < 1e-9 && Math.abs(m.c) < 1e-9 && Math.abs(m.a - 1) < 1e-9 && Math.abs(m.d - 1) < 1e-9;

// La boîte d'un élément dans le repère du timbre, s'il n'est ni tourné ni agrandi (sinon null).
function boiteDroite(el: Element, at: Atelier): Boite | null {
  const m = matriceDe(el, at);
  if (!sansRotation(m)) return null;
  const place = placeDe(el, at);
  return { x: m.e, y: m.f, l: place.l, h: place.h };
}

// Les pseudo-éléments ::before et ::after, placés en absolu dans leur parent.
function boiteDuPseudo(s: CSSStyleDeclaration, parent: Boite): Boite {
  const haut = px(s.top), gauche = px(s.left);
  const l = s.right !== 'auto' && s.left !== 'auto' ? parent.l - gauche - px(s.right) : px(s.width) + px(s.borderLeftWidth) + px(s.borderRightWidth) + px(s.paddingLeft) + px(s.paddingRight);
  const h = s.bottom !== 'auto' && s.top !== 'auto' ? parent.h - haut - px(s.bottom) : px(s.height) + px(s.borderTopWidth) + px(s.borderBottomWidth) + px(s.paddingTop) + px(s.paddingBottom);
  return { x: parent.x + gauche, y: parent.y + haut, l, h };
}

// ── Les boîtes : fonds, bordures, ombres ─────────────────────────────────────

// Les couches de fond d'une boîte (background-image, -size, -position), prêtes à peindre.
function couchesDuFond(s: CSSStyleDeclaration, boite: Boite): Couche[] {
  const fonds = lireLesFonds(s.backgroundImage);
  const tailles = decouper(s.backgroundSize);
  const positions = decouper(s.backgroundPosition);
  const couches: Couche[] = [];
  fonds.forEach((fond, i) => {
    if (!fond || fond === 'image') return;
    // Un dégradé n'a pas de taille propre : « auto » (ou cover, contain) vaut la boîte entière.
    const [tailleX = 'auto', tailleY = 'auto'] = (tailles[i % tailles.length] ?? 'auto').split(/\s+/);
    const cote = (valeur: string, place: number): number => { const l = lireLongueur(valeur); return l ? resoudre(l, place) : place; };
    const tl = cote(tailleX, boite.l);
    const th = cote(tailleY, boite.h);
    // background-position : un pourcentage aligne ce point de la tuile sur le même point de la boîte.
    const [posX = '0%', posY = '50%'] = (positions[i % positions.length] ?? '0% 0%').split(/\s+/);
    const decale = (valeur: string, place: number, tuile: number): number => { const l = lireLongueur(valeur); return !l ? 0 : l.u === '%' ? ((place - tuile) * l.v) / 100 : l.v; };
    couches.push({ degrade: fond, tuile: [tl, th], decalage: [decale(posX, boite.l, tl), decale(posY, boite.h, th)] });
  });
  return couches;
}

// Peint un fond calculé pixel par pixel sur une toile, à la place de la boîte.
function peindreDesPixels(ctx: Contexte, boite: Boite, at: Atelier, couleur: Rvba | null, couches: Couche[], bord = 0, lecteur?: (x: number, y: number, sortie: Float64Array) => void): void {
  const pixels = cadrer(boite, at.k);
  if (!pixels.largeur || !pixels.hauteur) return;
  peindreLeFond(pixels, boite, at.k, couleur, lecteur ? [lecteur] : couches.map(lecteurDeCouche), bord);
  const toile = nouvelleToile(pixels.largeur, pixels.hauteur);
  contexteDe(toile).putImageData(new ImageData(pixels.donnees, pixels.largeur, pixels.hauteur), 0, 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(toile, pixels.x, pixels.y);
  ctx.restore();
}

// Un anneau plein (ombre sans flou, bordure unie) : entre la boîte et la même boîte rentrée de « epaisseur ».
function anneau(ctx: Contexte, boite: Boite, epaisseur: number, couleur: Rvba, at: Atelier): void {
  if (epaisseur <= 0 || transparente(couleur)) return;
  const k = at.k;
  ctx.save();
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.fillStyle = ecrireCouleur(couleur);
  ctx.beginPath();
  ctx.rect(boite.x, boite.y, boite.l, boite.h);
  ctx.rect(boite.x + epaisseur, boite.y + epaisseur, boite.l - 2 * epaisseur, boite.h - 2 * epaisseur);
  ctx.fill('evenodd');
  ctx.restore();
}

// Un fond découpé aux lettres (background-clip: text) : le texte doré des finitions Brillante, le rang irisé.
const texteDore = (s: CSSStyleDeclaration): boolean => s.backgroundClip === 'text' || s.getPropertyValue('-webkit-background-clip') === 'text';

// Une boîte dont le fond n'est qu'une texture fondue en « multiply » (le grain du papier) : on pose son effet moyen,
// en teinte unie (l'opacité de la boîte est déjà comptée dans l'effet). Rend true si c'était le cas.
function peindreUneTexture(ctx: Contexte, s: CSSStyleDeclaration, boite: Boite, at: Atelier): boolean {
  const fonds = lireLesFonds(s.backgroundImage);
  const [adresse] = lireLesAdresses(s.backgroundImage);
  if (fonds.length !== 1 || fonds[0] !== 'image' || !adresse || s.mixBlendMode !== 'multiply') return false;
  const effet = at.grains.get(adresse);
  if (!effet) return true;
  ctx.save();
  ctx.setTransform(at.k, 0, 0, at.k, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = ecrireCouleur([255 * (1 - effet[0]), 255 * (1 - effet[1]), 255 * (1 - effet[2]), 1]);
  ctx.fillRect(boite.x, boite.y, boite.l, boite.h);
  ctx.restore();
  return true;
}

// Le fond, les ombres et la bordure d'une boîte (un élément ou un pseudo-élément), dans l'ordre de CSS.
function peindreLaBoite(ctx: Contexte, s: CSSStyleDeclaration, boite: Boite, at: Atelier): void {
  const ombres = lireLesOmbres(s.boxShadow);
  const rond = s.borderTopLeftRadius === '50%';
  const couleur = lireCouleur(s.backgroundColor);
  // Une pastille ronde et lumineuse (poussières des Hors-série) : couleur de fond, halo flou.
  if (rond) {
    ctx.save();
    ctx.setTransform(at.k, 0, 0, at.k, 0, 0);
    const halo = ombres.find((o) => !o.interieure);
    if (halo) { ctx.shadowColor = ecrireCouleur(halo.couleur); ctx.shadowBlur = halo.flou * at.k; }
    ctx.fillStyle = ecrireCouleur(couleur ?? [0, 0, 0, 0]);
    ctx.beginPath();
    ctx.ellipse(boite.x + boite.l / 2, boite.y + boite.h / 2, boite.l / 2, boite.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  for (const o of ombres) if (!o.interieure && o.flou === 0) anneau(ctx, { x: boite.x - o.etendue + o.x, y: boite.y - o.etendue + o.y, l: boite.l + 2 * o.etendue, h: boite.h + 2 * o.etendue }, o.etendue, o.couleur, at);
  if (!texteDore(s)) {
    const couches = couchesDuFond(s, boite);
    if (!transparente(couleur) || couches.length) peindreDesPixels(ctx, boite, at, transparente(couleur) ? null : couleur, couches);
  }
  // Les ombres intérieures, de la dernière à la première (la première est au-dessus).
  for (const o of [...ombres].reverse()) if (o.interieure && o.flou === 0) anneau(ctx, boite, o.etendue, o.couleur, at);
  // La bordure : unie, ou peinte d'un dégradé (border-image).
  const bord = px(s.borderTopWidth);
  if (bord > 0 && s.borderTopStyle !== 'none') {
    const source = s.borderImageSource && s.borderImageSource !== 'none' ? lireLesFonds(s.borderImageSource)[0] : null;
    if (source && source !== 'image') peindreDesPixels(ctx, boite, at, null, [], bord, lecteurDeBordureImage(source as Degrade, boite.l, boite.h, bord));
    else anneau(ctx, boite, bord, lireCouleur(s.borderTopColor) ?? [0, 0, 0, 0], at);
  }
}

// ── Les textes du HTML ───────────────────────────────────────────────────────

const policeDe = (s: CSSStyleDeclaration, taille = px(s.fontSize)): string => `${s.fontStyle === 'italic' ? 'italic ' : ''}${s.fontWeight} ${taille}px ${s.fontFamily}`;

function transformerLeTexte(texte: string, s: CSSStyleDeclaration): string {
  if (s.textTransform === 'uppercase') return texte.toLocaleUpperCase('fr');
  if (s.textTransform === 'lowercase') return texte.toLocaleLowerCase('fr');
  return texte;
}

// Les chiffres alignés de Playfair (lining-nums), que le canevas ne sait pas choisir : tracés d'après la police.
function chiffresAlignes(s: CSSStyleDeclaration): boolean {
  return s.fontVariantNumeric.includes('lining-nums') && s.fontFamily.includes('Playfair Display') && px(s.fontWeight) >= 800;
}

// Dessine les lettres d'un nœud de texte, chacune à la place exacte que le navigateur lui a donnée (espacement,
// crénage et capitales compris). « couleur » impose une teinte (masque des textes dorés).
function peindreUnTexte(ctx: Contexte, noeud: Text, at: Atelier, couleur?: string): void {
  const parent = noeud.parentElement;
  if (!parent || !noeud.data.trim()) return;
  const s = getComputedStyle(parent);
  const teinte = couleur ?? (transparente(lireCouleur(s.color)) ? null : s.color);
  if (!teinte) return;
  const taille = px(s.fontSize);
  ctx.save();
  ctx.setTransform(at.k, 0, 0, at.k, 0, 0);
  ctx.font = policeDe(s);
  ctx.fillStyle = teinte;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const montante = ctx.measureText('H').fontBoundingBoxAscent || taille * 0.9;
  const ombre = couleur ? undefined : lireLesOmbres(s.textShadow)[0];
  if (ombre) {
    ctx.shadowColor = ecrireCouleur(ombre.couleur);
    ctx.shadowBlur = ombre.flou * at.k;
    ctx.shadowOffsetX = ombre.x * at.k;
    ctx.shadowOffsetY = ombre.y * at.k;
  }
  const alignes = chiffresAlignes(s);
  const plage = document.createRange();
  let i = 0;
  for (const lettre of noeud.data) {
    plage.setStart(noeud, i);
    plage.setEnd(noeud, i + lettre.length);
    i += lettre.length;
    if (!lettre.trim()) continue;
    const r = plage.getBoundingClientRect();
    const x = r.left - at.origine.left;
    const base = r.top - at.origine.top + montante;
    if (alignes && /\d/.test(lettre)) {
      const [chiffre] = chiffresPlaces(lettre);
      ctx.save();
      ctx.translate(x, base);
      ctx.scale(taille / 1000, taille / 1000);
      ctx.fill(new Path2D(chiffre.contour));
      ctx.restore();
    } else ctx.fillText(transformerLeTexte(lettre, s), x, base);
  }
  ctx.restore();
}

// Tous les textes sous un élément (pour les textes dorés, découpés dans leur fond).
function textesSous(el: Element): Text[] {
  const textes: Text[] = [];
  const marcheur = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = marcheur.nextNode(); n; n = marcheur.nextNode()) textes.push(n as Text);
  return textes;
}

// ── Les dessins SVG ──────────────────────────────────────────────────────────

function transformationSvg(el: SVGGraphicsElement): DOMMatrix | null {
  const liste = el.transform?.baseVal;
  if (!liste || liste.numberOfItems === 0) return null;
  const m = liste.consolidate()?.matrix;
  return m ? new DOMMatrix([m.a, m.b, m.c, m.d, m.e, m.f]) : null;
}

// Le passage du repère d'un <svg> (viewBox) à sa boîte, comme preserveAspectRatio="xMidYMid meet" par défaut.
function repereDuViewBox(svg: SVGSVGElement, l: number, h: number): DOMMatrix {
  const vb = svg.viewBox?.baseVal;
  if (!vb || !vb.width || !vb.height) return new DOMMatrix();
  const aucun = svg.getAttribute('preserveAspectRatio') === 'none';
  const ex = l / vb.width;
  const ey = h / vb.height;
  const e = Math.min(ex, ey);
  return aucun
    ? new DOMMatrix().scaleSelf(ex, ey).translateSelf(-vb.x, -vb.y)
    : new DOMMatrix().translateSelf((l - vb.width * e) / 2, (h - vb.height * e) / 2).scaleSelf(e, e).translateSelf(-vb.x, -vb.y);
}

function poserLeRepere(ctx: Contexte, m: DOMMatrix, at: Atelier): void {
  ctx.setTransform(m.a * at.k, m.b * at.k, m.c * at.k, m.d * at.k, m.e * at.k, m.f * at.k);
}

// Le trait et le remplissage d'une forme, avec les styles calculés de l'élément.
function peindreUneForme(ctx: Contexte, chemin: Path2D, s: CSSStyleDeclaration): void {
  const opacite = parseFloat(s.opacity);
  const remplissage = s.fill && s.fill !== 'none' ? lireCouleur(s.fill) : null;
  const trait = s.stroke && s.stroke !== 'none' ? lireCouleur(s.stroke) : null;
  if (!transparente(remplissage)) {
    ctx.globalAlpha = opacite * parseFloat(s.fillOpacity || '1');
    ctx.fillStyle = ecrireCouleur(remplissage!);
    ctx.fill(chemin, s.fillRule === 'evenodd' ? 'evenodd' : 'nonzero');
  }
  const epaisseur = px(s.strokeWidth);
  if (!transparente(trait) && epaisseur > 0) {
    ctx.globalAlpha = opacite * parseFloat(s.strokeOpacity || '1');
    ctx.strokeStyle = ecrireCouleur(trait!);
    ctx.lineWidth = epaisseur;
    ctx.lineCap = s.strokeLinecap as CanvasLineCap;
    ctx.lineJoin = s.strokeLinejoin as CanvasLineJoin;
    ctx.setLineDash(s.strokeDasharray && s.strokeDasharray !== 'none' ? decouper(s.strokeDasharray.replace(/,/g, ' '), ' ').map(px) : []);
    ctx.lineDashOffset = px(s.strokeDashoffset);
    ctx.stroke(chemin);
    ctx.setLineDash([]);
  }
  ctx.globalAlpha = 1;
}

function cheminDe(el: SVGElement): Path2D | null {
  const nombre = (nom: string): number => parseFloat(el.getAttribute(nom) ?? '0') || 0;
  const chemin = new Path2D();
  switch (el.tagName) {
    case 'path': return new Path2D(el.getAttribute('d') ?? '');
    case 'circle': chemin.arc(nombre('cx'), nombre('cy'), nombre('r'), 0, Math.PI * 2); return chemin;
    case 'ellipse': chemin.ellipse(nombre('cx'), nombre('cy'), nombre('rx'), nombre('ry'), 0, 0, Math.PI * 2); return chemin;
    case 'line': chemin.moveTo(nombre('x1'), nombre('y1')); chemin.lineTo(nombre('x2'), nombre('y2')); return chemin;
    case 'rect': {
      const [x, y, l, h] = [nombre('x'), nombre('y'), nombre('width'), nombre('height')];
      const r = Math.min(nombre('rx') || nombre('ry'), l / 2, h / 2);
      if (r <= 0) chemin.rect(x, y, l, h);
      else {
        // Coins arrondis tracés à la main : Path2D.roundRect manque aux Safari d'avant 2022.
        chemin.moveTo(x + r, y);
        chemin.arcTo(x + l, y, x + l, y + h, r);
        chemin.arcTo(x + l, y + h, x, y + h, r);
        chemin.arcTo(x, y + h, x, y, r);
        chemin.arcTo(x, y, x + l, y, r);
        chemin.closePath();
      }
      return chemin;
    }
    case 'polyline':
    case 'polygon': {
      const points = (el.getAttribute('points') ?? '').trim().split(/[\s,]+/).map(Number);
      for (let i = 0; i + 1 < points.length; i += 2) (i === 0 ? chemin.moveTo : chemin.lineTo).call(chemin, points[i], points[i + 1]);
      if (el.tagName === 'polygon') chemin.closePath();
      return chemin;
    }
    default: return null;
  }
}

// Un texte SVG : droit (x, y, text-anchor, dominant-baseline) ou posé sur un chemin (textPath).
function peindreUnTexteSvg(ctx: Contexte, texte: SVGTextElement, m: DOMMatrix, at: Atelier): void {
  const s = getComputedStyle(texte);
  const remplissage = s.fill && s.fill !== 'none' ? lireCouleur(s.fill) : null;
  if (transparente(remplissage)) return;
  const taille = px(s.fontSize);
  const espace = px(s.letterSpacing);
  const premier = (liste: SVGAnimatedLengthList): number => (liste.baseVal.numberOfItems ? liste.baseVal.getItem(0).value : 0);
  ctx.save();
  poserLeRepere(ctx, m, at);
  ctx.font = policeDe(s, taille);
  ctx.fillStyle = ecrireCouleur(remplissage!);
  ctx.globalAlpha = parseFloat(s.opacity) * parseFloat(s.fillOpacity || '1');
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const mesurer = (t: string): number => ctx.measureText(t).width;
  const dy = premier(texte.dy);
  const surChemin = texte.querySelector('textPath');
  const contenu = transformerLeTexte((surChemin ?? texte).textContent ?? '', s);
  const placement = placerLesLettres(contenu, espace, mesurer);
  if (surChemin) {
    const lien = surChemin.getAttribute('href') ?? surChemin.getAttribute('xlink:href') ?? '';
    const chemin = parIdentifiant(at, lien.replace(/^#/, ''));
    if (chemin instanceof SVGGeometryElement) {
      const longueur = chemin.getTotalLength();
      const depart = lireLongueur(surChemin.getAttribute('startOffset') ?? '0');
      const voulue = surChemin.getAttribute('textLength');
      const lettres = lettresLeLongDuChemin(placement, depart ? resoudre(depart, longueur) : 0, longueur, voulue ? parseFloat(voulue) : null);
      for (const { lettre, milieu, chasse } of lettres) {
        const avant = chemin.getPointAtLength(Math.max(0, milieu - 0.05));
        const apres = chemin.getPointAtLength(Math.min(longueur, milieu + 0.05));
        const point = chemin.getPointAtLength(milieu);
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(Math.atan2(apres.y - avant.y, apres.x - avant.x));
        ctx.fillText(lettre, -chasse / 2, dy);
        ctx.restore();
      }
    }
  } else {
    let x = premier(texte.x) + premier(texte.dx);
    let y = premier(texte.y) + dy;
    const ancrage = s.textAnchor;
    // La largeur du texte compte l'espacement après la dernière lettre, comme le fait le navigateur.
    if (ancrage === 'middle') x -= placement.largeur / 2;
    else if (ancrage === 'end') x -= placement.largeur;
    const ligne = s.dominantBaseline;
    if (ligne === 'middle') y += (ctx.measureText('x').actualBoundingBoxAscent || taille * 0.5) / 2;
    else if (ligne === 'central') { const mesure = ctx.measureText('H'); y += (mesure.fontBoundingBoxAscent - mesure.fontBoundingBoxDescent) / 2; }
    if (espace === 0) ctx.fillText(contenu, x, y);
    else placement.lettres.forEach((lettre, i) => ctx.fillText(lettre, x + placement.x[i], y));
  }
  ctx.restore();
}

// Le filtre « encre usée » des cachets : feTurbulence → feColorMatrix → feComposite in. Rend la fonction qui donne,
// pour un point du dessin, la part d'encre conservée (0 à 1) ; null si le filtre est d'une autre sorte.
function lireLeFiltre(g: SVGGElement, at: Atelier): ((x: number, y: number) => number) | null {
  const reference = g.getAttribute('filter')?.match(/url\(["']?#([^"')]+)["']?\)/)?.[1];
  const filtre = reference ? parIdentifiant(at, reference) : null;
  const bruit = filtre?.querySelector('feTurbulence');
  const matrice = filtre?.querySelector('feColorMatrix');
  if (!bruit || !matrice || !filtre?.querySelector('feComposite[operator="in"]')) return null;
  const frequences = (bruit.getAttribute('baseFrequency') ?? '0').trim().split(/[\s,]+/).map(Number);
  const frequence: [number, number] = [frequences[0], frequences[1] ?? frequences[0]];
  const octaves = parseInt(bruit.getAttribute('numOctaves') ?? '1', 10);
  const fractal = bruit.getAttribute('type') === 'fractalNoise';
  const graine = parseFloat(bruit.getAttribute('seed') ?? '0');
  const valeurs = (matrice.getAttribute('values') ?? '').trim().split(/[\s,]+/).map(Number);
  if (valeurs.length !== 20) return null;
  const ligneAlpha = valeurs.slice(15, 20);
  const canaux = [0, 1, 2, 3].filter((c) => ligneAlpha[c] !== 0);
  const bruitDeBase = preparerLeBruit(graine);
  return (x, y) => {
    let a = ligneAlpha[4];
    for (const c of canaux) a += ligneAlpha[c] * turbulence(bruitDeBase, c, x, y, frequence, octaves, fractal);
    return Math.min(1, Math.max(0, a));
  };
}

// Peint un élément SVG et ses enfants, dans le repère m (du dessin vers le timbre, en px de la sonde).
function peindreDuSvg(ctx: Contexte, el: Element, m: DOMMatrix, at: Atelier): void {
  if (!(el instanceof SVGElement)) return;
  const s = getComputedStyle(el);
  if (s.display === 'none' || s.visibility === 'hidden') return;
  const nom = el.tagName;
  if (['defs', 'filter', 'style', 'title', 'desc', 'clipPath', 'mask', 'linearGradient', 'radialGradient', 'symbol', 'textPath'].includes(nom)) return;

  if (nom === 'svg') {
    const svg = el as SVGSVGElement;
    const [x, y, l, h] = ['x', 'y', 'width', 'height'].map((a) => (svg.getAttribute(a) ? (svg as unknown as Record<string, SVGAnimatedLength>)[a].baseVal.value : 0));
    const repere = m.translate(x, y).multiply(repereDuViewBox(svg, l, h));
    ctx.save();
    if (s.overflow === 'hidden' || s.overflow === 'clip') { poserLeRepere(ctx, m, at); ctx.beginPath(); ctx.rect(x, y, l, h); ctx.clip(); }
    for (const enfant of Array.from(svg.children)) peindreDuSvg(ctx, enfant, repere, at);
    ctx.restore();
    return;
  }

  const propre = transformationSvg(el as SVGGraphicsElement);
  const repere = propre ? m.multiply(propre) : m;

  if (nom === 'g') {
    const encre = lireLeFiltre(el as SVGGElement, at);
    const opacite = parseFloat(s.opacity);
    if (!encre && opacite === 1) { for (const enfant of Array.from(el.children)) peindreDuSvg(ctx, enfant, repere, at); return; }
    const calque = emprunterUneToile(at);
    for (const enfant of Array.from(el.children)) peindreDuSvg(calque, enfant, repere, at);
    if (encre) userouLEncre(calque, el as SVGGElement, repere, encre, at);
    poser(ctx, calque.canvas, opacite);
    rendreLaToile(at, calque);
    return;
  }

  if (nom === 'text') { peindreUnTexteSvg(ctx, el as SVGTextElement, repere, at); return; }

  const chemin = cheminDe(el);
  if (!chemin) return;
  ctx.save();
  poserLeRepere(ctx, repere, at);
  peindreUneForme(ctx, chemin, s);
  ctx.restore();
}

// Ronge l'encre d'un calque selon le filtre : chaque pixel garde la part d'encre que le bruit lui laisse.
function userouLEncre(calque: Contexte, g: SVGGElement, m: DOMMatrix, encre: (x: number, y: number) => number, at: Atelier): void {
  const b = g.getBBox();
  const coins = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(([x, y]) => m.transformPoint(new DOMPoint(x, y)));
  const x0 = Math.max(0, Math.floor(Math.min(...coins.map((p) => p.x)) * at.k) - 2);
  const y0 = Math.max(0, Math.floor(Math.min(...coins.map((p) => p.y)) * at.k) - 2);
  const x1 = Math.min(at.largeur, Math.ceil(Math.max(...coins.map((p) => p.x)) * at.k) + 2);
  const y1 = Math.min(at.hauteur, Math.ceil(Math.max(...coins.map((p) => p.y)) * at.k) + 2);
  if (x1 <= x0 || y1 <= y0) return;
  const image = calque.getImageData(x0, y0, x1 - x0, y1 - y0);
  const inv = new DOMMatrix([m.a * at.k, m.b * at.k, m.c * at.k, m.d * at.k, m.e * at.k, m.f * at.k]).inverse();
  const d = image.data;
  for (let j = 0; j < y1 - y0; j++) {
    const py = y0 + j + 0.5;
    for (let i = 0; i < x1 - x0; i++) {
      const o = (j * (x1 - x0) + i) * 4 + 3;
      if (d[o] === 0) continue;
      const pX = x0 + i + 0.5;
      d[o] = d[o] * encre(inv.a * pX + inv.c * py + inv.e, inv.b * pX + inv.d * py + inv.f);
    }
  }
  calque.putImageData(image, x0, y0);
}

// ── Le peintre : un élément du timbre, son fond, ses pseudo-éléments, ses enfants ─────────────────────────

function peindreUnPseudo(ctx: Contexte, el: Element, quel: '::before' | '::after', boiteParent: Boite, at: Atelier): void {
  const s = getComputedStyle(el, quel);
  if (!s.content || s.content === 'none' || s.content === 'normal' || s.display === 'none') return;
  const opacite = parseFloat(s.opacity);
  if (opacite === 0) return;
  const boite = boiteDuPseudo(s, boiteParent);
  if (peindreUneTexture(ctx, s, boite, at)) return;
  const groupe = opacite < 1 || s.mixBlendMode !== 'normal';
  const cible = groupe ? emprunterUneToile(at) : ctx;
  peindreLaBoite(cible, s, boite, at);
  if (groupe) { poser(ctx, cible.canvas, opacite, s.mixBlendMode); rendreLaToile(at, cible); }
}

// Le masque d'un élément (la dentelure du timbre) : une image SVG d'un seul chemin, étirée sur la boîte.
function appliquerLeMasque(ctx: Contexte, s: CSSStyleDeclaration, boite: Boite, at: Atelier): void {
  const image = s.maskImage || s.getPropertyValue('-webkit-mask-image');
  const [adresse] = image ? lireLesAdresses(image) : [];
  if (!adresse?.startsWith('data:image/svg+xml,')) return;
  const svg = decodeURIComponent(adresse.slice('data:image/svg+xml,'.length));
  const vue = svg.match(/viewBox=['"]([^'"]+)['"]/)?.[1]?.split(/[\s,]+/).map(Number);
  const d = svg.match(/\sd=['"]([^'"]+)['"]/)?.[1];
  if (!vue || !d) return;
  ctx.save();
  ctx.setTransform((boite.l / vue[2]) * at.k, 0, 0, (boite.h / vue[3]) * at.k, boite.x * at.k, boite.y * at.k);
  ctx.translate(-vue[0], -vue[1]);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fill(new Path2D(d));
  ctx.restore();
}

function peindreUnElement(ctx: Contexte, el: Element, at: Atelier): void {
  if (!(el instanceof HTMLElement) && !(el instanceof SVGSVGElement)) return;
  const s = getComputedStyle(el);
  if (s.display === 'none' || s.visibility === 'hidden') return;
  const opacite = parseFloat(s.opacity);
  if (opacite === 0) return;

  // Un dessin SVG posé dans le HTML (vignette, cachets) : ses enfants, dans le repère de son viewBox.
  if (el instanceof SVGSVGElement) {
    const groupeSvg = opacite < 1 || s.mixBlendMode !== 'normal';
    const cibleSvg = groupeSvg ? emprunterUneToile(at) : ctx;
    const place = placeDe(el, at);
    const repere = matriceDe(el, at).multiply(repereDuViewBox(el, place.l, place.h));
    for (const enfant of Array.from(el.children)) peindreDuSvg(cibleSvg, enfant, repere, at);
    if (groupeSvg) { poser(ctx, cibleSvg.canvas, opacite, s.mixBlendMode); rendreLaToile(at, cibleSvg); }
    return;
  }

  const boite = boiteDroite(el, at);
  const masque = Boolean(s.maskImage && s.maskImage !== 'none') || Boolean(s.getPropertyValue('-webkit-mask-image') && s.getPropertyValue('-webkit-mask-image') !== 'none');
  const groupe = opacite < 1 || s.mixBlendMode !== 'normal' || masque;
  const cible = groupe ? emprunterUneToile(at) : ctx;

  if (boite && !peindreUneTexture(cible, s, boite, at)) {
    peindreLaBoite(cible, s, boite, at);
    // Texte doré : le fond de l'élément n'apparaît qu'à travers ses lettres.
    if (texteDore(s)) {
      const dore = emprunterUneToile(at);
      peindreDesPixels(dore, boite, at, null, couchesDuFond(s, boite));
      const lettres = emprunterUneToile(at);
      for (const noeud of textesSous(el)) peindreUnTexte(lettres, noeud, at, '#fff');
      dore.globalCompositeOperation = 'destination-in';
      dore.drawImage(lettres.canvas, 0, 0);
      dore.globalCompositeOperation = 'source-over';
      poser(cible, dore.canvas);
      rendreLaToile(at, dore);
      rendreLaToile(at, lettres);
    }
  }

  cible.save();
  if (boite && (s.overflow === 'hidden' || s.overflow === 'clip' || masque)) {
    cible.setTransform(at.k, 0, 0, at.k, 0, 0);
    cible.beginPath();
    cible.rect(boite.x, boite.y, boite.l, boite.h);
    cible.clip();
  }
  if (boite) peindreUnPseudo(cible, el, '::before', boite, at);
  // Les enfants dans l'ordre du document ; ceux qui ont un z-index positif, par-dessus.
  const enfants = Array.from(el.childNodes);
  const rang = (n: ChildNode): number => (n instanceof Element ? parseInt(getComputedStyle(n).zIndex, 10) || 0 : 0);
  const ordonnes = enfants.map((n, i) => ({ n, i, z: rang(n) })).sort((a, b) => (Math.max(0, a.z) - Math.max(0, b.z)) || a.i - b.i);
  for (const { n } of ordonnes) {
    if (n instanceof Text) peindreUnTexte(cible, n, at);
    else if (n instanceof Element) peindreUnElement(cible, n, at);
  }
  if (boite) peindreUnPseudo(cible, el, '::after', boite, at);
  cible.restore();

  if (groupe) {
    if (masque && boite) appliquerLeMasque(cible, s, boite, at);
    poser(ctx, cible.canvas, opacite, s.mixBlendMode);
    rendreLaToile(at, cible);
  }
}

// ── Monter la sonde, mesurer les textures, peindre ───────────────────────────

const POLICES = ['500 40px Oswald', '600 40px Oswald', '400 40px "Playfair Display"', '700 40px "Playfair Display"', '900 40px "Playfair Display"', 'italic 400 40px "Playfair Display"', 'italic 700 40px "Playfair Display"'];

async function chargerLesPolices(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  await Promise.all(POLICES.map((p) => document.fonts.load(p).catch(() => [])));
}

// L'effet moyen d'une texture fondue en « multiply » (le grain du papier), pour une opacité donnée : de combien
// chaque canal s'assombrit en moyenne.
async function effetMoyen(adresse: string, opacite: number): Promise<[number, number, number]> {
  const repli: [number, number, number] = [GRAIN_MOYEN[0] * opacite, GRAIN_MOYEN[1] * opacite, GRAIN_MOYEN[2] * opacite];
  try {
    const image = new Image();
    image.src = adresse;
    await image.decode();
    const l = Math.max(1, image.naturalWidth || 180);
    const h = Math.max(1, image.naturalHeight || 180);
    const ctx = contexteDe(nouvelleToile(l, h));
    ctx.drawImage(image, 0, 0, l, h);
    const d = ctx.getImageData(0, 0, l, h).data;
    const somme = [0, 0, 0];
    for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) somme[c] += (d[i + 3] / 255) * (1 - d[i + c] / 255);
    const n = d.length / 4;
    return [(somme[0] / n) * opacite, (somme[1] / n) * opacite, (somme[2] / n) * opacite];
  } catch {
    return repli;
  }
}

// Les textures (url) posées en fond dans le timbre, et leur effet moyen (mesuré une fois par texture et opacité).
const EFFETS_MESURES = new Map<string, Promise<[number, number, number]>>();
async function mesurerLesTextures(timbre: HTMLElement): Promise<Map<string, [number, number, number]>> {
  const effets = new Map<string, [number, number, number]>();
  for (const el of [timbre, ...Array.from(timbre.querySelectorAll('*'))]) {
    for (const quel of [null, '::before', '::after']) {
      const s = getComputedStyle(el, quel);
      if (s.mixBlendMode !== 'multiply') continue;
      for (const adresse of lireLesAdresses(s.backgroundImage)) {
        const cle = `${s.opacity} ${adresse}`;
        if (!EFFETS_MESURES.has(cle)) EFFETS_MESURES.set(cle, effetMoyen(adresse, parseFloat(s.opacity)));
        if (!effets.has(adresse)) effets.set(adresse, await EFFETS_MESURES.get(cle)!);
      }
    }
  }
  return effets;
}

// Dessine le timbre, tel que le jeu l'affiche, sur un canevas de la largeur donnée (hauteur : 38/30 de la largeur).
export async function dessinerLeTimbre(carte: CarteIndex, habillage: Habillage, largeur: number): Promise<HTMLCanvasElement> {
  await chargerLesPolices();
  const conteneur = document.createElement('div');
  conteneur.className = 'sonde-du-partage';
  conteneur.setAttribute('aria-hidden', 'true');
  conteneur.style.cssText = `position:fixed;left:-${LARGEUR_SONDE + 1000}px;top:0;width:${LARGEUR_SONDE}px;pointer-events:none;contain:layout style`;
  const style = document.createElement('style');
  style.textContent = STYLE_SONDE;
  const support = document.createElement('div');
  conteneur.append(style, support);
  document.body.appendChild(conteneur);
  // Préfixe : les identifiants de la sonde (filtres, chemins des textes) ne se confondent pas avec ceux de la page.
  const racine = createRoot(support, { identifierPrefix: 'partage-' });
  try {
    flushSync(() => racine.render(createElement(Timbre, {
      carte, finition: habillage.finition, oblitere: true, obtenuLe: habillage.obtenuLe ?? null,
      cliquable: false, reagir: false,
    })));
    const timbre = support.querySelector<HTMLElement>('.tb');
    if (!timbre) throw new Error("Le timbre n'a pas pu être préparé.");
    timbre.getBoundingClientRect();
    await document.fonts.ready;
    const origine = timbre.getBoundingClientRect();
    const k = largeur / origine.width;
    const at: Atelier = {
      sonde: conteneur, timbre, origine, k,
      largeur: Math.round(origine.width * k),
      hauteur: Math.round(origine.height * k),
      grains: await mesurerLesTextures(timbre),
      toiles: [],
    };
    const toile = nouvelleToile(at.largeur, at.hauteur);
    const ctx = contexteDe(toile);
    for (const enfant of Array.from(timbre.children)) peindreUnElement(ctx, enfant, at);
    return toile;
  } finally {
    racine.unmount();
    conteneur.remove();
  }
}

// ── L'image à partager : le timbre sur le bleu nuit du jeu, avec son mot, sa définition et l'adresse du site ─

// Le format portrait des réseaux sociaux (4:5), mesures données pour l'échelle 1.
const LARGEUR_IMAGE = 1080;
const HAUTEUR_IMAGE = 1350;
const LARGEUR_TIMBRE = 640;
// Au-delà de ce poids, l'image est refaite un peu plus petite (90 %, puis 80 %) : cela n'arrive qu'aux timbres les
// plus chargés (quelques Hors-série au fond très guilloché).
const POIDS_MAXIMUM = 600 * 1024;
const ECHELLES = [1, 0.9, 0.8];
// Écart toléré (niveaux sur 255) quand on aligne les pixels presque égaux : invisible, et l'image pèse 30 % de moins.
const TOLERANCE = 2;
const NUIT = '#0b1729';
const SERIF = '"Playfair Display", "Palatino Linotype", Palatino, Georgia, serif';
const MENTION = 'Oswald, "Arial Narrow", Arial, sans-serif';
const SANS = '"Segoe UI", system-ui, -apple-system, sans-serif';

// Un texte espacé (letter-spacing), centré sur x.
function texteEspaceCentre(ctx: Contexte, texte: string, x: number, y: number, espace: number): void {
  const placement = placerLesLettres(texte, espace, (t) => ctx.measureText(t).width);
  const depart = x - (placement.largeur - espace) / 2;
  ctx.textAlign = 'left';
  placement.lettres.forEach((lettre, i) => ctx.fillText(lettre, depart + placement.x[i], y));
}

// L'image entière, à partir du timbre déjà dessiné à la bonne taille (LARGEUR_TIMBRE × échelle).
function composerLImage(timbre: HTMLCanvasElement, carte: CarteIndex, echelle: number): HTMLCanvasElement {
  const e = (n: number): number => n * echelle;
  const largeur = Math.round(e(LARGEUR_IMAGE));
  const toile = nouvelleToile(largeur, Math.round(e(HAUTEUR_IMAGE)));
  const ctx = contexteDe(toile);
  const milieu = largeur / 2;

  // Un fond uni : un halo dégradé alourdirait beaucoup l'image.
  ctx.fillStyle = NUIT;
  ctx.fillRect(0, 0, toile.width, toile.height);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#e0edfa';
  ctx.font = `700 ${e(56)}px ${SERIF}`;
  texteEspaceCentre(ctx, SITE.nom, milieu, e(96), e(-1.5));

  // Le timbre, posé au pixel près (sans rééchantillonnage), avec l'ombre portée des timbres de la page d'essai.
  const haut = Math.round(e(134));
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = e(38);
  ctx.shadowOffsetY = e(20);
  ctx.drawImage(timbre, Math.round((largeur - timbre.width) / 2), haut);
  ctx.restore();

  // Le mot, sa rareté et son origine, puis sa définition : elle n'est plus imprimée sur le timbre.
  let y = haut + timbre.height + e(86);
  ctx.fillStyle = '#e0edfa';
  ctx.font = `700 ${e(50)}px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.fillText(carte.mot, milieu, y);
  y += e(44);
  ctx.fillStyle = '#adc3da';
  ctx.font = `600 ${e(22)}px ${MENTION}`;
  texteEspaceCentre(ctx, `TIMBRE ${carte.rarete.toUpperCase()} · ${carte.faction.toUpperCase()}`, milieu, y, e(22 * 0.12));
  ctx.font = `italic 400 ${e(28)}px ${SERIF}`;
  ctx.fillStyle = '#c3d4e6';
  ctx.textAlign = 'center';
  y += e(8);
  for (const ligne of couperEnLignes(carte.definition, e(LARGEUR_IMAGE - 200), (t) => ctx.measureText(t).width, 2)) {
    y += e(40);
    ctx.fillText(ligne, milieu, y);
  }

  ctx.fillStyle = '#adc3da';
  ctx.font = `400 ${e(22)}px ${SANS}`;
  ctx.fillText(SITE.adresseCourte, milieu, toile.height - e(48));
  return toile;
}

function enPng(toile: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    toile.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("L'image n'a pas pu être fabriquée."))), 'image/png');
  });
}

export async function fabriquerLImage(carte: CarteIndex, habillage: Habillage): Promise<Blob> {
  for (const [i, echelle] of ECHELLES.entries()) {
    const toile = composerLImage(await dessinerLeTimbre(carte, habillage, Math.round(LARGEUR_TIMBRE * echelle)), carte, echelle);
    const ctx = contexteDe(toile);
    const pixels = ctx.getImageData(0, 0, toile.width, toile.height);
    lisserLesAplats(pixels.data, toile.width, toile.height, TOLERANCE);
    ctx.putImageData(pixels, 0, 0);
    const image = await enPng(toile);
    if (image.size <= POIDS_MAXIMUM || i === ECHELLES.length - 1) return image;
  }
  throw new Error("L'image n'a pas pu être fabriquée.");
}
