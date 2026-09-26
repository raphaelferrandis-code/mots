// Les avatars (refonte de septembre 2026). Gratuits : gravure au trait. Débloqués : métal bicolore.
// Premium : couleur pleine, lueur et animation.
import { blink, pt, rep } from './outils.ts';
import type { Point, Trace } from './outils.ts';

const trait = (c: string, s: string) => `<g fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${s}</g>`;
const deux = (u: string, c: string, lo: string) => `<linearGradient id="${u}f" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset=".35" stop-color="${c}"/><stop offset="1" stop-color="${lo}"/></linearGradient>`;
/** Dessin en métal bicolore : « F » dans le tracé désigne le dégradé de l'avatar. */
const metalA = (u: string, c: string, lo: string, corps: string) => `<defs>${deux(u, c, lo)}</defs><g stroke="${c}" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round">${corps.replace(/F/g, `url(#${u}f)`)}</g>`;
const lueur = (u: string, c: string, o = 0.55) => `<radialGradient id="${u}h"><stop stop-color="${c}" stop-opacity="${o}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient><circle cx="50" cy="50" r="48" fill="url(#${u}h)"/>`;
/** La plume d'écriture, dessinée pointe en haut puis couchée : étendard, barbes, rachis, puis tuyau taillé en bec.
 *  Sert aussi d'emblème gravé (onglet Titres, médailles). */
export const PLUME = {
  pose: 'translate(-3 3) rotate(40 50 50)',
  etendard: 'M52.5 71C51 69 46.5 63.5 44.5 59.5C42.5 56 41.5 53 40.5 49.5C39 46.5 38.5 43.5 38 40.5C37.5 37.5 37.5 35 38 32.5C38 29.5 38.5 27 39 25C39.5 22.5 40.5 20.5 41.5 18C42.5 16 43.5 14.5 44.5 12.5C45.5 11 46.5 9.5 47.5 8.5C48.5 7 49 6 50 6C51 6 51.5 7 52 7.5C53 8.5 54 10 55 11.5C56 13 57 14.5 58 16.5C59 18.5 60 20.5 60.5 23C61 25.5 62 28 62.5 31C62.5 33.5 63 36.5 62.5 39.5C62.5 43 62 46 61.5 49.5C61 53 60 56.5 58.5 60C57 63.5 53.5 69.5 52.5 71Z',
  barbes: 'M52 23.5L43.5 18M52.5 34L40.5 28M53 44.5L40 38M53 54.5L42 48M52.5 65L46 58M52 25.5L56.5 18.5M53 38.5L60 31M53 51L60 44.5M52.5 64L57 57.5',
  rachis: 'M50.5 10.5Q55 47 51.5 83.5',
  bec: 'M54 73.5L53.5 83.5L50 92.5L49.5 83L50 73M51 84L50.5 88.5',
};
const etoile = (x: number, y: number, r: number, col: string, b?: number) => `<path d="M${x} ${y - r}L${x + r * 0.25} ${y - r * 0.25}L${x + r} ${y}L${x + r * 0.25} ${y + r * 0.25}L${x} ${y + r}L${x - r * 0.25} ${y + r * 0.25}L${x - r} ${y}L${x - r * 0.25} ${y - r * 0.25}Z" fill="${col}">${b === undefined ? '' : blink(2.4, b)}</path>`;

export const DESSINS_AVATARS: Record<string, Trace> = {
  'plume': (_u, c) => trait(c, `<g transform="${PLUME.pose}"><path d="${PLUME.etendard}" fill="${c}" fill-opacity=".1"/><path d="${PLUME.barbes}" stroke-opacity=".55"/><path d="${PLUME.rachis}"/><path d="${PLUME.bec}"/></g>`),
  'timbre': (_u, c) => `<rect x="24" y="16" width="52" height="68" fill="none" stroke="${c}" stroke-width="3.2" stroke-dasharray="0 5.2" stroke-linecap="round"/>` + trait(c, `<rect x="31" y="23" width="38" height="54" fill="${c}" fill-opacity=".08"/><path d="M36 62l9-14 7 9 5-6 8 11Z" fill="${c}" fill-opacity=".25"/><circle cx="58" cy="36" r="5"/>`) + `<text x="36" y="36" font-family="'Playfair Display', Georgia, serif" font-weight="700" font-size="9" fill="${c}">M</text><text x="64" y="73" text-anchor="end" font-family="Oswald, sans-serif" font-size="6" fill="${c}">20c</text>`,
  'encrier': (_u, c) => trait(c, `<path d="M28 64h44v16a5 5 0 0 1-5 5H33a5 5 0 0 1-5-5Z" fill="${c}" fill-opacity=".1"/><path d="M37 64v-7h26v7M33 57h34"/><path d="M52 56 80 12"/><path d="M60 44c2-14 10-26 21-32-2 14-9 26-21 32Z" fill="${c}" fill-opacity=".14"/><path d="M64 38l8-2m-5-5 7-1"/><path d="M18 90q4-6 8 0q-4 3-8 0Z" fill="${c}"/>`),
  'colombe': (u, c) => metalA(u, c, '#7f93b3', `<path d="M50 48C52 34 58 22 68 12c1 5 4 7 7 6 0 5 3 7 6 6-2 8-9 18-21 26Z" fill="#cfdcef" fill-opacity=".8"/>
      <path d="M64 60 84 68l-3 4 6 4-8 2 4 6-21-14Z" fill="F"/>
      <path d="M24 46c4-7 13-7 18-2 8 6 18 12 26 18-4 8-18 10-28 4-8-4-15-12-16-20Z" fill="F"/>
      <path d="M46 50C42 36 36 22 28 8c5 3 9 4 12 3 1 4 4 5 7 4 1 4 4 5 7 4 1 5 3 7 6 7 0 10 0 18-2 26Z" fill="F"/>
      <path d="M46 48 36 16m12 32-4-31m7 31 1-27m4 28 3-21" fill="none" stroke="#7f93b3" stroke-width=".7"/>
      <path d="m24 46-6 3h7Z" fill="#e6a07a" stroke="none"/><circle cx="30" cy="45" r="1.3" fill="#0b1729" stroke="none"/>
      <g transform="rotate(-14 16 56)"><rect x="4" y="49" width="20" height="14" rx="1" fill="#f3ead7" stroke="#8a6a4a"/><path d="m4 49 10 8 10-8" fill="none" stroke="#8a6a4a"/><circle cx="14" cy="57" r="2.3" fill="#c9434b" stroke="none"/></g>`),
  'boussole': (u, c) => metalA(u, c, '#2f5f82', `<circle cx="50" cy="50" r="34" fill="#0e1d31"/><circle cx="50" cy="50" r="29" fill="none" stroke-opacity=".5"/><path d="m50 11 9 30 30 9-30 9-9 30-9-30-30-9 30-9Z" fill="F"/><path d="m50 11 9 30-9 9ZM89 50l-30 9-9-9ZM50 89l-9-30 9-9ZM11 50l30-9 9 9Z" fill="#0b1729" fill-opacity=".45" stroke="none"/><path d="m50 22 5 24-5 4-5-4Z" fill="#ff7a5c" stroke="none"/><circle cx="50" cy="50" r="3" fill="#fff" stroke="none"/>`),
  'renard': (u, c) => metalA(u, c, '#9a4f22', `<path d="m21 48-3-33 29 18h6l29-18-3 33-10 24-19 15-19-15Z" fill="F"/><path d="m18 15 17 34-14-1 29 39 29-39-14 1 17-34" fill="none"/><path d="m35 49 15 13 15-13-15 25Z" fill="#fff4e6" fill-opacity=".85"/><path d="m31 54 10 5m18 0 10-5" stroke="#3a1c08" stroke-width="3"/><circle cx="36" cy="55" r="1.4" fill="#ffc94a" stroke="none"/><circle cx="64" cy="55" r="1.4" fill="#ffc94a" stroke="none"/><path d="M46 75h8l-4 5Z" fill="#2a1406"/>`),
  'loupe': (u, c) => `<rect x="16" y="26" width="36" height="46" fill="#e9dcc3" stroke="#e9dcc3" stroke-width="3" stroke-dasharray="0 4.4" stroke-linecap="round" transform="rotate(-8 34 49)"/><rect x="21" y="31" width="26" height="36" fill="#7a2f3a" transform="rotate(-8 34 49)"/>` + metalA(u, c, '#7a5a22', `<circle cx="60" cy="46" r="19" fill="#9fd8ff" fill-opacity=".25" stroke-width="4" stroke="F"/><path d="M48 36a14 14 0 0 1 10-6" fill="none" stroke="#fff" stroke-width="2"/><path d="m74 60 16 16" stroke="F" stroke-width="7"/><path d="m74 60 16 16" stroke="#3a2a10" stroke-width="1"/>`),
  'papillon': (u, c) => metalA(u, c, '#2f7f7a', `<path d="M49 50C25 9 5 18 13 44c4 14 16 15 31 15C10 53 20 95 44 77l6-16 6 16c24 18 34-24 0-18 15 0 27-1 31-15C95 18 75 9 51 50" fill="F" fill-opacity=".85"/><path d="M50 43v35m0-35-8-11m8 11 8-11M21 33l23 20-20-5M79 33 56 53l20-5M29 72l15-9m27 9-15-9" fill="none" stroke="#e8fffb"/><circle cx="24" cy="36" r="3" fill="#fff" fill-opacity=".6" stroke="none"/><circle cx="76" cy="36" r="3" fill="#fff" fill-opacity=".6" stroke="none"/>`),
  'chouette': (u, c) => metalA(u, c, '#6b4f26', `<path d="M50 18C30 18 24 36 26 56c2 18 12 28 24 28s22-10 24-28c2-20-4-38-24-38Z" fill="F"/><path d="m30 26-4-12 12 8m32 4 4-12-12 8" fill="F"/><circle cx="40" cy="42" r="10" fill="#fff4dc"/><circle cx="60" cy="42" r="10" fill="#fff4dc"/><circle cx="40" cy="42" r="5" fill="#f0a020" stroke="none"/><circle cx="60" cy="42" r="5" fill="#f0a020" stroke="none"/><circle cx="40" cy="42" r="2.4" fill="#1a1206" stroke="none"/><circle cx="60" cy="42" r="2.4" fill="#1a1206" stroke="none"/><path d="m46 50 4 8 4-8Z" fill="#3a2a10"/><path d="m38 64 4 3 4-3 4 3 4-3 4 3 4-3M40 72l3 2 4-2 3 2 4-2 3 2" fill="none" stroke="#5a4020"/><path d="M14 86h72" stroke-width="3"/>`),
  'lune': (u, c) => metalA(u, c, '#5a4a9a', `<path d="M63 14a37 37 0 1 0 24 60A38 38 0 0 1 63 14Z" fill="F"/><circle cx="46" cy="60" r="4" fill="#fff" fill-opacity=".2" stroke="none"/><circle cx="36" cy="44" r="2.4" fill="#fff" fill-opacity=".2" stroke="none"/><path d="m73 21 3 10 10 3-10 3-3 10-3-10-10-3 10-3Z" fill="#fff8e0"/><circle cx="84" cy="56" r="1.6" fill="#fff" stroke="none"/>`),
  'cerf': (u, c) => metalA(u, c, '#45705a', `<path d="M42 40C36 30 34 22 36 12m0 14-10-6m9-2-8-8m13 22h-8M58 40c6-10 8-18 6-28m0 14 10-6m-9-2 8-8m-13 22h8" fill="none" stroke-width="2.4"/><path d="M50 38c-8 0-12 6-12 14 0 10 6 20 12 28 6-8 12-18 12-28 0-8-4-14-12-14Z" fill="F"/><path d="m39 46-13-5 10 12m25-7 13-5-10 12" fill="F"/><circle cx="44" cy="54" r="1.6" fill="#0b1729" stroke="none"/><circle cx="56" cy="54" r="1.6" fill="#0b1729" stroke="none"/><path d="M47 74h6l-3 4Z" fill="#0b1729"/><path d="M14 82h24m26 0h22M20 88h60" fill="none" stroke-opacity=".5"/>`),
  'baleine': (u, c) => metalA(u, c, '#2f5f8a', `<path d="M14 54c4-16 26-24 46-18 10 3 16 8 22 6l8-10-2 14 8 6H84C74 62 56 68 38 66 24 64 16 60 14 54Z" fill="F"/><path d="M18 58c14 6 36 6 56 0" fill="none" stroke="#e8f6ff"/><path d="M22 60c10 3 22 3 34 1M26 63c8 1.5 16 1.5 26 0" fill="none" stroke="#0b1729" stroke-opacity=".4"/><circle cx="26" cy="50" r="1.6" fill="#0b1729" stroke="none"/><path d="M40 62c2 8 8 12 14 12-4-4-6-8-6-12Z" fill="F"/><path d="M18 84q5-8 12-3 6-8 14 0 6-5 11 3Z" fill="#e8f2ff" fill-opacity=".85"/><path d="M58 86q4-6 10-2 5-5 10 2Z" fill="#e8f2ff" fill-opacity=".6"/>`),
  'clef': (u, c) => metalA(u, c, '#7a5f22', `<g transform="rotate(45 50 50)">${[[20, 39], [31, 50], [20, 61], [9, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.5" fill="F"/>`).join('')}<circle cx="20" cy="50" r="12" fill="F"/><circle cx="20" cy="50" r="6.5" fill="#0f1f35"/><circle cx="20" cy="50" r="3.4" fill="#c2414f" stroke="#ffd9de"/>
      <rect x="31" y="47.5" width="56" height="5" rx="1.5" fill="F"/><rect x="35" y="44" width="3" height="12" rx="1" fill="F"/><rect x="40.5" y="45" width="2" height="10" rx="1" fill="F"/>
      <path d="M68 52.5h17v15h-3.5v-5h-3v5h-3v-8h-3v8h-3v-4H68Z" fill="F"/></g>`),
  'montgolfiere': (u, c) => metalA(u, c, '#a14a3a', `<path d="M50 12C30 12 20 28 22 42c2 12 14 22 22 30h12c8-8 20-18 22-30 2-14-8-30-28-30Z" fill="F"/><path d="M50 12C40 20 38 50 44 72M50 12c10 8 12 38 6 60M50 12v60M24 42h52" fill="none" stroke="#fff3e6" stroke-opacity=".8"/><path d="m44 72 2 8m10-8-2 8" fill="none"/><path d="M43 80h14l-2 8h-10Z" fill="#b98a4a"/><path d="M68 62q3-3 6 0 3-3 6 0M12 70q2-2 4 0 2-2 4 0" fill="none"/>`),
  'dragon': (u, c) => {
      const seg = [[[46, 32], [66, 28], [78, 42], [64, 52]], [[64, 52], [52, 60], [28, 56], [34, 68]], [[34, 68], [40, 80], [62, 84], [82, 76]]];
      const bz = (s: number[][], t: number): Point => { const m = 1 - t; const v = (k: number) => m * m * m * s[0][k] + 3 * m * m * t * s[1][k] + 3 * m * t * t * s[2][k] + t * t * t * s[3][k]; return [v(0), v(1)]; };
      const pts: Point[] = []; seg.forEach((s, j) => { for (let i = j ? 1 : 0; i <= 16; i++) pts.push(bz(s, i / 16)); });
      const n = pts.length - 1, W = (i: number) => 7 - 5.8 * Math.pow(i / n, 1.6);
      const bord = (sg: number, k = 1): Point[] => pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty); return [+(p[0] + (sg * k * W(i) * ty) / l).toFixed(2), +(p[1] - (sg * k * W(i) * tx) / l).toFixed(2)]; });
      const poly = (e: Point[], i: Point[]) => 'M' + e.map((p) => p.join(' ')).join('L') + 'L' + i.reverse().map((p) => p.join(' ')).join('L') + 'Z';
      const dos = bord(1), dos2 = bord(1, 1.75);
      const epines = pts.map((_, i) => (i % 3 === 1 && i < n - 4 ? `M${dos[i - 1].join(' ')}L${dos2[i].join(' ')}L${dos[i + 1].join(' ')}Z` : '')).join('');
      const patte = (d: string, x: number, y: number) => `<path d="${d}" fill="none" stroke="F" stroke-width="3.2" stroke-linecap="round"/><path d="M${x} ${y}l4 1m-4-1 3 3m-3-3v4" fill="none" stroke="#f3f7e8" stroke-width=".9" stroke-linecap="round"/>`;
      return metalA(u, c, '#1f6a4a', `<path d="M46 20c6-8 14-6 16-12 0 8 6 10 10 6-2 8-8 12-16 14Z" fill="#c9f7df" stroke="none"/><path d="M60 30c6-2 10 2 8 6-2 3-6 2-5-1M16 60c-4-6 0-12 6-10 4 2 2 7-2 6M80 22c6 0 8 6 4 9-3 2-6-1-4-3" fill="none" stroke="#c9f7df" stroke-width="1.2"/>
        ${patte('M70 44q8 0 10 8', 80, 52)}${patte('M34 60q-8-2-12 3', 22, 63)}${patte('M50 80q-4 6-10 8', 40, 88)}
        <path d="${epines}" fill="#2e7a5a" stroke="none"/><path d="${poly(bord(1), bord(-1))}" fill="F"/><path d="${poly(bord(-1), bord(-1, 0.3))}" fill="#e3f7e4" stroke="none"/>
        <path d="M${pts.map((p) => p.map((v) => v.toFixed(2)).join(' ')).join('L')}" fill="none" stroke="#0d3324" stroke-width="6" stroke-dasharray="1.1 2.4" opacity=".28"/>
        <path d="M82 76c6-6 10-4 12-10-2 8 2 10 0 16-4-4-8-2-12-4Z" fill="#c9f7df"/>
        <path d="M42 18c4-8 10-12 18-14m-10 4 1-5M38 17c2-8 6-14 12-17" fill="none" stroke="#e8d08a" stroke-width="2"/>
        <path d="m14 26 15 3.5L16 33Z" fill="#8a1c24" stroke="none"/>
        <path d="M48 22c-6-6-16-7-24-3l-10 2c-3 1-3 4 0 5l14 2c4 1 4 3 2 4l-14 1c-3 1-2 4 1 4h13c8 3 16 1 20-4Z" fill="F"/>
        <path d="m16 26.3 1 2 1-1.8m2 .3 1 2 1-1.8m2 .3 1 2 1-1.8M18 33l1-2 1 2m2-.3 1-2 1 2" fill="#fff" stroke="#fff" stroke-width=".4"/>
        <path d="M30 21q3-2.4 6 0-3 2.2-6 0Z" fill="#ffd66b"/><path d="M33 19.6v2.8" stroke="#1a1206" stroke-width="1"/><path d="m28 19 8-3-1 3Z" fill="#1f6a4a"/><circle cx="16" cy="22.5" r=".8" fill="#0b1729" stroke="none"/>
        <path d="M13 23c-7-5-7-13-1-16M16 36c-8 6-8 14-2 16" fill="none" stroke="#f3f7e8" stroke-width=".9"/><path d="m30 37-2 6 4-3 1 6 3-5" fill="#c9f7df" stroke="none"/>`);
    },
  'abeille': (u, c) => metalA(u, c, '#8a5a12', `<ellipse cx="34" cy="38" rx="15" ry="8" transform="rotate(-30 34 38)" fill="#eaf6ff" fill-opacity=".35"/><ellipse cx="66" cy="38" rx="15" ry="8" transform="rotate(30 66 38)" fill="#eaf6ff" fill-opacity=".35"/>
      <ellipse cx="37" cy="50" rx="10" ry="5" transform="rotate(-10 37 50)" fill="#eaf6ff" fill-opacity=".25"/><ellipse cx="63" cy="50" rx="10" ry="5" transform="rotate(10 63 50)" fill="#eaf6ff" fill-opacity=".25"/>
      <path d="M50 50c10 0 12 14 8 24-2 6-6 10-8 12-2-2-6-6-8-12-4-10-2-24 8-24Z" fill="F"/><path d="M42 60q8 3 16 0M41 68q9 3 18 0M44 76q6 2 12 0" fill="none" stroke="#2a1a06" stroke-width="3"/>
      <ellipse cx="50" cy="42" rx="8" ry="7" fill="F"/><circle cx="50" cy="30" r="6" fill="F"/><path d="M47 25c-3-7-7-9-11-9m17 9c3-7 7-9 11-9" fill="none"/><circle cx="36" cy="16" r="1.6" fill="F"/><circle cx="64" cy="16" r="1.6" fill="F"/>`),
  'chat': (u, c) => metalA(u, c, '#56657d', `<path d="M66 84c14 0 22-8 20-18-1-6-6-8-10-6" fill="none" stroke="F" stroke-width="5"/><path d="M36 48c-8 12-9 30-3 38h34c6-8 5-26-3-38Z" fill="F"/>
      <path d="M34 36 30 14l13 11q7-2 14 0l13-11-4 22q2 13-16 14-18-1-16-14Z" fill="F"/><path d="m33 19 7 7-5 3Zm34 0-7 7 5 3Z" fill="#f2b8c6" stroke="none"/>
      <path d="M38 36q4-3 8 0-4 3-8 0Zm16 0q4-3 8 0-4 3-8 0Z" fill="#9be07a"/><path d="M42 34v4m16-4v4" stroke="#0b1729" stroke-width="1.4"/><path d="M48 42h4l-2 2Z" fill="#f2a0b4"/>
      <path d="M40 43l-9-1m9 3-9 2m29-4 9-1m-9 3 9 2" fill="none" stroke-width=".7"/><path d="M38 52q12 5 24 0" fill="none" stroke="#b8323f" stroke-width="2.4"/>
      <rect x="46" y="54" width="8" height="9" fill="#f3ead7" stroke="#e8c56e" stroke-width="1.4" stroke-dasharray="0 2" stroke-linecap="round"/><path d="M42 86v-8m16 8v-8" fill="none" stroke="#0b1729" stroke-opacity=".35"/>`),
  'cerf-volant': (u, c) => metalA(u, c, '#2f5f8a', `<path d="M55 34 20 88" fill="none" stroke-width=".7" stroke-dasharray="1 2"/>
      <path d="M56 10 76 34 54 60 34 32Z" fill="F"/><path d="M56 10 76 34H55Z" fill="#e8594f" fill-opacity=".85" stroke="none"/><path d="M34 32 55 34 54 60Z" fill="#f0c95a" fill-opacity=".85" stroke="none"/>
      <path d="M56 10 54 60M34 32l42 2" fill="none"/><path d="M54 60c-4 8 4 12-2 20s-4 10-10 14" fill="none" stroke-width="1"/>
      ${[[53, 68], [50, 80], [45, 90]].map(([x, y]) => `<path d="m${x - 5} ${y - 2.5} 5 2.5-5 2.5Zm10 0-5 2.5 5 2.5Z" fill="#e8594f" stroke="none"/>`).join('')}`),
  'livre': (u, c) => metalA(u, c, '#8a6a3a', `<path d="M50 38c-10-6-24-6-36-2v40c12-4 26-4 36 2Z" fill="F"/><path d="M50 38c10-6 24-6 36-2v40c-12-4-26-4-36 2Z" fill="F"/><path d="M50 38v40"/>
      <path d="M20 46c8-2 16-2 24 0M20 52c8-2 16-2 24 0M20 58c8-2 16-2 24 0M20 64c8-2 16-2 24 0M56 46c8-2 16-2 24 0M56 52c8-2 16-2 24 0M56 58c8-2 16-2 24 0M56 64c8-2 16-2 24 0" fill="none" stroke="#5a4020" stroke-opacity=".45" stroke-width=".8"/>
      <path d="M53 78v12l3-3 3 3V77" fill="#b8323f" stroke="#7a1f2b"/>`),
  'sablier': (u, c) => metalA(u, c, '#7a5a22', `<path d="M38 20c0 16 10 24 10 30s-10 14-10 30h24c0-16-10-24-10-30s10-14 10-30Z" fill="#dff1ff" fill-opacity=".18"/><path d="M42 30h16c-2 10-6 14-8 18-2-4-6-8-8-18Z" fill="#f0cf7a" stroke="none"/>
      <path d="M50 48v24" stroke="#f0cf7a" stroke-dasharray="1 1.5"/><path d="M40 80c3-9 17-9 20 0Z" fill="#f0cf7a" stroke="none"/>
      <rect x="28" y="14" width="44" height="6" rx="1.5" fill="F"/><rect x="28" y="80" width="44" height="6" rx="1.5" fill="F"/><path d="M32 20v60m36-60v60" stroke="F" stroke-width="3"/>`),
  'oracle': (u, c) => {
      const O = 'M8 50Q50 5 92 50Q50 95 8 50Z', F = 'M8 50Q50 49 92 50Q50 51 8 50Z';
      const cligne = `<animate attributeName="d" values="${O};${O};${F};${O}" keyTimes="0;.9;.95;1" dur="5s" repeatCount="indefinite"/>`;
      return `<defs>${lueur(u, '#8a6cff', 0.6)}<clipPath id="${u}c"><path d="${O}">${cligne}</path></clipPath><linearGradient id="${u}i" gradientUnits="userSpaceOnUse" x1="30" y1="30" x2="70" y2="70"><stop stop-color="#7fe0ff"/><stop offset=".5" stop-color="#c3b5ff"/><stop offset="1" stop-color="#ff9bd6"/><animateTransform attributeName="gradientTransform" type="rotate" from="0 50 50" to="360 50 50" dur="4s" repeatCount="indefinite"/></linearGradient></defs>
      <g stroke="${c}" stroke-linecap="round" stroke-width="1.3"><path d="M50 3v10m0 74v10M20 15l6 9m54-9-6 9M20 85l6-9m54 9-6-9"/></g>
      <path d="${O}" fill="#150f33" stroke="${c}" stroke-width="1.6">${cligne}</path>
      <g clip-path="url(#${u}c)"><circle cx="50" cy="50" r="19" fill="url(#${u}i)"/><circle cx="50" cy="50" r="19" fill="none" stroke="#fff" stroke-opacity=".5" stroke-dasharray="1 3"/><path d="m50 36 7 14-7 14-7-14Z" fill="#0b0720"/><circle cx="44" cy="43" r="3" fill="#fff" fill-opacity=".85"/></g>
      <g>${rep(6, (a) => `<g transform="rotate(${a} 50 50)"><path d="M50 7l2 3-2 3-2-3Z" fill="#f0e8ff"/></g>`)}<animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="16s" repeatCount="indefinite"/></g>`;
    },
  'kitsune': (u, _c) => {
      const Q = 'M0 0C-10-8-14-22-6-34c4-6 2-12-2-16 12 2 18 12 16 24-2 10 2 18-8 26Z';
      const queue = (a: number, i: number) => `<g transform="translate(50 66) rotate(${a})"><path d="${Q}" fill="url(#${u}q)" stroke="#fff3e6" stroke-width=".4"><animateTransform attributeName="transform" type="rotate" values="-5;5;-5" dur="${2.2 + (i % 3) * 0.5}s" begin="${i * 0.18}s" repeatCount="indefinite"/></path></g>`;
      return `<defs>${lueur(u, '#ff9a4a', 0.45)}<linearGradient id="${u}q" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#d9481f"/><stop offset=".5" stop-color="#ff9a4a"/><stop offset="1" stop-color="#ffffff"/></linearGradient><linearGradient id="${u}t" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#ffe2cc"/></linearGradient></defs>
      ${[-80, -60, -40, -20, 0, 20, 40, 60, 80].map(queue).join('')}
      <path d="M50 86C44 82 36 76 32 68L26 52 24 34l12 10 8-2 6 2 6-2 8 2 12-10-2 18-6 16c-4 8-12 14-18 18Z" fill="url(#${u}t)" stroke="#e46a2a" stroke-width=".8"/>
      <path d="m28 40 8 5-5 6Zm44 0-8 5 5 6Z" fill="#e0442a"/><path d="M37 57q5-4 9 1-5 2-9-1Zm26 0q-5-4-9 1 5 2 9-1Z" fill="#ffcf3a"/>
      <path d="M35 56q6-6 12 1m18-1q-6-6-12 1M34 64l6 2m26-2-6 2" fill="none" stroke="#d9241f" stroke-width="1.2" stroke-linecap="round"/><path d="M50 46c-3 4-2 8 0 10 2-2 3-6 0-10Z" fill="#d9241f"/><path d="M47 77h6l-3 3Z" fill="#2a1406"/>
      <g>${[0, 120, 240].map((a, i) => `<g transform="rotate(${a} 50 50)"><path d="M50 10c-3 0-4-4-1-7 1 1 2 1 2 0 2 2 3 5 1 6Z" fill="#8fe4ff">${blink(1, i * 0.3, '.5;1;.5')}</path></g>`).join('')}<animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="9s" repeatCount="indefinite"/></g>`;
    },
  'meduse': (u, _c) => {
      const T1 = 'M0 0q-4 10 0 18t0 18', T2 = 'M0 0q4 10 0 18t0 18';
      return `<defs>${lueur(u, '#3fd6ff', 0.5)}<radialGradient id="${u}o" cy=".95" r="1"><stop stop-color="#ffffff"/><stop offset=".45" stop-color="#9ff5ff"><animate attributeName="stop-color" values="#9ff5ff;#ffb6f0;#c7a6ff;#9ff5ff" dur="6s" repeatCount="indefinite"/></stop><stop offset="1" stop-color="#6a5cff" stop-opacity=".8"/></radialGradient></defs>
      <g><animateTransform attributeName="transform" type="translate" values="0 0;0 -4;0 0" dur="3s" repeatCount="indefinite"/>
      ${[30, 38, 46, 54, 62, 70].map((x, k) => `<path transform="translate(${x} 52)" d="${T1}" fill="none" stroke="#c8faff" stroke-width="${k % 2 ? 0.9 : 1.6}" stroke-opacity=".85"><animate attributeName="d" values="${T1};${T2};${T1}" dur="${2.2 + (k % 3) * 0.3}s" begin="${k * 0.2}s" repeatCount="indefinite"/></path>`).join('')}
      <path d="M22 52C22 22 78 22 78 52q-7-4-14 0-7-4-14 0-7-4-14 0-7-4-14 0Z" fill="url(#${u}o)" stroke="#e6feff" stroke-width=".8"/><path d="M32 40q6-10 18-10" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>
      ${rep(5, (_, i) => `<circle cx="${34 + i * 8}" cy="${44 - (i % 2) * 3}" r="1.3" fill="#fff">${blink(1.6, i * 0.3)}</circle>`)}</g>`;
    },
  'ouroboros': (u, c) => {
      const q = (r: number, a: number) => pt(r, a, 50, 50), N = 64, A0 = 19, A1 = 332;
      const ext = [], int = [], axe1 = [], axe2 = [];
      for (let i = 0; i <= N; i++) { const a = A0 + ((A1 - A0) * i) / N, w = 0.8 + 4.8 * Math.min(1, (a - A0) / 120); ext.push(q(30 + w, a)); int.push(q(30 - w, a)); axe1.push(q(30 + w * 0.45, a)); axe2.push(q(30 - w * 0.45, a)); }
      const ligne = (l: Point[]) => 'M' + l.map((p) => p.join(' ')).join('L');
      const corps = ligne(ext) + 'L' + int.reverse().map((p) => p.join(' ')).join('L') + 'Z';
      return `<defs>${lueur(u, '#f0cf7a', 0.35)}<linearGradient id="${u}s" gradientUnits="userSpaceOnUse" x1="10" y1="10" x2="90" y2="90"><stop stop-color="#f0cf7a"/><stop offset=".35" stop-color="#b3ffe0"/><stop offset=".6" stop-color="#e0b3ff"/><stop offset="1" stop-color="#f0cf7a"/><animateTransform attributeName="gradientTransform" type="rotate" from="0 50 50" to="360 50 50" dur="5s" repeatCount="indefinite"/></linearGradient></defs>
      <g><path d="M46 22c6-3 14-5 21-6l-3 12c-6-2-12-4-18-5Z" fill="#4a0c12"/>
        <path d="${corps}" fill="url(#${u}s)" stroke="#3a2a10" stroke-width=".5"/>
        <path d="${ligne(axe1)}" fill="none" stroke="#1a1206" stroke-width="2.6" stroke-dasharray="1.2 2.2" opacity=".35"/><path d="${ligne(axe2)}" fill="none" stroke="#1a1206" stroke-width="2.6" stroke-dasharray="1.2 2.2" stroke-dashoffset="1.7" opacity=".35"/>
        <path d="M60 24c2 3 0 6 2 9m0 0-1.5 2m1.5-2 1.5 1.5" fill="none" stroke="#c9303a" stroke-width=".8" stroke-linecap="round"/>
        <path d="M44 23c6 0 12 2 18 4l3 2c-2 2-7 2-13 1-6-1-12-2-16-5Z" fill="url(#${u}s)" stroke="#3a2a10" stroke-width=".6"/>
        <path d="M32 20c0-7 8-12 18-12 8 0 14 2 19 5 1 1 1 3-1 3l-10 1c-4 1-8 2-12 5-6 1-12 1-14-2Z" fill="url(#${u}s)" stroke="#3a2a10" stroke-width=".6"/>
        <path d="m60 17 1 4 1-4.3Zm4.5-.6.8 3.4 1-3.6ZM58 26.2l1-2.8 1 3.1Z" fill="#fff"/>
        <ellipse cx="52" cy="13" rx="2.2" ry="1.5" fill="#ffd23a"/><path d="M52 11.6v2.8" stroke="#1a1206" stroke-width=".8"/><path d="M47 11q5-2.4 10 0" fill="none" stroke="#3a2a10" stroke-width=".8"/><circle cx="66" cy="13" r=".6" fill="#3a2a10"/>
        <path d="M40 14q3 2 6 0m-8 4q3 2 6 0m0-7q3 2 6 0" fill="none" stroke="#3a2a10" stroke-width=".4" opacity=".6"/>
        <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="18s" repeatCount="indefinite"/></g>
      <path d="M38 50c0-6 8-6 12 0s12 6 12 0-8-6-12 0-12 6-12 0Z" fill="none" stroke="${c}" stroke-width="1.6"/>`;
    },
  'comete': (u, _c) => `<defs>${lueur(u, '#5aa9ff', 0.4)}<linearGradient id="${u}t" x1="1" y1="0" x2="0" y2="1"><stop stop-color="#ffffff"/><stop offset=".3" stop-color="#a6d8ff" stop-opacity=".8"/><stop offset="1" stop-color="#a6d8ff" stop-opacity="0"/></linearGradient><radialGradient id="${u}n"><stop stop-color="#fff"/><stop offset=".4" stop-color="#dff1ff"/><stop offset="1" stop-color="#a6d8ff" stop-opacity="0"/></radialGradient></defs>
      <path d="M72 22 12 82 20 90 80 30Z" fill="url(#${u}t)" opacity=".85"/>
      ${[[70, 26, 16, 84], [74, 28, 24, 88], [72, 32, 20, 92]].map(([x1, y1, x2, y2], i) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="#fff" stroke-width=".8" stroke-dasharray="4 8" opacity=".8"><animate attributeName="stroke-dashoffset" from="0" to="-24" dur="${0.8 + i * 0.2}s" repeatCount="indefinite"/></path>`).join('')}
      <circle cx="76" cy="26" r="14" fill="url(#${u}n)"><animate attributeName="r" values="13;15;13" dur="1.4s" repeatCount="indefinite"/></circle><circle cx="76" cy="26" r="4.5" fill="#fff"/>
      ${etoile(26, 24, 3.6, '#fff', 0)}${etoile(84, 70, 2.6, '#fff', 0.8)}${etoile(56, 84, 2, '#fff', 1.6)}
      <path d="M10 40l14 4" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity="0"><animateTransform attributeName="transform" type="translate" values="0 0;40 12" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0;0" keyTimes="0;.1;.3;1" dur="3s" repeatCount="indefinite"/></path>`,
  'loup-etoiles': (u, _c) => {
      const pts = [[70, 24], [62, 18], [56, 10], [53, 24], [46, 40], [32, 50], [16, 56], [26, 62], [26, 82], [36, 66], [48, 68], [52, 84], [56, 56], [62, 36], [70, 24]];
      const d = 'M' + pts.map((p) => p.join(' ')).join('L');
      const ciel = Array.from({ length: 42 }, (_, i) => { const x = ((i * 37.3 + 11) % 92) + 4, y = ((i * 53.7 + 7) % 92) + 4; return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i % 5 ? 0.45 : 0.9}" fill="#fff" opacity="${0.3 + (i % 4) * 0.15}">${i % 3 ? '' : blink(2 + (i % 4) * 0.6, i * 0.13, '.15;.9;.15')}</circle>`; }).join('');
      return `<defs>${lueur(u, '#4d7bd1', 0.4)}<radialGradient id="${u}v"><stop stop-color="#9ab8ff" stop-opacity=".28"/><stop offset="1" stop-color="#9ab8ff" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="50" cy="50" rx="62" ry="15" transform="rotate(-32 50 50)" fill="url(#${u}v)"/>${ciel}
      <path d="${d}Z" fill="#b9d4ff" fill-opacity=".1"/>
      <path d="${d}" fill="none" stroke="#b9d4ff" stroke-width=".9" pathLength="100" stroke-dasharray="100 100"><animate attributeName="stroke-dashoffset" values="100;0;0;100" keyTimes="0;.5;.9;1" dur="7s" repeatCount="indefinite"/></path>
      ${pts.slice(0, -1).map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 1.3 : 2}" fill="#fff">${blink(1.8 + (i % 4) * 0.4, i * 0.2, '.5;1;.5')}</circle>`).join('')}`;
    },

  // La boutique de l'Encre (26/09/2026) : métal bicolore, comme les avatars gagnés, avec une touche de couleur.
  'pieuvre': (u, c) => metalA(u, c, '#4a3a7c', `
      <g fill="none" stroke="F" stroke-width="4.6" stroke-linecap="round">
        <path d="M31 52c-8 0-14-5-15-11-1-5 4-7 6-3"/><path d="M34 58c-6 6-13 9-15 16-1 5 4 8 7 4"/>
        <path d="M41 61c-2 9-7 15-6 22 1 5 7 5 7 0"/><path d="M50 62c0 9-1 16 3 22 3 3 8 1 6-3"/>
        <path d="M58 61c3 8 8 12 9 19 1 4 6 5 8 1"/><path d="M65 57c6 3 11 8 16 8 4 0 5-4 2-6"/>
        <path d="M68 50c5-3 8-8 10-14"/>
      </g>
      <g fill="#241a40" stroke="none" fill-opacity=".55">${[[20, 66], [24, 77], [37, 76], [44, 84], [55, 80], [62, 72], [73, 80], [78, 64]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9"/>`).join('')}</g>
      <path d="M50 12c-16 0-26 12-26 27 0 10 5 17 11 20h30c6-3 11-10 11-20 0-15-10-27-26-27Z" fill="F"/>
      <path d="M38 20c3-3 7-4 11-4" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="44" cy="27" r="1.6" fill="#fff" fill-opacity=".35" stroke="none"/><circle cx="58" cy="22" r="1.2" fill="#fff" fill-opacity=".35" stroke="none"/>
      <ellipse cx="41" cy="44" rx="5.6" ry="5" fill="#fff4dc"/><ellipse cx="59" cy="44" rx="5.6" ry="5" fill="#fff4dc"/>
      <rect x="37.6" y="43" width="6.8" height="2.6" rx="1.3" fill="#1d1532" stroke="none"/><rect x="55.6" y="43" width="6.8" height="2.6" rx="1.3" fill="#1d1532" stroke="none"/>
      <path d="M86 12c-7 4-11 12-12 22l-4 14 7-12c7-5 9-14 9-24Z" fill="#f3ead8" stroke="#8d7fb8" stroke-width=".8"/>
      <path d="M85 14 69 50" stroke="#8d7fb8" stroke-width="1"/><path d="M69 50l-2 6 3-5" fill="#1d1532" stroke="#1d1532" stroke-width="1"/>
      <path d="M66 60q-3 4 0 7q3-3 0-7Z" fill="#6c5bb0" stroke="none"/>`),
  // Le corbeau, plumage d'encre : son propre dégradé, noir bleuté, plutôt que le métal clair des autres.
  'corbeau': (u, c) => `<defs><linearGradient id="${u}f" x1="0" y1="0" x2=".9" y2="1"><stop stop-color="#a8bbe6"/><stop offset=".35" stop-color="#3b4b7c"/><stop offset="1" stop-color="#0e1428"/></linearGradient></defs>
      <path d="M6 85h64" stroke="#c89a5e" stroke-width="3" stroke-linecap="round"/>
      <path d="M68 85c7-5 15-6 24-2-7 5-16 6-24 2Z" fill="#f3ead8" stroke="#c89a5e" stroke-width=".8"/>
      <path d="M47 72v12m-4 1h8M56 74v10m-4 1h8" stroke="#c89a5e" stroke-width="1.8" stroke-linecap="round"/>
      <g stroke="${c}" stroke-width="1" stroke-linejoin="round">
        <path d="M28 27C30 22 34 20 38 20C43 20 46 22 48 26C54 30 60 34 66 40C74 48 80 58 84 66L95 81L83 78L80 82L72 74C64 76 54 76 46 72C38 68 32 60 30 50C29 44 28 40 28 36Z" fill="url(#${u}f)"/>
        <path d="M48 34C58 38 68 48 74 60C76 66 76 70 72 74C64 66 56 56 50 46Z" fill="#253258"/>
        <path d="M28 27C21 28 15 31 9 36C16 37 22 37 28 36Z" fill="#2c3346"/>
      </g>
      <path d="M54 44l10 11M52 50l12 13M51 57l11 12" fill="none" stroke="#c8d6f5" stroke-opacity=".45" stroke-width=".9" stroke-linecap="round"/>
      <path d="M36 23c3-2 7-2 10 0" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.3" stroke-linecap="round"/>
      <circle cx="36" cy="29" r="2.4" fill="#fff4dc"/><circle cx="35.6" cy="29" r="1.2" fill="#0b1020"/>`,
  'presse': (u, c) => metalA(u, c, '#6d4b24', `
      <path d="M14 84h72v6H14Z" fill="F"/><path d="M20 84v-4h60v4" fill="none"/>
      <path d="M24 28h7v52h-7ZM69 28h7v52h-7Z" fill="F"/>
      <path d="M19 20h62v9H19Z" fill="F"/><path d="M34 20c3-8 29-8 32 0" fill="none" stroke-width="1.6"/><circle cx="50" cy="11" r="3" fill="F"/>
      <path d="M47 29h6v13h-6Z" fill="F"/><path d="M47 32h6M47 35h6M47 38h6" stroke-width=".8"/>
      <path d="M53 34 88 27" stroke-width="3" stroke-linecap="round"/><circle cx="89" cy="27" r="3.6" fill="F"/>
      <path d="M34 42h32v6H34Z" fill="F"/>
      <path d="M37 54h26v8H37Z" fill="#fff4dc"/><path d="M41 57h18M41 59.5h12" stroke="#2a2016" stroke-width="1"/>
      <path d="M20 62h60v5H20Z" fill="F"/><path d="M31 71h38" stroke-width="1" stroke-dasharray="2 2"/>`),
  'paon': (u, c) => {
    // La plume couchée en diagonale : barbes calculées le long du rachis, puis l'œil, et la pointe taillée.
    const point = (t: number): [number, number] => [20 * (1 - t) ** 2 + 2 * t * (1 - t) * 38 + t * t * 66, 92 * (1 - t) ** 2 + 2 * t * (1 - t) * 58 + t * t * 28];
    const barbes = Array.from({ length: 15 }, (_, i) => {
      const t = 0.18 + i * 0.05, [x, y] = point(t), [x2, y2] = point(t + 0.01);
      const dx = x2 - x, dy = y2 - y, n = Math.hypot(dx, dy), long = 6 + 16 * t;
      const nx = -dy / n, ny = dx / n;
      return `M${(x + nx * long - dx / n * 4).toFixed(1)} ${(y + ny * long - dy / n * 4).toFixed(1)}L${x.toFixed(1)} ${y.toFixed(1)}L${(x - nx * long - dx / n * 4).toFixed(1)} ${(y - ny * long - dy / n * 4).toFixed(1)}`;
    }).join('');
    return `<defs>${deux(u, c, '#2f6f68')}<radialGradient id="${u}o" cx=".5" cy=".55" r=".55"><stop offset=".3" stop-color="#1c3f8c"/><stop offset=".62" stop-color="#2f7ac0"/><stop offset=".7" stop-color="#d9a441"/><stop offset=".86" stop-color="#b88a3a"/><stop offset=".92" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs>
      <path d="${barbes}" fill="none" stroke="${c}" stroke-opacity=".7" stroke-width=".9" stroke-linecap="round"/>
      <g transform="rotate(-38 68 26)"><ellipse cx="68" cy="26" rx="16" ry="21" fill="url(#${u}o)"/><ellipse cx="68" cy="28" rx="4" ry="6" fill="#0f1d45"/>
        <path d="M58 12q10-8 20 0M54 22q-2-10 6-16M82 22q2-10-6-16" fill="none" stroke="${c}" stroke-opacity=".6" stroke-width=".8"/></g>
      <path d="M20 92Q38 58 66 28" fill="none" stroke="url(#${u}f)" stroke-width="2" stroke-linecap="round"/>
      <path d="M20 92l-4 5 6-3Z" fill="#f3ead8" stroke="#f3ead8" stroke-width=".8"/>`;
  },
};
