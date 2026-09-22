// L'image d'un timbre, pour la partager ou l'enregistrer. Le timbre est redessiné trait par trait sur un canevas,
// d'après les mêmes règles que timbre.css : mesures en centièmes de la largeur, encres de la faction, qualité
// d'impression selon la rareté, finition, cachets. On ne « photographie » pas l'écran : cela ne marche pas sur
// tous les téléphones, et l'image doit être la même partout. Quand timbre.css change d'aspect, ce fichier suit.
// Tout est déterminé par le mot : la même carte donne toujours la même image.

import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { attaqueEnJeu, defenseEnJeu } from '../../config/equilibrage.ts';
import { SITE } from '../../config/site.ts';
import type { CarteIndex, Finition } from '../../partage/types.ts';
import { NIVEAU, NOM_COURT, anneeDuCachet, encresDe, entier, entre, hasardDe, motifDuTimbre } from './decor.ts';
import { couperEnLignes, tailleDuMot } from './miseEnLignes.ts';
import { VIGNETTES } from './vignettes.tsx';

export type Habillage = { finition: Finition; maitriseeLe: number | null };

const SERIF = '"Playfair Display", "Palatino Linotype", Palatino, Georgia, serif';
const MENTION = '"Barlow Condensed", "Arial Narrow", Arial, sans-serif';
const SANS = '"Segoe UI", system-ui, -apple-system, sans-serif';

// Les dégradés métalliques et irisés de timbre.css.
type Arrets = [number, string][];
const OR: Arrets = [[0, '#8a6a12'], [0.22, '#f6e59a'], [0.4, '#c9a227'], [0.55, '#fff6c4'], [0.72, '#b08a1e'], [1, '#f1d979']];
const ARGENT: Arrets = [[0, '#6f7680'], [0.24, '#eef1f4'], [0.42, '#a9b0b9'], [0.56, '#ffffff'], [0.74, '#8c939d'], [1, '#dfe3e8']];
const IRISE: Arrets = ['#ff5ea0', '#ffd75e', '#6dffb0', '#5ec8ff', '#b57bff', '#ff5ea0', '#ffd75e', '#6dffb0', '#5ec8ff'].map((c, i, t) => [i / (t.length - 1), c]);

type Contexte = CanvasRenderingContext2D;

// ── Petites aides de dessin ──────────────────────────────────────────────────

