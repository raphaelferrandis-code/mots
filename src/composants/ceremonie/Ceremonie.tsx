// La cérémonie d'ouverture d'un paquet : la feuille de timbres (brief du 26/09/2026, prototype-ouverture-feuille.html).
// Déroulé : ouverture → déchirure → sortie (la feuille pliée monte du paquet, puis se déplie) → feuille, d'où l'on
// détache les timbres un à un ou que l'on retourne (cascade de tampons) → fin : la feuille vide s'en va, le plateau
// s'agrandit, le résumé. Deux façons de détacher (décision de Raphaël) : prendre son temps et suivre les pointillés
// (gros plan, fiche, « Ranger ce timbre »), ou aller vite d'un clic (le timbre se retourne sur place et file dans le
// plateau ; on peut cliquer le suivant aussitôt). Un clic, une action.
//
// Le tirage est fait par le serveur dès le clic, pendant que le paquet vient se placer : la cérémonie ne fait
// qu'afficher un résultat déjà décidé et enregistré. Détacher un timbre est purement visuel ; fermer en cours de route
// ne perd donc rien. Les animations sont pilotées à la main (Web Animations) ; un jeton les arrête si l'on ferme.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ClavierReact, PointerEvent as PointeurReact } from 'react';
import { createPortal, flushSync } from 'react-dom';
import type { CarteObtenue } from '../../jeu/partie.ts';
import { EDITION } from '../../services/cartes.ts';
import { Timbre } from '../timbre/Timbre.tsx';
import { PaquetDeCeremonie, MASQUE_DU_PAQUET } from './PaquetDeCeremonie.tsx';
import { Feuille, useEcranEtroit } from './Feuille.tsx';
import type { FaceDeLaFeuille } from './Feuille.tsx';
import { PARTS_DU_TOUR, SEUIL_DU_DETACHEMENT, avancement, caseDuTimbre, disposition, melanger, parcourir, pointDuTour, surLeTour, traceDesParts } from './feuille.ts';
import { Particules, SONS } from './effets.ts';
import { ABREGE_DE_LA_NATURE, COULEURS_DE_LA_LUEUR, NOM_DE_LA_FINITION, RANG_DE_L_ECLAT, bilanDuPaquet, eclatDe, gainsDuPaquet, lueurDuPaquet, ordreDuResume, titreDuResume } from './eclats.ts';
import { useRacineInerte } from '../useRacineInerte.ts';
import { MomentsDeProgres, useRecompensesDuMoment } from '../Recompenses.tsx';
import { mouvementReduit } from '../mouvement.ts';
import { messageDe } from '../../partage/messages.ts';
import './ceremonie.css';

type Phase = 'ouverture' | 'dechirure' | 'sortie' | 'feuille' | 'retournement' | 'gros-plan' | 'rangement' | 'tout-detacher' | 'fin' | 'resume' | 'fermeture';
// La feuille : cachée derrière le paquet, pliée en deux (seule sa moitié haute se voit), puis dépliée.
type EtatDeLaFeuille = 'cachee' | 'pliee' | 'depliee';
// Le timbre détaché, au premier plan : la face qu'il montre, s'il était déjà révélé, et si sa fiche est affichée.
type GrosPlan = { i: number; face: FaceDeLaFeuille; dejaRevele: boolean; fiche: boolean };
// Un timbre détaché d'un clic, à sa place d'origine à l'écran, le temps de se retourner et de filer dans le plateau.
type Volant = { i: number; cadre: { left: number; top: number; width: number; height: number }; face: FaceDeLaFeuille; dejaRevele: boolean };

// Ce que la page reçoit au rangement : les timbres et leur place à l'écran, pour les faire voler jusqu'à l'album.
export type Envol = { cartes: CarteObtenue[]; places: DOMRect[] };

