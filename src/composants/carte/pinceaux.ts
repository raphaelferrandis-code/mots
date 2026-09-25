// Les pinceaux de l'image de partage (imageDuTimbre.ts) : de quoi repeindre sur un canevas ce que CSS dessine à
// l'écran. Lecture des valeurs calculées par le navigateur (couleurs, dégradés, ombres), dégradés peints pixel
// par pixel, bruit des cachets (feTurbulence), placement des lettres. Rien ici ne touche au navigateur : ces
// calculs sont testés sous Node (pinceaux.test.ts).
//
// Pourquoi peindre les dégradés pixel par pixel au lieu de laisser faire le canevas ? Le canevas mélange les
// couleurs sans tenir compte de leur opacité (un passage vers « transparent » tire vers le gris, là où CSS reste
// propre), et Chrome trame ses dégradés d'un bruit invisible qui alourdit énormément une image PNG. Calculés ici,
// les dégradés suivent la règle de CSS et donnent la même image dans tous les navigateurs.

// ── Lecture des valeurs CSS ──────────────────────────────────────────────────

export type Rvba = [number, number, number, number]; // rouge, vert, bleu de 0 à 255 ; opacité de 0 à 1

// Découpe une valeur CSS à ses virgules (ou à ses espaces) de premier niveau, pas à celles des parenthèses.
export function decouper(texte: string, separateur: ',' | ' ' = ','): string[] {
  const parties: string[] = [];
  let profondeur = 0;
  let debut = 0;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (c === '(') profondeur++;
    else if (c === ')') profondeur--;
    else if (profondeur === 0 && (separateur === ',' ? c === ',' : /\s/.test(c))) {
      parties.push(texte.slice(debut, i).trim());
      debut = i + 1;
    }
  }
  parties.push(texte.slice(debut).trim());
  return parties.filter(Boolean);
}

const NOMMEES: Record<string, Rvba> = { transparent: [0, 0, 0, 0], black: [0, 0, 0, 1], white: [255, 255, 255, 1] };

export function lireCouleur(texte: string): Rvba | null {
  const t = texte.trim().toLowerCase();
  if (NOMMEES[t]) return [...NOMMEES[t]];
  if (/^#[0-9a-f]{3,8}$/.test(t)) {
    const h = t.slice(1);
    const plein = h.length <= 4 ? [...h].map((c) => c + c).join('') : h;
    const octet = (i: number): number => parseInt(plein.slice(i, i + 2), 16);
    return [octet(0), octet(2), octet(4), plein.length === 8 ? octet(6) / 255 : 1];
  }
  const nombres = (corps: string): number[] => corps.split(/[\s,/]+/).filter(Boolean).map((n) => (n.endsWith('%') ? parseFloat(n) / 100 : parseFloat(n)));
  let m = t.match(/^rgba?\(([^)]*)\)$/);
  if (m) {
    const [r, g, b, a = 1] = nombres(m[1]);
    return [r, g, b, a];
  }
  // color-mix() et les couleurs récentes se lisent sous la forme color(srgb r v b / a), de 0 à 1.
  m = t.match(/^color\(srgb\s+([^)]*)\)$/);
  if (m) {
    const [r, g, b, a = 1] = nombres(m[1]);
    return [r * 255, g * 255, b * 255, a];
  }
  return null;
}

export const ecrireCouleur = ([r, g, b, a]: Rvba): string => `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${Number(a.toFixed(4))})`;

export type Longueur = { v: number; u: 'px' | '%' };
export function lireLongueur(texte: string): Longueur | null {
  const m = texte.trim().match(/^(-?[\d.]+(?:e-?\d+)?)(px|%)?$/);
  if (!m) return null;
  return { v: parseFloat(m[1]), u: m[2] === '%' ? '%' : 'px' };
}
export const resoudre = (l: Longueur, reference: number): number => (l.u === '%' ? (l.v / 100) * reference : l.v);

// ── Dégradés ─────────────────────────────────────────────────────────────────

export type ArretCss = { couleur: Rvba; position: Longueur | null };
export type TailleRadiale = 'closest-side' | 'farthest-side' | 'closest-corner' | 'farthest-corner' | [Longueur, Longueur];
export type Degrade =
  | { sorte: 'lineaire'; repete: boolean; angle: number; arrets: ArretCss[] }
  | { sorte: 'radial'; repete: boolean; cercle: boolean; taille: TailleRadiale; centre: [Longueur, Longueur]; arrets: ArretCss[] };