function composantes(hexa: string): [number, number, number] {
  const h = hexa.replace('#', '');
  const n = parseInt(h.length === 3 ? [...h].map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
// L'équivalent de color-mix(in srgb, a part%, b).
function melange(a: string, part: number, b: string): string {
  const [ra, ga, ba] = composantes(a);
  const [rb, gb, bb] = composantes(b);
  const m = (x: number, y: number): number => Math.round(x * part + y * (1 - part));
  return `rgb(${m(ra, rb)},${m(ga, gb)},${m(ba, bb)})`;
}
function voile(hexa: string, alpha: number): string {
  const [r, g, b] = composantes(hexa);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Un dégradé linéaire comme en CSS : l'angle en degrés, 0 vers le haut, 90 vers la droite.
function degrade(ctx: Contexte, arrets: Arrets, x: number, y: number, w: number, h: number, angle: number): CanvasGradient {
  const t = (angle * Math.PI) / 180;
  const dx = Math.sin(t);
  const dy = -Math.cos(t);
  const longueur = Math.abs(w * dx) + Math.abs(h * dy);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const g = ctx.createLinearGradient(cx - (dx * longueur) / 2, cy - (dy * longueur) / 2, cx + (dx * longueur) / 2, cy + (dy * longueur) / 2);
  for (const [position, couleur] of arrets) g.addColorStop(position, couleur);
  return g;
}

function police(ctx: Contexte, style: '' | 'italic', poids: number, taille: number, famille: string): void {
  ctx.font = `${style} ${poids} ${taille}px ${famille}`.trim();
}

// Un texte dessiné caractère par caractère, pour l'espacement des lettres (letter-spacing), que le canevas ne connaît pas partout.
function largeurEspacee(ctx: Contexte, texte: string, espace: number): number {
  const lettres = [...texte];
  return lettres.reduce((total, lettre) => total + ctx.measureText(lettre).width, 0) + espace * Math.max(0, lettres.length - 1);
}
function texteEspace(ctx: Contexte, texte: string, x: number, y: number, espace: number, alignement: 'left' | 'center' | 'right'): void {
  const total = largeurEspacee(ctx, texte, espace);
  let px = alignement === 'center' ? x - total / 2 : alignement === 'right' ? x - total : x;
  const ancien = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const lettre of [...texte]) {
    ctx.fillText(lettre, px, y);
    px += ctx.measureText(lettre).width + espace;
  }
  ctx.textAlign = ancien;
}

function rectangleArrondi(ctx: Contexte, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Des traits horizontaux très fins, comme les tailles d'une gravure.
function hachures(ctx: Contexte, x: number, y: number, w: number, h: number, pas: number, epaisseur: number, couleur: string): void {
  ctx.fillStyle = couleur;
  for (let ligne = y; ligne < y + h; ligne += pas) ctx.fillRect(x, ligne, w, epaisseur);
}

// Un cachet à l'encre usée : dessiné à part, puis rongé de petits trous, comme le filtre de Tampon.tsx.
function cachetUse(largeur: number, hauteur: number, hasard: () => number, dessiner: (ctx: Contexte) => void): HTMLCanvasElement {
  const toile = document.createElement('canvas');
  toile.width = Math.ceil(largeur);
  toile.height = Math.ceil(hauteur);
  const ctx = toile.getContext('2d');
  if (!ctx) return toile;
  dessiner(ctx);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  const trous = Math.round((largeur * hauteur) / 55);
  for (let i = 0; i < trous; i++) {
    ctx.beginPath();
    ctx.arc(hasard() * largeur, hasard() * hauteur, entre(hasard, 0.2, 1.1) * (largeur / 100), 0, Math.PI * 2);
    ctx.fill();
  }
  return toile;
}

// ── Le timbre ────────────────────────────────────────────────────────────────

// Dessine le timbre en (0, 0), de la largeur donnée (hauteur : 1,4 fois la largeur), sur un canevas transparent.
export function dessinerLeTimbre(ctx: Contexte, carte: CarteIndex, habillage: Habillage, largeur: number, illustration: CanvasImageSource | null): void {
  const U = (n: number): number => (n * largeur) / 100; // 1 = un centième de la largeur, comme « cqi » dans timbre.css
  const W = largeur;
  const H = U(140);
  const niveau = NIVEAU[carte.rarete];
  const horsSerie = niveau === 6;
  const [encreFaction, contraste] = encresDe(carte.faction);
  const papier = horsSerie ? '#17161c' : '#f8f2e2';
  const texte = horsSerie ? '#efe9da' : '#26201b';
  const encre = horsSerie ? '#e9dfc4' : encreFaction;
  const seconde = horsSerie ? '#9fd8ff' : niveau === 5 ? '#a67c1a' : niveau === 4 ? '#7b838d' : niveau === 2 || niveau === 3 ? melange(contraste, 0.72, '#000000') : encre;
  const metal = niveau === 4 ? ARGENT : niveau === 5 ? OR : horsSerie ? IRISE : null;
  const angleMetal = horsSerie ? 115 : 120;
  const texteSurMetal = horsSerie ? '#15131a' : '#241a05';
  const finition = horsSerie ? 'Prismatique' : habillage.finition;

  // Le papier et la dentelure : des demi-cercles mordus dans le bord tous les 4 centièmes. (Pas de grain comme à
  // l'écran : un bruit aléatoire rend l'image trois fois plus lourde et bien plus lente à fabriquer.)
  ctx.fillStyle = papier;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'destination-out';
  const dent = U(4);
  const trou = (x: number, y: number): void => { ctx.beginPath(); ctx.arc(x, y, dent * 0.31, 0, Math.PI * 2); ctx.fill(); };
  for (let i = 0; i <= 25; i++) { trou(i * dent, 0); trou(i * dent, H); }
  for (let j = 1; j < 35; j++) { trou(0, j * dent); trou(W, j * dent); }
  ctx.globalCompositeOperation = 'source-over';

  // Le cadre de l'impression : une bordure, un filet intérieur, deux pour une Rare.
  const x0 = U(4.6), y0 = U(4.6), w0 = W - 2 * x0, h0 = H - 2 * y0;
  const filet = (retrait: number, epaisseur: number, couleur: string | CanvasGradient): void => {
    ctx.lineWidth = epaisseur;
    ctx.strokeStyle = couleur;
    ctx.strokeRect(x0 + retrait + epaisseur / 2, y0 + retrait + epaisseur / 2, w0 - 2 * retrait - epaisseur, h0 - 2 * retrait - epaisseur);
  };
  filet(0, U(0.75), metal ? degrade(ctx, metal, x0, y0, w0, h0, angleMetal) : encre);
  filet(U(0.75 + 0.45), U(0.3), encre);
  if (niveau === 3) filet(U(0.75 + 1.3), U(0.25), encre);

  // La zone imprimée, et la hauteur de chaque bande (les mêmes proportions que la grille de timbre.css).
  const cx = x0 + U(0.75), cy = y0 + U(0.75), cw = w0 - U(1.5), ch = h0 - U(1.5);
  const bordure = U(0.5);
  const hautH = U(14.1);
  const tailleMot = U(tailleDuMot(carte.mot));
  const motH = U(0.9 + 1.5 + 1.1 + 0.9) + tailleMot * 1.05;
  const tailleDef = U(4.2);
  const interligne = tailleDef * 1.33;
  police(ctx, 'italic', 400, tailleDef, SERIF);
  const lignesDef = couperEnLignes(carte.definition, cw - U(12), (t) => ctx.measureText(t).width, 6);
  const defH = U(2) + lignesDef.length * interligne + U(2.2);
  const registreH = carte.registre.length > 0 ? U(4) : 0;
  const basH = U(5.64);
  police(ctx, '', 700, U(2.9), MENTION);
  const lignesRecord = carte.record ? couperEnLignes(carte.record.toUpperCase(), cw - U(4), (t) => largeurEspacee(ctx, t, U(2.9) * 0.12), 3) : [];
  const recordH = lignesRecord.length > 0 ? U(2.6) + lignesRecord.length * U(2.9 * 1.2) : 0;
  const vignetteH = ch - (hautH + bordure + U(2.6) + U(2.2) + motH + defH + registreH + bordure + basH + recordH);

  ctx.save();
  ctx.beginPath();
  ctx.rect(cx, cy, cw, ch);
  ctx.clip();
  ctx.textBaseline = 'middle';

  // Le bandeau du haut : les deux valeurs dans les coins, la langue émettrice au centre.
  const vw = U(15.5);
  const valeurs = [[cx, 'Att.', attaqueEnJeu(carte.attaque, carte.rarete)], [cx + cw - vw, 'Déf.', defenseEnJeu(carte.defense, carte.rarete)]] as const;
  for (const [x, nom, valeur] of valeurs) {
    ctx.fillStyle = metal ? degrade(ctx, metal, x, cy, vw, hautH, angleMetal) : encre;
    ctx.fillRect(x, cy, vw, hautH);
    ctx.fillStyle = metal ? texteSurMetal : papier;
    police(ctx, '', 600, U(2.3), MENTION);
    texteEspace(ctx, nom.toUpperCase(), x + vw / 2, cy + U(1.2 + 1.38), U(2.3) * 0.18, 'center');
    police(ctx, '', 700, U(9.6), SERIF);
    ctx.textAlign = 'center';
    ctx.fillText(String(valeur), x + vw / 2, cy + U(1.2 + 2.76 + 4.56 + 0.5));
  }
  ctx.fillStyle = encre;
  police(ctx, '', 700, U(3.7), SERIF);
  const lignesFaction = couperEnLignes(carte.faction.toUpperCase(), cw - 2 * vw - U(3), (t) => largeurEspacee(ctx, t, U(3.7) * 0.1));
  const blocFaction = U(2.3 * 1.2 + 0.5) + lignesFaction.length * U(3.7 * 1.1);
  let y = cy + (hautH - blocFaction) / 2;
  ctx.globalAlpha = 0.75;
  police(ctx, '', 600, U(2.3), MENTION);
  texteEspace(ctx, 'ORIGINE', cx + cw / 2, y + U(1.38), U(2.3) * 0.18, 'center');
  ctx.globalAlpha = 1;
  y += U(2.3 * 1.2 + 0.5);
  police(ctx, '', 700, U(3.7), SERIF);
  for (const ligne of lignesFaction) { texteEspace(ctx, ligne, cx + cw / 2, y + U(3.7 * 0.55), U(3.7) * 0.1, 'center'); y += U(3.7 * 1.1); }
  ctx.fillStyle = encre;
  ctx.fillRect(cx, cy + hautH, cw, bordure);

  // La vignette : une fenêtre aux coins du haut arrondis, un fond de tailles, et la rosace propre au mot.
  const vx = cx + U(6), vy = cy + hautH + bordure + U(2.6), vwid = cw - U(12), vh = vignetteH;
  const rx = Math.min(U(36), vwid / 2), ry = Math.min(U(26), vh);
  const fenetre = (): void => {
    ctx.beginPath();
    ctx.moveTo(vx, vy + vh);
    ctx.lineTo(vx, vy + ry);
    ctx.ellipse(vx + rx, vy + ry, rx, ry, 0, Math.PI, Math.PI * 1.5);
    ctx.lineTo(vx + vwid - rx, vy);
    ctx.ellipse(vx + vwid - rx, vy + ry, rx, ry, 0, Math.PI * 1.5, Math.PI * 2);
    ctx.lineTo(vx + vwid, vy + vh);
    ctx.closePath();
  };
  ctx.save();
  fenetre();
  ctx.clip();
  if (niveau === 5 || horsSerie) {
    const fond = ctx.createRadialGradient(vx + vwid / 2, vy + vh * 0.6, 0, vx + vwid / 2, vy + vh * 0.6, Math.max(vwid, vh) * 0.75);
    fond.addColorStop(0, horsSerie ? '#2b2838' : '#fff8dc');
    fond.addColorStop(1, horsSerie ? '#121118' : '#f1dfa6');
    ctx.fillStyle = fond;
  } else {
    ctx.fillStyle = niveau === 3 ? melange(contraste, 0.22, papier) : melange(papier, 0.8, '#ffffff');
  }
  ctx.fillRect(vx, vy, vwid, vh);
  hachures(ctx, vx, vy, vwid, vh, U(0.95), U(0.22), horsSerie ? 'rgba(255,255,255,0.07)' : niveau === 5 ? 'rgba(166,124,26,0.22)' : voile(encre, 0.16));
  const cote = Math.min(vwid, vh);
  const ox = vx + (vwid - cote) / 2, oy = vy + (vh - cote) / 2;
  if (illustration) {
    ctx.drawImage(illustration, ox, oy, cote, cote);
  } else {
    const echelle = cote / 60;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(echelle, echelle);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = horsSerie ? 0.8 : 0.34;
    motifDuTimbre(carte.id, niveau >= 4 ? 4 : niveau >= 2 ? 3 : 2).forEach((d, i) => {
      ctx.strokeStyle = horsSerie ? '#fff6dc' : i % 2 === 1 ? seconde : encre;
      ctx.stroke(new Path2D(d));
    });
    ctx.restore();
  }
  ctx.restore();
  fenetre();
  ctx.lineWidth = U(0.45);
  ctx.strokeStyle = encre;
  ctx.stroke();

  // Le mot, entre deux doubles filets.
  y = vy + vh + U(2.2);
  const mx = cx + U(3), mw = cw - U(6);
  const doubleFilet = (haut: number): void => { ctx.fillStyle = encre; ctx.fillRect(mx, haut, mw, U(0.3)); ctx.fillRect(mx, haut + U(0.6), mw, U(0.3)); };
  doubleFilet(y);
  ctx.fillStyle = horsSerie ? '#fff4d6' : encre;
  police(ctx, '', 700, tailleMot, SERIF);
  texteEspace(ctx, carte.mot.toUpperCase(), cx + cw / 2, y + U(0.9 + 1.5) + tailleMot * 0.58, tailleMot * 0.07, 'center');
  doubleFilet(y + motH - U(0.9));
  y += motH;
  const yDefinition = y + U(2);
  y += defH;

  // Le registre, puis la bande du bas : type, rareté, date du cachet.
  if (carte.registre.length > 0) {
    ctx.fillStyle = encre;
    ctx.globalAlpha = 0.8;
    police(ctx, '', 600, U(2.5), MENTION);
    texteEspace(ctx, carte.registre.join(' · ').toUpperCase(), cx + cw / 2, y + U(1.5), U(2.5) * 0.2, 'center');
    ctx.globalAlpha = 1;
    y += registreH;
  }
  ctx.fillStyle = encre;
  ctx.fillRect(cx, y, cw, bordure);
  y += bordure;
  const basMetal = metal && !horsSerie;
  if (basMetal) { ctx.fillStyle = degrade(ctx, metal, cx, y, cw, basH, angleMetal); ctx.fillRect(cx, y, cw, basH); }
  ctx.fillStyle = basMetal ? texteSurMetal : encre;
  police(ctx, '', 600, U(2.7), MENTION);
  const yBas = y + U(1.3 + 1.62);
  texteEspace(ctx, carte.type.toUpperCase(), cx + U(2.4), yBas, U(2.7) * 0.16, 'left');
  texteEspace(ctx, carte.rarete.toUpperCase(), cx + cw / 2, yBas, U(2.7) * 0.16, 'center');
  texteEspace(ctx, anneeDuCachet(carte.attestation), cx + cw - U(2.4), yBas, U(2.7) * 0.16, 'right');
  y += basH;
  if (lignesRecord.length > 0) {
    ctx.fillStyle = degrade(ctx, IRISE, cx, y, cw, recordH, 115);
    ctx.fillRect(cx, y, cw, recordH);
    ctx.fillStyle = '#15131a';
    police(ctx, '', 700, U(2.9), MENTION);
    lignesRecord.forEach((ligne, i) => texteEspace(ctx, ligne, cx + cw / 2, y + U(1.3 + 1.74) + i * U(2.9 * 1.2), U(2.9) * 0.12, 'center'));
  }

  // La finition : un reflet figé, là où l'écran le fait balayer la carte.
  if (finition !== 'Normale') {
    ctx.save();
    if (finition === 'Brillante') {
      ctx.globalCompositeOperation = 'hard-light';
      ctx.globalAlpha = 0.85;
      const reflet: Arrets = [[0.18, 'rgba(255,255,255,0)'], [0.4, 'rgba(255,255,255,0.85)'], [0.5, 'rgba(90,80,60,0.28)'], [0.6, 'rgba(255,255,255,0.7)'], [0.82, 'rgba(255,255,255,0)']];
      ctx.fillStyle = degrade(ctx, reflet, cx - cw * 0.8, cy - ch * 0.8, cw * 2.6, ch * 2.6, 115);
    } else {
      ctx.globalCompositeOperation = finition === 'Prismatique' ? 'screen' : 'overlay';
      ctx.globalAlpha = finition === 'Prismatique' ? 0.2 : 0.62;
      ctx.fillStyle = degrade(ctx, IRISE, cx - cw * 1.1, cy - ch * 1.1, cw * 3.2, ch * 3.2, 115);
    }
    ctx.fillRect(cx, cy, cw, ch);
    if (finition === 'Holographique') hachures(ctx, cx, cy, cw, ch, U(0.72), U(0.18), 'rgba(255,255,255,0.28)');
    ctx.restore();
  }

  // La définition, toujours au-dessus du reflet pour rester lisible.
  ctx.fillStyle = texte;
  ctx.textAlign = 'center';
  police(ctx, 'italic', 400, tailleDef, SERIF);
  if (finition === 'Holographique' || finition === 'Prismatique') { ctx.shadowColor = papier; ctx.shadowBlur = U(0.8); }
  lignesDef.forEach((ligne, i) => ctx.fillText(ligne, cx + cw / 2, yDefinition + i * interligne + interligne / 2));
  ctx.shadowBlur = 0;
  ctx.restore();

  // Le cachet d'origine, à l'encre noire, par-dessus l'impression.
  const hasardTampon = hasardDe(`${carte.id}-tampon`);
  const rotationTampon = entre(hasardTampon, -19, 14);
  entier(hasardTampon, 1, 90); // la graine du filtre à l'écran : on la consomme pour rester en phase
  const taille = U(38);
  const echelle = taille / 100;
  const tampon = cachetUse(taille, taille, hasardTampon, (c) => {
    c.scale(echelle, echelle);
    c.strokeStyle = horsSerie ? '#f3ecd8' : '#1b2230';
    c.fillStyle = c.strokeStyle;
    c.lineWidth = 2.2;
    c.beginPath(); c.arc(50, 50, 46, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 0.9;
    c.beginPath(); c.arc(50, 50, 42.5, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(50, 50, 27, 0, Math.PI * 2); c.stroke();
    // Le texte qui suit le cercle, réparti sur presque tout le tour, comme le « textPath » de Tampon.tsx.
    police(c, '', 700, 7.4, MENTION);
    c.textBaseline = 'alphabetic';
    c.textAlign = 'left';
    const lettres = [...`★ ORIGINE CONTRÔLÉE ★ ${carte.faction.toUpperCase()}`];
    const largeurs = lettres.map((l) => c.measureText(l).width);
    const espace = Math.max(0, (220 - largeurs.reduce((a, b) => a + b, 0)) / (lettres.length - 1));
    let position = 0;
    lettres.forEach((lettre, i) => {
      const angle = Math.PI + (position + largeurs[i] / 2) / 36;
      c.save();
      c.translate(50 + 36 * Math.cos(angle), 50 + 36 * Math.sin(angle));
      c.rotate(angle + Math.PI / 2);
      c.fillText(lettre, -largeurs[i] / 2, 0);
      c.restore();
      position += largeurs[i] + espace;
    });
    c.textAlign = 'center';
    police(c, '', 700, 8.4, MENTION);
    texteEspace(c, NOM_COURT[carte.faction] ?? carte.faction.toUpperCase(), 50, 47, 8.4 * 0.04, 'center');
    police(c, '', 700, 9.5, MENTION);
    c.fillText(anneeDuCachet(carte.attestation), 50, 59);
  });
  ctx.save();
  ctx.globalAlpha = horsSerie ? 0.55 : 0.74;
  ctx.globalCompositeOperation = horsSerie ? 'screen' : 'multiply';
  ctx.translate(W - U(2.5) - taille / 2, U(22) + taille / 2);
  ctx.rotate((rotationTampon * Math.PI) / 180);
  ctx.drawImage(tampon, -taille / 2, -taille / 2);
  ctx.restore();

  // Le cachet « Maîtrisé », à l'encre violette, de l'autre côté de la vignette.
  if (habillage.maitriseeLe !== null) {
    const hasardMaitrise = hasardDe(`${carte.id}-maitrise`);
    const rotation = entre(hasardMaitrise, -16, -7);
    entier(hasardMaitrise, 1, 90);
    const date = new Date(habillage.maitriseeLe);
    const jour = `${String(date.getDate()).padStart(2, '0')}·${String(date.getMonth() + 1).padStart(2, '0')}·${date.getFullYear()}`;
    const largeurCachet = U(47), hauteurCachet = U(47 * 0.46);
    const e = largeurCachet / 100;
    const griffe = cachetUse(largeurCachet, hauteurCachet, hasardMaitrise, (c) => {
      c.scale(e, e);
      c.strokeStyle = horsSerie ? '#c9b3ff' : '#4a2a8a';
      c.fillStyle = c.strokeStyle;
      c.lineWidth = 3; rectangleArrondi(c, 2, 2, 96, 42, 3); c.stroke();
      c.lineWidth = 0.9; rectangleArrondi(c, 5.5, 5.5, 89, 35, 1.5); c.stroke();
      c.textBaseline = 'alphabetic';
      c.textAlign = 'center';
      police(c, '', 700, 15, MENTION);
      texteEspace(c, 'MAÎTRISÉ', 50, 23, 15 * 0.08, 'center');
      police(c, '', 700, 9.5, MENTION);
      c.fillText(jour, 50, 35.5);
    });
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.globalCompositeOperation = horsSerie ? 'screen' : 'multiply';
    ctx.translate(U(2.5) + largeurCachet / 2, U(30) + hauteurCachet / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(griffe, -largeurCachet / 2, -hauteurCachet / 2);
    ctx.restore();
  }
}

// ── L'image à partager : le timbre sur le bleu nuit du jeu, avec son nom et l'adresse du site ───────────────

const LARGEUR_IMAGE = 1080;
const HAUTEUR_IMAGE = 1440;
const LARGEUR_TIMBRE = 780;

async function chargerLesPolices(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  await Promise.all(['700 40px "Playfair Display"', 'italic 400 40px "Playfair Display"', '600 40px "Barlow Condensed"'].map((p) => document.fonts.load(p).catch(() => [])));
}

function chargerUneImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("L'illustration du timbre n'a pas pu être dessinée."));
    image.src = source;
  });
}

// L'illustration d'un timbre Hors-série : son dessin, rendu en SVG dans un coin de page détaché, puis chargé
// comme une image (sans police ni ressource extérieure, pour qu'un canevas accepte de le dessiner partout).
function illustrationDe(carte: CarteIndex): Promise<HTMLImageElement | null> {
  const dessin = VIGNETTES[carte.id];
  if (!dessin) return Promise.resolve(null);
  const style = 'path,circle,line,polyline,polygon,rect{fill:none;stroke:#fff6dc;stroke-width:.8;stroke-linejoin:round;stroke-linecap:round}.vig-fin{stroke-width:.3!important;opacity:.55}.vig-plein{fill:#fff6dc;stroke:none}.vig-texte{fill:#fff6dc;stroke:none;font-family:Georgia,"Times New Roman",serif}';
  const coin = document.createElement('div');
  const racine = createRoot(coin);
  flushSync(() => racine.render(createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 60 60', width: 600, height: 600 }, createElement('style', null, style), dessin('partage'))));
  const svg = coin.innerHTML;
  racine.unmount();
  return chargerUneImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
}

export async function fabriquerLImage(carte: CarteIndex, habillage: Habillage): Promise<Blob> {
  await chargerLesPolices();
  const illustration = await illustrationDe(carte);

  const timbre = document.createElement('canvas');
  timbre.width = LARGEUR_TIMBRE;
  timbre.height = LARGEUR_TIMBRE * 1.4;
  const contexteTimbre = timbre.getContext('2d');
  const toile = document.createElement('canvas');
  toile.width = LARGEUR_IMAGE;
  toile.height = HAUTEUR_IMAGE;
  const ctx = toile.getContext('2d');
  if (!contexteTimbre || !ctx) throw new Error("Ce navigateur ne sait pas dessiner l'image.");
  dessinerLeTimbre(contexteTimbre, carte, habillage, LARGEUR_TIMBRE, illustration);

  // Un fond uni : un halo dégradé comme à l'écran doublerait le poids de l'image (mesuré : plus d'un mégaoctet).
  ctx.fillStyle = '#0b1729';
  ctx.fillRect(0, 0, LARGEUR_IMAGE, HAUTEUR_IMAGE);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e0edfa';
  police(ctx, '', 700, 60, SERIF);
  texteEspace(ctx, SITE.nom, LARGEUR_IMAGE / 2, 92, -2, 'center');

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 16;
  ctx.drawImage(timbre, (LARGEUR_IMAGE - LARGEUR_TIMBRE) / 2, 158);
  ctx.restore();

  const basDuTimbre = 158 + LARGEUR_TIMBRE * 1.4;
  ctx.fillStyle = '#e0edfa';
  police(ctx, '', 700, 42, SERIF);
  ctx.fillText(carte.mot, LARGEUR_IMAGE / 2, basDuTimbre + 66);
  ctx.fillStyle = '#adc3da';
  police(ctx, '', 600, 22, MENTION);
  texteEspace(ctx, `TIMBRE ${carte.rarete.toUpperCase()} · ${carte.faction.toUpperCase()}`, LARGEUR_IMAGE / 2, basDuTimbre + 112, 22 * 0.12, 'center');
  police(ctx, '', 400, 22, SANS);
  ctx.fillText(SITE.adresseCourte, LARGEUR_IMAGE / 2, basDuTimbre + 152);

  return new Promise((resolve, reject) => {
    toile.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("L'image n'a pas pu être fabriquée."))), 'image/png');
  });
}
