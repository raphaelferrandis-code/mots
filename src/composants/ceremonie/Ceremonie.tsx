// La cérémonie d'ouverture d'un paquet : la feuille de timbres (brief du 26/09/2026, prototype-ouverture-feuille.html).
// Déroulé : ouverture → déchirure → sortie (la feuille pliée monte du paquet, puis se déplie) → feuille ↔ retournement
// → résumé.
//
// Le tirage est fait par le serveur dès le clic, pendant que le paquet vient se placer : la cérémonie ne fait
// qu'afficher un résultat déjà décidé et enregistré. Fermer en cours de route ne perd donc rien.
// Les animations sont pilotées à la main (Web Animations) ; un jeton les arrête proprement si l'on ferme.

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ClavierReact, PointerEvent as PointeurReact } from 'react';
import { createPortal, flushSync } from 'react-dom';
import type { CarteObtenue } from '../../jeu/partie.ts';
import { EDITION } from '../../services/cartes.ts';
import { Timbre } from '../timbre/Timbre.tsx';
import { PaquetDeCeremonie, MASQUE_DU_PAQUET } from './PaquetDeCeremonie.tsx';
import { Feuille, useEcranEtroit } from './Feuille.tsx';
import type { FaceDeLaFeuille } from './Feuille.tsx';
import { disposition, melanger } from './feuille.ts';
import { Particules, SONS } from './effets.ts';
import { ABREGE_DE_LA_NATURE, NOM_DE_LA_FINITION, RANG_DE_L_ECLAT, bilanDuPaquet, eclatDe, gainsDuPaquet, titreDuResume } from './eclats.ts';
import { useRacineInerte } from '../useRacineInerte.ts';
import { mouvementReduit } from '../mouvement.ts';
import { messageDe } from '../../partage/messages.ts';
import './ceremonie.css';

type Phase = 'ouverture' | 'dechirure' | 'sortie' | 'feuille' | 'retournement' | 'resume' | 'fermeture';
// La feuille : cachée derrière le paquet, pliée en deux (seule sa moitié haute se voit), puis dépliée.
type EtatDeLaFeuille = 'cachee' | 'pliee' | 'depliee';

// Ce que la page reçoit au rangement : les timbres et leur place à l'écran, pour les faire voler jusqu'à l'album.
export type Envol = { cartes: CarteObtenue[]; places: DOMRect[] };