const POSITIONS: Record<string, number> = { left: 0, top: 0, center: 50, right: 100, bottom: 100 };
const COTES: Record<string, number> = { top: 0, right: 90, bottom: 180, left: 270 };

function lireArret(texte: string): ArretCss[] | null {
  const morceaux = decouper(texte, ' ');
  const couleur = morceaux.length ? lireCouleur(morceaux[0]) : null;
  if (!couleur) return null;
  const positions = morceaux.slice(1).map(lireLongueur);
  if (positions.some((p) => p === null)) return null;
  if (positions.length === 0) return [{ couleur, position: null }];
  return positions.map((position) => ({ couleur, position }));
}

// Lit un dégradé linéaire ou radial (répété ou non), tel que getComputedStyle l'écrit. null si la forme est inconnue.
export function lireDegrade(texte: string): Degrade | null {
  const m = texte.trim().match(/^(repeating-)?(linear|radial)-gradient\((.*)\)$/s);
  if (!m) return null;
  const repete = Boolean(m[1]);
  const parties = decouper(m[3]);
  if (parties.length === 0) return null;
  const premier = lireArret(parties[0]);
  const reglage = premier ? '' : parties[0];
  const arrets: ArretCss[] = [];
  for (const partie of premier ? parties : parties.slice(1)) {
    const lus = lireArret(partie);
    if (!lus) return null;
    arrets.push(...lus);
  }
  if (arrets.length === 0) return null;

  if (m[2] === 'linear') {
    let angle = 180;
    if (reglage) {
      const a = reglage.match(/^(-?[\d.]+)(deg|turn|rad|grad)$/);
      if (a) angle = parseFloat(a[1]) * ({ deg: 1, turn: 360, rad: 180 / Math.PI, grad: 0.9 } as const)[a[2] as 'deg'];
      else {
        const cotes = reglage.replace(/^to\s+/, '').split(/\s+/).map((c) => COTES[c]);
        if (cotes.some((c) => c === undefined)) return null;
        // Un coin (« to top right ») : on garde l'angle de la bissectrice, suffisant pour ces timbres.
        angle = cotes.length === 1 ? cotes[0] : (cotes.includes(0) && cotes.includes(270) ? 315 : (cotes[0] + cotes[1]) / 2);
      }
    }
    return { sorte: 'lineaire', repete, angle, arrets };
  }

  let cercle = false;
  let taille: TailleRadiale = 'farthest-corner';
  let centre: [Longueur, Longueur] = [{ v: 50, u: '%' }, { v: 50, u: '%' }];
  if (reglage) {
    const [forme, position] = reglage.split(/\s+at\s+|^at\s+/);
    const mots = (forme ?? '').split(/\s+/).filter(Boolean);
    const longueurs: Longueur[] = [];
    for (const mot of mots) {
      if (mot === 'circle') cercle = true;
      else if (mot === 'ellipse') cercle = false;
      else if (['closest-side', 'farthest-side', 'closest-corner', 'farthest-corner'].includes(mot)) taille = mot as TailleRadiale;
      else {
        const l = lireLongueur(mot);
        if (!l) return null;
        longueurs.push(l);
      }
    }
    if (longueurs.length === 1) { cercle = true; taille = [longueurs[0], longueurs[0]]; }
    if (longueurs.length === 2) taille = [longueurs[0], longueurs[1]];
    if (position !== undefined) {
      const coordonnees = position.trim().split(/\s+/).map((p) => (p in POSITIONS ? { v: POSITIONS[p], u: '%' as const } : lireLongueur(p)));
      if (coordonnees.some((c) => c === null) || coordonnees.length === 0) return null;
      centre = [coordonnees[0]!, coordonnees[1] ?? { v: 50, u: '%' }];
    }
  }
  return { sorte: 'radial', repete, cercle, taille, centre, arrets };
}

// Les adresses des images d'une valeur calculée (url("…"), guillemets doubles, échappements par \). Une adresse
// data: peut contenir des parenthèses (le filtre du grain du papier) : on lit jusqu'au guillemet fermant.
export function lireLesAdresses(texte: string): string[] {
  return [...texte.matchAll(/url\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^)\s]*))\s*\)/g)]
    .map((m) => (m[1] ?? m[2] ?? m[3] ?? '').replace(/\\(.)/g, '$1'));
}

