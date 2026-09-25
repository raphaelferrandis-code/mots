import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import type { CarteIndex, Finition } from '../../partage/types.ts';
import { Carte, DosDeCarte } from './Carte.tsx';
import './timbreManipulable.css';

export function TimbreManipulable({ carte, finition, maitriseeLe, obtenuLe = null }: { carte: CarteIndex; finition: Finition; maitriseeLe: number | null; obtenuLe?: number | null }) {
  const [angle, setAngle] = useState({ x: 0, y: 0 });
  const [saisie, setSaisie] = useState(false);
  const geste = useRef<{ id: number; x: number; y: number; angle: typeof angle; largeur: number } | null>(null);
  const pointeur = useRef({ x: .5, y: .5 });
  const scene = useRef<HTMLDivElement>(null);
  const verso = Math.cos(angle.y * Math.PI / 180) < 0;
  // Le timbre ne reçoit pas le pointeur (la scène le capte pour tourner) : c'est la scène qui place ses reflets,
  // d'après la position du pointeur et l'inclinaison de la carte, pour que le brillant glisse quand on la tourne.
  const eclairer = (a: typeof angle): void => {
    const timbre = scene.current?.querySelector<HTMLElement>('.timbre-objet__face:not(.timbre-objet__face--dos) .tb');
    if (!timbre) return;
    const borne = (v: number): number => Math.max(0, Math.min(1, v));
    const x = borne(pointeur.current.x - Math.sin(a.y * Math.PI / 180) * .6);
    const y = borne(pointeur.current.y + a.x / 24 * .35);
    timbre.style.setProperty('--mx', x.toFixed(3)); timbre.style.setProperty('--my', y.toFixed(3));
    timbre.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`); timbre.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => eclairer(angle), [angle]);
  const debut = (e: PointerEvent<HTMLDivElement>): void => {
    if (!e.isPrimary || e.button !== 0) return;
    geste.current = { id: e.pointerId, x: e.clientX, y: e.clientY, angle, largeur: e.currentTarget.clientWidth };
    e.currentTarget.setPointerCapture(e.pointerId);
    setSaisie(true);
  };
  const bouger = (e: PointerEvent<HTMLDivElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect();
    // La zone de saisie reste fixe, même lorsque la carte passe sur la tranche.
    pointeur.current = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
    const g = geste.current;
    if (!g || g.id !== e.pointerId) { eclairer(angle); return; }
    setAngle({
      y: g.angle.y + (e.clientX - g.x) / g.largeur * 240,
      // Sur téléphone, le geste vertical reste disponible pour faire défiler la fiche.
      x: e.pointerType === 'touch' ? 0 : Math.max(-24, Math.min(24, g.angle.x - (e.clientY - g.y) / g.largeur * 70)),
    });
  };
  const fin = (): void => { geste.current = null; setSaisie(false); };
  const redresser = (): void => setAngle((a) => ({ x: 0, y: Math.round(a.y / 360) * 360 }));
  const clavier = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(e.key)) return;
    e.preventDefault();
    if (e.key === 'Home') { redresser(); return; }
    setAngle((a) => ({ x: Math.max(-24, Math.min(24, a.x + (e.key === 'ArrowUp' ? 8 : e.key === 'ArrowDown' ? -8 : 0))), y: a.y + (e.key === 'ArrowRight' ? 30 : e.key === 'ArrowLeft' ? -30 : 0) }));
  };

  return <div className="timbre-objet">
    <div ref={scene} className="timbre-objet__scene" role="group" tabIndex={0}
      aria-label={`${carte.mot}, timbre manipulable. Glisser ou utiliser les flèches pour tourner ; touche Début pour revenir au recto.`}
      onPointerDown={debut} onPointerMove={bouger} onPointerUp={fin} onPointerCancel={fin} onLostPointerCapture={fin} onKeyDown={clavier}
      data-saisie={saisie}>
      <div className="timbre-objet__rotation" style={{ '--rotation-x': `${angle.x}deg`, '--rotation-y': `${angle.y}deg` } as CSSProperties}>
        <div className="timbre-objet__face" aria-hidden={verso}><Carte carte={carte} finition={finition} maitriseeLe={maitriseeLe} obtenuLe={obtenuLe} cliquable={false} /></div>
        <div className="timbre-objet__face timbre-objet__face--dos" aria-hidden={!verso}><DosDeCarte etiquette={`Dos de ${carte.mot}`} /></div>
      </div>
    </div>
    <div className="timbre-objet__commandes">
      <button type="button" className="bouton bouton--discret" onClick={() => setAngle((a) => ({ x: 0, y: Math.round(a.y / 180) * 180 + 180 }))}>Retourner</button>
      <button type="button" className="bouton bouton--discret" onClick={redresser}>Redresser</button>
    </div>
  </div>;
}