type Props = {
  premier: Promise<CarteObtenue[]>; // le tirage lancé au clic (jamais depuis la cérémonie : un seul tirage par geste)
  premiersJours?: ReadonlySet<string>; // les timbres qui inaugurent une rareté de l'album : cachet « Premier jour »
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
const entre = (a: number, b: number): number => a + Math.random() * (b - a);
const AUCUN: ReadonlySet<string> = new Set();

export function Ceremonie({ premier, premiersJours = AUCUN, tirer, continuer, reserve, numero = 1, depuis, modelePaquet, dos, sons, onSons, reduire, onFermer, onRanger, onErreur }: Props) {
  useRacineInerte();
  const [phase, setPhase] = useState<Phase>('ouverture');
  // Au résumé, le niveau et les succès gagnés avec ce paquet s’y affichent (au lieu du bandeau, après coup).
  const progres = useRecompensesDuMoment(phase === 'resume');
  // La feuille passe en 2 colonnes × 3 rangées sous 700 px.
  const feuilleEtroite = useEcranEtroit();
  const [cartes, setCartes] = useState<CarteObtenue[] | null>(null);
  const [face, setFaceEtat] = useState<FaceDeLaFeuille>('verso');
  const [etatFeuille, setEtatFeuille] = useState<EtatDeLaFeuille>('cachee');
  const [pli, setPli] = useState(false); // le volet du dépliage est à l'écran
  const [detaches, setDetachesEtat] = useState<boolean[]>([]);
  const [reveles, setRevelesEtat] = useState<boolean[]>([]);
  const [rangement, setRangementEtat] = useState<number[]>([]); // les timbres du plateau, dans l'ordre où ils y sont arrivés, puis, au résumé, du moins rare au plus rare
  const [grosPlan, setGrosPlanEtat] = useState<GrosPlan | null>(null);
  const [apercu, setApercu] = useState<number | null>(null);
  // Détachés d'un clic : les timbres qui se retournent sur place puis filent dans le plateau, et le dernier révélé.
  const [volants, setVolants] = useState<Volant[]>([]);
  const [dernier, setDernier] = useState<number | null>(null);
  const [tentative, setTentative] = useState(0);
  // Un paquet d'exception : sa lueur se voit dès que le paquet arrive (eclats.ts).
  const lueur = cartes ? lueurDuPaquet(cartes) : null;

  const scene = useRef<HTMLDivElement>(null);
  const emballage = useRef<HTMLDivElement>(null);
  const feuilleDom = useRef<HTMLDivElement>(null);
  const inclinaisonDom = useRef<HTMLDivElement>(null);
  const pivotDom = useRef<HTMLDivElement>(null);
  const voletDom = useRef<HTMLDivElement>(null);
  const traitDom = useRef<SVGPathElement>(null);
  const grosPlanDom = useRef<HTMLButtonElement>(null);
  const ficheDom = useRef<HTMLDivElement>(null);
  const cases = useRef<(HTMLButtonElement | null)[]>([]);
  const apercuDom = useRef<HTMLButtonElement>(null);
  const eclair = useRef<HTMLDivElement>(null);
  const toile = useRef<HTMLCanvasElement>(null);
  const infos = useRef<HTMLDivElement>(null);
  const particules = useRef<Particules | null>(null);
  const jeton = useRef(0);
  const phaseRef = useRef<Phase>('ouverture');
  const cartesRef = useRef<CarteObtenue[]>([]);
  // Les mêmes états, lisibles depuis les animations en cours (qui survivent aux rendus).
  const etat = useRef({ face: 'verso' as FaceDeLaFeuille, detaches: [] as boolean[], reveles: [] as boolean[], rangement: [] as number[], grosPlan: null as GrosPlan | null });
  const geste = useRef({ p: 0, actif: false, x: 0, cumul: 0 });
  // Le geste « suivre les pointillés » : la case, la dernière position sur son tour, le chemin parcouru.
  const gesteCase = useRef<{ i: number; t: number | null; trajet: number; x: number; y: number; fibres: number } | null>(null);
  const arrachages = useRef(new Map<number, boolean[]>()); // les pointillés déjà arrachés, case par case
  const retourALaFeuille = useRef<'principal' | 'case'>('principal');
  const cascadeFaite = useRef(false); // la cascade de tampons n'a lieu qu'au premier passage au recto
  const enCours = useRef(new Set<number>()); // les timbres détachés d'un clic, pas encore arrivés dans le plateau
  const volantsDom = useRef(new Map<number, HTMLDivElement>());
  const pointeur = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 3 });
  const penche = useRef({ rx: 0, ry: 0 });

  const reduit = (): boolean => reduire || mouvementReduit();
  const D = (ms: number): number => (reduit() ? 1 : ms);
  const attendre = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, reduit() ? Math.min(ms, 40) : ms));
  const aller = (p: Phase): void => { phaseRef.current = p; setPhase(p); };
  const jaillir: Particules['jaillir'] = (x, y, options) => particules.current?.jaillir(x, y, options);
  const dans = <T extends Element>(racine: Element | null | undefined, selecteur: string): T | null => racine?.querySelector<T>(selecteur) ?? null;
  const setFace = (f: FaceDeLaFeuille): void => { etat.current.face = f; setFaceEtat(f); };
  const setDetaches = (v: boolean[]): void => { etat.current.detaches = v; setDetachesEtat(v); };
  const setReveles = (v: boolean[]): void => { etat.current.reveles = v; setRevelesEtat(v); };
  const setRangement = (v: number[]): void => { etat.current.rangement = v; setRangementEtat(v); };
  const setGrosPlan = (g: GrosPlan | null): void => { etat.current.grosPlan = g; setGrosPlanEtat(g); };
  const avec = (liste: boolean[], i: number): boolean[] => liste.map((v, k) => v || k === i);
  const caseDom = (i: number): HTMLElement | null => dans<HTMLElement>(pivotDom.current, `:scope > .fe .fe__case[data-i="${i}"]`);

  // Les gestionnaires installés une fois pour toutes (clavier) appellent toujours la dernière version des actions.
  const actions = useRef({ echap: (): void => undefined, caseTouchee: (_i: number, _parClavier: boolean): void => undefined });
  // Toujours la même fonction pour la feuille (mémorisée) : elle appelle la dernière version de l'action.
  const caseTouchee = useCallback((i: number, parClavier: boolean) => actions.current.caseTouchee(i, parClavier), []);
  actions.current.echap = (): void => { if (phaseRef.current === 'gros-plan') void rangerLeTimbre(); else fermer(); };

  useEffect(() => { SONS.muet = !sons; }, [sons]);

  // ── Mise en place : particules, clavier, suivi du pointeur (la page derrière est inerte : useRacineInerte) ──
  useEffect(() => {
    document.body.classList.add('ceremonie-ouverte');
    if (toile.current) particules.current = new Particules(toile.current, reduit);
    const ajuster = (): void => particules.current?.ajuster();
    const suivre = (e: PointerEvent): void => { pointeur.current = { x: e.clientX, y: e.clientY }; };
    const echap = (e: KeyboardEvent): void => { if (e.key === 'Escape') actions.current.echap(); };
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

  // Tant qu'on ne l'a pas déchiré, un paquet d'exception laisse filer des étincelles par sa fente.
  useEffect(() => {
    if (phase !== 'dechirure' || !lueur || reduit()) return;
    const minuterie = window.setInterval(() => {
      const r = dans<HTMLElement>(emballage.current, '.cp__fente')?.getBoundingClientRect();
      if (r?.width && !document.hidden) jaillir(r.left + r.width * entre(.12, .88), r.top + r.height * .09, { n: 2, genre: 'etincelle', couleurs: COULEURS_DE_LA_LUEUR[lueur], vitesse: [20, 110], duree: [.7, 1.5], taille: [1, 2.4], ouverture: 1.6, g: -40 });
    }, 160);
    return () => window.clearInterval(minuterie);
  }, [phase, lueur, tentative]);

  // La feuille posée s'incline doucement vers le pointeur (souris seulement), et se redresse pendant un geste.
  useEffect(() => {
    if (etatFeuille !== 'depliee' || reduit() || !window.matchMedia('(hover: hover)').matches) return;
    let cadre = 0;
    const p = { rx: 0, ry: 0 };
    const boucle = (): void => {
      const el = inclinaisonDom.current, r = feuilleDom.current?.getBoundingClientRect();
      if (el && r?.width && !document.hidden) {
        const libre = phaseRef.current === 'feuille' && !gesteCase.current;
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

  // Le clavier suit le bouton principal de chaque moment ; après un rangement, il revient sur la feuille.
  useEffect(() => {
    // Le paquet à déchirer reçoit le focus : Entrée le déchire d'un coup.
    if (phase === 'dechirure') scene.current?.focus({ preventScroll: true });
    if (phase === 'feuille') {
      const cible = retourALaFeuille.current === 'case' ? dans<HTMLElement>(pivotDom.current, ':scope > .fe .fe__case[data-i]') : dans<HTMLElement>(infos.current, '[data-action="principal"]');
      cible?.focus({ preventScroll: true });
      retourALaFeuille.current = 'principal';
    }
    if (phase === 'resume' && apercu === null) dans<HTMLButtonElement>(infos.current, '[data-action="ranger"]')?.focus({ preventScroll: true });
    if (apercu !== null) apercuDom.current?.focus({ preventScroll: true });
  }, [phase, apercu]);

  // Les pointillés arrachés se redessinent quand la feuille change (face, timbre détaché, nouveau paquet).
  useEffect(() => dessinerLesArrachages(), [face, detaches, tentative, feuilleEtroite]);

  // ── Ouverture : le paquet arrive pendant que le serveur tire son contenu ──
  async function demarrer(origine: DOMRect | null, promesse: Promise<CarteObtenue[]> = tirer()): Promise<void> {
    const j = ++jeton.current;
    promesse.catch(() => undefined);
    geste.current = { p: 0, actif: false, x: 0, cumul: 0 };
    gesteCase.current = null;
    arrachages.current.clear();
    cascadeFaite.current = false;
    enCours.current.clear();
    cartesRef.current = [];
    flushSync(() => {
      setCartes(null); setFace('verso'); setEtatFeuille('cachee'); setPli(false);
      setDetaches([]); setReveles([]); setRangement([]); setGrosPlan(null); setApercu(null); setVolants([]); setDernier(null);
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
      setDetaches(places.map(() => false)); setReveles(places.map(() => false));
      aller('dechirure');
    });
    // Un paquet d'exception s'annonce avant qu'on le déchire : sa lueur apparaît, et elle tinte.
    if (lueurDuPaquet(places)) SONS.scintillement();
  }

  // ── La déchirure du paquet ──
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
    // Paquet d'exception : la lumière retenue jaillit de la fente.
    const signe = lueurDuPaquet(cartesRef.current);
    const fente = dans<HTMLElement>(emballage.current, '.cp__fente');
    const fr = fente?.getBoundingClientRect();
    if (signe && fente && fr) {
      fente.animate([{ opacity: 1, transform: 'scaleY(1)' }, { opacity: 1, transform: 'scaleY(2.2)', offset: .25 }, { opacity: 0, transform: 'scaleY(1.5)' }], { duration: D(900), easing: 'ease-out', fill: 'forwards' });
      jaillir(fr.left + fr.width / 2, fr.top + fr.height / 2, { n: 80, genre: 'etincelle', couleurs: COULEURS_DE_LA_LUEUR[signe], vitesse: [140, 560], duree: [.6, 1.4], taille: [1.2, 2.8], ouverture: 2.6 });
      SONS.carillon(3);
    }
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
    jaillir(pr.left + pr.width / 2, pr.top + pr.height * .12, { n: signe ? 90 : 40, genre: 'poussiere', couleurs: signe ? COULEURS_DE_LA_LUEUR[signe] : ['#ffe3b0', '#f0c48f', '#fff8e8'], vitesse: [40, 220], ouverture: 1.7, duree: [.8, 1.6], frein: .94, taille: [1.2, 3] });
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

  // Un bouton touché pendant que des timbres détachés d'un clic sont encore en l'air : il attend qu'ils soient rangés.
  // Rend faux si la cérémonie a changé entre-temps (fermée, paquet suivant, autre action).
  async function apresLesEnvols(): Promise<boolean> {
    const j = jeton.current;
    while (enCours.current.size) {
      await new Promise((r) => setTimeout(r, 50));
      if (j !== jeton.current) return false;
    }
    return phaseRef.current === 'feuille';
  }

  // ── Retourner la feuille : elle pivote en deux temps, et change de face à mi-course ──
  async function retourner(): Promise<void> {
    if (phaseRef.current !== 'feuille' || !(await apresLesEnvols())) return;
    const j = jeton.current, pivot = pivotDom.current;
    if (!pivot) return;
    aller('retournement');
    SONS.souffle();
    await pivot.animate([{ transform: 'perspective(1800px) rotateY(0deg)' }, { transform: 'perspective(1800px) rotateY(90deg) scale(1.03)' }], { duration: D(260), easing: 'cubic-bezier(.5,0,1,1)' }).finished;
    if (j !== jeton.current) return;
    // Les pointillés à moitié arrachés ne suivent pas la feuille retournée : elle repart intacte.
    arrachages.current.clear();
    pivot.querySelectorAll<HTMLElement>(':scope > .fe .fe__case').forEach((el) => { el.style.transform = ''; });
    flushSync(() => setFace(etat.current.face === 'verso' ? 'recto' : 'verso'));
    await pivot.animate([{ transform: 'perspective(1800px) rotateY(-90deg) scale(1.03)' }, { transform: 'perspective(1800px) rotateY(0deg)' }], { duration: D(460), easing: 'cubic-bezier(.2,1.3,.4,1)' }).finished;
    if (j !== jeton.current) return;
    SONS.coup();
    if (etat.current.face === 'recto' && !cascadeFaite.current) {
      cascadeFaite.current = true;
      await cascade();
      if (j !== jeton.current) return;
    }
    aller('feuille');
  }

  // ── La cascade de tampons : au premier passage au recto, chaque timbre encore vierge reçoit son cachet, du plus
  // courant au plus rare ; la Légendaire ou la Hors-série arrive en dernier, après un temps de suspense et un éclair ──
  async function cascade(): Promise<void> {
    const j = jeton.current;
    const ordre = cartesRef.current.map((o, i) => ({ i, rang: RANG_DE_L_ECLAT[eclatDe(o)] }))
      .filter(({ i }) => !etat.current.detaches[i] && !etat.current.reveles[i])
      .sort((a, b) => a.rang - b.rang);
    await attendre(160);
    for (const { i, rang } of ordre) {
      if (j !== jeton.current) return;
      const cellule = caseDom(i), timbre = dans<HTMLElement>(cellule, '.tb');
      if (!cellule || !timbre) continue;
      if (rang === 3) {
        await attendre(260);
        if (j !== jeton.current) return;
        SONS.montee(1);
        await timbre.animate(Array.from({ length: 12 }, (_, k) => ({ transform: `translate(${(entre(-1, 1) * k * .5).toFixed(1)}px,${(entre(-1, 1) * k * .5).toFixed(1)}px)` })), { duration: D(900), easing: 'ease-in' }).finished;
        if (j !== jeton.current) return;
        eclairer();
      }
      await tamponnerEtCelebrer(timbre, rang);
      if (j !== jeton.current) return;
      setReveles(avec(etat.current.reveles, i));
      await attendre(rang ? 520 : 330);
    }
  }

  // Le coup de tampon sur un timbre posé (feuille, envol d'un clic) et l'effet de sa rareté : reflet doré, étincelles,
  // ou confettis et carillon d'une grande révélation.
  async function tamponnerEtCelebrer(timbre: HTMLElement, rang: number): Promise<void> {
    const j = jeton.current;
    const r = timbre.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    tamponner(dans(timbre, '.tb__recto .tb__cachet'));
    SONS.coup();
    timbre.animate([{ transform: 'scale(1)' }, { transform: 'scale(.95)' }, { transform: 'scale(1)' }], { duration: D(220) });
    if (rang === 1) {
      SONS.carillon(1);
      jaillir(cx, cy, { n: 28, genre: 'poussiere', couleurs: ['#ffe1a8', '#f0c48f', '#fff4d6'], vitesse: [50, 240], duree: [.6, 1.2] });
      dans<HTMLElement>(timbre, '.tb__recto .tb__vernis')?.animate([{ backgroundPosition: '100% 50%' }, { backgroundPosition: '0% 50%' }], { duration: D(900), easing: 'ease-in-out' });
    } else if (rang === 2) {
      SONS.scintillement(); SONS.carillon(2);
      jaillir(cx, cy, { n: 50, genre: 'etincelle', couleurs: ['#ff7aa2', '#ffe07a', '#8dffc0', '#7fd8ff', '#c49bff'], vitesse: [120, 460], duree: [.5, 1.1], taille: [1.2, 2.4] });
    } else if (rang === 3) {
      SONS.eclat();
      jaillir(cx, cy, { n: 110, genre: 'confetti', couleurs: ['#f0c48f', '#d7263f', '#f6ecd6', '#3557a8'], vitesse: [200, 700], g: 700, duree: [1.3, 2.4], taille: [5, 10], frein: .97 });
      await attendre(380);
      if (j !== jeton.current) return;
      SONS.carillon(3);
    }
  }

  // ── Détacher un timbre en suivant ses pointillés ──
  // Les pointillés arrachés : un trait sombre qui relie les trous, sur la face visible.
  function dessinerLesArrachages(): void {
    const trait = traitDom.current;
    if (!trait) return;
    const d = disposition(Math.max(1, cartesRef.current.length), feuilleEtroite);
    let chemin = '';
    for (const [i, parts] of arrachages.current) chemin += traceDesParts(caseDuTimbre(i, d, etat.current.face === 'verso'), parts);
    trait.setAttribute('d', chemin);
  }
  // Le timbre à moitié arraché se soulève un peu.
  function soulever(i: number, p: number): void {
    const el = caseDom(i);
    if (el) el.style.transform = p > 0 ? `translate(${(-p * 3).toFixed(1)}px, ${(-p * 6).toFixed(1)}px) rotate(${(-p * 1.6).toFixed(2)}deg)` : '';
  }
  // La case sous le doigt, ou celle dont le bord passe tout près (on peut commencer sur les pointillés). Entre deux
  // timbres voisins, celui dont on a déjà commencé à arracher les pointillés l'emporte.
  function caseSousLePointeur(x: number, y: number): number | null {
    let choisie: number | null = null, meilleure = Infinity;
    pivotDom.current?.querySelectorAll<HTMLElement>(':scope > .fe .fe__case[data-i]').forEach((el) => {
      if (enCours.current.has(Number(el.dataset.i))) return;
      const r = el.getBoundingClientRect(), marge = Math.max(14, .2 * Math.min(r.width, r.height));
      const dedans = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      const distance = dedans ? 0 : surLeTour(x, y, r).distance;
      const note = distance - (arrachages.current.has(Number(el.dataset.i)) ? marge : 0);
      if (distance <= marge && note < meilleure) { meilleure = note; choisie = Number(el.dataset.i); }
    });
    return choisie;
  }
  function suivreLesPointilles(x: number, y: number): void {
    const g = gesteCase.current;
    if (!g) return;
    const el = caseDom(g.i), r = el?.getBoundingClientRect();
    g.trajet += Math.hypot(x - g.x, y - g.y);
    g.x = x; g.y = y;
    if (!r?.width) return;
    const { t, distance } = surLeTour(x, y, r);
    if (distance > Math.max(14, .2 * Math.min(r.width, r.height))) { g.t = null; return; }
    const parts = arrachages.current.get(g.i) ?? Array<boolean>(PARTS_DU_TOUR).fill(false);
    arrachages.current.set(g.i, parts);
    const nouvelles = parcourir(parts, g.t, t);
    g.t = t;
    if (!nouvelles) return;
    g.fibres += nouvelles;
    SONS.grain(.7);
    if (g.fibres >= 2) { g.fibres = 0; jaillir(x, y, { n: 3, genre: 'fibre', couleurs: ['#f6ead2', '#e8dcc0'], vitesse: [30, 130], taille: [2, 4], g: 500, duree: [.4, .9] }); }
    const p = avancement(parts);
    dessinerLesArrachages();
    soulever(g.i, p);
    if (p >= SEUIL_DU_DETACHEMENT) {
      gesteCase.current = null;
      void detacher(g.i);
    }
  }
  // ── Le chemin rapide : un clic, un toucher ou Entrée. Les pointillés s'arrachent en un éclair, le timbre se soulève,
  // se retourne sur place, reçoit son tampon, puis file dans la case suivante du plateau. Rien n'attend : on peut
  // cliquer le timbre suivant aussitôt. ──
  async function detacherVite(i: number): Promise<void> {
    if (phaseRef.current !== 'feuille' || etat.current.detaches[i] || enCours.current.has(i)) return;
    const j = jeton.current, el = caseDom(i);
    if (!el) return;
    enCours.current.add(i);
    const parts = arrachages.current.get(i) ?? Array<boolean>(PARTS_DU_TOUR).fill(false);
    arrachages.current.set(i, parts);
    const t0 = performance.now(), duree = D(260);
    await new Promise<void>((fin) => {
      const pas = (maintenant: number): void => {
        if (j !== jeton.current) { fin(); return; }
        const k = Math.min(1, (maintenant - t0) / duree), jusqua = Math.floor(k * PARTS_DU_TOUR);
        for (let n = 0; n < jusqua; n++) parts[n] = true;
        const r = el.getBoundingClientRect(), [x, y] = pointDuTour({ x: r.left, y: r.top, l: r.width, h: r.height }, k);
        if (Math.random() < .6) { SONS.grain(.8); jaillir(x, y, { n: 2, genre: 'fibre', couleurs: ['#f6ead2', '#e8dcc0'], vitesse: [30, 130], taille: [2, 4], g: 500, duree: [.4, .9] }); }
        dessinerLesArrachages();
        soulever(i, avancement(parts));
        if (k < 1) requestAnimationFrame(pas); else fin();
      };
      requestAnimationFrame(pas);
    });
    if (j !== jeton.current) return;

    // Le timbre quitte la feuille (un trou à sa place) et reste un instant là où il était.
    const r = el.getBoundingClientRect();
    const depuisLeVerso = etat.current.face === 'verso', dejaRevele = etat.current.reveles[i];
    const rang = RANG_DE_L_ECLAT[eclatDe(cartesRef.current[i])];
    SONS.dechirure();
    arrachages.current.delete(i);
    el.style.transform = '';
    const avaitLeFocus = document.activeElement === el;
    flushSync(() => {
      setDetaches(avec(etat.current.detaches, i));
      setVolants((v) => [...v, { i, cadre: { left: r.left, top: r.top, width: r.width, height: r.height }, face: depuisLeVerso && !dejaRevele ? 'verso' : 'recto', dejaRevele }]);
    });
    dessinerLesArrachages();
    // Au clavier, la case détachée devient un trou : le focus passe au timbre suivant (ou au bouton principal).
    if (avaitLeFocus) {
      const restantes = Array.from(pivotDom.current?.querySelectorAll<HTMLElement>(':scope > .fe .fe__case[data-i]') ?? []).filter((c) => !enCours.current.has(Number(c.dataset.i)));
      (restantes.find((c) => Number(c.dataset.i) > i) ?? restantes[0] ?? dans<HTMLElement>(infos.current, '[data-action="principal"]'))?.focus({ preventScroll: true });
    }
    const volant = volantsDom.current.get(i), retourne = dans<HTMLElement>(volant, '.c-retourne');
    if (!volant || !retourne) { enCours.current.delete(i); return; }
    await volant.animate([{ transform: 'none' }, { transform: 'translateY(-10px) scale(1.08)' }], { duration: D(120), easing: 'ease-out', fill: 'forwards' }).finished;
    if (j !== jeton.current) return;
    if (!dejaRevele) {
      if (depuisLeVerso) {
        SONS.souffle();
        await retourne.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(90deg)' }], { duration: D(110), easing: 'cubic-bezier(.5,0,1,1)' }).finished;
        if (j !== jeton.current) return;
        flushSync(() => setVolants((v) => v.map((x) => (x.i === i ? { ...x, face: 'recto' } : x))));
        if (rang === 3) eclairer();
        await retourne.animate([{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0deg)' }], { duration: D(220), easing: 'cubic-bezier(.2,1.4,.4,1)' }).finished;
        if (j !== jeton.current) return;
      }
      const timbre = dans<HTMLElement>(volant, '.tb');
      if (timbre) await tamponnerEtCelebrer(timbre, rang);
      if (j !== jeton.current) return;
      setReveles(avec(etat.current.reveles, i));
    }
    setDernier(i);
    await attendre(rang === 3 ? 700 : 420);
    if (j !== jeton.current) return;

    // Puis il file dans la case suivante du plateau.
    const de = dans<HTMLElement>(volant, '.tb')?.getBoundingClientRect();
    const k = etat.current.rangement.length;
    flushSync(() => {
      setRangement([...etat.current.rangement, i]);
      setVolants((v) => v.filter((x) => x.i !== i));
    });
    volantsDom.current.delete(i);
    const vignette = dans<HTMLElement>(cases.current[k], '.tb');
    if (vignette && de) {
      SONS.bulle();
      const vers = vignette.getBoundingClientRect();
      vignette.style.transformOrigin = '0 0';
      await vignette.animate([{ transform: `translate(${de.left - vers.left}px,${de.top - vers.top}px) scale(${de.width / vers.width})` }, { transform: 'none' }], { duration: D(460), easing: 'cubic-bezier(.3,.9,.3,1)' }).finished;
    }
    enCours.current.delete(i);
    if (j !== jeton.current) return;
    if (!enCours.current.size && phaseRef.current === 'feuille' && etat.current.rangement.length >= cartesRef.current.length) await finDuPaquet();
  }

  // Le timbre se détache : fibres le long des perforations, il laisse un trou et s'envole au premier plan.
  async function detacher(i: number): Promise<void> {
    if (phaseRef.current !== 'feuille' || etat.current.detaches[i] || enCours.current.has(i)) return;
    const j = jeton.current, el = caseDom(i);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const depuisLeVerso = etat.current.face === 'verso', dejaRevele = etat.current.reveles[i];
    aller('gros-plan');
    for (let k = 0; k < 20; k++) {
      const [x, y] = pointDuTour({ x: r.left, y: r.top, l: r.width, h: r.height }, k / 20);
      jaillir(x, y, { n: 2, genre: 'fibre', couleurs: ['#f6ead2', '#e8dcc0'], vitesse: [30, 140], taille: [2, 4.5], g: 500, duree: [.4, .9] });
    }
    SONS.dechirure();
    arrachages.current.delete(i);
    el.style.transform = '';
    flushSync(() => {
      setDetaches(avec(etat.current.detaches, i));
      setGrosPlan({ i, face: depuisLeVerso && !dejaRevele ? 'verso' : 'recto', dejaRevele, fiche: false });
    });
    dessinerLesArrachages();
    const slot = grosPlanDom.current;
    if (!slot) return;
    // L'envol : de la case jusqu'au centre, le timbre se soulève, part en tournant un peu, se pose.
    const vers = slot.getBoundingClientRect(), k = r.width / vers.width, dx = r.left - vers.left, dy = r.top - vers.top;
    const leve = `translate(${(dx - r.width * .02).toFixed(1)}px,${(dy - 12).toFixed(1)}px) rotate(-4deg) scale(${(k * 1.05).toFixed(4)})`;
    slot.style.transformOrigin = '0 0';
    await slot.animate([{ transform: `translate(${dx}px,${dy}px) scale(${k})` }, { transform: leve }], { duration: D(200), easing: 'ease-out' }).finished;
    if (j !== jeton.current) return;
    SONS.souffle();
    await slot.animate([{ transform: leve }, { transform: 'rotate(3deg) scale(1.04)', offset: .8 }, { transform: 'none' }], { duration: D(720), easing: 'cubic-bezier(.3,.8,.25,1)' }).finished;
    if (j !== jeton.current) return;
    slot.style.transformOrigin = '';
    if (!dejaRevele) await reveler(i, depuisLeVerso);
    else if (eclatDe(cartesRef.current[i]) === 'holo') SONS.scintillement();
    if (j !== jeton.current) return;
    const g = etat.current.grosPlan;
    if (g) flushSync(() => setGrosPlan({ ...g, fiche: true }));
    dans<HTMLButtonElement>(ficheDom.current, '[data-action="ranger-timbre"]')?.focus({ preventScroll: true });
  }

  // ── La révélation au premier plan : s'il vient du verso, le timbre (s'il est rare, après avoir tremblé) se retourne ;
  // puis le coup de tampon et l'effet de sa rareté ──
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
    grosPlanDom.current?.parentElement?.animate(images, { duration: D(460) });
  }
  async function reveler(i: number, retournement: boolean): Promise<void> {
    const j = jeton.current, obtenue = cartesRef.current[i], slot = grosPlanDom.current;
    const retourne = dans<HTMLElement>(slot, '.c-retourne');
    if (!obtenue || !slot || !retourne) return;
    const rang = RANG_DE_L_ECLAT[eclatDe(obtenue)];
    if (retournement) {
      if (rang >= 2) {
        SONS.montee(rang === 3 ? 1.1 : .7);
        await retourne.animate(secousse(rang), { duration: D(rang === 3 ? 1100 : 700), easing: 'ease-in' }).finished;
        if (j !== jeton.current) return;
      }
      SONS.souffle();
      await retourne.animate([{ transform: 'rotateY(0deg) scale(1)' }, { transform: 'rotateY(90deg) scale(1.1)' }], { duration: D(170), easing: 'cubic-bezier(.5,0,1,1)' }).finished;
      if (j !== jeton.current) return;
      const g = etat.current.grosPlan;
      if (g) flushSync(() => setGrosPlan({ ...g, face: 'recto' }));
      if (rang === 3) { eclairer(); secouerLaScene(); }
      await retourne.animate([{ transform: 'rotateY(-90deg) scale(1.1)' }, { transform: 'rotateY(0deg) scale(1)' }], { duration: D(rang ? 440 : 300), easing: 'cubic-bezier(.2,1.4,.4,1)' }).finished;
      if (j !== jeton.current) return;
    }
    await attendre(90);
    if (j !== jeton.current) return;
    tamponner(dans(slot, '.tb__recto .tb__cachet')); SONS.coup();
    setReveles(avec(etat.current.reveles, i));
    retourne.animate([{ transform: 'scale(1)' }, { transform: 'scale(.965) translateY(3px)' }, { transform: 'scale(1)' }], { duration: D(230) });
    const r = slot.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (rang === 1) {
      SONS.carillon(1);
      jaillir(cx, cy, { n: 44, genre: 'poussiere', couleurs: ['#ffe1a8', '#f0c48f', '#fff4d6'], vitesse: [60, 340], duree: [.7, 1.5] });
      dans<HTMLElement>(slot, '.tb__recto .tb__vernis')?.animate([{ backgroundPosition: '100% 50%' }, { backgroundPosition: '0% 50%' }], { duration: D(1000), easing: 'ease-in-out' });
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
  }

  // ── « Ranger ce timbre » : il quitte le premier plan pour la case suivante du plateau ──
  async function rangerLeTimbre(): Promise<void> {
    const g = etat.current.grosPlan;
    if (phaseRef.current !== 'gros-plan' || !g?.fiche) return;
    const j = jeton.current;
    const source = dans<HTMLElement>(grosPlanDom.current, '.tb')?.getBoundingClientRect();
    const k = etat.current.rangement.length;
    aller('rangement');
    flushSync(() => { setRangement([...etat.current.rangement, g.i]); setGrosPlan(null); });
    const vignette = dans<HTMLElement>(cases.current[k], '.tb');
    if (vignette && source) {
      SONS.bulle();
      const vers = vignette.getBoundingClientRect();
      vignette.style.transformOrigin = '0 0';
      await vignette.animate([{ transform: `translate(${source.left - vers.left}px,${source.top - vers.top}px) scale(${source.width / vers.width})` }, { transform: 'none' }], { duration: D(560), easing: 'cubic-bezier(.3,.9,.3,1)' }).finished;
    }
    if (j !== jeton.current) return;
    if (!enCours.current.size && etat.current.rangement.length >= cartesRef.current.length) { await finDuPaquet(); return; }
    retourALaFeuille.current = 'case';
    aller('feuille');
  }

  // ── « Tout détacher » (au recto) : les timbres restants partent un à un vers le plateau, avec la déchirure ──
  async function toutDetacher(): Promise<void> {
    if (phaseRef.current !== 'feuille' || etat.current.face !== 'recto' || !(await apresLesEnvols())) return;
    const j = jeton.current;
    aller('tout-detacher');
    const restants = cartesRef.current.map((_, i) => i).filter((i) => !etat.current.detaches[i]);
    for (const i of restants) {
      const el = caseDom(i);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      for (let k = 0; k < 20; k++) {
        const [x, y] = pointDuTour({ x: r.left, y: r.top, l: r.width, h: r.height }, k / 20);
        jaillir(x, y, { n: 2, genre: 'fibre', couleurs: ['#f6ead2', '#e8dcc0'], vitesse: [30, 140], taille: [2, 4.5], g: 500, duree: [.4, .9] });
      }
      SONS.dechirure();
      arrachages.current.delete(i);
      const k = etat.current.rangement.length;
      flushSync(() => {
        setDetaches(avec(etat.current.detaches, i));
        setReveles(avec(etat.current.reveles, i));
        setRangement([...etat.current.rangement, i]);
      });
      dessinerLesArrachages();
      const vignette = dans<HTMLElement>(cases.current[k], '.tb');
      if (vignette) {
        const vers = vignette.getBoundingClientRect();
        vignette.style.transformOrigin = '0 0';
        vignette.animate([{ transform: `translate(${r.left - vers.left}px,${r.top - vers.top}px) scale(${r.width / vers.width}) rotate(-6deg)` }, { transform: 'none' }], { duration: D(620), easing: 'cubic-bezier(.3,.9,.3,1)' });
      }
      await attendre(230);
      if (j !== jeton.current) return;
    }
    await attendre(500);
    if (j !== jeton.current) return;
    await finDuPaquet();
  }

  // ── La fin du paquet : la feuille vide s'en va, le plateau s'agrandit au milieu de la scène, le résumé s'affiche ──
  async function finDuPaquet(): Promise<void> {
    const j = jeton.current, feuille = feuilleDom.current;
    aller('fin');
    if (feuille) {
      SONS.souffle();
      await feuille.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(40px) rotate(-3deg) scale(.92)' }], { duration: D(600), easing: 'ease-in', fill: 'forwards' }).finished;
      if (j !== jeton.current) return;
    }
    // Le résumé se range du moins rare au plus rare : chaque timbre glisse de sa case, en bas, jusqu'à sa place dans la
    // rangée agrandie (on suit le timbre, pas la case, puisqu'il peut changer de case).
    const avant = new Map(etat.current.rangement.map((i, k) => [i, cases.current[k]?.getBoundingClientRect()] as const));
    flushSync(() => { setRangement(ordreDuResume(cartesRef.current)); aller('resume'); });
    etat.current.rangement.forEach((i, k) => {
      const c = cases.current[k], a = avant.get(i), b = c?.getBoundingClientRect();
      if (!c || !a?.width || !b?.width) return;
      c.animate([
        { transform: `translate(${a.left - b.left}px,${a.top - b.top}px) scale(${a.width / b.width})`, transformOrigin: '0 0' },
        { transform: 'none', transformOrigin: '0 0' },
      ], { duration: D(640), delay: D(k * 45), easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'backwards' });
    });
    SONS.carillon(1);
  }

  // Un timbre de la feuille actionné au clavier se détache d'un coup ; au doigt et à la souris, la scène suit le geste.
  actions.current.caseTouchee = (i: number, parClavier: boolean): void => { if (parClavier) void detacherVite(i); };

  // ── « Tout révéler » : tous les timbres sortent vite du paquet, du moins rare au plus rare, et l'on passe au résumé ──
  function toutReveler(): void {
    const obtenues = cartesRef.current;
    if (!obtenues.length || !['dechirure', 'sortie', 'feuille', 'retournement'].includes(phaseRef.current)) return;
    jeton.current++;
    geste.current.actif = false;
    gesteCase.current = null;
    const rang = Math.max(...obtenues.filter((_, i) => !etat.current.reveles[i]).map((o) => RANG_DE_L_ECLAT[eclatDe(o)]), 0);
    // D'où sortent les timbres : le paquet (ou la feuille), mesuré avant qu'il ne quitte la scène.
    const source = (dans<HTMLElement>(emballage.current, '.cp') ?? feuilleDom.current ?? scene.current)?.getBoundingClientRect();
    flushSync(() => {
      setReveles(obtenues.map(() => true));
      setRangement(ordreDuResume(obtenues));
      setPli(false);
      aller('resume');
    });
    SONS.souffle();
    // Chaque timbre jaillit du paquet, petit et penché, et file à sa place avec un léger rebond (70 ms d'écart).
    // L'envol attend que le résumé soit dessiné (deux images) : sur un téléphone lent, ce premier dessin est long et les
    // timbres auraient fini leur course avant d'être vus. En attendant, ils restent cachés.
    const j = jeton.current;
    const envols = source?.width ? cases.current.map((c) => { const b = c?.getBoundingClientRect(); return c && b?.width ? { c, b } : null; }) : [];
    for (const e of envols) if (e) e.c.style.opacity = '0';
    requestAnimationFrame(() => requestAnimationFrame(() => envols.forEach((e, k) => {
      if (!e) return;
      e.c.style.opacity = '';
      if (j !== jeton.current || !source) return;
      const dx = source.left + source.width / 2 - (e.b.left + e.b.width / 2), dy = source.top + source.height / 2 - (e.b.top + e.b.height / 2);
      e.c.animate([
        { transform: `translate(${dx}px,${dy}px) rotate(${(k % 2 ? 1 : -1) * (6 + k * 2)}deg) scale(.5)`, opacity: 0 },
        { opacity: 1, offset: .2 },
        { transform: 'none', opacity: 1 },
      ], { duration: D(520), delay: D(40 + k * 70), easing: 'cubic-bezier(.2,1.2,.4,1)', fill: 'backwards' });
    })));
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

  // ── « Ranger dans l'album » : la page fait voler les timbres du plateau jusqu'à l'album ──
  function ranger(): void {
    if (phaseRef.current !== 'resume') return;
    flushSync(() => setApercu(null));
    const ordre = etat.current.rangement;
    const places = ordre.map((_, k) => dans<HTMLElement>(cases.current[k], '.tb')?.getBoundingClientRect()).filter((r): r is DOMRect => !!r);
    onRanger?.({ cartes: ordre.map((i) => cartesRef.current[i]), places });
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

  // ── Les gestes sur la scène : déchirure du paquet, pointillés d'un timbre ──
  const appuyer = (e: PointeurReact<HTMLDivElement>): void => {
    if (phaseRef.current === 'feuille') {
      const i = caseSousLePointeur(e.clientX, e.clientY);
      if (i === null) return;
      gesteCase.current = { i, t: null, trajet: 0, x: e.clientX, y: e.clientY, fibres: 0 };
      try { scene.current?.setPointerCapture(e.pointerId); } catch { /* le navigateur refuse : le geste marche quand même */ }
      suivreLesPointilles(e.clientX, e.clientY);
      return;
    }
    if (phaseRef.current !== 'dechirure') return;
    geste.current = { ...geste.current, actif: true, x: e.clientX, cumul: 0 };
    dans<HTMLElement>(emballage.current, '.cp__indice')?.classList.add('cp__indice--eteint');
    try { scene.current?.setPointerCapture(e.pointerId); } catch { /* le navigateur refuse : le geste marche quand même */ }
  };
  const glisser = (e: PointeurReact<HTMLDivElement>): void => {
    const g = geste.current;
    if (phaseRef.current === 'feuille' && gesteCase.current) { suivreLesPointilles(e.clientX, e.clientY); return; }
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
    if (apercu !== null) incliner(apercuDom.current, e);
  };
  const lacher = (): void => {
    geste.current.actif = false;
    const g = gesteCase.current;
    gesteCase.current = null;
    // Un simple clic ou toucher, sans geste le long des pointillés : le timbre se détache d'un coup (décision de Raphaël).
    if (g && g.trajet < 10 && phaseRef.current === 'feuille') void detacherVite(g.i);
  };
  // Le timbre agrandi (gros plan, aperçu) s'incline vers le pointeur et fait jouer ses reflets.
  function incliner(el: HTMLElement | null, e: PointeurReact<HTMLElement>): void {
    const r = el?.getBoundingClientRect();
    if (!el || !r?.width) return;
    const px = clamp(.5 + (e.clientX - (r.left + r.width / 2)) / (r.width * 1.3), 0, 1);
    const py = clamp(.5 + (e.clientY - (r.top + r.height / 2)) / (r.height * 1.3), 0, 1);
    const incline = dans<HTMLElement>(el, '.c-inclinaison');
    if (incline) incline.style.transform = `rotateX(${((.5 - py) * 16).toFixed(2)}deg) rotateY(${((px - .5) * 20).toFixed(2)}deg)`;
    const timbre = dans<HTMLElement>(el, '.tb');
    timbre?.style.setProperty('--mx', px.toFixed(3)); timbre?.style.setProperty('--my', py.toFixed(3));
    timbre?.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`); timbre?.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
  }
  const redresser = (): void => { document.querySelectorAll<HTMLElement>('.c-apercu .c-inclinaison, .c-gros-plan .c-inclinaison').forEach((t) => { t.style.transform = ''; }); };
  const clavierDeLaScene = (e: ClavierReact<HTMLDivElement>): void => {
    if (phaseRef.current === 'dechirure' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); void dechirerDUnCoup(); }
  };

  // ── Le rendu ──
  const n = cartes?.length ?? 0;
  const courante = cartes?.[apercu ?? 0] ?? null;
  const d = disposition(Math.max(1, n), feuilleEtroite);
  const avantLaSortie = phase === 'ouverture' || phase === 'dechirure' || phase === 'sortie';
  const auResume = phase === 'resume' || (phase === 'fermeture' && n > 0 && rangement.length >= n);
  const feuille = (face: FaceDeLaFeuille, principale: boolean) => cartes && <Feuille cartes={cartes} face={face} etroite={feuilleEtroite} numero={numero} edition={EDITION} dos={dos} premiersJours={premiersJours}
    detaches={detaches} reveles={reveles} reduire={reduit()} lueur={lueur} onCase={principale ? caseTouchee : undefined} />;
  const detail = grosPlan && cartes ? cartes[grosPlan.i] : null;

  const fiche = (obtenue: CarteObtenue, sous: string | null) => {
    return <>
      <div className="c-pastilles">
        <span className="c-pastille c-vignette" data-rarete={obtenue.carte.rarete}>{obtenue.carte.rarete}</span>
        {obtenue.finition !== 'Normale' && <span className="c-pastille c-dorure" data-finition={obtenue.finition}><span>{NOM_DE_LA_FINITION[obtenue.finition]}</span></span>}
        {premiersJours.has(obtenue.carte.id) ? <span className="c-pastille c-tampon c-tampon--premier-jour">Premier jour</span>
          : obtenue.nouvelle ? <span className="c-pastille c-tampon">Nouveau</span>
          : obtenue.nouvelleFinition ? <span className="c-pastille c-tampon">Nouvelle finition</span>
            : <span className="c-pastille c-tampon c-tampon--doublon">Doublon{obtenue.encre > 0 ? ` · +${obtenue.encre} Encre` : ''}</span>}
      </div>
      <h2 className="c-mot">{obtenue.carte.mot}</h2>
      <p className="c-definition"><em>{ABREGE_DE_LA_NATURE[obtenue.carte.type]}</em>{obtenue.carte.definition}</p>
      {obtenue.carte.record && <p className="c-sous">{obtenue.carte.record}</p>}
      {sous && <p className="c-sous">{sous}</p>}
    </>;
  };

  // Le dernier timbre détaché d'un clic : sa rareté, son mot, s'il est nouveau.
  const derniere = dernier !== null && cartes ? cartes[dernier] : null;
  const ligneDuDernier = derniere && <p className="c-dernier">
    <span className="c-pastille c-vignette" data-rarete={derniere.carte.rarete}>{derniere.carte.rarete}</span>
    <span className="c-dernier__mot">{derniere.carte.mot}</span>
    {premiersJours.has(derniere.carte.id) ? <span className="c-pastille c-tampon c-tampon--premier-jour">Premier jour</span>
      : derniere.nouvelle && <span className="c-pastille c-tampon">Nouveau</span>}
  </p>;
  let info = null;
  if (phase === 'ouverture') info = <p className="c-sous">Préparation du paquet…</p>;
  else if (phase === 'dechirure') info = <><p className="c-indice">Déchire le paquet en suivant les pointillés</p><div className="c-liens"><button type="button" className="c-lien" onClick={() => void dechirerDUnCoup()}>Déchirer d’un coup</button><button type="button" className="c-lien" onClick={toutReveler}>Tout révéler</button></div></>;
  else if (phase === 'feuille' && face === 'verso') info = <>
    {ligneDuDernier ?? <p className="c-indice">Touche un timbre ou suis ses pointillés pour le détacher</p>}
    <div className="c-actions"><button type="button" className="bouton-dentele" data-action="principal" onClick={() => void retourner()}>Retourner la feuille</button></div>
  </>;
  else if (phase === 'feuille') info = <>
    {ligneDuDernier}
    <div className="c-actions">
      <button type="button" className="bouton-dentele" data-action="principal" onClick={() => void toutDetacher()}>Tout détacher</button>
      <button type="button" className="bouton-dentele bouton-dentele--filet" onClick={() => void retourner()}>Retourner la feuille</button>
    </div>
  </>;
  else if (phase === 'resume' && cartes) {
    info = apercu !== null && courante ? fiche(courante, 'Touche le timbre pour revenir au résumé.') : <>
      <h2 className="c-titre">{titreDuResume(cartes)}</h2>
      <p className="c-sous">{bilanDuPaquet(cartes)}. {gainsDuPaquet(cartes)}. Touche un timbre pour l’admirer.</p>
      <MomentsDeProgres recompenses={progres} />
      <div className="c-actions">
        <button type="button" className="bouton-dentele" data-action="ranger" onClick={ranger}>Ranger dans l’album</button>
        {continuer && reserve > 0 && <button type="button" className="bouton-dentele bouton-dentele--filet" onClick={() => void demarrer(null)}>Ouvrir le suivant ({reserve})</button>}
      </div>
    </>;
  }

  return createPortal(<>
    <div className="ceremonie" data-phase={phase} data-gros-plan={grosPlan ? '' : undefined} data-fin={auResume ? '' : undefined} role="dialog" aria-modal="true" aria-label="Ouverture d’un paquet"
      style={{ '--masque-paquet': MASQUE_DU_PAQUET } as CSSProperties}>
      <div className="ceremonie__haut">
        <button type="button" className="c-icone" aria-pressed={!sons} aria-label={sons ? 'Couper le son' : 'Remettre le son'} onClick={() => onSons(!sons)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />{sons ? <><path d="M15.5 9a4.5 4.5 0 0 1 0 6" /><path d="M18 6.5a8 8 0 0 1 0 11" /></> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}</svg>
        </button>
        <button type="button" className="c-icone" aria-label="Fermer et ranger les timbres" onClick={() => fermer()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      <div className="ceremonie__scene" ref={scene} tabIndex={phase === 'dechirure' ? 0 : -1} aria-label={phase === 'dechirure' ? `Paquet${lueur ? ' d’exception' : ''} à déchirer : glisse de gauche à droite, ou appuie sur Entrée` : undefined}
        onPointerDown={appuyer} onPointerMove={glisser} onPointerUp={lacher} onPointerCancel={lacher} onPointerLeave={redresser} onKeyDown={clavierDeLaScene}>
        {cartes && !auResume && <div className="c-feuille" ref={feuilleDom} key={`feuille-${tentative}`} data-etat={etatFeuille}
          style={{ '--fe-ratio': (d.largeur / d.hauteur).toFixed(4) } as CSSProperties}>
          <div className="c-feuille__inclinaison" ref={inclinaisonDom}>
            <div className="c-feuille__pivot" ref={pivotDom}>
              {feuille(face, true)}
              <svg className="c-arrachage" viewBox={`0 0 ${d.largeur} ${d.hauteur}`} aria-hidden="true">
                <path ref={traitDom} className="c-arrachage__trait" />
              </svg>
              {pli && <div className="c-feuille__volet" ref={voletDom} inert aria-hidden="true">{feuille('verso', false)}</div>}
            </div>
          </div>
        </div>}
        {avantLaSortie && <div className="c-emballage" ref={emballage} key={`paquet-${tentative}`}>
          {lueur && <span className="c-emballage__aura" data-lueur={lueur} />}
          <PaquetDeCeremonie modele={modelePaquet} lueur={lueur ?? undefined} className="cp--scene" />
        </div>}
        {apercu !== null && cartes && <button type="button" ref={apercuDom} className="c-carte c-apercu" aria-label={`${cartes[apercu].carte.mot}, fermer l’aperçu`} onClick={() => setApercu(null)}>
          <div className="c-inclinaison"><div className="c-retourne"><Timbre carte={cartes[apercu].carte} finition={cartes[apercu].finition} oblitere premierJour={premiersJours.has(cartes[apercu].carte.id)} cliquable={false} reagir={false} /></div></div>
        </button>}
      </div>

      <div className="ceremonie__infos" ref={infos} aria-live="polite">{info}</div>

      {/* Le plateau : les timbres rangés, dans l'ordre où ils y arrivent. À la fin, il s'agrandit, se range du moins rare au plus rare, et chaque timbre s'admire. */}
      <div className={`ceremonie__plateau${apercu !== null ? ' ceremonie__plateau--estompe' : ''}`}>
        {Array.from({ length: n || 6 }, (_, k) => {
          const i = rangement[k];
          const pleine = i !== undefined && cartes;
          return <button key={`${tentative}-${k}`} type="button" tabIndex={auResume && pleine && apercu === null ? 0 : -1} ref={(el) => { cases.current[k] = el; }}
            className={`c-case${pleine ? ' c-case--pleine' : ''}`} aria-label={pleine ? `Admirer ${cartes[i].carte.mot}` : `Emplacement ${k + 1}`}
            onClick={() => { if (pleine) montrerApercu(i); }}>
            {pleine && <Timbre carte={cartes[i].carte} finition={cartes[i].finition} oblitere premierJour={premiersJours.has(cartes[i].carte.id)} cliquable={false} reagir={false} />}
          </button>;
        })}
      </div>

      {volants.map((v) => cartes && <div key={`${tentative}-${v.i}`} className="c-volant" aria-hidden="true"
        ref={(el) => { if (el) volantsDom.current.set(v.i, el); }}
        style={{ left: v.cadre.left, top: v.cadre.top, width: v.cadre.width, height: v.cadre.height }}>
        <div className="c-retourne">
          <Timbre carte={cartes[v.i].carte} finition={cartes[v.i].finition} verso montrerVerso={v.face === 'verso'} dos={dos} oblitere={v.dejaRevele} premierJour={premiersJours.has(cartes[v.i].carte.id)} cliquable={false} reagir={false} />
        </div>
      </div>)}

      {/* Le timbre détaché, au premier plan sur un fond assombri : le toucher (ou Échap) le range. */}
      <div className="c-voile" onClick={() => void rangerLeTimbre()} />
      {grosPlan && detail && <div className="c-gros-plan" onPointerMove={(e) => incliner(grosPlanDom.current, e)} onPointerLeave={redresser}>
        <button type="button" ref={grosPlanDom} className="c-gros-plan__timbre" onClick={() => void rangerLeTimbre()}
          aria-label={grosPlan.fiche ? `${detail.carte.mot}, ranger ce timbre` : 'Timbre détaché'}>
          <div className="c-inclinaison"><div className="c-retourne">
            <Timbre carte={detail.carte} finition={detail.finition} verso montrerVerso={grosPlan.face === 'verso'} dos={dos} oblitere={grosPlan.dejaRevele} premierJour={premiersJours.has(detail.carte.id)} cliquable={false} reagir />
          </div></div>
        </button>
        <div ref={ficheDom} className={`c-gros-plan__fiche${grosPlan.fiche ? ' c-gros-plan__fiche--visible' : ''}`} aria-live="polite">
          {grosPlan.fiche && <>
            {fiche(detail, null)}
            <div className="c-actions"><button type="button" className="bouton-dentele" data-action="ranger-timbre" onClick={() => void rangerLeTimbre()}>Ranger ce timbre</button></div>
          </>}
        </div>
      </div>}
      <div className="ceremonie__eclair" ref={eclair} />
    </div>
    <canvas className="ceremonie__particules" ref={toile} aria-hidden="true" />
  </>, document.body);
}