// Les images de fond d'une propriété background-image : un dégradé, ou null pour « none » et les images (url).
export function lireLesFonds(texte: string): (Degrade | 'image' | null)[] {
  if (texte.trim() === 'none') return [];
  return decouper(texte).map((fond) => (fond.startsWith('url(') ? 'image' : fond === 'none' ? null : lireDegrade(fond)));
}

export type Ombre = { couleur: Rvba; x: number; y: number; flou: number; etendue: number; interieure: boolean };
// Lit box-shadow ou text-shadow (valeurs calculées : couleur en tête, longueurs en px, « inset » à la fin).
export function lireLesOmbres(texte: string): Ombre[] {
  if (!texte || texte.trim() === 'none') return [];
  return decouper(texte).flatMap((ombre) => {
    const mots = decouper(ombre, ' ');
    let couleur: Rvba = [0, 0, 0, 1];
    const longueurs: number[] = [];
    let interieure = false;
    for (const mot of mots) {
      if (mot === 'inset') interieure = true;
      else if (lireLongueur(mot)) longueurs.push(lireLongueur(mot)!.v);
      else couleur = lireCouleur(mot) ?? couleur;
    }
    if (longueurs.length < 2) return [];
    const [x, y, flou = 0, etendue = 0] = longueurs;
    return [{ couleur, x, y, flou, etendue, interieure }];
  });
}

// ── Peinture des dégradés ────────────────────────────────────────────────────

// Place les arrêts d'un dégradé le long de sa ligne (longueur en px), selon la règle CSS : premier à 0, dernier à
// la fin, les positions manquantes réparties entre leurs voisines, jamais de retour en arrière.
export function placerLesArrets(arrets: ArretCss[], longueur: number): { position: number; couleur: Rvba }[] {
  const positions = arrets.map((a) => (a.position ? resoudre(a.position, longueur) : null));
  if (positions[0] === null) positions[0] = 0;
  if (positions[positions.length - 1] === null) positions[positions.length - 1] = longueur;
  let plusGrande = -Infinity;
  for (let i = 0; i < positions.length; i++) {
    if (positions[i] !== null) { positions[i] = Math.max(positions[i]!, plusGrande); plusGrande = positions[i]!; }
  }
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] !== null) continue;
    let j = i;
    while (positions[j] === null) j++;
    const avant = positions[i - 1]!;
    const pas = (positions[j]! - avant) / (j - i + 1);
    for (let k = i; k < j; k++) positions[k] = avant + pas * (k - i + 1);
  }
  return arrets.map((a, i) => ({ position: positions[i]!, couleur: a.couleur }));
}

// La couleur d'un dégradé à une distance donnée le long de sa ligne, prémultipliée par l'opacité (comme CSS mélange).
function couleurAuPoint(arrets: { position: number; couleur: Rvba }[], d: number, sortie: Float64Array): void {
  const n = arrets.length;
  let ca = arrets[0].couleur;
  let cb = ca;
  let f = 0;
  if (d >= arrets[n - 1].position) ca = cb = arrets[n - 1].couleur;
  else if (d > arrets[0].position) {
    let i = 1;
    while (arrets[i].position < d) i++;
    const a = arrets[i - 1];
    const b = arrets[i];
    ca = a.couleur;
    cb = b.couleur;
    f = b.position > a.position ? (d - a.position) / (b.position - a.position) : 1;
  }
  for (let k = 0; k < 3; k++) sortie[k] = ca[k] * ca[3] + (cb[k] * cb[3] - ca[k] * ca[3]) * f;
  sortie[3] = ca[3] + (cb[3] - ca[3]) * f;
}

// Une table de couleurs prémultipliées, de « debut » à « fin » le long de la ligne : la lecture pixel par pixel
// devient une simple consultation.
function tableDesCouleurs(arrets: { position: number; couleur: Rvba }[], debut: number, fin: number, taille: number): Float64Array {
  const table = new Float64Array(taille * 4);
  const c = new Float64Array(4);
  for (let i = 0; i < taille; i++) {
    couleurAuPoint(arrets, debut + ((fin - debut) * i) / (taille - 1), c);
    table.set(c, i * 4);
  }
  return table;
}

