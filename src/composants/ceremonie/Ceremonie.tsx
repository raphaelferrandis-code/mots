// La cérémonie d'ouverture d'un paquet, fidèle à la maquette (prototype-ceremonie.html).
// Déroulé : ouverture → déchirure → sortie → révélation ↔ retournement → révélée → envoi … → résumé.
//
// Le tirage est fait par le serveur dès le clic, pendant que le paquet vient se placer : la cérémonie ne fait
// qu'afficher un résultat déjà décidé et enregistré. Fermer en cours de route ne perd donc rien.
// Les animations sont pilotées à la main (Web Animations) ; un jeton les arrête proprement si l'on ferme.

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ClavierReact, PointerEvent as PointeurReact } from 'react';
import { createPortal, flushSync } from 'react-dom';
import type { CarteObtenue } from '../../jeu/partie.ts';
import { Timbre } from '../timbre/Timbre.tsx';
import { PaquetDeCeremonie, MASQUE_DU_PAQUET } from './PaquetDeCeremonie.tsx';
import { Particules, SONS } from './effets.ts';
import { ABREGE_DE_LA_NATURE, NOM_DE_LA_FINITION, RANG_DE_L_ECLAT, bilanDuPaquet, eclatDe, gainsDuPaquet, titreDuResume } from './eclats.ts';
import { useRacineInerte } from '../useRacineInerte.ts';
import { mouvementReduit } from '../mouvement.ts';
import { messageDe } from '../../partage/messages.ts';
import './ceremonie.css';

type Phase = 'ouverture' | 'dechirure' | 'sortie' | 'revelation' | 'retournement' | 'revelee' | 'envoi' | 'resume' | 'fermeture';

// Ce que la page reçoit au rangement : les timbres et leur place à l'écran, pour les faire voler jusqu'à l'album.
export type Envol = { cartes: CarteObtenue[]; places: DOMRect[] };

type Props = {
  premier: Promise<CarteObtenue[]>; // le tirage lancé au clic (jamais depuis la cérémonie : un seul tirage par geste)
  tirer: () => Promise<CarteObtenue[]>; // tire (et enregistre) le paquet suivant sur le serveur
  continuer: boolean; // « Ouvrir le suivant » est proposé (paquets gratuits seulement)
  reserve: number; // paquets encore en réserve
  depuis: DOMRect | null; // d'où vient le paquet à l'écran (le paquet de l'accueil)
  modelePaquet: string;
  dos: string;
  sons: boolean;
  onSons: (actifs: boolean) => void;
  reduire: boolean; // réglage « Réduire les animations »
  onFermer: () => void;
  onRanger?: (envol: Envol) => void; // « Ranger dans l'album » : la page prend le relais pour l'envol
  onErreur: (message: string) => void;
};

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const entre = (a: number, b: number): number => a + Math.random() * (b - a);

