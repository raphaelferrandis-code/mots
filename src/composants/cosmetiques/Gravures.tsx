import { useEffect, useId, useMemo, useRef } from 'react';
import { ornement } from '../../jeu/personnalisation.ts';
import { DESSINS_AVATARS, PLUME } from './dessins/avatars.ts';
import { DESSINS_CADRES } from './dessins/cadres.ts';

// Dessins originaux en SVG : un seul tracé net à toutes les tailles, sans textures téléchargées.
export function Motif({ nom }: { nom: string }) {
  switch (nom) {
    case 'boussole': return <><circle cx="50" cy="50" r="33" /><circle cx="50" cy="50" r="28" opacity=".5" /><path d="m50 11 9 30 30 9-30 9-9 30-9-30-30-9 30-9Z" /><path d="m50 23 5 22-5 5-5-5Z" fill="currentColor" /><path d="m27 27 46 46m0-46L27 73M50 3v9m0 76v9M3 50h9m76 0h9" opacity=".55" /></>;
    case 'lune': case 'etoiles': return <><path d="M63 14a37 37 0 1 0 24 60A38 38 0 0 1 63 14Z" fill="currentColor" fillOpacity=".14" /><path d="M56 20a31 31 0 0 0 24 60M26 69l5 7m-9-22 1 6" opacity=".5" /><path d="m73 21 3 10 10 3-10 3-3 10-3-10-10-3 10-3ZM49 8v5m41 44h6M45 42v6m-3-3h6" /><circle cx="77" cy="62" r="2" /></>;
    case 'renard': return <><path d="m21 48-3-33 29 18h6l29-18-3 33-10 24-19 15-19-15Z" fill="currentColor" fillOpacity=".12" /><path d="m18 15 17 34-14-1 29 39 29-39-14 1 17-34M35 49l15 13 15-13M33 42l-7-13m41 13 7-13" /><path d="m31 54 10 5m18 0 10-5m-23 21h8l-4 5Z" strokeWidth="3" /><path d="M50 33v16" opacity=".6" /></>;
    case 'papillon': return <><path d="M49 50C25 9 5 18 13 44c4 14 16 15 31 15C10 53 20 95 44 77l6-16 6 16c24 18 34-24 0-18 15 0 27-1 31-15C95 18 75 9 51 50" fill="currentColor" fillOpacity=".12" /><path d="M50 43v35m0-35-8-11m8 11 8-11M21 33l23 20-20-5M79 33 56 53l20-5M29 72l15-9m27 9-15-9" /><circle cx="50" cy="49" r="3" fill="currentColor" /></>;
    case 'dragon': return <><path d="M25 80C3 50 41 57 32 31l-9-11 21 5L60 9l-2 18 19 12-16 6 10 12-21-5C29 63 83 63 73 84c-7 15-33 4-25-7" fill="currentColor" fillOpacity=".13" /><path d="m44 25 14 2M32 31l13 6-6 9m19-12 5 3m-7 16-3 10m10-4-2 7m11 0-4 8M25 80l5-12m18 9-8-8M29 17l-8-5m11 20-14-5" /><path d="m70 44 17 3-12 5" /><circle cx="55" cy="35" r="2" fill="currentColor" /></>;
    case 'phenix': return <><path d="M50 78C27 83 18 64 11 26l29 26-12-35 22 23 22-23-12 35 29-26C82 64 73 83 50 78Z" fill="currentColor" fillOpacity=".18" /><path d="m50 40 5-13 7 8-7 4v17L50 78l-5-22M18 42l22 20m-14-8 15 16m41-28L60 62m14-8L59 70M50 78 37 94l13-8 13 8Z" /><path d="M49 18 52 7m-13 15-5-10m29 10 5-10" opacity=".6" /></>;
    case 'oracle': return <><path d="M8 50Q50 5 92 50Q50 95 8 50Z" fill="currentColor" fillOpacity=".12" /><circle cx="50" cy="50" r="20" /><path d="m50 34 9 16-9 16-9-16Z" fill="currentColor" fillOpacity=".5" /><path d="M50 3v14m0 66v14M20 15l7 10m53-10-7 10M20 85l7-10m53 10-7-10M35 9l4 10m26-10-4 10" /><circle cx="50" cy="50" r="29" strokeDasharray="1 5" /></>;
    case 'feuilles': return <><path d="M50 90V10" />{[22,39,56,73].map((y) => <g key={y} transform={`translate(50 ${y})`}><path d="M0 10Q-35 9-32-13Q-7-15 0 10ZM0 10Q35 9 32-13Q7-15 0 10Z" fill="currentColor" fillOpacity=".1" /><path d="m0 10-22-14m22 14 22-14" opacity=".5" /></g>)}</>;
    case 'cristal': return <><path d="m50 5 26 28-9 48-17 14-17-14-9-48Z" fill="currentColor" fillOpacity=".13" /><path d="m50 5-10 30 10 60 10-60ZM24 33l16 2 20 0 16-2M33 81l17-14 17 14M40 35l10 32 10-32" /><path d="m13 42-8 10 10 24 10-13Zm74 0 8 10-10 24-10-13Z" fill="currentColor" fillOpacity=".2" /></>;
    case 'vagues': return <>{[0,16,32].map((y) => <path key={y} transform={`translate(0 ${y})`} d="M5 34C22 5 39 54 55 30S82 15 95 31M5 39C22 10 39 59 55 35S82 20 95 36" />)}<circle cx="66" cy="12" r="5" /></>;
    default: return <g transform={PLUME.pose}><path d={PLUME.etendard} fill="currentColor" fillOpacity=".13" /><path d={PLUME.barbes} opacity=".55" /><path d={PLUME.rachis} /><path d={PLUME.bec} /></g>;
  }
}

