// Outils de dessin des cadres et des avatars. Chaque dessin est une chaîne SVG fabriquée à la demande :
// les animations sont en SVG natif (SMIL), ce qui les rend indépendantes de React et du CSS.
// Repère des cadres : 200 × 200, centre (100, 100), le portrait occupe le disque de rayon 60.
// Repère des avatars : 100 × 100, dessinés dans ce même disque.

/** Un tracé reçoit un préfixe unique (pour les identifiants de dégradés) et la teinte de l'objet. */
export type Trace = (u: string, c: string) => string;

export type Point = [number, number];

export const rep = (k: number, f: (angle: number, i: number) => string): string => Array.from({ length: k }, (_, i) => f((i * 360) / k, i)).join('');
export const rot = (a: number, s: string): string => `<g transform="rotate(${a.toFixed(2)} 100 100)">${s}</g>`;
export const pt = (r: number, a: number, cx = 100, cy = 100): Point => [+(cx + r * Math.sin((a * Math.PI) / 180)).toFixed(2), +(cy - r * Math.cos((a * Math.PI) / 180)).toFixed(2)];
export const spin = (d: number, rev = false, c = '100 100'): string => `<animateTransform attributeName="transform" type="rotate" from="0 ${c}" to="${rev ? -360 : 360} ${c}" dur="${d}s" repeatCount="indefinite" additive="sum"/>`;
export const blink = (d: number, b = 0, v = '.2;1;.2'): string => `<animate attributeName="opacity" values="${v}" dur="${d}s" begin="${b}s" repeatCount="indefinite"/>`;
export const metal = (id: string, c: string, hi = '#fff7e4', lo?: string): string => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lo || c}"/><stop offset=".42" stop-color="${hi}"/><stop offset=".58" stop-color="${c}"/><stop offset="1" stop-color="${lo || c}" stop-opacity=".8"/></linearGradient>`;
/** Le double filet commun à tous les cadres ; il attend un dégradé `${u}m` déclaré par le cadre. */
export const ring = (u: string, c: string, w = 2): string => `<circle cx="100" cy="100" r="61.5" fill="none" stroke="${c}" stroke-opacity=".4" stroke-width=".7"/><circle cx="100" cy="100" r="64.5" fill="none" stroke="url(#${u}m)" stroke-width="${w}"/>`;
export const star = (x: number, y: number, r: number, fill: string, extra = ''): string => `<path d="M${x} ${y - r}L${x + r * 0.22} ${y - r * 0.22}L${x + r} ${y}L${x + r * 0.22} ${y + r * 0.22}L${x} ${y + r}L${x - r * 0.22} ${y + r * 0.22}L${x - r} ${y}L${x - r * 0.22} ${y - r * 0.22}Z" fill="${fill}"${extra}/>`;
/** Une étoile qui scintille : invisible au repos, pour qu'un cadre figé reste sobre. */
export const etincelle = (x: number, y: number, r: number, fill: string, d: number, b: number, v = '0;0;1;0'): string => star(x, y, r, fill, ` opacity="0"`).replace('/>', `>${blink(d, b, v)}</path>`);
export const gem = (x: number, y: number, r: number, c: string, light = '#ffffff'): string => `<path d="M${x} ${y - r}L${x + r * 0.8} ${y}L${x} ${y + r}L${x - r * 0.8} ${y}Z" fill="${c}" stroke="${light}" stroke-opacity=".7" stroke-width=".6"/><path d="M${x} ${y - r}L${x + r * 0.8} ${y}L${x} ${y}Z" fill="${light}" fill-opacity=".45"/>`;
export const sector = (r1: number, r2: number, a1: number, a2: number): string => {
  const [x1, y1] = pt(r2, a1), [x2, y2] = pt(r2, a2), [x3, y3] = pt(r1, a2), [x4, y4] = pt(r1, a1);
  const l = a2 - a1 > 180 ? 1 : 0;
  return `M${x1} ${y1}A${r2} ${r2} 0 ${l} 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 ${l} 0 ${x4} ${y4}Z`;
};
export const wobble = (r: number, amp: number, k: number, ph = 0, step = 4): string => {
  let d = '';
  for (let a = 0; a <= 360; a += step) { const [x, y] = pt(r + amp * Math.sin(((a * k + ph) * Math.PI) / 180), a); d += (a ? 'L' : 'M') + x + ' ' + y; }
  return d + 'Z';
};
export const circlePath = (r: number): string => `M100 ${100 - r}a${r} ${r} 0 1 1 -.01 0`;
/** Légende circulaire centrée sur le rayon rc (capitales ≈ 0,76 em) et répartie régulièrement sur tout le tour. */
export const legende = (id: string, rc: number, taille: number, texte: string, attrs: string): string => {
  const rb = +(rc - taille * 0.38).toFixed(2), tour = (2 * Math.PI * rb).toFixed(1);
  return `<path id="${id}" d="${circlePath(rb)}" fill="none"/><text font-size="${taille}" ${attrs}><textPath href="#${id}" textLength="${tour}" lengthAdjust="spacing">${texte}</textPath></text>`;
};
export const halo = (u: string, c: string, r = 96, o = 0.45): string => `<radialGradient id="${u}h"><stop offset=".55" stop-color="${c}" stop-opacity="${o}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient><circle cx="100" cy="100" r="${r}" fill="url(#${u}h)"/>`;
export const rise = (x: number, y: number, dy: number, d: number, b: number, r: number, col: string): string => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity="0"><animateTransform attributeName="transform" type="translate" values="0 0;${(Math.sin(x) * 6).toFixed(1)} ${-dy}" dur="${d}s" begin="${b}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur="${d}s" begin="${b}s" repeatCount="indefinite"/></circle>`;
/** Couronne dentée : t dents de hauteur h au rayon r. */
export const engrenage = (r: number, t: number, h: number): string => {
  let d = '';
  for (let i = 0; i < t; i++) { const a = (i * 360) / t, s = 360 / t; ([[r, a], [r + h, a + s * 0.15], [r + h, a + s * 0.45], [r, a + s * 0.6]] as const).forEach(([rr, aa], k) => { const [x, y] = pt(rr, aa); d += (i || k ? 'L' : 'M') + x + ' ' + y; }); }
  return d + 'Z';
};
export const chemin = (points: Point[]): string => 'M' + points.map((p) => p.join(' ')).join('L');
