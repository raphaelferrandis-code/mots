// Le fond vivant de l'accueil (maquette : BG) : de grandes rosaces qui tournent lentement, décalées par le pointeur,
// et une poussière dorée qui monte. Les rosaces sont dessinées une fois dans des canevas hors écran.
// Le fond s'arrête quand l'onglet est caché ou qu'une cérémonie occupe l'écran ; immobile si le mouvement est réduit.
// « immobile » : dessiné une seule fois, sans boucle ni suivi du pointeur (l'accueil, l'album et le marché : App.tsx ;
// décision de Raphaël du 28/09/2026 : redessiné à chaque image, ce fond occupait le processeur d'un téléphone au repos).
// Immobile, les rosaces se peignent directement sur le fond, sans canevas hors écran : mesuré le 28/09/2026 à la taille
// d'un téléphone, 5 Mo au lieu de 25, et un tiers de temps en moins.

import { useEffect, useRef } from 'react';
import { rosace } from '../timbre/dessins.ts';
import { mouvementReduit } from '../mouvement.ts';

// Le centre d'une rosace, un rond sombre cerné de clair, reste hors de l'écran (décision de Raphaël du 29/09/2026 : on
// aurait dit des endroits où cliquer). « x », « y » : un bord de la fenêtre ; « dx », « dy » : le pas de plus, en
// fraction de sa plus grande dimension comme la taille « s », d'environ trois fois le rayon de ce centre.
const ROSACES = [
  { x: 0, dx: -.04, y: .24, dy: 0, s: .62, R: 96, r: 35, d: 56, couleur: 'rgba(216,154,92,.17)', vitesse: .035, profondeur: 26 },
  { x: 1, dx: .055, y: .82, dy: 0, s: .95, R: 120, r: 47, d: 68, couleur: 'rgba(126,164,226,.13)', vitesse: -.025, profondeur: 46 },
  { x: .62, dx: 0, y: 0, dy: -.035, s: .42, R: 84, r: 29, d: 50, couleur: 'rgba(233,225,208,.09)', vitesse: .05, profondeur: 16 },
  { x: .3, dx: 0, y: 1, dy: .04, s: .55, R: 70, r: 23, d: 43, couleur: 'rgba(216,154,92,.11)', vitesse: -.04, profondeur: 22 },
];
type Rosace = typeof ROSACES[number] & { taille: number; trace: Path2D; image: HTMLCanvasElement | null };

// Une rosace et son cercle, centrés sur l'origine du contexte.
function peindre(g: CanvasRenderingContext2D, r: Rosace): void {
  g.strokeStyle = r.couleur; g.lineWidth = .7;
  g.stroke(r.trace);
  g.beginPath(); g.arc(0, 0, r.taille / 2 - 2, 0, 6.283); g.stroke();
}

const densite = (): number => Math.min(2, window.devicePixelRatio || 1);

export function FondAnime({ immobile = false }: { immobile?: boolean } = {}) {
  const toile = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = toile.current;
    const c = cv?.getContext('2d');
    if (!cv || !c) return;
    const anime = !immobile && !mouvementReduit();
    const pointeur = { nx: .5, ny: .4 };
    let W = 0, H = 0, base = 0, dpr = 1, px = 0, py = 0, cadre = 0, minuterie = 0;
    let rosaces: Rosace[] = [];
    let grains: { x: number; y: number; z: number; ph: number }[] = [];
    const t0 = performance.now();

    const construire = (): void => {
      // À largeur égale, le dessin garde la plus grande hauteur déjà vue : sur téléphone, la barre d'adresse qui s'efface
      // ou revient en cours de défilement (ou le clavier) ne le fait pas refaire. Collé en haut, le canevas garde sa
      // taille en pixels : ce qui dépasse en bas est simplement hors de l'écran.
      const memeLargeur = window.innerWidth === W;
      dpr = densite(); W = window.innerWidth; H = memeLargeur ? Math.max(H, window.innerHeight) : window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = `${W}px`; cv.style.height = `${H}px`;
      base = Math.max(W, H);
      rosaces = ROSACES.map((o) => {
        const taille = Math.round(base * o.s);
        // Une fenêtre de taille nulle (onglet caché, cadre pas encore mesuré) : rien à dessiner, et « arc » refuserait un rayon négatif.
        const r: Rosace = { ...o, taille, trace: new Path2D(taille > 12 ? rosace(taille / 2 - 6, o.R, o.r, o.d) : ''), image: null };
        if (anime && taille > 12) {
          const image = document.createElement('canvas');
          image.width = image.height = Math.round(taille * dpr);
          const g = image.getContext('2d');
          if (g) { g.scale(dpr, dpr); g.translate(taille / 2, taille / 2); peindre(g, r); r.image = image; }
        }
        return r;
      });
      grains = Array.from({ length: W < 700 ? 34 : 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: .3 + Math.random() * .7, ph: Math.random() * 6.28 }));
    };
    const dessiner = (maintenant: number): void => {
      const t = (maintenant - t0) / 1000;
      px += (pointeur.nx - .5 - px) * .04; py += (pointeur.ny - .5 - py) * .04;
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
      for (const r of rosaces) {
        if (r.taille <= 12) continue; // rosace vide (voir « construire ») : « drawImage » refuse un canevas de largeur nulle
        c.save(); c.translate(r.x * W + r.dx * base - px * r.profondeur, r.y * H + r.dy * base - py * r.profondeur);
        if (r.image) { c.rotate(t * r.vitesse); c.drawImage(r.image, -r.taille / 2, -r.taille / 2, r.taille, r.taille); }
        else peindre(c, r);
        c.restore();
      }
      c.globalCompositeOperation = 'lighter';
      for (const m of grains) {
        m.y -= m.z * .18; m.x += Math.sin(t * .3 + m.ph) * .08;
        if (m.y < -10) { m.y = H + 10; m.x = Math.random() * W; }
        const a = (.2 + .38 * Math.sin(t * 1.3 + m.ph * 3)) * m.z;
        if (a <= 0) continue;
        c.globalAlpha = a; c.fillStyle = m.ph > 3 ? '#f0c48f' : '#e9e1d0';
        c.beginPath(); c.arc(m.x - px * 40 * m.z, m.y - py * 40 * m.z, m.z * 1.4, 0, 6.283); c.fill();
      }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    };
    const boucle = (maintenant: number): void => {
      if (!document.hidden && !document.body.classList.contains('ceremonie-ouverte')) dessiner(maintenant);
      cadre = requestAnimationFrame(boucle);
    };
    const suivre = (e: PointerEvent): void => { pointeur.nx = e.clientX / window.innerWidth; pointeur.ny = e.clientY / window.innerHeight; };
    const redimensionner = (): void => {
      if (window.innerWidth === W && window.innerHeight <= H && densite() === dpr) return; // déjà couvert (voir « construire »)
      clearTimeout(minuterie); minuterie = window.setTimeout(() => { construire(); dessiner(performance.now()); }, 150);
    };

    construire();
    dessiner(performance.now());
    if (anime) { cadre = requestAnimationFrame(boucle); window.addEventListener('pointermove', suivre, { passive: true }); }
    window.addEventListener('resize', redimensionner);
    return () => { cancelAnimationFrame(cadre); clearTimeout(minuterie); window.removeEventListener('pointermove', suivre); window.removeEventListener('resize', redimensionner); };
  }, [immobile]);

  return <>
    <canvas className="fond-anime" ref={toile} aria-hidden="true" />
    <div className="fond-anime__grain" aria-hidden="true" />
    <div className="fond-anime__vignette" aria-hidden="true" />
  </>;
}