// La distance, le long de la ligne du dégradé, d'un point (x, y) de sa boîte (l × h), et la longueur de la ligne.
function geometrie(degrade: Degrade, l: number, h: number): { longueur: number; distance: (x: number, y: number) => number } {
  if (degrade.sorte === 'lineaire') {
    const a = (degrade.angle * Math.PI) / 180;
    const dx = Math.sin(a);
    const dy = -Math.cos(a);
    const longueur = Math.abs(l * dx) + Math.abs(h * dy);
    const departX = l / 2 - (dx * longueur) / 2;
    const departY = h / 2 - (dy * longueur) / 2;
    return { longueur, distance: (x, y) => (x - departX) * dx + (y - departY) * dy };
  }
  const cx = resoudre(degrade.centre[0], l);
  const cy = resoudre(degrade.centre[1], h);
  const cotes = [cx, l - cx, cy, h - cy].map(Math.abs);
  const coins = [[0, 0], [l, 0], [0, h], [l, h]].map(([x, y]) => [Math.abs(x - cx), Math.abs(y - cy)]);
  let rx: number;
  let ry: number;
  const t = degrade.taille;
  if (Array.isArray(t)) { rx = resoudre(t[0], l); ry = degrade.cercle ? rx : resoudre(t[1], h); }
  else if (t === 'closest-side' || t === 'farthest-side') {
    const choisir = t === 'closest-side' ? Math.min : Math.max;
    rx = choisir(cotes[0], cotes[1]);
    ry = choisir(cotes[2], cotes[3]);
    if (degrade.cercle) rx = ry = choisir(rx, ry);
  } else {
    const distances = coins.map(([x, y]) => Math.hypot(x, y));
    const choisi = coins[distances.indexOf((t === 'closest-corner' ? Math.min : Math.max)(...distances))];
    if (degrade.cercle) rx = ry = Math.hypot(choisi[0], choisi[1]);
    else {
      // Ellipse passant par le coin, de même rapport que pour « side » (règle CSS).
      const rapport = (t === 'closest-corner' ? Math.min(cotes[0], cotes[1]) / Math.min(cotes[2], cotes[3]) : Math.max(cotes[0], cotes[1]) / Math.max(cotes[2], cotes[3])) || 1;
      ry = Math.hypot(choisi[0] / rapport, choisi[1]);
      rx = ry * rapport;
    }
  }
  rx = Math.max(rx, 1e-6);
  ry = Math.max(ry, 1e-6);
  return { longueur: rx, distance: (x, y) => Math.hypot((x - cx) / rx, (y - cy) / ry) * rx };
}

// Une couche de fond : un dégradé dessiné dans une tuile de taille donnée, décalée depuis le coin de la boîte,
// répétée dans les deux sens (le réglage par défaut de CSS).
export type Couche = { degrade: Degrade; tuile: [number, number]; decalage: [number, number] };

// Prépare la lecture d'une couche : (x, y) dans la boîte → couleur prémultipliée écrite dans « sortie ».
export function lecteurDeCouche(couche: Couche): (x: number, y: number, sortie: Float64Array) => void {
  const [tl, th] = couche.tuile;
  const { longueur, distance } = geometrie(couche.degrade, tl, th);
  const arrets = placerLesArrets(couche.degrade.arrets, longueur);
  const debut = arrets[0].position;
  const etendue = arrets[arrets.length - 1].position - debut || 1;
  const repete = couche.degrade.repete && arrets[arrets.length - 1].position > debut;
  // Au-delà des extrémités, la couleur reste celle du premier ou du dernier arrêt.
  const table = tableDesCouleurs(arrets, debut, debut + etendue, 2048);
  const derniere = 2047;
  const [ox, oy] = couche.decalage;
  return (x, y, sortie) => {
    let lx = (x - ox) % tl;
    if (lx < 0) lx += tl;
    let ly = (y - oy) % th;
    if (ly < 0) ly += th;
    let t = (distance(lx, ly) - debut) / etendue;
    if (repete) t -= Math.floor(t);
    const i = Math.round(Math.min(1, Math.max(0, t)) * derniere) * 4;
    sortie[0] = table[i]; sortie[1] = table[i + 1]; sortie[2] = table[i + 2]; sortie[3] = table[i + 3];
  };
}

