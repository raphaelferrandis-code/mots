// Les cadres de portrait (refonte de septembre 2026, validée sur la planche de tri).
// `fond` se dessine derrière le portrait, `dessin` par-dessus : un aplat opaque ne doit jamais aller dans `dessin`.
import { blink, circlePath, engrenage, etincelle, gem, halo, legende, metal, pt, rep, ring, rise, rot, sector, spin, star, wobble } from './outils.ts';
import type { Point, Trace } from './outils.ts';

export type DessinCadre = { fond?: Trace; dessin: Trace };

export const DESSINS_CADRES: Record<string, DessinCadre> = {
  'simple': {
    dessin: (u, c) => `<defs>${metal(u + 'm', c)}</defs>${ring(u, c, 1.6)}
      <circle cx="100" cy="100" r="72.5" fill="none" stroke="${c}" stroke-opacity=".35" stroke-width=".6"/>
      <g stroke="${c}" stroke-width=".7" stroke-linecap="round">${rep(72, (a, i) => rot(a, `<path d="M100 ${i % 6 ? 32 : 29.5}V33.5" stroke-opacity="${i % 6 ? 0.45 : 0.9}"/>`))}</g>
      ${rep(4, (a) => rot(a, star(100, 22, 4, c)))}`,
  },
  'dentelure': {
    fond: (u, c) => `<defs><mask id="${u}k"><circle cx="100" cy="100" r="80" fill="#fff"/>${rep(44, (a) => { const [x, y] = pt(80, a); return `<circle cx="${x}" cy="${y}" r="3.1" fill="#000"/>`; })}</mask>
      <radialGradient id="${u}p" r=".6"><stop offset=".7" stop-color="${c}"/><stop offset="1" stop-color="#c9b48f"/></radialGradient></defs>
      <circle cx="100" cy="100" r="80" fill="url(#${u}p)" mask="url(#${u}k)"/>
      <circle cx="100" cy="100" r="74.5" fill="none" stroke="#6b4d33" stroke-width=".7"/>
      ${legende(u + 't', 68.5, 6.6, 'PHILAMOTS · POSTE DES MOTS · 2026 · PHILAMOTS · POSTE DES MOTS · 2026 · ', `font-family="Oswald, 'Arial Narrow', sans-serif" fill="#6b4d33" font-weight="500"`)}`,
    dessin: (_u, _c) => `<circle cx="100" cy="100" r="62.5" fill="none" stroke="#6b4d33" stroke-width="1.4"/>`,
  },
  'postal': {
    dessin: (u, c) => `<defs>${metal(u + 'm', c)}</defs>${ring(u, c)}
      <circle cx="100" cy="100" r="70" fill="none" stroke="${c}" stroke-width="1"/><circle cx="100" cy="100" r="83" fill="none" stroke="url(#${u}m)" stroke-width="2.2"/>
      ${legende(u + 't', 76.2, 7.2, '✦ BUREAU DES MOTS ✦ PHILAMOTS ✦ LEVÉE DE 18H ', `font-family="Oswald, 'Arial Narrow', sans-serif" fill="${c}" font-weight="600"`)}
      <g fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" opacity=".85">${[0, 1, 2, 3, 4].map((i) => `<path d="M168 ${78 + i * 11}q9-6 18 0t18 0" />`).join('')}</g>
      <rect x="84" y="176" width="32" height="12" rx="2" fill="#0d1a2c" stroke="url(#${u}m)"/><text x="100" y="185" text-anchor="middle" font-family="Oswald, sans-serif" font-size="7" fill="${c}">25·IX</text>`,
  },
  'herbier-presse': {
    dessin: (u, c) => {
      const frond = (s: string) => `<g transform="${s}"><path d="M0 0C4-14 2-30-6-42" fill="none" stroke="${c}" stroke-width="1.2"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => { const y = -5 - i * 5.4, x = -i * 0.8; return `<path d="M${x} ${y}q-8-2-10-8q7 0 10 8Zm0 0q7-4 7-10q-6 3-7 10Z" fill="${c}" fill-opacity="${0.55 - i * 0.05}"/>`; }).join('')}</g>`;
      const fleur = (x: number, y: number, col: string) => `<g transform="translate(${x} ${y})">${rep(5, (a) => `<ellipse rx="2.4" ry="4.6" cy="-4" transform="rotate(${a})" fill="${col}"/>`)}<circle r="1.8" fill="#f6e3a1"/></g>`;
      return `<defs>${metal(u + 'm', c, '#eef7e6')}</defs>${ring(u, c, 1.4)}
      ${frond('translate(52 150) rotate(-35)')}${frond('translate(148 150) scale(-1 1) rotate(-35)')}${frond('translate(60 44) rotate(-150)')}
      ${fleur(40, 108, '#e9b7c9')}${fleur(162, 92, '#c8b6ee')}${fleur(146, 42, '#f0d59a')}${fleur(100, 172, '#e9b7c9')}
      <rect x="22" y="70" width="26" height="9" fill="#efe3c6" fill-opacity=".72" transform="rotate(-24 35 74)"/>
      <rect x="152" y="140" width="26" height="9" fill="#efe3c6" fill-opacity=".72" transform="rotate(-24 165 144)"/>`;
    },
  },
  'ronces': {
    dessin: (u, c) => `<defs>${metal(u + 'm', c, '#e6fff0')}<radialGradient id="${u}b"><stop offset="0" stop-color="#b276c9"/><stop offset="1" stop-color="#4b2160"/></radialGradient></defs>${ring(u, c, 1.3)}
      <path d="${wobble(72, 4, 7)}" fill="none" stroke="url(#${u}m)" stroke-width="2.4"/><path d="${wobble(72, 4, 7, 180)}" fill="none" stroke="${c}" stroke-width="1.4" stroke-opacity=".7"/>
      ${rep(28, (a, i) => rot(a, `<path d="M${i % 2 ? 98 : 102} ${i % 2 ? 24 : 32}l${i % 2 ? -3 : 3} ${i % 2 ? -7 : 7} ${i % 2 ? 6 : -6} 0Z" fill="${c}" transform="rotate(${i % 2 ? -10 : 10} 100 28)"/>`))}
      ${rep(7, (a) => rot(a + 20, `<circle cx="100" cy="17" r="3.4" fill="url(#${u}b)"/><circle cx="104" cy="20" r="2.6" fill="url(#${u}b)"/><circle cx="99" cy="15.8" r=".9" fill="#fff" fill-opacity=".7"/>`))}
      ${rep(5, (a) => rot(a + 50, `<path d="M100 28q10-12 20-6q-8 10-20 6Z" fill="${c}" fill-opacity=".6"/>`))}`,
  },
  'arabesque': {
    dessin: (u, c) => `<defs>${metal(u + 'm', c)}</defs>${ring(u, c)}
      ${rep(4, (a) => rot(a, `<g fill="none" stroke="url(#${u}m)" stroke-linecap="round"><path d="M100 34C88 34 76 30 74 21c-2-9 8-13 13-8 4 5-1 10-5 8" stroke-width="1.8"/><path d="M100 34c12 0 24-4 26-13 2-9-8-13-13-8-4 5 1 10 5 8" stroke-width="1.8"/><path d="M86 30C70 34 58 44 54 58" stroke-width="1"/><path d="M114 30c16 4 28 14 32 28" stroke-width="1"/></g><path d="M100 14q-4 7 0 11q4-4 0-11Z" fill="${c}"/><circle cx="100" cy="30" r="1.8" fill="${c}"/>`))}`,
  },
  'ecailles': {
    dessin: (u, c) => `<defs>${metal(u + 'm', c, '#e8fff3', '#2e7a5a')}<linearGradient id="${u}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d7ffe9"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="#1f5f45"/></linearGradient></defs>
      ${rep(30, (a) => rot(a + 6, `<path d="M94 22q0 11 6 13q6-2 6-13Z" fill="url(#${u}s)" stroke="#1a4a37" stroke-width=".6"/>`))}
      ${rep(30, (a) => rot(a, `<path d="M94.5 29q0 9 5.5 11q5.5-2 5.5-11Z" fill="url(#${u}s)" stroke="#1a4a37" stroke-width=".6"/><path d="M96.5 31q.5 4 2.5 5" stroke="#fff" stroke-opacity=".6" stroke-width=".6" fill="none"/>`))}
      ${ring(u, c, 2.4)}${gem(100, 13, 5, '#3fbf86')}`,
  },
  'vitrail': {
    dessin: (u, c) => {
      const cols = ['#2f6fb5', '#5aa9e0', '#a4dcf5', '#2f6fb5', '#e3c46e', '#5aa9e0', '#1f4f8e', '#8fd0ee'];
      const inner = rep(16, (a, i) => `<path d="${sector(66, 77, a, a + 22.5)}" fill="${cols[i % 8]}" fill-opacity=".85"/>`);
      const outer = rep(16, (a, i) => `<path d="${sector(77, 88, a + 11.25, a + 33.75)}" fill="${cols[(i + 3) % 8]}" fill-opacity=".85"/>`);
      return `<defs>${metal(u + 'm', '#27394f', '#8aa3bb')}<radialGradient id="${u}l" cx=".25" cy=".2" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <g stroke="#0a1422" stroke-width="1.8" stroke-linejoin="round">${inner}${outer}</g>
      <path d="${circlePath(88)} ${circlePath(66)}" fill="url(#${u}l)" fill-rule="evenodd"/><circle cx="100" cy="100" r="88.5" fill="none" stroke="#0a1422" stroke-width="2.4"/>
      ${ring(u, c, 2.6)}${rep(4, (a) => rot(a, gem(100, 8, 5, '#e3c46e')))}`;
    },
  },
  'rose-des-vents': {
    fond: (u, c) => `<defs><linearGradient id="${u}a" x1="0" x2="1"><stop offset=".5" stop-color="${c}"/><stop offset=".5" stop-color="#2c4a66"/></linearGradient></defs>
      ${rep(8, (a, i) => rot(a, `<path d="M100 ${i % 2 ? 22 : 5}L${i % 2 ? 106 : 109} 50H${i % 2 ? 94 : 91}Z" fill="url(#${u}a)" stroke="${c}" stroke-width=".5"/>`))}
      <circle cx="100" cy="100" r="76" fill="#0e1d31"/>`,
    dessin: (u, c) => `<defs>${metal(u + 'm', c, '#f2fbff')}</defs>
      <circle cx="100" cy="100" r="76" fill="none" stroke="url(#${u}m)" stroke-width="1.6"/><circle cx="100" cy="100" r="70" fill="none" stroke="${c}" stroke-width=".6"/>
      <g stroke="${c}" stroke-width=".6">${rep(72, (a, i) => rot(a, `<path d="M100 24V${i % 2 ? 27 : 29}"/>`))}</g>
      <g font-family="'Playfair Display', Georgia, serif" font-size="9" fill="${c}" text-anchor="middle" font-weight="700">${['N', 'E', 'S', 'O'].map((l, i) => { const [x, y] = pt(80, i * 90); return `<text x="${x}" y="${y + 3.2}" fill="${i ? c : '#ff8f6b'}">${l}</text>`; }).join('')}</g>
      ${ring(u, c)}<path d="M100 32l4 6h-8Z" fill="#ff8f6b"/>`,
  },
  'givre': {
    dessin: (u, c) => `<defs>${metal(u + 'm', c, '#ffffff', '#6aa6c7')}</defs>${ring(u, c)}
      <g stroke="url(#${u}m)" stroke-linecap="round" fill="none">${rep(12, (a, i) => rot(a, `<path d="M100 35V${i % 2 ? 20 : 10}" stroke-width="1.6"/><path d="M100 29l-5-5m5 5 5-5m-5-3-4-4m4 4 4-4${i % 2 ? '' : 'm-4-3-3-3m3 3 3-3'}" stroke-width="1"/>`))}</g>
      ${rep(12, (a) => rot(a + 15, `<g transform="translate(100 24)" stroke="${c}" stroke-width=".7">${rep(3, (b) => `<path d="M0-3.5V3.5" transform="rotate(${b})"/>`)}</g>`))}`,
  },
  'sceau-cire': {
    fond: (u, c) => `<defs><radialGradient id="${u}w" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#ef7a7a"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="#5e1219"/></radialGradient><linearGradient id="${u}r" x1="0" x2="1"><stop stop-color="#1f3f6b"/><stop offset=".5" stop-color="#3f6fa6"/><stop offset="1" stop-color="#1f3f6b"/></linearGradient></defs>
      <path d="M86 160l-22 48 12-6 8 12 16-50Z M114 160l22 48-12-6-8 12-16-50Z" fill="url(#${u}r)"/>
      <path d="${wobble(82, 3.2, 9, 0, 3)}" fill="url(#${u}w)"/><path d="${wobble(80, 2, 13, 40, 3)}" fill="none" stroke="#ff9d9d" stroke-opacity=".35"/>`,
    dessin: (u, c) => `<defs>${metal(u + 'm', '#e8b9a0', '#fff1e8', '#8f3b3b')}</defs>
      <circle cx="100" cy="100" r="71" fill="none" stroke="#5e1219" stroke-width="3" stroke-opacity=".7"/><circle cx="100" cy="100" r="71.8" fill="none" stroke="#ff9d9d" stroke-width=".6" stroke-opacity=".5"/>
      ${rep(24, (a) => rot(a, `<circle cx="100" cy="24.5" r="1.3" fill="#5e1219" fill-opacity=".6"/>`))}${ring(u, c, 1.8)}`,
  },
  'maree': {
    dessin: (u, c) => `<defs>${metal(u + 'm', c, '#ffffff', '#3b8f9a')}<linearGradient id="${u}v" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e9ffff"/><stop offset=".6" stop-color="${c}"/><stop offset="1" stop-color="#2b6d7b"/></linearGradient></defs>
      ${rep(8, (a) => rot(a, `<path d="M74 36C78 20 96 10 111 17c8 4 8 14 0 15-6 1-8-6-4-8-7-2-15 2-19 10Z" fill="url(#${u}v)" stroke="#e9ffff" stroke-width=".6"/>`))}
      ${rep(16, (a, i) => rot(a + 11, `<circle cx="100" cy="${i % 2 ? 11 : 14}" r="${i % 2 ? 1.2 : 1.8}" fill="#e9ffff"/>`))}${ring(u, c)}`,
  },
  'recif': {
    dessin: (u, c) => {
      const b = `<path d="M84 186C64 176 50 160 44 136M58 168C42 166 32 154 28 136M50 152c-8-8-10-18-8-28M44 136c-6-10-4-22 2-30M28 136c-8-4-12-12-12-20M66 176c-4-12-2-24 4-34M60 156c-12-2-20-8-24-16" />`;
      return `<defs>${metal(u + 'm', c, '#fff0e6', '#b8584a')}<linearGradient id="${u}c" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#b8484a"/><stop offset="1" stop-color="#ffc2a6"/></linearGradient></defs>${ring(u, c)}
      <g fill="none" stroke="url(#${u}c)" stroke-width="4.2" stroke-linecap="round">${b}<g transform="translate(200 0) scale(-1 1)">${b}</g></g>
      ${[[40, 96, 3], [34, 80, 2], [160, 100, 3.4], [168, 84, 2.2], [164, 70, 1.4], [30, 66, 1.4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#bff1ff" stroke-width=".8"/>`).join('')}`;
    },
  },
  'rouage': {
    fond: (u, c) => { return `<defs>${metal(u + 'm', c, '#fff4d2', '#7a5a22')}</defs><path d="${engrenage(76, 40, 6)}" fill="url(#${u}m)" stroke="#5c4318" stroke-width=".6"/><circle cx="100" cy="100" r="76" fill="#132338"/>`; },
    dessin: (u, c) => {
      const romains = ['XII', 'III', 'VI', 'IX'];
      return `<defs>${metal(u + 'm', c, '#fff4d2', '#7a5a22')}</defs>
      <circle cx="100" cy="100" r="76" fill="none" stroke="#5c4318" stroke-width=".6"/>
      <g transform="translate(60 60)"><path d="${engrenage(14, 12, 4)}" fill="url(#${u}m)" stroke="#5c4318" stroke-width=".5"/><circle cx="100" cy="100" r="5" fill="#132338" stroke="${c}"/></g>
      <g font-family="'Playfair Display', Georgia, serif" font-size="7" fill="${c}" text-anchor="middle">${romains.map((l, i) => { const [x, y] = pt(70, i * 90); return `<text x="${x}" y="${y + 2.4}">${l}</text>`; }).join('')}</g>
      <g stroke="${c}" stroke-width=".6">${rep(60, (a, i) => (i % 15 ? rot(a, `<path d="M100 26v${i % 5 ? 2 : 4}"/>`) : ''))}</g>${ring(u, c, 1.6)}`;
    },
  },
  'laurier': {
    dessin: (u, c) => {
      const br = rep(10, (_, i) => rot(192 + i * 16, `<path d="M100 22Q104 11 115 13Q109 23 100 22Z" fill="url(#${u}m)" stroke="#6f5a25" stroke-width=".5"/><path d="M100 22Q107 30 116 28Q110 19 100 22Z" fill="url(#${u}m)" fill-opacity=".8" stroke="#6f5a25" stroke-width=".5"/>`));
      return `<defs>${metal(u + 'm', c, '#fffbe6', '#8a6f2a')}<linearGradient id="${u}r" x1="0" x2="1"><stop stop-color="#7a1f2b"/><stop offset=".5" stop-color="#c2414f"/><stop offset="1" stop-color="#7a1f2b"/></linearGradient></defs>${ring(u, c)}
      <g fill="none" stroke="#8a6f2a" stroke-width="1.2"><path d="M${pt(78, 188).join(' ')}A78 78 0 0 1 ${pt(78, 348).join(' ')}"/></g>${br}<g transform="translate(200 0) scale(-1 1)"><path d="M${pt(78, 188).join(' ')}A78 78 0 0 1 ${pt(78, 348).join(' ')}" fill="none" stroke="#8a6f2a" stroke-width="1.2"/>${br}</g>
      <path d="M100 176l-18-9v18Zm0 0 18-9v18Z" fill="url(#${u}r)"/><path d="M96 179l-10 22 7-3 4 7 4-24Zm8 0 10 22-7-3-4 7-4-24Z" fill="url(#${u}r)" fill-opacity=".9"/><circle cx="100" cy="176" r="4" fill="#c2414f" stroke="${c}"/>
      ${gem(100, 20, 6, '#c2414f', '#ffd9de')}`;
    },
  },
  'filigrane': {
    dessin: (u, c) => `<defs>${metal(u + 'm', c, '#fffbe8', '#8f7430')}</defs>${ring(u, c, 2.2)}
      <g fill="none" stroke="url(#${u}m)" stroke-width=".9">${rep(24, (a) => rot(a, `<circle cx="100" cy="28.5" r="4"/>`))}${rep(12, (a) => rot(a, `<path d="M100 22c-6-4-6-11 0-13c6 2 6 9 0 13Zm-3 3c-7 1-12-3-12-8m15 8c7 1 12-3 12-8"/>`))}</g>
      ${rep(36, (a, i) => rot(a, `<circle cx="100" cy="${i % 3 ? 16 : 7}" r="${i % 3 ? 0.9 : 1.6}" fill="${c}"/>`))}`,
  },
  'eclipse': {
    dessin: (u, c) => `<defs>${metal(u + 'm', c, '#fff6ff', '#6b4f8a')}<linearGradient id="${u}o" x1="0" x2="1"><stop stop-color="#05080f"/><stop offset="1" stop-color="#1c2340" stop-opacity=".4"/></linearGradient></defs>
      <g stroke="${c}" stroke-linecap="round">${rep(48, (a, i) => rot(a, `<path d="M100 32V${[24, 18, 26, 14][i % 4]}" stroke-width="${i % 4 === 3 ? 1.2 : 0.6}" stroke-opacity="${i % 4 === 3 ? 1 : 0.6}"/>`))}</g>
      <path d="M100 12a88 88 0 0 0 0 176a72 88 0 0 1 0-176Z" fill="url(#${u}o)" stroke="${c}" stroke-width=".7" stroke-opacity=".6"/>${ring(u, c)}
      ${[[168, 52, 5], [178, 96, 3.4], [160, 150, 4.2]].map(([x, y, r]) => star(x, y, r, '#fff1ff')).join('')}`,
  },
  'enluminure': {
    dessin: (u, c) => `<defs>${metal(u + 'm', c, '#fff6d6', '#8a6a1e')}</defs>
      <circle cx="100" cy="100" r="70" fill="none" stroke="url(#${u}m)" stroke-width="7"/><circle cx="100" cy="100" r="66.3" fill="none" stroke="#5a3f10" stroke-width=".6"/><circle cx="100" cy="100" r="73.7" fill="none" stroke="#5a3f10" stroke-width=".6"/>
      ${rep(36, (a, i) => rot(a, `<circle cx="100" cy="30" r="1.1" fill="${i % 2 ? '#2f5fb5' : '#b8323f'}"/>`))}
      ${rep(8, (a) => rot(a + 22.5, `<path d="M100 26v-6" stroke="${c}" stroke-width="1"/><path d="M100 20C94 16 90 10 92 4c6 4 9 10 8 16Z" fill="#2f5fb5" stroke="${c}" stroke-width=".5"/><path d="M100 20c6-4 10-10 8-16-6 4-9 10-8 16Z" fill="#b8323f" stroke="${c}" stroke-width=".5"/>`))}
      ${rep(4, (a) => rot(a, `<circle cx="100" cy="16" r="9" fill="#1f3f8a" stroke="url(#${u}m)" stroke-width="2"/><path d="M100 10c-2 3-2 6 0 9 2-3 2-6 0-9Zm-5 5c1 2 3 3 5 3-1-2-3-3-5-3Zm10 0c-2 0-4 1-5 3 2 0 4-1 5-3Z" fill="#ffe7a0"/>`))}
      ${rep(32, (a) => rot(a + 5.6, `<circle cx="100" cy="11" r=".9" fill="${c}"/>`))}`,
  },
  'marqueterie': {
    dessin: (u, _c) => `<defs>${metal(u + 'm', '#e0b870', '#fff3cf', '#7a5a22')}
        <linearGradient id="${u}a" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f0d3a3"/><stop offset="1" stop-color="#c3935f"/></linearGradient>
        <linearGradient id="${u}b" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#8a5630"/><stop offset="1" stop-color="#4f2c14"/></linearGradient></defs>
      ${rep(24, (a, i) => `<path d="${sector(65.5, 82.5, a, a + 15)}" fill="url(#${u}${i % 2 ? 'b' : 'a'})"/>`)}
      <g fill="none" stroke="#3a200c" stroke-opacity=".25" stroke-width=".5">${rep(48, (a) => rot(a + 2, `<path d="M100 19q1.5 7 0 15"/>`))}</g>
      ${rep(8, (a) => rot(a + 7.5, `<path d="M100 19.5l5 7.5-5 7.5-5-7.5Z" fill="#f7ead0" stroke="#4f2c14" stroke-width=".6"/><circle cx="100" cy="27" r="1.2" fill="#4f2c14"/>`))}
      <circle cx="100" cy="100" r="65.5" fill="none" stroke="url(#${u}m)" stroke-width="1.6"/><circle cx="100" cy="100" r="82.5" fill="none" stroke="url(#${u}m)" stroke-width="1.6"/>
      <circle cx="100" cy="100" r="86" fill="none" stroke="#e0b870" stroke-width="1" stroke-dasharray=".1 4" stroke-linecap="round"/>${ring(u, '#e0b870', 1)}`,
  },
  'rosee': {
    dessin: (u, c) => {
      const K = 16, fils = rep(K, (a) => { const [x1, y1] = pt(63, a), [x2, y2] = pt(95, a); return `<path d="M${x1} ${y1}L${x2} ${y2}"/>`; });
      const spirale = (R: number) => { let d = ''; for (let i = 0; i <= K; i++) { const a = (i * 360) / K, [x, y] = pt(R, a); if (!i) d = `M${x} ${y}`; else { const [qx, qy] = pt(R - 3, a - 180 / K); d += `Q${qx} ${qy} ${x} ${y}`; } } return `<path d="${d}"/>`; };
      let gouttes = '';
      [70, 77, 84, 91].forEach((R, j) => { for (let i = 0; i < K; i++) if ((i * 7 + j * 3) % 5 === 0) { const [x, y] = pt(R, (i * 360) / K); const r = 1.5 + ((i + j) % 3) * 0.6; gouttes += `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${u}g)" stroke="#fff" stroke-width=".35"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.3}" fill="#fff"/>`; } });
      return `<defs>${metal(u + 'm', c, '#ffffff', '#7fa3b8')}<radialGradient id="${u}g" cx=".4" cy=".35"><stop stop-color="#ffffff" stop-opacity=".95"/><stop offset=".6" stop-color="#bfe8ff" stop-opacity=".45"/><stop offset="1" stop-color="#7fc4e8" stop-opacity=".8"/></radialGradient></defs>
      ${ring(u, c, 1.4)}<g fill="none" stroke="${c}" stroke-width=".55" stroke-opacity=".75">${fils}${[70, 77, 84, 91].map(spirale).join('')}<path d="M${pt(95, 315).join(' ')}L-14 -14M${pt(95, 45).join(' ')}L214 -14"/></g>${gouttes}`;
    },
  },
  'astral': {
    fond: (u, c) => `<defs>${halo(u, c, 100, 0.4)}</defs>`,
    dessin: (u, c) => {
      const orb = (a: number, d: number, col: string, rr: number, rev = 0) => `<g transform="rotate(${a} 100 100)"><ellipse cx="100" cy="100" rx="94" ry="32" fill="none" stroke="${c}" stroke-opacity=".55" stroke-width=".9"/><circle r="${rr}" fill="${col}"><animateMotion dur="${d}s" repeatCount="indefinite" path="M6 100a94 32 0 1 ${rev ? 0 : 1} 188 0a94 32 0 1 ${rev ? 0 : 1} -188 0"/></circle></g>`;
      return `<defs>${metal(u + 'm', c, '#f6efff', '#5c46a8')}</defs>${ring(u, c, 2.4)}
      ${orb(-32, 7, '#f4e6ff', 4.2)}${orb(32, 11, '#8fd8ff', 3, 1)}
      <g>${spin(60)}${rep(8, (a, i) => rot(a, star(100, i % 2 ? 22 : 14, i % 2 ? 2.6 : 4, '#f4e6ff', ` opacity=".5"`) .replace('/>', `>${blink(2 + (i % 3), i * 0.4)}</path>`)))}</g>
      ${gem(100, 180, 6, '#8a6cff', '#efe6ff')}` },
  },
  'floraison': {
    dessin: (u, c) => {
      const fleur = (i: number) => { const [x, y] = pt(76, i * 45); return `<g transform="translate(${x} ${y})"><g>${rep(5, (a) => `<ellipse rx="4.2" ry="8.5" cy="-6" transform="rotate(${a})" fill="url(#${u}p)" stroke="#fff0f6" stroke-width=".4"/>`)}<animateTransform attributeName="transform" type="rotate" from="0" to="${i % 2 ? -360 : 360}" dur="${14 + i}s" repeatCount="indefinite"/></g><circle r="3.4" fill="#ffe2a0"/><circle r="1.4" fill="#fff"/></g>`; };
      const petale = (i: number) => { const [x, y] = pt(80, i * 60 + 20); return `<g transform="translate(${x} ${y})"><ellipse rx="2.2" ry="4" fill="#f7bad6" opacity="0"><animateTransform attributeName="transform" type="translate" values="0 0;8 28;-4 58" dur="${5 + (i % 3)}s" begin="${i * 0.9}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" dur="${5 + (i % 3)}s" begin="${i * 0.9}s" repeatCount="indefinite"/></ellipse></g>`; };
      return `<defs>${metal(u + 'm', c, '#fff5fa', '#b0507e')}<radialGradient id="${u}p" cy="1" r="1.1"><stop offset="0" stop-color="#b24b7d"/><stop offset=".6" stop-color="${c}"/><stop offset="1" stop-color="#fff0f7"/></radialGradient></defs>${ring(u, c, 2.2)}
      <circle cx="100" cy="100" r="76" fill="none" stroke="#7fc79b" stroke-width="1.4"/>${rep(16, (a) => rot(a + 22.5, `<path d="M100 24q-7-6-4-13q7 4 4 13Z" fill="#7fc79b"/>`))}
      ${rep(8, (_, i) => fleur(i))}${rep(6, (_, i) => petale(i))}` },
  },
  'cristal': {
    dessin: (u, c) => `<defs>${metal(u + 'm', c, '#ffffff', '#3a9aa8')}<linearGradient id="${u}x" gradientUnits="userSpaceOnUse" x1="10" y1="10" x2="190" y2="190"><stop stop-color="#85e9ef"/><stop offset=".3" stop-color="#ffffff"/><stop offset=".45" stop-color="#f2b4ff"/><stop offset=".65" stop-color="#7fb8ff"/><stop offset="1" stop-color="#85e9ef"/><animateTransform attributeName="gradientTransform" type="rotate" from="0 100 100" to="360 100 100" dur="6s" repeatCount="indefinite"/></linearGradient></defs>
      ${rep(12, (a, i) => rot(a, `<path d="M100 38L92 27L100 ${[3, 15, 8][i % 3]}L108 27Z" fill="url(#${u}x)" fill-opacity=".92" stroke="#e8feff" stroke-width=".6"/><path d="M100 38V${[3, 15, 8][i % 3]}" stroke="#fff" stroke-opacity=".5" stroke-width=".5"/>`))}
      ${rep(12, (a) => rot(a + 15, `<path d="M100 36l-4-6 4-8 4 8Z" fill="url(#${u}x)" fill-opacity=".7"/>`))}${ring(u, c, 2.6)}
      ${rep(6, (a, i) => rot(a, star(100, [3, 15, 8][(i * 2) % 3] - 1, 3.4, '#fff', ` opacity="0"`).replace('/>', `>${blink(3, i * 0.5, '0;0;1;0')}</path>`)))}`,
  },
  'brasier': {
    fond: (u, _c) => {
      const plume = (x: number, y: number, a: number, s: number, o: number) => `<path transform="translate(${x} ${y}) rotate(${a}) scale(${s})" d="M0 0C-6-14-5-40 0-60C5-40 6-14 0 0Z" fill="url(#${u}f)" fill-opacity="${o}"/>`;
      const aile = [[-18, 1.35, 1], [-34, 1.45, 0.95], [-50, 1.4, 0.9], [-66, 1.25, 0.85], [-82, 1.05, 0.8], [-98, 0.8, 0.7]].map(([a, s, o]) => plume(66, 140, a, s, o)).join('');
      return `<defs><linearGradient id="${u}f" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#b3261e"/><stop offset=".5" stop-color="#ff7b3a"/><stop offset="1" stop-color="#ffe29a"/></linearGradient>${halo(u, '#ff7b3a', 100, 0.5)}</defs>
      <g>${aile}<animateTransform attributeName="transform" type="rotate" values="0 66 140;-3 66 140;0 66 140" dur="2.4s" repeatCount="indefinite"/></g>
      <g transform="translate(200 0) scale(-1 1)"><g>${aile}<animateTransform attributeName="transform" type="rotate" values="0 66 140;-3 66 140;0 66 140" dur="2.4s" repeatCount="indefinite"/></g></g>`;
    },
    dessin: (u, c) => {
      const A = 'M0 0C-7-10-5-22 1-36C3-24 10-18 8-8C8-4 4 0 0 0Z', B = 'M0 0C-9-12-1-22-3-38C6-26 12-16 8-6C7-3 4 0 0 0Z';
      const flamme = (x: number, y: number, s: number, d: number) => `<path transform="translate(${x} ${y}) scale(${s})" d="${A}" fill="url(#${u}g)"><animate attributeName="d" values="${A};${B};${A}" dur="${d}s" repeatCount="indefinite"/></path>`;
      return `<defs>${metal(u + 'm', c, '#fff3d6', '#b8431f')}<linearGradient id="${u}g" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#ff4d2e"/><stop offset=".6" stop-color="#ffb347"/><stop offset="1" stop-color="#fff2b0"/></linearGradient></defs>
      ${flamme(100, 36, 1.1, 0.9)}${flamme(90, 38, 0.75, 1.1)}${flamme(110, 38, 0.75, 1.3)}${ring(u, c, 2.6)}
      ${rep(10, (_, i) => rise(60 + i * 9, 176, 70 + (i % 3) * 20, 2.6 + (i % 4) * 0.5, i * 0.35, i % 2 ? 1.2 : 1.8, i % 3 ? '#ffb347' : '#fff2b0'))}
      <path d="m100 170 10 8-10 16-10-16Z" fill="url(#${u}g)" stroke="#fff3d6" stroke-width=".6"/>`;
    },
  },
  'aurore': {
    fond: (u, _c) => `<defs>${halo(u, '#4fd1a5', 98, 0.28)}</defs>`,
    dessin: (u, c) => {
      const voile = (a: number, col: string, w: number, d: number, dash: string) => `<ellipse cx="100" cy="100" rx="84" ry="76" transform="rotate(${a} 100 100)" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${dash}" opacity=".8"><animate attributeName="stroke-dashoffset" from="0" to="-500" dur="${d}s" repeatCount="indefinite"/></ellipse>`;
      return `<defs>${metal(u + 'm', c, '#f0fff8', '#2f8f75')}<linearGradient id="${u}a" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a5f5d1"/><stop offset=".5" stop-color="#6fc4ff"/><stop offset="1" stop-color="#cdb6ef"/></linearGradient></defs>
      ${voile(0, 'url(#' + u + 'a)', 9, 12, '140 60 60 240')}${voile(60, '#a5f5d1', 4, 9, '90 40 30 340')}${voile(120, '#cdb6ef', 5, 15, '120 90 50 240')}
      ${voile(0, '#ffffff', 1, 12, '140 60 60 240')}${ring(u, c, 2)}
      ${rep(9, (a, i) => rot(a + 10, `<circle cx="100" cy="${6 + (i % 3) * 3}" r="${i % 2 ? 0.9 : 1.4}" fill="#fff">${blink(2 + (i % 4) * 0.7, i * 0.3)}</circle>`))}`;
    },
  },
  'hologramme': {
    fond: (u, _c) => `<defs><mask id="${u}k"><circle cx="100" cy="100" r="82" fill="#fff"/>${rep(46, (a) => { const [x, y] = pt(82, a); return `<circle cx="${x}" cy="${y}" r="3.1" fill="#000"/>`; })}</mask>
      <linearGradient id="${u}r" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="200" y2="200" spreadMethod="reflect"><stop stop-color="#ffb3d9"/><stop offset=".2" stop-color="#fff2b3"/><stop offset=".4" stop-color="#b3ffe0"/><stop offset=".6" stop-color="#b3d4ff"/><stop offset=".8" stop-color="#e0b3ff"/><stop offset="1" stop-color="#ffb3d9"/><animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="200 200" dur="4s" repeatCount="indefinite"/></linearGradient>
      <linearGradient id="${u}s" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="200" y2="60"><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".9"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><animateTransform attributeName="gradientTransform" type="translate" values="-220 0;220 0;220 0" dur="3.5s" repeatCount="indefinite"/></linearGradient>
      </defs>
      <g mask="url(#${u}k)"><circle cx="100" cy="100" r="82" fill="url(#${u}r)"/><circle cx="100" cy="100" r="82" fill="url(#${u}s)"/></g>
      <circle cx="100" cy="100" r="77" fill="none" stroke="#3b3f6b" stroke-width=".7"/>
      ${legende(u + 't', 71.3, 6.6, 'ÉDITION PREMIUM ✦ PHILAMOTS ✦ TIRAGE LIMITÉ ✦ ', `font-family="Oswald, 'Arial Narrow', sans-serif" fill="#2b2f55" font-weight="600"`)}`,
    dessin: (u, c) => `<defs>${metal(u + 'm', '#b9c6ff', '#ffffff', '#6c74c9')}</defs>${ring(u, c, 2.2)}`,
  },
  'abysses': {
    fond: (u, _c) => `<defs>${halo(u, '#1fb5d6', 100, 0.35)}</defs>`,
    dessin: (u, c) => {
      const T1 = 'M-6 0q-3 8 0 14t0 14', T2 = 'M-6 0q3 8 0 14t0 14';
      const meduse = (x: number, y: number, s: number, d: number) => `<g transform="translate(${x} ${y}) scale(${s})"><g><animateTransform attributeName="transform" type="translate" values="0 0;0 -5;0 0" dur="${d}s" repeatCount="indefinite"/>
        <circle r="16" fill="url(#${u}g)"/>${[-6, -2, 2, 6].map((dx, k) => `<path transform="translate(${dx + 6} 0)" d="${T1}" fill="none" stroke="#bffaff" stroke-width=".9" stroke-opacity=".8"><animate attributeName="d" values="${T1};${T2};${T1}" dur="${d * 0.8}s" begin="${k * 0.2}s" repeatCount="indefinite"/></path>`).join('')}
        <path d="M-11 0C-11-14 11-14 11 0Q5.5-3 0 0Q-5.5-3-11 0Z" fill="url(#${u}j)" stroke="#dcfdff" stroke-width=".6"/><path d="M-6-5q3-4 8-3" stroke="#fff" stroke-width=".7" fill="none" opacity=".8"/></g></g>`;
      return `<defs>${metal(u + 'm', c, '#f0ffff', '#1f7f95')}<radialGradient id="${u}j" cy=".9" r="1"><stop stop-color="#e6ffff"/><stop offset=".5" stop-color="#7ff0ff" stop-opacity=".85"/><stop offset="1" stop-color="#b58bff" stop-opacity=".7"/></radialGradient><radialGradient id="${u}g"><stop stop-color="#7ff0ff" stop-opacity=".45"/><stop offset="1" stop-color="#7ff0ff" stop-opacity="0"/></radialGradient></defs>
      ${ring(u, c, 2.2)}<circle cx="100" cy="100" r="72" fill="none" stroke="${c}" stroke-opacity=".3" stroke-dasharray="1 5"/>
      ${meduse(34, 44, 1.1, 4)}${meduse(166, 40, 0.9, 5)}${meduse(172, 138, 0.7, 4.5)}${meduse(28, 146, 0.8, 5.5)}
      ${rep(8, (_, i) => `<circle cx="${40 + i * 17}" cy="186" r="${1 + (i % 3) * 0.7}" fill="none" stroke="#bffaff" stroke-width=".7" opacity="0"><animateTransform attributeName="transform" type="translate" values="0 0;0 -${60 + (i % 3) * 25}" dur="${3 + (i % 3)}s" begin="${i * 0.45}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur="${3 + (i % 3)}s" begin="${i * 0.45}s" repeatCount="indefinite"/></circle>`)}`;
    },
  },
  'tempete': {
    fond: (u, _c) => {
      // Nuages étirés le long du cercle, légèrement inclinés pour donner le sens du tourbillon.
      const nuage = (r: number, k: number, rMin: number, rMax: number, grad: string, ph: number) => rep(k, (a, i) => { const [x, y] = pt(r + ((i * 7) % 5) - 2, a + ph), t = rMin + ((i * 5) % 4) * ((rMax - rMin) / 3); return `<ellipse cx="${x}" cy="${y}" rx="${(t * 2.1).toFixed(1)}" ry="${(t * 0.8).toFixed(1)}" transform="rotate(${(a + ph + 10).toFixed(1)} ${x} ${y})" fill="url(#${grad})"/>`; });
      return `<defs>${halo(u, '#3d5fc4', 104, 0.4)}
        <radialGradient id="${u}n1" cx=".38" cy=".3" r=".75"><stop stop-color="#a9b9da"/><stop offset=".55" stop-color="#55668c"/><stop offset="1" stop-color="#2a3553"/></radialGradient>
        <radialGradient id="${u}n2" cx=".38" cy=".3" r=".75"><stop stop-color="#eef3ff"/><stop offset=".5" stop-color="#a7b7d8"/><stop offset="1" stop-color="#5b6b90"/></radialGradient></defs>
      <g>${nuage(86, 14, 11, 16, u + 'n1', 0)}${spin(70, true)}</g>
      <g>${nuage(77, 18, 8.5, 12.5, u + 'n2', 10)}${spin(45)}</g>`;
    },
    dessin: (u, c) => {
      const eclair = (a: number, b: number) => rot(a, `<g opacity="0"><path d="M101 2l-9 16 7 1-7 15 14-19-7-1 6-12Z" fill="#fff" stroke="#bcd4ff" stroke-width="1.4" stroke-linejoin="round"/><animate attributeName="opacity" values="0;0;1;.2;1;0;0" keyTimes="0;.7;.72;.75;.78;.84;1" dur="4.2s" begin="${b}s" repeatCount="indefinite"/></g>`);
      return `<defs>${metal(u + 'm', c, '#ffffff', '#4561a8')}</defs>${ring(u, c, 2.2)}
      <g fill="none" stroke="#eaf1ff" stroke-linecap="round" opacity=".35"><path d="M${pt(70, 20).join(' ')}A70 70 0 0 1 ${pt(70, 80).join(' ')}"/><path d="M${pt(70, 200).join(' ')}A70 70 0 0 1 ${pt(70, 260).join(' ')}"/>${spin(8)}</g>
      ${eclair(35, 0)}${eclair(160, 1.5)}${eclair(275, 2.8)}
      <circle cx="100" cy="100" r="64.5" fill="none" stroke="#fff" stroke-width="2.6" opacity="0"><animate attributeName="opacity" values="0;0;.9;0;0" keyTimes="0;.7;.72;.8;1" dur="4.2s" repeatCount="indefinite"/></circle>`;
    },
  },
  'mecanique': {
    fond: (u, c) => {
      return `<defs>${metal(u + 'm', c, '#fff5d8', '#7a5a22')}</defs><g><path d="${engrenage(82, 48, 6)}" fill="url(#${u}m)" stroke="#5c4318" stroke-width=".5"/><circle cx="100" cy="100" r="82" fill="#101d30"/>${rep(12, (a) => rot(a, `<circle cx="100" cy="21.5" r="1.6" fill="${c}"/>`))}${spin(40)}</g>`;
    },
    dessin: (u, c) => {
      return `<defs>${metal(u + 'm', c, '#fff5d8', '#7a5a22')}</defs>
      <g><path d="${engrenage(70, 36, 5)}" fill="none" stroke="url(#${u}m)" stroke-width="1.4"/>${rep(12, (a, i) => rot(a, `<path d="M100 36v-5" stroke="${c}" stroke-width="${i % 3 ? 0.6 : 1.4}"/>`))}${spin(28, true)}</g>
      ${ring(u, c, 2)}
      ${star(100, 8, 6, '#fff5d8')}` },
  },
  'etreinte-dragon': {
    dessin: (u, c) => {
      const L = 290, N = 58, PH = [0, 90, 180, 270, 360];
      const amp = (a: number) => 6 * Math.min(1, (L - a) / 50, (a + 10) / 60);
      const R = (a: number, ph: number) => 80 + amp(a) * Math.sin(((a * 5 + ph) * Math.PI) / 180);
      const W = (a: number) => 1.4 + 5 * Math.min(1, a / 150);
      const f = (n: number) => +n.toFixed(2);
      // Repère local au point d'abscisse a : position, tangente (vers la tête), normale (vers l'extérieur).
      const repere = (a: number, ph: number, dr = 0): { p: Point; t: Point; n: Point } => {
        const p = pt(R(a, ph) + dr, a), p1 = pt(R(a - 1, ph), a - 1), p2 = pt(R(a + 1, ph), a + 1);
        let tx = p2[0] - p1[0], ty = p2[1] - p1[1]; const l = Math.hypot(tx, ty); tx /= l; ty /= l;
        return { p, t: [tx, ty], n: [ty, -tx] };
      };
      const add = (p: Point, v: Point, k: number): Point => [f(p[0] + v[0] * k), f(p[1] + v[1] * k)];
      const bande = (ph: number, d1: number, d2: number) => { const e: Point[] = [], i: Point[] = []; for (let k = 0; k <= N; k++) { const a = (k / N) * L; e.push(pt(R(a, ph) + d1 * W(a), a)); i.push(pt(R(a, ph) + d2 * W(a), a)); } return 'M' + e.map((p) => p.join(' ')).join('L') + 'L' + i.reverse().map((p) => p.join(' ')).join('L') + 'Z'; };
      const axe = (ph: number) => { const e: Point[] = []; for (let k = 0; k <= N; k++) { const a = (k / N) * L; e.push(pt(R(a, ph), a)); } return 'M' + e.map((p) => p.join(' ')).join('L'); };
      const criniere = (ph: number) => { let d = ''; for (let a = 36; a <= L - 14; a += 9) { const { p, t, n } = repere(a, ph, W(a) - 0.5), long = 4 + 3 * Math.sin(a * 0.7); const q = add(add(p, n, long * 0.8), t, -long * 0.5), e = add(add(p, n, long * 1.1), t, -long * 1.3); d += `M${p.join(' ')}Q${q.join(' ')} ${e.join(' ')}`; } return d; };
      const pattes = (ph: number) => [70, 120, 195, 245].map((a0) => { const { p, t, n } = repere(a0, ph, -W(a0) + 1), k = add(add(p, n, -5), t, -3.5), pied = add(add(k, n, -4), t, 2.5); return `M${p.join(' ')}L${k.join(' ')}L${pied.join(' ')}M${pied.join(' ')}l${f(-n[0] * 2.6 + t[0] * 1.6)} ${f(-n[1] * 2.6 + t[1] * 1.6)}M${pied.join(' ')}l${f(-n[0] * 3)} ${f(-n[1] * 3)}M${pied.join(' ')}l${f(-n[0] * 2.6 - t[0] * 1.6)} ${f(-n[1] * 2.6 - t[1] * 1.6)}`; }).join('');
      const anime = (fn: (ph: number) => string, d = '2.6s') => `<animate attributeName="d" values="${PH.map(fn).join(';')}" dur="${d}" repeatCount="indefinite"/>`;
      const paillettes = rep(12, (a, i) => { const [x, y] = pt(92 + (i % 3) * 5, a + 13); return etincelle(x, y, i % 3 ? 1.8 : 2.8, '#ffe39a', 2.6 + (i % 4) * 0.5, i * 0.37, '0;1;0'); });
      return `<defs>${metal(u + 'm', c, '#e8fff3', '#2e7a5a')}<linearGradient id="${u}or" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff3c4"/><stop offset="1" stop-color="#c9973a"/></linearGradient>
        <radialGradient id="${u}d" gradientUnits="userSpaceOnUse" cx="100" cy="100" r="92"><stop offset=".76" stop-color="#174a36"/><stop offset=".83" stop-color="#4fb886"/><stop offset=".88" stop-color="#bff5dc"/><stop offset=".93" stop-color="#4fb886"/><stop offset="1" stop-color="#174a36"/></radialGradient></defs>
      ${ring(u, c, 1.6)}${paillettes}
      <g>${spin(26)}
        <path d="${criniere(0)}" fill="none" stroke="#c9f7df" stroke-width="1.3" stroke-linecap="round" opacity=".9">${anime(criniere)}</path>
        <path d="${pattes(0)}" fill="none" stroke="#2e7a5a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${anime(pattes)}</path>
        <path d="${pattes(0)}" fill="none" stroke="#e8fff3" stroke-width=".7" stroke-linecap="round" opacity=".7">${anime(pattes)}</path>
        <path d="${bande(0, 1, -1)}" fill="url(#${u}d)" stroke="#123f2e" stroke-width=".6">${anime((p) => bande(p, 1, -1))}</path>
        <path d="${bande(0, -1, -0.35)}" fill="#e3f7e4" fill-opacity=".85">${anime((p) => bande(p, -1, -0.35))}</path>
        <path d="${axe(0)}" fill="none" stroke="#0d3324" stroke-width="5" stroke-dasharray="1.2 2.6" opacity=".3">${anime(axe)}</path>
        ${rot(0, `<path d="M100 20C94 12 88 12 82 8c4 6 2 10-2 12 6 2 6 6 2 12 6-4 12-4 18-10Z" fill="#c9f7df" stroke="#2e7a5a" stroke-width=".5"/>`)}
        ${rot(L, `<path d="M90 12C82 6 76 8 70 2c4 8 0 12-6 12 8 4 6 8 2 12 10-2 16 0 22 2Z" fill="#c9f7df" fill-opacity=".9" stroke="#2e7a5a" stroke-width=".5"/>
          <path d="M94 10C92 2 88-4 80-8m9 6-5 1m2-4-2-5M99 8c0-8-2-14-7-20m5 9 4-3" fill="none" stroke="url(#${u}or)" stroke-width="2" stroke-linecap="round"/>
          <path d="M104 21 123 17l-5 8Z" fill="#8a1c24"/>
          <path d="M86 14c6-6 16-8 24-5l10 2c5 1 7 4 4 6l-10 1c-4 0-8 1-10 3l14 4c3 2 1 5-3 4l-11-1c-8 3-15 0-18-4Z" fill="url(#${u}m)" stroke="#123f2e" stroke-width=".7"/>
          <path d="m108 18.6 1 2.2 1-2.4m3 1.6 1 2.2 1-2.4m3 1.6 1 2.2 1-2.4M110 23.2l1-2 1 2.3m3-1.1 1-2 1 2.3" fill="#fff" stroke="#fff" stroke-width=".4"/>
          <path d="M104 12.5q3-2.4 6 0-3 2.2-6 0Z" fill="#ffd66b"/><path d="M107 11v3" stroke="#1a1206" stroke-width=".9"/><path d="m101 11 6-3-1 3" fill="#2e7a5a"/><circle cx="120" cy="12.8" r=".8" fill="#123f2e"/>
          <path d="M100 29l-2 6 4-3 1 6 3-6" fill="#c9f7df"/>
          <path d="M121 12c9-4 13-12 21-14M118 27c8 5 10 13 18 15" fill="none" stroke="#e8fff3" stroke-width=".9" stroke-linecap="round"/>`)}
      </g>`;
    },
  },
  'nebuleuse': {
    fond: (u, _c) => {
      const bras = (off: number, col: string, w: number) => { let d = ''; for (let t = 0; t <= 300; t += 6) { const r = 62 + t * 0.12, [x, y] = pt(r, t + off); d += (t ? 'L' : 'M') + x + ' ' + y; } return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" opacity=".5"/>`; };
      return `<defs>${halo(u, '#7b4de0', 104, 0.55)}</defs><g>${bras(0, '#f2a9ff', 9)}${bras(120, '#8fb8ff', 7)}${bras(240, '#d0a6ff', 10)}${bras(60, '#ffffff', 1.4)}${bras(180, '#ffffff', 1)}${spin(45)}</g>`;
    },
    dessin: (u, c) => `<defs>${metal(u + 'm', c, '#fbf2ff', '#6d45b8')}</defs>${ring(u, c, 2.2)}
      ${rep(22, (a, i) => { const [x, y] = pt(70 + ((i * 37) % 30), a + i * 3); return `<circle cx="${x}" cy="${y}" r="${(i % 3) * 0.5 + 0.6}" fill="#fff">${i % 2 ? blink(1.8 + (i % 5) * 0.5, i * 0.2) : ''}</circle>`; })}`,
  },
  'encre-vivante': {
    dessin: (u, c) => {
      const trait = (a: number, b: number) => rot(a, `<path d="M100 34C84 34 70 28 70 18c0-9 11-11 14-4 3 6-4 9-7 5M100 34c16 0 30-6 30-16 0-9-11-11-14-4-3 6 4 9 7 5" fill="none" stroke="url(#${u}m)" stroke-width="1.8" stroke-linecap="round" pathLength="100" stroke-dasharray="100 100"><animate attributeName="stroke-dashoffset" values="100;0;0;100" keyTimes="0;.4;.8;1" dur="6s" begin="${b}s" repeatCount="indefinite"/></path>`);
      const goutte = (a: number, b: number) => rot(a, `<path d="M100 4q-3 5 0 8q3-3 0-8Z" fill="#ffd97a" opacity="0"><animateTransform attributeName="transform" type="translate" values="0 0;0 12" dur="2s" begin="${b}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.2;.6;.62" dur="2s" begin="${b}s" repeatCount="indefinite"/></path><circle cx="100" cy="24" r="1" fill="none" stroke="#ffd97a" opacity="0"><animate attributeName="r" values="1;1;8" keyTimes="0;.6;1" dur="2s" begin="${b}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0;1;0" keyTimes="0;.6;.62;1" dur="2s" begin="${b}s" repeatCount="indefinite"/></circle>`);
      return `<defs>${metal(u + 'm', c, '#fff6de', '#8d6a2c')}</defs>${ring(u, c, 2)}${rep(4, (a, i) => trait(a, i * 1.5))}${goutte(45, 0)}${goutte(165, 0.7)}${goutte(285, 1.4)}`;
    },
  },
  'feux-follets': {
    fond: (u, _c) => `<defs>${halo(u, '#3aa8ff', 98, 0.3)}</defs>`,
    dessin: (u, c) => `<defs>${metal(u + 'm', c, '#f0fbff', '#2f6da8')}<radialGradient id="${u}w" cy=".65"><stop stop-color="#ffffff"/><stop offset=".4" stop-color="#9fe4ff"/><stop offset="1" stop-color="#3aa8ff" stop-opacity="0"/></radialGradient><linearGradient id="${u}t" x1="1" x2="0"><stop stop-color="#9fe4ff" stop-opacity=".9"/><stop offset="1" stop-color="#9fe4ff" stop-opacity="0"/></linearGradient></defs>
      ${ring(u, c, 2)}<g>${rep(5, (a, i) => rot(a, `<path d="M${pt(80, -40).join(' ')}A80 80 0 0 1 100 20" fill="none" stroke="url(#${u}t)" stroke-width="3" stroke-linecap="round" transform="rotate(-2 100 100)"/><g transform="translate(100 20) rotate(90)"><path d="M0 7C-6 7-7 0-3-6c1 3 3 3 3 0 3 3 6 8 3 11-1 1-2 2-3 2Z" fill="url(#${u}w)">${blink(0.6 + i * 0.13, i * 0.2, '.7;1;.7')}</path></g>`))}${spin(12)}</g>`,
  },
  'grand-philateliste': {
    fond: (u, c) => `<defs><radialGradient id="${u}r"><stop offset=".6" stop-color="${c}" stop-opacity=".55"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient><mask id="${u}k"><circle cx="100" cy="100" r="80" fill="#fff"/>${rep(44, (a) => { const [x, y] = pt(80, a); return `<circle cx="${x}" cy="${y}" r="3" fill="#000"/>`; })}</mask>${metal(u + 'o', c, '#fffbe6', '#8a6f2a')}</defs>
      <g>${rep(24, (a, i) => rot(a, `<path d="M100 100L${i % 2 ? 97 : 95} ${i % 2 ? -4 : -14}H${i % 2 ? 103 : 105}Z" fill="url(#${u}r)"/>`))}${spin(30)}</g>
      <circle cx="100" cy="100" r="80" fill="url(#${u}o)" mask="url(#${u}k)"/><circle cx="100" cy="100" r="74" fill="#132338"/>`,
    dessin: (u, c) => {
      const pierres: [string, number, number][] = [['#e0425a', 72, 26], ['#3f8cff', 86, 24], ['#3fcf8e', 100, 23], ['#3f8cff', 114, 24], ['#e0425a', 128, 26]];
      return `<defs>${metal(u + 'm', c, '#fffbe6', '#8a6f2a')}</defs>
      ${rep(36, (a) => rot(a, `<circle cx="100" cy="30" r="1.1" fill="${c}"/>`))}${ring(u, c, 2.8)}
      <path d="M66 30 60 2 80 16 100 -6 120 16 140 2 134 30Q100 22 66 30Z" fill="url(#${u}m)" stroke="#6f5a25" stroke-width=".8"/>
      <path d="M68 24Q100 16 132 24" fill="none" stroke="#6f5a25" stroke-width=".8"/>
      ${[[60, 2], [100, -6], [140, 2]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="#fffbe6" stroke="#8a6f2a" stroke-width=".6"/>`).join('')}
      ${pierres.map(([col, x, y]) => gem(x, y, 3.2, col, '#fff')).join('')}
      ${[[100, -6, 0], [60, 2, 0.8], [140, 2, 1.6], [150, 150, 2.4], [42, 132, 3.2]].map(([x, y, b]) => etincelle(x, y, 7, '#fff', 4, b, '0;0;1;0;0')).join('')}
      <path d="M100 176l-20-9v18Zm0 0 20-9v18Z" fill="#7a1f2b" stroke="${c}" stroke-width=".6"/><circle cx="100" cy="176" r="5" fill="url(#${u}m)"/>`;
    },
  },
};
