// Le fond vivant de l'accueil (maquette : BG) : de grandes rosaces qui tournent lentement, décalées par le pointeur,
// et une poussière dorée qui monte. Les rosaces sont dessinées une fois dans des canevas hors écran.
// Le fond s'arrête quand l'onglet est caché ou qu'une cérémonie occupe l'écran ; immobile si le mouvement est réduit.

import { useEffect, useRef } from 'react';
import { rosace } from '../timbre/dessins.ts';

const ROSACES = [
  { x: .08, y: .24, s: .62, R: 96, r: 35, d: 56, couleur: 'rgba(216,154,92,.17)', vitesse: .035, profondeur: 26 },
  { x: .92, y: .82, s: .95, R: 120, r: 47, d: 68, couleur: 'rgba(126,164,226,.13)', vitesse: -.025, profondeur: 46 },
  { x: .62, y: .06, s: .42, R: 84, r: 29, d: 50, couleur: 'rgba(233,225,208,.09)', vitesse: .05, profondeur: 16 },
  { x: .3, y: 1.02, s: .55, R: 70, r: 23, d: 43, couleur: 'rgba(216,154,92,.11)', vitesse: -.04, profondeur: 22 },
];

export function FondAnime() {
  const toile = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = toile.current;
    const c = cv?.getContext('2d');
    if (!cv || !c) return;
    const reduit = (): boolean => document.documentElement.hasAttribute('data-animations-reduites') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointeur = { nx: .5, ny: .4 };
    let W = 0, H = 0, dpr = 1, px = 0, py = 0, cadre = 0, minuterie = 0;
    let rosaces: (typeof ROSACES[number] & { taille: number; image: HTMLCanvasElement })[] = [];
    let grains: { x: number; y: number; z: number; ph: number }[] = [];
    const t0 = performance.now();

    const construire = (): void => {
      dpr = Math.min(2, window.devicePixelRatio || 1); W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      const base = Math.max(W, H);
      rosaces = ROSACES.map((o) => {
        const taille = Math.round(base * o.s), image = document.createElement('canvas');
        image.width = image.height = Math.round(taille * dpr);
        const g = image.getContext('2d');
        // Une fenêtre de taille nulle (onglet caché, cadre pas encore mesuré) : rien à dessiner, et « arc » refuserait un rayon négatif.
        if (g && taille > 12) {
          g.scale(dpr, dpr); g.strokeStyle = o.couleur; g.lineWidth = .7;
          g.stroke(new Path2D(rosace(taille / 2 - 6, o.R, o.r, o.d, taille / 2, taille / 2)));
          g.beginPath(); g.arc(taille / 2, taille / 2, taille / 2 - 2, 0, 6.283); g.stroke();
        }
        return { ...o, taille, image };
      });
      grains = Array.from({ length: W < 700 ? 34 : 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: .3 + Math.random() * .7, ph: Math.random() * 6.28 }));
    };
    const dessiner = (maintenant: number): void => {
      const t = (maintenant - t0) / 1000;
      px += (pointeur.nx - .5 - px) * .04; py += (pointeur.ny - .5 - py) * .04;
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
      for (const r of rosaces) {
        c.save(); c.translate(r.x * W - px * r.profondeur, r.y * H - py * r.profondeur); c.rotate(t * r.vitesse);
        c.drawImage(r.image, -r.taille / 2, -r.taille / 2, r.taille, r.taille); c.restore();
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
    const redimensionner = (): void => { clearTimeout(minuterie); minuterie = window.setTimeout(() => { construire(); dessiner(performance.now()); }, 150); };

    construire();
    dessiner(performance.now());
    if (!reduit()) { cadre = requestAnimationFrame(boucle); window.addEventListener('pointermove', suivre, { passive: true }); }
    window.addEventListener('resize', redimensionner);
    return () => { cancelAnimationFrame(cadre); clearTimeout(minuterie); window.removeEventListener('pointermove', suivre); window.removeEventListener('resize', redimensionner); };
  }, []);

  return <>
    <canvas className="fond-anime" ref={toile} aria-hidden="true" />
    <div className="fond-anime__grain" aria-hidden="true" />
    <div className="fond-anime__vignette" aria-hidden="true" />
  </>;
}