// La bordure d'un élément peinte avec border-image: <dégradé> 1 : chaque côté étire la bande d'un pixel prise au
// bord de l'image, chaque coin étire son pixel de coin. Le lecteur rend la couleur d'un point (x, y) de la bordure.
export function lecteurDeBordureImage(degrade: Degrade, l: number, h: number, bord: number): (x: number, y: number, sortie: Float64Array) => void {
  const lire = lecteurDeCouche({ degrade, tuile: [l, h], decalage: [0, 0] });
  const le = (v: number, taille: number): number => {
    if (v < bord) return (v / bord) * 1;
    if (v > taille - bord) return taille - 1 + (v - (taille - bord)) / bord;
    return 1 + ((v - bord) * (taille - 2)) / Math.max(1e-6, taille - 2 * bord);
  };
  return (x, y, sortie) => {
    // Un pixel du bord intérieur, à moitié dans le trou : on le lit sur l'anneau, au plus près.
    if (x > bord && x < l - bord && y > bord && y < h - bord) {
      const ecarts = [x - bord, l - bord - x, y - bord, h - bord - y];
      const plusPres = ecarts.indexOf(Math.min(...ecarts));
      if (plusPres === 0) x = bord; else if (plusPres === 1) x = l - bord; else if (plusPres === 2) y = bord; else y = h - bord;
    }
    lire(Math.min(l - 1e-6, le(x, l)), Math.min(h - 1e-6, le(y, h)), sortie);
  };
}

export type Pixels = { x: number; y: number; largeur: number; hauteur: number; donnees: Uint8ClampedArray<ArrayBuffer> };

// Les pixels entiers de l'image (échelle k) touchés par une boîte donnée en px de la sonde.
export function cadrer(boite: { x: number; y: number; l: number; h: number }, k: number): Pixels {
  const x = Math.floor(boite.x * k);
  const y = Math.floor(boite.y * k);
  const largeur = Math.max(0, Math.ceil((boite.x + boite.l) * k) - x);
  const hauteur = Math.max(0, Math.ceil((boite.y + boite.h) * k) - y);
  return { x, y, largeur, hauteur, donnees: new Uint8ClampedArray(largeur * hauteur * 4) };
}

// La part d'un pixel [p, p + 1] couverte par l'intervalle [a, b].
const recouvrement = (p: number, a: number, b: number): number => Math.max(0, Math.min(1, Math.min(p + 1, b) - Math.max(p, a)));

// Peint dans des pixels une couleur de fond puis des couches (la première de la liste au-dessus), évaluées au
// centre de chaque pixel. « bord » : seul l'anneau de cette épaisseur le long des côtés est peint (une bordure).
// Les pixels à cheval sur un bord ne sont couverts qu'en partie, comme à l'écran.
export function peindreLeFond(pixels: Pixels, boite: { x: number; y: number; l: number; h: number }, k: number, couleur: Rvba | null, couches: ((x: number, y: number, sortie: Float64Array) => void)[], bord = 0): void {
  const c = new Float64Array(4);
  const x0 = boite.x * k, x1 = (boite.x + boite.l) * k, y0 = boite.y * k, y1 = (boite.y + boite.h) * k;
  const e = bord * k;
  const anneau = bord > 0 && boite.l > 2 * bord && boite.h > 2 * bord;
  for (let j = 0; j < pixels.hauteur; j++) {
    const py = pixels.y + j;
    const couvertY = recouvrement(py, y0, y1);
    if (couvertY <= 0) continue;
    const trouY = anneau ? recouvrement(py, y0 + e, y1 - e) : 0;
    const y = (py + 0.5) / k - boite.y;
    for (let i = 0; i < pixels.largeur; i++) {
      const px = pixels.x + i;
      let couvert = couvertY * recouvrement(px, x0, x1);
      if (anneau) couvert -= trouY * recouvrement(px, x0 + e, x1 - e);
      if (couvert <= 1e-6) continue;
      const x = (px + 0.5) / k - boite.x;
      let r = 0, g = 0, b = 0, a = 0;
      if (couleur) { r = couleur[0] * couleur[3]; g = couleur[1] * couleur[3]; b = couleur[2] * couleur[3]; a = couleur[3]; }
      for (let n = couches.length - 1; n >= 0; n--) {
        couches[n](x, y, c);
        const reste = 1 - c[3];
        r = c[0] + r * reste; g = c[1] + g * reste; b = c[2] + b * reste; a = c[3] + a * reste;
      }
      a *= couvert;
      const o = (j * pixels.largeur + i) * 4;
      if (a <= 0) continue;
      pixels.donnees[o] = (r * couvert) / a;
      pixels.donnees[o + 1] = (g * couvert) / a;
      pixels.donnees[o + 2] = (b * couvert) / a;
      pixels.donnees[o + 3] = a * 255;
    }
  }
}