export function Embleme({ motif }: { motif: string }) {
  const id = useId();
  return <svg className="embleme-grave" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
    <defs><radialGradient id={id}><stop stopColor="currentColor" stopOpacity=".16" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></radialGradient></defs>
    <circle cx="50" cy="50" r="49" fill={`url(#${id})`} stroke="none" /><Motif nom={motif} />
  </svg>;
}

// Les cadres et les avatars de la refonte : des chaînes SVG animées en SMIL (voir dessins/outils.ts).
// Le repère visible va de 10 à 190 : ce qui dépasse (ailes, couronne, moustaches) déborde volontairement du portrait.
const REPERE = '10 10 180 180';
const prefixe = (id: string) => 'g' + id.replace(/[^a-zA-Z0-9]/g, '');

function dessinDuPortrait(u: string, cadre: string, avatar: string | null): string {
  const bord = DESSINS_CADRES[cadre], visage = avatar ? DESSINS_AVATARS[avatar] : undefined;
  const teinteCadre = ornement(cadre)?.teinte ?? '#bacbde';
  const fond = bord?.fond?.(u + 'k', teinteCadre) ?? '';
  const devant = bord ? bord.dessin(u + 'c', teinteCadre) : '<circle cx="100" cy="100" r="61" fill="none" stroke="#4a6687" stroke-width="1.2"/>';
  if (avatar === null) return fond + devant;
  const disque = `<defs><radialGradient id="${u}d" cx=".5" cy=".42" r=".62"><stop stop-color="#243650"/><stop offset=".7" stop-color="#101c2e"/><stop offset="1" stop-color="#08111e"/></radialGradient><clipPath id="${u}p"><circle cx="100" cy="100" r="60"/></clipPath></defs><circle cx="100" cy="100" r="60" fill="url(#${u}d)"/>`;
  const dessin = visage ? `<g clip-path="url(#${u}p)"><svg x="46" y="46" width="108" height="108" viewBox="0 0 100 100" overflow="visible">${visage(u + 'a', ornement(avatar)?.teinte ?? '#eccba0')}</svg></g>` : '';
  return fond + disque + dessin + devant;
}

// Les animations SMIL tournent d'elles-mêmes : on les fige (à leur image de départ) quand l'objet n'est pas
// mis en avant, ou quand le joueur ou son système demandent moins d'animations.
function useAnimationsSvg(anime: boolean, contenu: string) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg || typeof svg.pauseAnimations !== 'function') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const regler = () => {
      if (!anime || media.matches || document.documentElement.hasAttribute('data-animations-reduites')) { svg.pauseAnimations(); svg.setCurrentTime(0); }
      else svg.unpauseAnimations();
    };
    regler();
    media.addEventListener('change', regler);
    const observateur = new MutationObserver(regler);
    observateur.observe(document.documentElement, { attributes: true, attributeFilter: ['data-animations-reduites'] });
    return () => { media.removeEventListener('change', regler); observateur.disconnect(); };
  }, [anime, contenu]);
  return ref;
}

/** Le portrait complet : fond du cadre, disque, avatar, puis le cadre par-dessus. `cadre` vide : simple filet. */
export function PortraitGrave({ avatar, cadre, anime = false }: { avatar: string; cadre: string; anime?: boolean }) {
  const u = prefixe(useId());
  const contenu = useMemo(() => dessinDuPortrait(u, cadre, avatar), [u, cadre, avatar]);
  const ref = useAnimationsSvg(anime, contenu);
  return <svg ref={ref} className="portrait-grave" viewBox={REPERE} overflow="visible" aria-hidden="true" dangerouslySetInnerHTML={{ __html: contenu }} />;
}

/** Le cadre seul, pour entourer autre chose qu'un avatar (podium du classement). */
export function CadreGrave({ modele, anime = false }: { modele: string; anime?: boolean }) {
  const u = prefixe(useId());
  const contenu = useMemo(() => dessinDuPortrait(u, modele, null), [u, modele]);
  const ref = useAnimationsSvg(anime, contenu);
  return <svg ref={ref} className="cadre-grave" viewBox={REPERE} overflow="visible" aria-hidden="true" dangerouslySetInnerHTML={{ __html: contenu }} />;
}