type Props = {
  premier: Promise<CarteObtenue[]>; // le tirage lancé au clic (jamais depuis la cérémonie : un seul tirage par geste)
  tirer: () => Promise<CarteObtenue[]>; // tire (et enregistre) le paquet suivant sur le serveur
  continuer: boolean; // « Ouvrir le suivant » est proposé (paquets gratuits seulement)
  reserve: number; // paquets encore en réserve
  numero?: number; // paquets déjà ouverts par le joueur : le « Paquet n° » imprimé sur la feuille
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

export function Ceremonie({ premier, tirer, continuer, reserve, numero = 1, depuis, modelePaquet, dos, sons, onSons, reduire, onFermer, onRanger, onErreur }: Props) {
  useRacineInerte();
  const [phase, setPhase] = useState<Phase>('ouverture');
  // L'éventail du résumé se resserre sur un écran étroit ; la feuille passe en 2 × 3 sous 700 px.
  const [etroit, setEtroit] = useState(() => window.matchMedia('(max-width: 639.98px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 639.98px)');
    const suivre = (): void => setEtroit(media.matches);
    media.addEventListener('change', suivre);
    return () => media.removeEventListener('change', suivre);
  }, []);
  const feuilleEtroite = useEcranEtroit();
  const [cartes, setCartes] = useState<CarteObtenue[] | null>(null);
  const [face, setFace] = useState<FaceDeLaFeuille>('verso');
  const [etatFeuille, setEtatFeuille] = useState<EtatDeLaFeuille>('cachee');
  const [pli, setPli] = useState(false); // le volet du dépliage est à l'écran
  const [detaches, setDetaches] = useState<boolean[]>([]);
  const [reveles, setReveles] = useState<boolean[]>([]);
  const [plateau, setPlateau] = useState<boolean[]>([]);
  const [apercu, setApercu] = useState<number | null>(null);
  const [tentative, setTentative] = useState(0);
  const [aplati, setAplati] = useState(false);

  const scene = useRef<HTMLDivElement>(null);
  const emballage = useRef<HTMLDivElement>(null);
  const feuilleDom = useRef<HTMLDivElement>(null);
  const inclinaisonDom = useRef<HTMLDivElement>(null);
  const pivotDom = useRef<HTMLDivElement>(null);
  const voletDom = useRef<HTMLDivElement>(null);
  const apercuDom = useRef<HTMLButtonElement>(null);
  const eclair = useRef<HTMLDivElement>(null);
  const toile = useRef<HTMLCanvasElement>(null);
  const infos = useRef<HTMLDivElement>(null);
  const particules = useRef<Particules | null>(null);
  const jeton = useRef(0);
  const phaseRef = useRef<Phase>('ouverture');
  const cartesRef = useRef<CarteObtenue[]>([]);
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

  // La feuille posée s'incline doucement vers le pointeur (souris seulement), et se redresse pendant un geste.
  useEffect(() => {
    if (etatFeuille !== 'depliee' || reduit() || !window.matchMedia('(hover: hover)').matches) return;
    let cadre = 0;
    const p = { rx: 0, ry: 0 };
    const boucle = (): void => {
      const el = inclinaisonDom.current, r = feuilleDom.current?.getBoundingClientRect();
      if (el && r?.width && !document.hidden) {
        const libre = phaseRef.current === 'feuille';
        const nx = (pointeur.current.x - r.left) / r.width, ny = (pointeur.current.y - r.top) / r.height;
        p.rx = lerp(p.rx, libre ? clamp((ny - .5) * -7, -6, 6) : 0, .07);
        p.ry = lerp(p.ry, libre ? clamp((nx - .5) * 8, -7, 7) : 0, .07);
        el.style.transform = Math.abs(p.rx) + Math.abs(p.ry) < .02 ? '' : `rotateX(${p.rx.toFixed(2)}deg) rotateY(${p.ry.toFixed(2)}deg)`;
      }
      cadre = requestAnimationFrame(boucle);
    };
    cadre = requestAnimationFrame(boucle);
    return () => { cancelAnimationFrame(cadre); if (inclinaisonDom.current) inclinaisonDom.current.style.transform = ''; };
  }, [etatFeuille, tentative]);

  // Le clavier suit le bouton principal de chaque moment.
  useEffect(() => {
    if (phase === 'feuille') dans<HTMLButtonElement>(infos.current, '[data-action="principal"]')?.focus({ preventScroll: true });
    if (phase === 'resume' && apercu === null) dans<HTMLButtonElement>(infos.current, '[data-action="ranger"]')?.focus({ preventScroll: true });
    if (apercu !== null) apercuDom.current?.focus({ preventScroll: true });
  }, [phase, apercu]);

  // ── Ouverture : le paquet arrive pendant que le serveur tire son contenu ──
  async function demarrer(origine: DOMRect | null, promesse: Promise<CarteObtenue[]> = tirer()): Promise<void> {
    const j = ++jeton.current;
    promesse.catch(() => undefined);
    geste.current = { p: 0, actif: false, x: 0, cumul: 0 };
    cartesRef.current = [];
    flushSync(() => {
      setCartes(null); setFace('verso'); setEtatFeuille('cachee'); setPli(false);
      setDetaches([]); setReveles([]); setPlateau([]); setApercu(null); setAplati(false);
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
    // La place de chaque timbre sur la feuille : mélangée pour l'affichage (le serveur rend le plus rare en dernier).
    const places = melanger(obtenues, obtenues.map((o) => `${o.carte.id}/${o.finition}`).join('|'));
    cartesRef.current = places;
    flushSync(() => {
      setCartes(places);
      setDetaches(places.map(() => false)); setReveles(places.map(() => false)); setPlateau(places.map(() => false));
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

  // ── La sortie : la feuille pliée monte hors du paquet, le paquet tombe, la feuille se place puis se déplie ──
  async function finirLaDechirure(): Promise<void> {
    if (phaseRef.current !== 'dechirure') return;
    const j = jeton.current;
    aller('sortie');
    geste.current.actif = false;
    dechirer(1); SONS.dechirure();
    const attachee = dans<HTMLElement>(emballage.current, '.cp__bande--attachee');
    const arrachee = dans<HTMLElement>(emballage.current, '.cp__bande--arrachee');
    const tr = arrachee?.getBoundingClientRect();
    if (tr) jaillir(tr.right - 10, tr.bottom, { n: 26, genre: 'fibre', couleurs: ['#f6ead2', '#e8bb83', '#fff6e6'], vitesse: [80, 320], g: 900, duree: [.8, 1.6], taille: [2, 5] });
    if (attachee) attachee.style.visibility = 'hidden';
    arrachee?.animate([{ transform: arrachee.style.transform, opacity: 1 }, { transform: 'translate(110px,-260px) rotate(-38deg)', opacity: 0 }], { duration: D(820), easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards' });
    await attendre(260); if (j !== jeton.current) return;

    const paquet = dans<HTMLElement>(emballage.current, '.cp');
    const feuille = feuilleDom.current;
    if (!paquet || !feuille) return;
    flushSync(() => setEtatFeuille('pliee'));
    // La feuille pliée part de l'intérieur du paquet, à la largeur du paquet, et monte jusqu'à dépasser de son bord.
    const pr = paquet.getBoundingClientRect(), sr = feuille.getBoundingClientRect();
    const k = (pr.width * .88) / sr.width;
    const y0 = pr.top + pr.height * .18 - sr.top, y1 = pr.top - sr.top - sr.height * k * .45;
    feuille.style.transformOrigin = '50% 0';
    jaillir(pr.left + pr.width / 2, pr.top + pr.height * .12, { n: 40, genre: 'poussiere', couleurs: ['#ffe3b0', '#f0c48f', '#fff8e8'], vitesse: [40, 220], ouverture: 1.7, duree: [.8, 1.6], frein: .94, taille: [1.2, 3] });
    SONS.souffle();
    await feuille.animate([{ transform: `translateY(${y0}px) scale(${k})` }, { transform: `translateY(${y1}px) scale(${k})` }], { duration: D(700), easing: 'cubic-bezier(.2,.9,.25,1)', fill: 'forwards' }).finished;
    if (j !== jeton.current) return;
    emballage.current?.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(75vh) rotate(7deg)', opacity: 0 }], { duration: D(650), easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' });
    feuille.style.zIndex = '4';
    await feuille.animate([{ transform: `translateY(${y1}px) scale(${k})` }, { transform: 'none' }], { duration: D(700), easing: 'cubic-bezier(.3,1.1,.4,1)', fill: 'forwards' }).finished;
    if (j !== jeton.current) return;
    await deplier();
    if (j !== jeton.current) return;
    feuille.getAnimations().forEach((a) => a.cancel());
    feuille.style.transform = '';
    aller('feuille');
  }

  // Le dépliage : un volet, copie de la moitié basse du verso, pivote de −178° à 0° autour de la ligne de pli.
  async function deplier(): Promise<void> {
    const j = jeton.current;
    flushSync(() => setPli(true));
    const volet = voletDom.current;
    SONS.souffle();
    if (volet) {
      await volet.animate([
        { transform: 'perspective(1400px) rotateX(-178deg)' },
        { transform: 'perspective(1400px) rotateX(12deg)', offset: .75 },
        { transform: 'perspective(1400px) rotateX(0deg)' },
      ], { duration: D(900), easing: 'cubic-bezier(.35,.1,.3,1)' }).finished;
    }
    if (j !== jeton.current) return;
    flushSync(() => { setEtatFeuille('depliee'); setPli(false); });
    SONS.coup();
    const r = pivotDom.current?.getBoundingClientRect();
    if (r) jaillir(r.left + r.width / 2, r.bottom, { n: 24, genre: 'poussiere', couleurs: ['#f0c48f', '#fff4d6'], vitesse: [60, 260], duree: [.5, 1], taille: [1.2, 3] });
  }

  // ── Retourner la feuille : elle pivote en deux temps, et change de face à mi-course ──
  async function retourner(): Promise<void> {
    if (phaseRef.current !== 'feuille') return;
    const j = jeton.current, pivot = pivotDom.current;
    if (!pivot) return;
    aller('retournement');
    SONS.souffle();
    await pivot.animate([{ transform: 'perspective(1800px) rotateY(0deg)' }, { transform: 'perspective(1800px) rotateY(90deg) scale(1.03)' }], { duration: D(260), easing: 'cubic-bezier(.5,0,1,1)' }).finished;
    if (j !== jeton.current) return;
    flushSync(() => setFace((f) => (f === 'verso' ? 'recto' : 'verso')));
    await pivot.animate([{ transform: 'perspective(1800px) rotateY(-90deg) scale(1.03)' }, { transform: 'perspective(1800px) rotateY(0deg)' }], { duration: D(460), easing: 'cubic-bezier(.2,1.3,.4,1)' }).finished;
    if (j !== jeton.current) return;
    SONS.coup();
    aller('feuille');
  }

  // ── La grande révélation, partagée par le résumé ──
  function eclairer(): void { eclair.current?.animate([{ opacity: 0 }, { opacity: .9, offset: .15 }, { opacity: 0 }], { duration: D(700), easing: 'ease-out' }); }

  // ── « Tout révéler » : tous les timbres rejoignent le plateau d'un coup, et l'on passe au résumé ──
  function toutReveler(): void {
    const obtenues = cartesRef.current;
    if (!obtenues.length || !['dechirure', 'sortie', 'feuille', 'retournement'].includes(phaseRef.current)) return;
    jeton.current++;
    geste.current.actif = false;
    const rang = Math.max(...obtenues.filter((_, i) => !reveles[i]).map((o) => RANG_DE_L_ECLAT[eclatDe(o)]), 0);
    flushSync(() => {
      const tous = obtenues.map(() => true);
      setReveles(tous); setPlateau(tous); setPli(false);
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

  // ── Les gestes sur la scène : déchirure au doigt, inclinaison de l'aperçu ──
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
    const el = apercu !== null ? apercuDom.current : null;
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
  const redresser = (): void => { scene.current?.querySelectorAll<HTMLElement>('.c-apercu .c-inclinaison').forEach((t) => { t.style.transform = ''; }); };
  const clavierDeLaScene = (e: ClavierReact<HTMLDivElement>): void => {
    if (phaseRef.current === 'dechirure' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); void dechirerDUnCoup(); }
  };

  // ── Le rendu ──
  const n = cartes?.length ?? 0;
  const courante = cartes?.[apercu ?? 0] ?? null;
  const d = disposition(Math.max(1, n), feuilleEtroite);
  const eventail = (k: number): string => aplati
    ? `translateX(${k * (etroit ? 22 : 46)}%) scale(${etroit ? .46 : .62})`
    : `translateX(${k * (etroit ? 22 : 46)}%) translateY(${Math.abs(k) * 5}%) rotate(${k * 7}deg) scale(${etroit ? .46 : .62})`;
  const milieu = (n - 1) / 2;
  const avantLaSortie = phase === 'ouverture' || phase === 'dechirure' || phase === 'sortie';
  const auResume = phase === 'resume' || (phase === 'fermeture' && plateau.length > 0 && plateau.every(Boolean));
  const feuille = (face: FaceDeLaFeuille, principale: boolean) => cartes && <Feuille cartes={cartes} face={face} etroite={feuilleEtroite} numero={numero} edition={EDITION} dos={dos}
    detaches={detaches} reveles={reveles} reduire={reduit()} onCase={principale ? () => undefined : undefined} />;

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
  else if (phase === 'feuille' && face === 'verso') info = <>
    <p className="c-indice">Détache un timbre, ou retourne la feuille</p>
    <div className="c-actions"><button type="button" className="bouton-dentele" data-action="principal" onClick={() => void retourner()}>Retourner la feuille</button></div>
  </>;
  else if (phase === 'feuille') info = <div className="c-actions">
    <button type="button" className="bouton-dentele" data-action="principal" onClick={toutReveler}>Tout détacher</button>
    <button type="button" className="bouton-dentele bouton-dentele--filet" onClick={() => void retourner()}>Retourner la feuille</button>
  </div>;
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
        {cartes && !auResume && <div className="c-feuille" ref={feuilleDom} key={`feuille-${tentative}`} data-etat={etatFeuille}
          style={{ '--fe-ratio': (d.largeur / d.hauteur).toFixed(4) } as CSSProperties}>
          <div className="c-feuille__inclinaison" ref={inclinaisonDom}>
            <div className="c-feuille__pivot" ref={pivotDom}>
              {feuille(face, true)}
              {pli && <div className="c-feuille__volet" ref={voletDom} inert aria-hidden="true">{feuille('verso', false)}</div>}
            </div>
          </div>
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
        {Array.from({ length: cartes?.length ?? 6 }, (_, i) => <button key={`${tentative}-${i}`} type="button" tabIndex={-1}
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