// ── Le poids de l'image ──────────────────────────────────────────────────────

// Aligne les pixels presque égaux à leur voisin (du dessus, sinon de gauche) : au plus « tolerance » niveaux
// d'écart par canal, invisible à l'œil. Les dégradés superposés (fond, lueur, vernis) laissent sinon un fin bruit
// d'arrondis que le PNG compresse mal ; les bords nets (traits, lettres) dépassent la tolérance et restent intacts.
// Le voisin du dessus d'abord : les rayures de l'impression sont horizontales.
export function lisserLesAplats(pixels: Uint8ClampedArray, largeur: number, hauteur: number, tolerance: number): void {
  const proche = (p: number, q: number): boolean =>
    pixels[p + 3] === pixels[q + 3] && Math.abs(pixels[p] - pixels[q]) <= tolerance && Math.abs(pixels[p + 1] - pixels[q + 1]) <= tolerance && Math.abs(pixels[p + 2] - pixels[q + 2]) <= tolerance;
  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < largeur; x++) {
      const p = (y * largeur + x) * 4;
      // Les voisins sont déjà alignés ; le pixel lui-même garde sa valeur d'origine : l'écart reste borné.
      const voisin = y > 0 && proche(p, p - largeur * 4) ? p - largeur * 4 : x > 0 && proche(p, p - 4) ? p - 4 : -1;
      if (voisin < 0) continue;
      pixels[p] = pixels[voisin];
      pixels[p + 1] = pixels[voisin + 1];
      pixels[p + 2] = pixels[voisin + 2];
    }
  }
}

// ── Le bruit des cachets : feTurbulence, d'après l'algorithme de référence de la norme SVG ─────────────────
// Même graine, mêmes coordonnées : même grain que le filtre du cachet à l'écran.

const BLOC = 0x100;
const MASQUE = 0xff;
const DECALAGE = 0x1000;
const ALEA_M = 2147483647;
const ALEA_A = 16807;
const ALEA_Q = 127773;
const ALEA_R = 2836;

const alea = (graine: number): number => {
  const r = ALEA_A * (graine % ALEA_Q) - ALEA_R * Math.floor(graine / ALEA_Q);
  return r <= 0 ? r + ALEA_M : r;
};