export function Ceremonie({ premier, tirer, continuer, reserve, depuis, modelePaquet, dos, sons, onSons, reduire, onFermer, onRanger, onErreur }: Props) {
  useRacineInerte();
  const [phase, setPhase] = useState<Phase>('ouverture');
  // L'éventail des timbres se resserre sur un écran étroit, et suit le téléphone qu'on tourne.
  const [etroit, setEtroit] = useState(() => window.matchMedia('(max-width: 639.98px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 639.98px)');
    const suivre = (): void => setEtroit(media.matches);
    media.addEventListener('change', suivre);
    return () => media.removeEventListener('change', suivre);
  }, []);
  const [cartes, setCartes] = useState<CarteObtenue[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revelees, setRevelees] = useState<boolean[]>([]);
  const [rangees, setRangees] = useState<boolean[]>([]);
  const [plateau, setPlateau] = useState<boolean[]>([]);
  const [apercu, setApercu] = useState<number | null>(null);
  const [tentative, setTentative] = useState(0);
  const [aplati, setAplati] = useState(false);

  const scene = useRef<HTMLDivElement>(null);
  const emballage = useRef<HTMLDivElement>(null);
  const pile = useRef<HTMLDivElement>(null);
  const cartesDom = useRef<(HTMLButtonElement | null)[]>([]);
  const cases = useRef<(HTMLButtonElement | null)[]>([]);
  const apercuDom = useRef<HTMLButtonElement>(null);
  const eclair = useRef<HTMLDivElement>(null);
  const toile = useRef<HTMLCanvasElement>(null);
  const infos = useRef<HTMLDivElement>(null);
  const particules = useRef<Particules | null>(null);
  const jeton = useRef(0);
  const phaseRef = useRef<Phase>('ouverture');
  const cartesRef = useRef<CarteObtenue[]>([]);
  const indexRef = useRef(0);
  const geste = useRef({ p: 0, actif: false, x: 0, cumul: 0 });
  const pointeur = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 3 });
  const penche = useRef({ rx: 0, ry: 0 });

  const reduit = (): boolean => reduire || mouvementReduit();
  const D = (ms: number): number => (reduit() ? 1 : ms);
  const attendre = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, reduit() ? Math.min(ms, 40) : ms));
  const aller = (p: Phase): void => { phaseRef.current = p; setPhase(p); };
  const jaillir: Particules['jaillir'] = (x, y, options) => particules.current?.jaillir(x, y, options);
  const dans = <T extends Element>(racine: Element | null | undefined, selecteur: string): T | null => racine?.querySelector<T>(selecteur) ?? null;

  useEffect(() => { SONS.muet = !sons; }, [sons]);

  // ── Mise en place : particules, clavier, suivi du pointeur (la page derrière est inerte : useRacineInerte) ──
  useEffect(() => {
    document.body.classList.add('ceremonie-ouverte');
    if (toile.current) particules.current = new Particules(toile.current, reduit);
    const ajuster = (): void => particules.current?.ajuster();
    const suivre = (e: PointerEvent): void => { pointeur.current = { x: e.clientX, y: e.clientY }; };
    const echap = (e: KeyboardEvent): void => { if (e.key === 'Escape') fermer(); };
    window.addEventListener('resize', ajuster);
    window.addEventListener('pointermove', suivre, { passive: true });
    window.addEventListener('keydown', echap);
    SONS.preparer();
    // Juste après le montage : flushSync ne peut pas redessiner depuis l'intérieur d'un effet.
    void Promise.resolve().then(() => demarrer(depuis, premier));
    return () => {
      jeton.current++;
      document.body.classList.remove('ceremonie-ouverte');
      window.removeEventListener('resize', ajuster);
      window.removeEventListener('pointermove', suivre);
      window.removeEventListener('keydown', echap);
      particules.current?.vider();
    };
  }, []); // une cérémonie par montage : « Ouvrir le suivant » la relance de l'intérieur

  // Le paquet s'incline vers le pointeur tant qu'il est sur la scène (pas quand le joueur a demandé moins d'animations).
  useEffect(() => {
    if ((phase !== 'ouverture' && phase !== 'dechirure') || reduit()) return;
    let cadre = 0;
    const boucle = (): void => {
      const paquet = dans<HTMLElement>(emballage.current, '.cp');
      const incline = dans<HTMLElement>(paquet, '.cp__inclinaison');
      const r = paquet?.getBoundingClientRect();
      if (paquet && incline && r?.width && !document.hidden) {
        const force = geste.current.actif ? .35 : .8;
        const dx = clamp((pointeur.current.x - (r.left + r.width / 2)) / (window.innerWidth * .45), -1, 1);
        const dy = clamp((pointeur.current.y - (r.top + r.height / 2)) / (window.innerHeight * .45), -1, 1);
        const p = penche.current;
        p.rx = lerp(p.rx, -dy * 12 * force, .08); p.ry = lerp(p.ry, dx * 22 * force, .08);
        incline.style.transform = `rotateX(${p.rx.toFixed(2)}deg) rotateY(${p.ry.toFixed(2)}deg)`;
        const mx = .5 + p.ry / 44, my = .5 - p.rx / 24;
        paquet.style.setProperty('--mx', mx.toFixed(3)); paquet.style.setProperty('--my', my.toFixed(3));
        paquet.style.setProperty('--gx', `${(mx * 100).toFixed(1)}%`); paquet.style.setProperty('--gy', `${(my * 60).toFixed(1)}%`);
      }
      cadre = requestAnimationFrame(boucle);
    };
    cadre = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(cadre);
  }, [phase, tentative]);

  // Le clavier suit le timbre à retourner, puis le bouton principal du résumé.
  useEffect(() => {
    if (phase === 'revelation') cartesDom.current[index]?.focus({ preventScroll: true });
    if (phase === 'resume' && apercu === null) dans<HTMLButtonElement>(infos.current, '[data-action="ranger"]')?.focus({ preventScroll: true });
    if (apercu !== null) apercuDom.current?.focus({ preventScroll: true });
  }, [phase, index, apercu]);

  // ── Ouverture : le paquet arrive pendant que le serveur tire son contenu ──
  async function demarrer(origine: DOMRect | null, promesse: Promise<CarteObtenue[]> = tirer()): Promise<void> {
    const j = ++jeton.current;
    promesse.catch(() => undefined);
    geste.current = { p: 0, actif: false, x: 0, cumul: 0 };
    cartesRef.current = []; indexRef.current = 0;
    flushSync(() => {
      setCartes(null); setIndex(0); setRevelees([]); setRangees([]); setPlateau([]); setApercu(null); setAplati(false);
      setTentative((t) => t + 1); aller('ouverture');
    });
    const paquet = dans<HTMLElement>(emballage.current, '.cp');
    SONS.souffle();
    let vol: Promise<unknown> = Promise.resolve();
    if (paquet) {
      let depart = 'translateY(75vh) rotate(-8deg)';
      if (origine?.width) {
        const vers = paquet.getBoundingClientRect();
        const dx = (origine.left + origine.width / 2) - (vers.left + vers.width / 2), dy = (origine.top + origine.height / 2) - (vers.top + vers.height / 2);
        depart = `translate(${dx}px,${dy}px) scale(${origine.width / vers.width})`;
      }
      vol = paquet.animate([{ transform: depart }, { transform: 'none' }], { duration: D(origine ? 760 : 720), easing: origine ? 'cubic-bezier(.2,.8,.2,1)' : 'cubic-bezier(.2,.9,.25,1)' }).finished;
    }
    let obtenues: CarteObtenue[];
    try {
      [obtenues] = await Promise.all([promesse, vol]);
    } catch (e) {
      if (j !== jeton.current) return;
      onErreur(messageDe(e));
      fermer(true);
      return;
    }
    if (j !== jeton.current) return;
    if (obtenues.length === 0) { onErreur('Le paquet est vide.'); fermer(true); return; }
    cartesRef.current = obtenues;
    flushSync(() => {
      setCartes(obtenues);
      setRevelees(obtenues.map(() => false)); setRangees(obtenues.map(() => false)); setPlateau(obtenues.map(() => false));
      aller('dechirure');
    });
  }

  // ── La déchirure ──
  function dechirer(p: number): void {
    const attachee = dans<HTMLElement>(emballage.current, '.cp__bande--attachee');
    const arrachee = dans<HTMLElement>(emballage.current, '.cp__bande--arrachee');
    if (!attachee || !arrachee) return;
    const t = clamp(p, 0, 1);
    geste.current.p = t;
    const pct = (t * 100).toFixed(2);
    attachee.style.clipPath = `inset(0 0 0 ${pct}%)`;
    arrachee.style.clipPath = `inset(0 ${(100 - t * 100).toFixed(2)}% 0 0)`;
    arrachee.style.transformOrigin = `${pct}% 100%`;
    arrachee.style.transform = `translate(${(-t * 4).toFixed(1)}px, ${(-t * 16).toFixed(1)}px) rotate(${(-t * 10).toFixed(2)}deg)`;
  }
  function fibres(): void {
    const r = dans<HTMLElement>(emballage.current, '.cp__bande--attachee')?.getBoundingClientRect();
    if (r) jaillir(r.left + geste.current.p * r.width, r.bottom - 3, { n: 2, genre: 'fibre', couleurs: ['#f6ead2', '#e8bb83'], vitesse: [40, 150], g: 650, taille: [2, 4], duree: [.5, 1], ouverture: 2.2 });
  }
  async function dechirerDUnCoup(): Promise<void> {
    if (phaseRef.current !== 'dechirure') return;
    dans<HTMLElement>(emballage.current, '.cp__indice')?.classList.add('cp__indice--eteint');
    const depart = geste.current.p, t0 = performance.now(), duree = D(620);
    const j = jeton.current;
    await new Promise<void>((fin) => {
      const pas = (maintenant: number): void => {
        if (j !== jeton.current) { fin(); return; }
        const k = Math.min(1, (maintenant - t0) / duree), e = k * k * (3 - 2 * k);
        dechirer(depart + (1 - depart) * e);
        if (Math.random() < .6) { SONS.grain(.8); fibres(); }
        if (k < 1) requestAnimationFrame(pas); else fin();
      };
      requestAnimationFrame(pas);
    });
    await finirLaDechirure();
  }
  async function finirLaDechirure(): Promise<void> {
    if (phaseRef.current !== 'dechirure') return;
    const j = jeton.current;
    aller('sortie');
    geste.current.actif = false;
    dechirer(1); SONS.dechirure();
    const attachee = dans<HTMLElement>(emballage.current, '.cp__bande--attachee');
    const arrachee = dans<HTMLElement>(emballage.current, '.cp__bande--arrachee');
    const paquet = dans<HTMLElement>(emballage.current, '.cp');
    const tr = arrachee?.getBoundingClientRect();
    if (tr) jaillir(tr.right - 10, tr.bottom, { n: 26, genre: 'fibre', couleurs: ['#f6ead2', '#e8bb83', '#fff6e6'], vitesse: [80, 320], g: 900, duree: [.8, 1.6], taille: [2, 5] });
    if (attachee) attachee.style.visibility = 'hidden';
    arrachee?.animate([{ transform: arrachee.style.transform, opacity: 1 }, { transform: 'translate(110px,-260px) rotate(-38deg)', opacity: 0 }], { duration: D(820), easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards' });
    await attendre(240); if (j !== jeton.current) return;
    const pr = paquet?.getBoundingClientRect();
    if (pr) jaillir(pr.left + pr.width / 2, pr.top + pr.height * .12, { n: 46, genre: 'poussiere', couleurs: ['#ffe3b0', '#f0c48f', '#fff8e8'], vitesse: [40, 240], ouverture: 1.7, duree: [.8, 1.8], frein: .94, taille: [1.2, 3.2] });
    SONS.souffle();
    const tas = pile.current;
    if (!tas) return;
    await tas.animate([{ transform: 'translateY(8%) scale(.8)' }, { transform: 'translateY(-46%) scale(.86)' }], { duration: D(720), easing: 'cubic-bezier(.2,.9,.25,1)', fill: 'forwards' }).finished;
    if (j !== jeton.current) return;
    emballage.current?.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(75vh) rotate(7deg)', opacity: 0 }], { duration: D(650), easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' });
    await attendre(170); if (j !== jeton.current) return;
    tas.style.zIndex = '3';
    await tas.animate([{ transform: 'translateY(-46%) scale(.86)' }, { transform: 'none' }], { duration: D(640), easing: 'cubic-bezier(.3,1.3,.4,1)', fill: 'forwards' }).finished;
    if (j !== jeton.current) return;
    aller('revelation');
  }

  // ── La révélation d'un timbre ──
  function secousse(rang: number): Keyframe[] {
    const images: Keyframe[] = [], n = 14, amplitude = rang === 3 ? 7 : 4;
    for (let i = 0; i <= n; i++) {
      const k = i / n, a = amplitude * k * (i === n ? 0 : 1);
      images.push({ transform: `translate(${entre(-a, a).toFixed(1)}px,${entre(-a, a).toFixed(1)}px) rotate(${entre(-a * .4, a * .4).toFixed(2)}deg) scale(${(1 + k * .04).toFixed(3)})` });
    }
    return images;
  }
  function tamponner(el: Element | null, opacite = .82): void {
    el?.animate([{ opacity: 0, transform: 'scale(1.9)', filter: 'blur(3px)' }, { opacity: opacite, transform: 'scale(1)', filter: 'blur(0)' }], { duration: D(190), easing: 'cubic-bezier(.6,0,.9,.5)', fill: 'forwards' });
  }
  function eclairer(): void { eclair.current?.animate([{ opacity: 0 }, { opacity: .9, offset: .15 }, { opacity: 0 }], { duration: D(700), easing: 'ease-out' }); }
  function secouerLaScene(): void {
    const images: Keyframe[] = [];
    for (let i = 0; i < 10; i++) { const a = 10 * (1 - i / 10); images.push({ transform: `translate(${entre(-a, a).toFixed(1)}px,${entre(-a, a).toFixed(1)}px)` }); }
    images.push({ transform: 'none' });
    scene.current?.animate(images, { duration: D(460) });
  }

  async function reveler(): Promise<void> {
    if (phaseRef.current !== 'revelation') return;
    const j = jeton.current, i = indexRef.current, obtenue = cartesRef.current[i], carte = cartesDom.current[i];
    const retourne = dans<HTMLElement>(carte, '.c-retourne');
    if (!obtenue || !carte || !retourne) return;
    const rang = RANG_DE_L_ECLAT[eclatDe(obtenue)];
    aller('retournement');
    if (rang >= 2) {
      SONS.montee(rang === 3 ? 1.1 : .7);
      await retourne.animate(secousse(rang), { duration: D(rang === 3 ? 1100 : 700), easing: 'ease-in' }).finished;
      if (j !== jeton.current) return;
    }
    SONS.souffle();
    await retourne.animate([{ transform: 'rotateY(0deg) scale(1)' }, { transform: 'rotateY(90deg) scale(1.1)' }], { duration: D(170), easing: 'cubic-bezier(.5,0,1,1)' }).finished;
    if (j !== jeton.current) return;
    flushSync(() => setRevelees((r) => r.map((v, k) => v || k === i)));
    if (rang === 3) { eclairer(); secouerLaScene(); }
    await retourne.animate([{ transform: 'rotateY(-90deg) scale(1.1)' }, { transform: 'rotateY(0deg) scale(1)' }], { duration: D(rang ? 440 : 300), easing: 'cubic-bezier(.2,1.4,.4,1)' }).finished;
    if (j !== jeton.current) return;
    await attendre(90);
    if (j !== jeton.current) return;
    tamponner(dans(carte, '.tb__recto .tb__cachet')); SONS.coup();
    retourne.animate([{ transform: 'scale(1)' }, { transform: 'scale(.965) translateY(3px)' }, { transform: 'scale(1)' }], { duration: D(230) });
    const r = carte.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (rang === 1) {
      SONS.carillon(1);
      jaillir(cx, cy, { n: 44, genre: 'poussiere', couleurs: ['#ffe1a8', '#f0c48f', '#fff4d6'], vitesse: [60, 340], duree: [.7, 1.5] });
      dans<HTMLElement>(carte, '.tb__recto .tb__vernis')?.animate([{ backgroundPosition: '100% 50%' }, { backgroundPosition: '0% 50%' }], { duration: D(1000), easing: 'ease-in-out' });
    } else if (rang === 2) {
      SONS.scintillement(); SONS.carillon(2);
      jaillir(cx, cy, { n: 80, genre: 'etincelle', couleurs: ['#ff7aa2', '#ffe07a', '#8dffc0', '#7fd8ff', '#c49bff'], vitesse: [140, 560], duree: [.6, 1.3], taille: [1.2, 2.6] });
    } else if (rang === 3) {
      SONS.eclat();
      jaillir(cx, cy, { n: 130, genre: 'confetti', couleurs: ['#f0c48f', '#d7263f', '#f6ecd6', '#3557a8'], vitesse: [220, 760], g: 720, duree: [1.4, 2.6], taille: [5, 10], frein: .97 });
      jaillir(cx, cy, { n: 60, genre: 'etincelle', couleurs: ['#ffd79a', '#ffffff'], vitesse: [220, 720], duree: [.5, 1.1] });
      await attendre(460);
      if (j !== jeton.current) return;
      SONS.carillon(3);
    }
    aller('revelee');
  }

  // ── Le rangement dans le plateau, timbre par timbre ──
  async function envoyer(): Promise<void> {
    if (phaseRef.current !== 'revelee') return;
    const j = jeton.current, i = indexRef.current, carte = cartesDom.current[i];
    aller('envoi');
    flushSync(() => setPlateau((p) => p.map((v, k) => v || k === i)));
    const vignette = dans<HTMLElement>(cases.current[i], '.tb');
    const source = dans<HTMLElement>(carte, '.tb');
    if (carte && vignette && source) {
      const de = source.getBoundingClientRect(), vers = vignette.getBoundingClientRect();
      carte.style.visibility = 'hidden';
      SONS.bulle();
      vignette.style.transformOrigin = '0 0';
      await vignette.animate([{ transform: `translate(${de.left - vers.left}px,${de.top - vers.top}px) scale(${de.width / vers.width})` }, { transform: 'none' }], { duration: D(520), easing: 'cubic-bezier(.3,.9,.3,1)' }).finished;
    }
    if (j !== jeton.current) return;
    const suivant = i + 1;
    indexRef.current = suivant;
    flushSync(() => {
      setRangees((r) => r.map((v, k) => v || k === i));
      setIndex(suivant);
      aller(suivant >= cartesRef.current.length ? 'resume' : 'revelation');
    });
  }

  // ── « Tout révéler » : les timbres restants se retournent d'un coup, et l'on passe au résumé ──
  function toutReveler(): void {
    const obtenues = cartesRef.current;
    if (!obtenues.length || !['dechirure', 'sortie', 'revelation', 'retournement', 'revelee', 'envoi'].includes(phaseRef.current)) return;
    jeton.current++;
    geste.current.actif = false;
    const rang = Math.max(...obtenues.filter((_, i) => !revelees[i]).map((o) => RANG_DE_L_ECLAT[eclatDe(o)]), 0);
    indexRef.current = obtenues.length;
    flushSync(() => {
      const tous = obtenues.map(() => true);
      setRevelees(tous); setRangees(tous); setPlateau(tous); setIndex(obtenues.length);
      aller('resume');
    });
    SONS.souffle();
    const r = scene.current?.getBoundingClientRect();
    if (!r) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (rang === 3) {
      eclairer(); SONS.eclat();
      jaillir(cx, cy, { n: 130, genre: 'confetti', couleurs: ['#f0c48f', '#d7263f', '#f6ecd6', '#3557a8'], vitesse: [220, 760], g: 720, duree: [1.4, 2.6], taille: [5, 10], frein: .97 });
    } else if (rang === 2) {
      SONS.scintillement(); SONS.carillon(2);
      jaillir(cx, cy, { n: 80, genre: 'etincelle', couleurs: ['#ff7aa2', '#ffe07a', '#8dffc0', '#7fd8ff', '#c49bff'], vitesse: [140, 560], duree: [.6, 1.3], taille: [1.2, 2.6] });
    } else {
      SONS.carillon(rang);
      jaillir(cx, cy, { n: 44, genre: 'poussiere', couleurs: ['#ffe1a8', '#f0c48f', '#fff4d6'], vitesse: [60, 340], duree: [.7, 1.5] });
    }
  }

  // ── Le rangement : l'éventail s'aplatit, puis la page fait voler les timbres jusqu'à l'album ──
  async function ranger(): Promise<void> {
    if (phaseRef.current !== 'resume') return;
    const obtenues = cartesRef.current;
    setApercu(null);
    flushSync(() => setAplati(true));
    await attendre(320);
    if (phaseRef.current !== 'resume') return;
    const places = Array.from(scene.current?.querySelectorAll('.c-eventail__timbre .tb') ?? [], (el) => el.getBoundingClientRect());
    onRanger?.({ cartes: obtenues, places });
    fermer(!!onRanger);
  }

  // ── Le résumé, l'aperçu agrandi, la suite ──
  function montrerApercu(i: number): void {
    if (phaseRef.current !== 'resume') return;
    setApercu(i);
    SONS.bulle();
    if (eclatDe(cartesRef.current[i]) === 'holo') SONS.scintillement();
  }
  function fermer(immediat = false): void {
    if (phaseRef.current === 'fermeture') return;
    jeton.current++;
    aller('fermeture');
    setTimeout(onFermer, immediat || reduit() ? 0 : 450);
  }

  // ── Les gestes sur la scène : déchirure au doigt, inclinaison du timbre ──
  const appuyer = (e: PointeurReact<HTMLDivElement>): void => {
    if (phaseRef.current !== 'dechirure') return;
    geste.current = { ...geste.current, actif: true, x: e.clientX, cumul: 0 };
    dans<HTMLElement>(emballage.current, '.cp__indice')?.classList.add('cp__indice--eteint');
    try { scene.current?.setPointerCapture(e.pointerId); } catch { /* le navigateur refuse : le geste marche quand même */ }
  };
  const glisser = (e: PointeurReact<HTMLDivElement>): void => {
    const g = geste.current;
    if (phaseRef.current === 'dechirure' && g.actif) {
      const dx = e.clientX - g.x;
      g.x = e.clientX;
      if (dx > 0) {
        const largeur = dans<HTMLElement>(emballage.current, '.cp__bande--attachee')?.getBoundingClientRect().width || 300;
        dechirer(g.p + (dx / largeur) * 1.15);
        g.cumul += dx;
        while (g.cumul > 7) { g.cumul -= 7; SONS.grain(Math.min(1, dx / 12)); if (Math.random() < .5) fibres(); }
        if (g.p >= .9) void finirLaDechirure();
      }
      return;
    }
    const el = apercu !== null ? apercuDom.current : ['revelation', 'revelee', 'retournement'].includes(phaseRef.current) ? cartesDom.current[indexRef.current] : null;
    const r = el?.getBoundingClientRect();
    if (!el || !r?.width) return;
    const px = clamp(.5 + (e.clientX - (r.left + r.width / 2)) / (r.width * 1.3), 0, 1);
    const py = clamp(.5 + (e.clientY - (r.top + r.height / 2)) / (r.height * 1.3), 0, 1);
    const incline = dans<HTMLElement>(el, '.c-inclinaison');
    if (incline) incline.style.transform = `rotateX(${((.5 - py) * 16).toFixed(2)}deg) rotateY(${((px - .5) * 20).toFixed(2)}deg)`;
    const timbre = dans<HTMLElement>(el, '.tb');
    timbre?.style.setProperty('--mx', px.toFixed(3)); timbre?.style.setProperty('--my', py.toFixed(3));
    timbre?.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`); timbre?.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
  };
  const lacher = (): void => { geste.current.actif = false; };
  const redresser = (): void => { scene.current?.querySelectorAll<HTMLElement>('.c-inclinaison').forEach((t) => { t.style.transform = ''; }); };
  const toucherLaCarte = (i: number): void => {
    if (i !== indexRef.current) return;
    if (phaseRef.current === 'revelation') void reveler();
    else if (phaseRef.current === 'revelee') void envoyer();
  };
  const clavierDeLaScene = (e: ClavierReact<HTMLDivElement>): void => {
    if (phaseRef.current === 'dechirure' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); void dechirerDUnCoup(); }
  };

  // ── Le rendu ──
  const n = cartes?.length ?? 0;
  const courante = cartes?.[apercu ?? index] ?? null;
  const eventail = (k: number): string => aplati
    ? `translateX(${k * (etroit ? 22 : 46)}%) scale(${etroit ? .46 : .62})`
    : `translateX(${k * (etroit ? 22 : 46)}%) translateY(${Math.abs(k) * 5}%) rotate(${k * 7}deg) scale(${etroit ? .46 : .62})`;
  const milieu = (n - 1) / 2;
  const avantLaSortie = phase === 'ouverture' || phase === 'dechirure' || phase === 'sortie';
  const auResume = phase === 'resume' || (phase === 'fermeture' && rangees.length > 0 && rangees.every(Boolean));

  const fiche = (obtenue: CarteObtenue, sous: string) => {
    return <>
      <div className="c-pastilles">
        <span className="c-pastille c-vignette" data-rarete={obtenue.carte.rarete}>{obtenue.carte.rarete}</span>
        {obtenue.finition !== 'Normale' && <span className="c-pastille c-dorure" data-finition={obtenue.finition}><span>{NOM_DE_LA_FINITION[obtenue.finition]}</span></span>}
        {obtenue.nouvelle ? <span className="c-pastille c-tampon">Nouveau</span>
          : obtenue.nouvelleFinition ? <span className="c-pastille c-tampon">Nouvelle finition</span>
            : <span className="c-pastille c-tampon c-tampon--doublon">Doublon{obtenue.encre > 0 ? ` · +${obtenue.encre} Encre` : ''}</span>}
      </div>
      <h2 className="c-mot">{obtenue.carte.mot}</h2>
      <p className="c-definition"><em>{ABREGE_DE_LA_NATURE[obtenue.carte.type]}</em>{obtenue.carte.definition}</p>
      {obtenue.carte.record && <p className="c-sous">{obtenue.carte.record}</p>}
      <p className="c-sous">{sous}</p>
    </>;
  };

  let info = null;
  if (phase === 'ouverture') info = <p className="c-sous">Préparation du paquet…</p>;
  else if (phase === 'dechirure') info = <><p className="c-indice">Déchire le paquet en suivant les pointillés</p><div className="c-liens"><button type="button" className="c-lien" onClick={() => void dechirerDUnCoup()}>Déchirer d’un coup</button><button type="button" className="c-lien" onClick={toutReveler}>Tout révéler</button></div></>;
  else if (phase === 'revelation') info = <><p className="c-indice">Touche le timbre pour le retourner</p><p className="c-sous">Timbre {index + 1} sur {n}</p>{n - index > 1 && <button type="button" className="c-lien" onClick={toutReveler}>Tout révéler</button>}</>;
  else if ((phase === 'revelee' || phase === 'envoi') && courante) info = <>{fiche(courante, 'Touche-le à nouveau pour le ranger.')}{n - index > 1 && <button type="button" className="c-lien" onClick={toutReveler}>Révéler les suivants d’un coup</button>}</>;
  else if (phase === 'resume' && cartes) {
    info = apercu !== null && courante ? fiche(courante, 'Touche le timbre pour revenir au résumé.') : <>
      <h2 className="c-titre">{titreDuResume(cartes)}</h2>
      <p className="c-sous">{bilanDuPaquet(cartes)}. {gainsDuPaquet(cartes)}. Touche un timbre pour l’admirer.</p>
      <div className="c-actions">
        <button type="button" className="bouton-dentele" data-action="ranger" onClick={() => void ranger()}>Ranger dans l’album</button>
        {continuer && reserve > 0 && <button type="button" className="bouton-dentele bouton-dentele--filet" onClick={() => void demarrer(null)}>Ouvrir le suivant ({reserve})</button>}
      </div>
    </>;
  }

  return createPortal(<>
    <div className="ceremonie" data-phase={phase} role="dialog" aria-modal="true" aria-label="Ouverture d’un paquet"
      style={{ '--masque-paquet': MASQUE_DU_PAQUET } as CSSProperties}>
      <div className="ceremonie__haut">
        <button type="button" className="c-icone" aria-pressed={!sons} aria-label={sons ? 'Couper le son' : 'Remettre le son'} onClick={() => onSons(!sons)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />{sons ? <><path d="M15.5 9a4.5 4.5 0 0 1 0 6" /><path d="M18 6.5a8 8 0 0 1 0 11" /></> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}</svg>
        </button>
        <button type="button" className="c-icone" aria-label="Fermer et ranger les timbres" onClick={() => fermer()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      <div className="ceremonie__scene" ref={scene} tabIndex={phase === 'dechirure' ? 0 : -1} aria-label={phase === 'dechirure' ? 'Paquet à déchirer : glisse de gauche à droite, ou appuie sur Entrée' : undefined}
        onPointerDown={appuyer} onPointerMove={glisser} onPointerUp={lacher} onPointerCancel={lacher} onPointerLeave={redresser} onKeyDown={clavierDeLaScene}>
        {cartes && !auResume && <div className="c-pile" ref={pile} key={`pile-${tentative}`} style={{ transform: 'translateY(8%) scale(.8)' }}>
          {cartes.map((obtenue, i) => rangees[i] ? null : <button key={`${tentative}-${i}`} type="button" ref={(el) => { cartesDom.current[i] = el; }}
            className={`c-carte${i === index && phase === 'revelation' && eclatDe(obtenue) !== 'courant' ? ' c-carte--attente' : ''}`}
            data-eclat={eclatDe(obtenue)} tabIndex={i === index && (phase === 'revelation' || phase === 'revelee') ? 0 : -1}
            aria-label={revelees[i] ? `${obtenue.carte.mot}, ${obtenue.carte.rarete.toLowerCase()}. Ranger ce timbre` : i === index ? `Retourner le timbre ${i + 1} sur ${n}` : `Timbre ${i + 1} sur ${n}, face cachée`}
            style={{ zIndex: n - i, transform: i === index ? 'none' : `translate(${i * 2.5}px, ${-i * 2}px) rotate(${(i % 2 ? 1 : -1) * (1 + i * .6)}deg)` }}
            onClick={() => toucherLaCarte(i)}>
            <div className="c-inclinaison"><div className="c-retourne">
              <Timbre carte={obtenue.carte} finition={obtenue.finition} verso montrerVerso={!revelees[i]} dos={dos} cliquable={false} reagir={false} />
            </div></div>
          </button>)}
        </div>}
        {avantLaSortie && <div className="c-emballage" ref={emballage} key={`paquet-${tentative}`}>
          <PaquetDeCeremonie modele={modelePaquet} className="cp--scene" />
        </div>}
        {auResume && cartes && <div className={`c-eventail${apercu !== null ? ' c-eventail--estompe' : ''}`}>
          {cartes.map((obtenue, i) => <button key={`${tentative}-${i}`} type="button" className="c-eventail__timbre" style={{ transform: eventail(i - milieu), '--i': i } as CSSProperties}
            aria-label={`Admirer ${obtenue.carte.mot}`} tabIndex={apercu === null ? 0 : -1} onClick={() => montrerApercu(i)}>
            <Timbre carte={obtenue.carte} finition={obtenue.finition} oblitere cliquable={false} reagir={false} />
          </button>)}
        </div>}
        {apercu !== null && cartes && <button type="button" ref={apercuDom} className="c-carte c-apercu" aria-label={`${cartes[apercu].carte.mot}, fermer l’aperçu`} onClick={() => setApercu(null)}>
          <div className="c-inclinaison"><div className="c-retourne"><Timbre carte={cartes[apercu].carte} finition={cartes[apercu].finition} oblitere cliquable={false} reagir={false} /></div></div>
        </button>}
      </div>

      <div className="ceremonie__infos" ref={infos} aria-live="polite">{info}</div>

      <div className={`ceremonie__plateau${auResume ? ' ceremonie__plateau--fini' : ''}`}>
        {Array.from({ length: cartes?.length ?? 5 }, (_, i) => <button key={`${tentative}-${i}`} type="button" tabIndex={-1} ref={(el) => { cases.current[i] = el; }}
          className={`c-case${plateau[i] ? ' c-case--pleine' : ''}`} aria-label={plateau[i] && cartes ? `Revoir ${cartes[i].carte.mot}` : `Emplacement ${i + 1}`}
          onClick={() => montrerApercu(i)}>
          {plateau[i] && cartes && <Timbre carte={cartes[i].carte} finition={cartes[i].finition} oblitere cliquable={false} reagir={false} />}
        </button>)}
      </div>
      <div className="ceremonie__eclair" ref={eclair} />
    </div>
    <canvas className="ceremonie__particules" ref={toile} aria-hidden="true" />
  </>, document.body);
}