// Renvoie le bruit d'un canal (0 rouge … 3 opacité) au point (x, y), déjà multiplié par sa fréquence.
export function preparerLeBruit(graine: number): (canal: number, x: number, y: number) => number {
  let s = Math.trunc(graine);
  if (s <= 0) s = -(s % (ALEA_M - 1)) + 1;
  if (s > ALEA_M - 1) s = ALEA_M - 1;
  const selecteur = new Int32Array(BLOC + BLOC + 2);
  const gradients = [0, 1, 2, 3].map(() => new Float64Array((BLOC + BLOC + 2) * 2));
  let i = 0;
  for (let k = 0; k < 4; k++) {
    for (i = 0; i < BLOC; i++) {
      selecteur[i] = i;
      for (let j = 0; j < 2; j++) {
        s = alea(s);
        gradients[k][i * 2 + j] = ((s % (BLOC + BLOC)) - BLOC) / BLOC;
      }
      const norme = Math.hypot(gradients[k][i * 2], gradients[k][i * 2 + 1]) || 1;
      gradients[k][i * 2] /= norme;
      gradients[k][i * 2 + 1] /= norme;
    }
  }
  while (--i) {
    const k = selecteur[i];
    s = alea(s);
    const j = s % BLOC;
    selecteur[i] = selecteur[j];
    selecteur[j] = k;
  }
  for (i = 0; i < BLOC + 2; i++) {
    selecteur[BLOC + i] = selecteur[i];
    for (let k = 0; k < 4; k++) for (let j = 0; j < 2; j++) gradients[k][(BLOC + i) * 2 + j] = gradients[k][i * 2 + j];
  }
  const courbe = (t: number): number => t * t * (3 - 2 * t);
  return (canal, x, y) => {
    const g = gradients[canal];
    let t = x + DECALAGE;
    const bx0 = Math.trunc(t) & MASQUE;
    const bx1 = (bx0 + 1) & MASQUE;
    const rx0 = t - Math.trunc(t);
    const rx1 = rx0 - 1;
    t = y + DECALAGE;
    const by0 = Math.trunc(t) & MASQUE;
    const by1 = (by0 + 1) & MASQUE;
    const ry0 = t - Math.trunc(t);
    const ry1 = ry0 - 1;
    const i0 = selecteur[bx0];
    const j0 = selecteur[bx1];
    const b00 = selecteur[i0 + by0] * 2;
    const b10 = selecteur[j0 + by0] * 2;
    const b01 = selecteur[i0 + by1] * 2;
    const b11 = selecteur[j0 + by1] * 2;
    const sx = courbe(rx0);
    const sy = courbe(ry0);
    let u = rx0 * g[b00] + ry0 * g[b00 + 1];
    let v = rx1 * g[b10] + ry0 * g[b10 + 1];
    const a = u + sx * (v - u);
    u = rx0 * g[b01] + ry1 * g[b01 + 1];
    v = rx1 * g[b11] + ry1 * g[b11 + 1];
    const b = u + sx * (v - u);
    return a + sy * (b - a);
  };
}

// La valeur d'un canal de feTurbulence, de 0 à 1, au point (x, y) du dessin (type fractalNoise ou turbulence).
export function turbulence(bruit: (canal: number, x: number, y: number) => number, canal: number, x: number, y: number, frequence: [number, number], octaves: number, fractal: boolean): number {
  let somme = 0;
  let vx = x * frequence[0];
  let vy = y * frequence[1];
  let ratio = 1;
  for (let o = 0; o < octaves; o++) {
    const n = bruit(canal, vx, vy);
    somme += (fractal ? n : Math.abs(n)) / ratio;
    vx *= 2;
    vy *= 2;
    ratio *= 2;
  }
  return Math.min(1, Math.max(0, fractal ? (somme + 1) / 2 : somme));
}

// ── Texte ────────────────────────────────────────────────────────────────────

// La place de chaque lettre d'un texte espacé (letter-spacing) : chaque lettre avance de sa chasse, de
// l'espacement et du crénage qui la sépare de la suivante (mesuré par paires, comme le fait le navigateur).
// « largeur » compte l'espacement après la dernière lettre, comme la boîte du texte à l'écran.
export function placerLesLettres(texte: string, espace: number, mesurer: (t: string) => number): { lettres: string[]; x: number[]; chasses: number[]; largeur: number } {
  const lettres = [...texte];
  const chasses = lettres.map((l) => mesurer(l));
  const x: number[] = [];
  let position = 0;
  lettres.forEach((lettre, i) => {
    x.push(position);
    const crenage = i + 1 < lettres.length ? mesurer(lettre + lettres[i + 1]) - chasses[i] - chasses[i + 1] : 0;
    position += chasses[i] + espace + crenage;
  });
  return { lettres, x, chasses, largeur: position };
}

// Les lettres d'un texte posé sur un chemin (textPath SVG) : la distance de leur milieu depuis le départ du chemin.
// « textLength » avec lengthAdjust="spacing" : l'écart est réparti entre les lettres. Règle SVG : une lettre dont
// le milieu dépasse le bout du chemin n'est pas dessinée.
export function lettresLeLongDuChemin(placement: { lettres: string[]; x: number[]; chasses: number[]; largeur: number }, depart: number, longueur: number, longueurVoulue: number | null = null): { lettre: string; milieu: number; chasse: number }[] {
  const n = placement.lettres.length;
  const ajout = longueurVoulue !== null && n > 0 ? (longueurVoulue - placement.largeur) / n : 0;
  return placement.lettres
    .map((lettre, i) => ({ lettre, milieu: depart + placement.x[i] + ajout * i + placement.chasses[i] / 2, chasse: placement.chasses[i] }))
    .filter(({ milieu }) => milieu >= 0 && milieu <= longueur);
}
