// Le comptoir des paquets, comme en haut de l'accueil de la maquette : le titre qui compte les paquets en toutes
// lettres (seule mention du stock), le paquet qui flotte devant sa pile, le bouton dentelé, puis ce que le titre ne
// dit pas : quand arrive le prochain paquet, et dans combien de paquets tombe la Légendaire garantie.
// Un clic tire le paquet sur le serveur et ouvre la cérémonie par-dessus la page.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { CarteObtenue } from '../../jeu/partie.ts';
import { premiersJoursDuPaquet, rareteDansLEdition } from '../../jeu/premierJour.ts';
import type { Sauvegarde } from '../../jeu/sauvegarde.ts';
import { profilVisible } from '../../jeu/personnalisation.ts';
import { lien } from '../../navigation/routes.ts';
import { HORS_LIGNE, changerUnReglage, ouvrirRecompense, ouvrirUnPaquet, synchroniser } from '../../services/partie.ts';
import { chargerEdition } from '../../services/cartes.ts';
import { preparerAccueil } from '../accueil/modeleAccueil.ts';
import { useRecompensesSuspendues } from '../Recompenses.tsx';
import { Timbre } from '../timbre/Timbre.tsx';
import { useChargement } from '../useChargement.ts';
import { ErreurDeChargement } from '../ErreurDeChargement.tsx';
import { mouvementReduit } from '../mouvement.ts';
import { enMinutesEtSecondes, usePartie, useStockDePaquets } from '../usePartie.ts';
import { ApercuDeLAlbum } from './ApercuDeLAlbum.tsx';
import { Ceremonie } from './Ceremonie.tsx';
import type { Envol } from './Ceremonie.tsx';
import { MASQUE_DU_PAQUET, PaquetDeCeremonie } from './PaquetDeCeremonie.tsx';
import { libererLesCompteurs, retenirLesCompteurs } from './compteurs.ts';
import { Particules, SONS } from './effets.ts';
import { phraseDeLaGarantie, titreDuComptoir } from './eclats.ts';
import { EQUILIBRAGE } from '../../config/equilibrage.ts';
import './ceremonie.css';
import './comptoir.css';

// « avant » : la partie telle qu'elle était au clic. L'album la garde jusqu'au rangement, pour ne rien dévoiler.
type Ouverture = { premier: Promise<CarteObtenue[]>; tirer: () => Promise<CarteObtenue[]>; continuer: boolean; depuis: DOMRect | null; avant: Sauvegarde };
type Vol = Envol & { cachees: Set<string>; compte: number; premiers: ReadonlySet<string> };
const AUCUN: ReadonlySet<string> = new Set();

const attendre = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, mouvementReduit() ? Math.min(ms, 40) : ms));

// « aCote » : ce qui se range à droite de l'album (les duels, sur l'accueil). « accroche » : quelques mots sous le
// titre (sur l'accueil, ce qu'est le jeu, tant que le joueur débute). « suite » : sous le bouton (les premiers pas).
export function Comptoir({ aCote, accroche, suite }: { aCote?: ReactNode; accroche?: ReactNode; suite?: ReactNode } = {}) {
  const partie = usePartie();
  const paquets = useStockDePaquets(partie);
  const edition = useChargement(chargerEdition, 'edition');
  const [ouverture, setOuverture] = useState<Ouverture | null>(null);
  const [vol, setVol] = useState<Vol | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const verrou = useRef(false);
  const enVol = useRef(false);
  const scene = useRef<HTMLDivElement>(null);
  const album = useRef<HTMLElement>(null);
  const clones = useRef<(HTMLDivElement | null)[]>([]);
  const toile = useRef<HTMLCanvasElement>(null);
  // Les récompenses (niveau, succès) attendent la fin de la cérémonie.
  useRecompensesSuspendues(ouverture !== null);
  // Le cachet « Premier jour » : les timbres du paquet qui inaugurent une rareté de l'album (jeu/premierJour.ts).
  const cartesDeLEdition = edition.etat === 'pret' ? edition.donnees.cartes : null;
  const rareteDe = useMemo(() => (cartesDeLEdition ? rareteDansLEdition(cartesDeLEdition) : null), [cartesDeLEdition]);
  const sauvegardeActuelle = partie.etat === 'prete' ? partie.sauvegarde : null;
  const premiersJours = useMemo(() => (ouverture && sauvegardeActuelle && rareteDe ? premiersJoursDuPaquet(ouverture.avant.cartes, sauvegardeActuelle.cartes, rareteDe) : AUCUN),
    [ouverture, sauvegardeActuelle, rareteDe]);

  // Le paquet s'incline doucement vers le pointeur, sauf quand la cérémonie occupe l'écran.
  useEffect(() => {
    if (ouverture) return;
    const reduit = mouvementReduit(); // (le réglage du jeu compte aussi, pas seulement celui de l'appareil)
    const pointeur = { x: window.innerWidth / 2, y: window.innerHeight / 3 };
    const penche = { rx: 0, ry: 0 };
    const suivre = (e: PointerEvent): void => { pointeur.x = e.clientX; pointeur.y = e.clientY; };
    let cadre = 0;
    const boucle = (): void => {
      const paquet = scene.current?.querySelector<HTMLElement>('.comptoir__paquet .cp'); // celui du devant, pas la pile
      const incline = paquet?.querySelector<HTMLElement>('.cp__inclinaison');
      const r = paquet?.getBoundingClientRect();
      if (paquet && incline && r?.width && !document.hidden) {
        const dx = Math.max(-1, Math.min(1, (pointeur.x - (r.left + r.width / 2)) / (window.innerWidth * .45)));
        const dy = Math.max(-1, Math.min(1, (pointeur.y - (r.top + r.height / 2)) / (window.innerHeight * .45)));
        penche.rx += (-dy * 12 - penche.rx) * .08; penche.ry += (dx * 22 - penche.ry) * .08;
        incline.style.transform = `rotateX(${penche.rx.toFixed(2)}deg) rotateY(${penche.ry.toFixed(2)}deg)`;
        const mx = .5 + penche.ry / 44, my = .5 - penche.rx / 24;
        paquet.style.setProperty('--mx', mx.toFixed(3)); paquet.style.setProperty('--my', my.toFixed(3));
        paquet.style.setProperty('--gx', `${(mx * 100).toFixed(1)}%`); paquet.style.setProperty('--gy', `${(my * 60).toFixed(1)}%`);
      }
      cadre = requestAnimationFrame(boucle);
    };
    if (!reduit) { window.addEventListener('pointermove', suivre, { passive: true }); cadre = requestAnimationFrame(boucle); }
    return () => { cancelAnimationFrame(cadre); window.removeEventListener('pointermove', suivre); };
  }, [ouverture]);

  // Si l'on quitte la page en plein envol, les compteurs reprennent leur vraie valeur.
  useEffect(() => () => libererLesCompteurs(), []);

  // L'envol : les timbres quittent l'éventail, la page descend jusqu'à l'album, et chacun rejoint sa case.
  useEffect(() => {
    if (!vol) return;
    let annule = false;
    const particules = toile.current ? new Particules(toile.current, mouvementReduit) : null;
    void (async () => {
      album.current?.scrollIntoView({ behavior: mouvementReduit() ? 'auto' : 'smooth', block: 'center' });
      await attendre(700);
      if (annule) return;
      libererLesCompteurs();
      const vus = new Set<string>();
      await Promise.all(vol.cartes.map(async (obtenue, i) => {
        await attendre(i * 110);
        const clone = clones.current[i];
        if (annule || !clone) return;
        const caseVisee = album.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(obtenue.carte.id)}"]`);
        const cible = caseVisee ?? album.current?.querySelector<HTMLElement>('.album-apercu__compte b');
        const tr = cible?.getBoundingClientRect(), cr = clone.getBoundingClientRect();
        if (tr && cr.width) {
          const dx = tr.left - cr.left, dy = tr.top - cr.top;
          const echelle = caseVisee ? tr.width / cr.width : .2;
          await clone.animate([
            { transform: 'none', opacity: 1 },
            { transform: `translate(${dx}px,${dy - 60}px) scale(${echelle * 1.25}) rotate(-6deg)`, opacity: 1, offset: .6 },
            { transform: `translate(${dx}px,${dy}px) scale(${echelle})`, opacity: caseVisee ? 1 : 0 },
          ], { duration: mouvementReduit() ? 1 : 760, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished;
        }
        if (annule) return;
        clone.style.visibility = 'hidden';
        SONS.coup();
        // Le compte ne monte que pour un timbre qui n'était pas encore dans la collection.
        const compte = obtenue.nouvelle && obtenue.carte.rarete !== 'Hors-série' && !vus.has(obtenue.carte.id);
        vus.add(obtenue.carte.id);
        setVol((v) => v && { ...v, compte: v.compte + (compte ? 1 : 0), cachees: new Set([...v.cachees].filter((id) => id !== obtenue.carte.id)) });
        if (tr) particules?.jaillir(tr.left + tr.width / 2, tr.top + tr.height / 2, { n: 10, genre: 'poussiere', couleurs: ['#f0c48f', '#fff4d6'], vitesse: [40, 140], duree: [.4, .8] });
      }));
      await attendre(600);
      if (annule) return;
      enVol.current = false;
      setVol(null);
    })();
    return () => { annule = true; particules?.vider(); };
  }, [vol?.places]); // un envol par rangement : « places » change à chaque paquet rangé

  if (partie.etat !== 'prete' || !paquets) return <p className="texte-doux" role="status">Chargement…</p>;

  const { reglages, profil } = partie.sauvegarde;
  const formule = partie.compte?.formule;
  const hebdomadaires = formule?.paquetsHebdomadaires ?? 0;
  const cadeau = formule?.achatUnique && formule.cadeauAchatReclame === false;
  const stock = paquets.stock;

  // Le tirage part tout de suite, au clic : la cérémonie affiche ensuite ce que le serveur a décidé.
  const ouvrir = (tirer: () => Promise<CarteObtenue[]>, continuer: boolean): void => {
    if (verrou.current || enVol.current) return;
    verrou.current = true;
    setErreur(null);
    retenirLesCompteurs({ encre: partie.sauvegarde.encre, xp: partie.sauvegarde.profil.xp });
    const depuis = scene.current?.querySelector('.comptoir__paquet .cp')?.getBoundingClientRect() ?? null;
    setOuverture({ premier: tirer(), tirer, continuer, depuis, avant: partie.sauvegarde });
  };
  const fermer = (): void => {
    verrou.current = false;
    setOuverture(null);
    if (!enVol.current) libererLesCompteurs();
  };
  const ranger = (envol: Envol): void => {
    const cartes = edition.etat === 'pret' ? edition.donnees.cartes : null;
    if (!cartes || envol.places.length !== envol.cartes.length) return;
    // Le compte d'avant le paquet : le compte réel, moins les timbres ordinaires qui viennent d'entrer dans la collection.
    const collection = preparerAccueil(partie.sauvegarde, cartes).collection.possedees;
    const nouveaux = new Set(envol.cartes.filter((o) => o.nouvelle && o.carte.rarete !== 'Hors-série').map((o) => o.carte.id));
    enVol.current = true;
    setVol({ ...envol, cachees: new Set(envol.cartes.filter((o) => o.nouvelle).map((o) => o.carte.id)), compte: Math.max(0, collection - nouveaux.size), premiers: premiersJours });
  };

  return (<>
    <section className="comptoir" aria-labelledby="titre-comptoir">
      <div className="comptoir__texte">
        <h1 id="titre-comptoir" className="comptoir__titre">{titreDuComptoir(stock)}</h1>
        {accroche && <div className="comptoir__accroche">{accroche}</div>}
        <div className="comptoir__actions">
          <button type="button" className="bouton-dentele" disabled={stock <= 0 || ouverture !== null} onClick={() => ouvrir(ouvrirUnPaquet, true)}>Ouvrir un paquet</button>
          <a className="comptoir__lien" href={lien({ ecran: 'collection' })}>Ouvrir mon album</a>
        </div>
        {suite}
        {(hebdomadaires > 0 || cadeau) && <div className="comptoir__actions comptoir__actions--offres">
          {hebdomadaires > 0 && <button type="button" className="bouton-dentele bouton-dentele--filet" disabled={ouverture !== null} onClick={() => ouvrir(() => ouvrirRecompense('hebdomadaire'), false)}>Paquet hebdomadaire · {hebdomadaires}</button>}
          {cadeau && <button type="button" className="bouton-dentele bouton-dentele--filet" disabled={ouverture !== null} onClick={() => ouvrir(() => ouvrirRecompense('achat'), false)}>Découvrir ma Hors-série</button>}
        </div>}
        <div className="comptoir__infos">
          <p>{paquets.attente !== null
            ? <>Prochain paquet dans <span role="timer">{enMinutesEtSecondes(paquets.attente)}</span></>
            : `Réserve pleine (${paquets.maximum} paquets) : ouvre-en un pour relancer la recharge.`}</p>
          <p className="comptoir__garantie"><span aria-hidden="true">✦</span> {phraseDeLaGarantie(partie.sauvegarde.paquets.sansLegendaire, EQUILIBRAGE.paquets.paquetsAvantLegendaireGarantie)}</p>
        </div>
        {partie.serveur.etat === 'hors ligne' && <p className="bloc bloc--alerte" role="alert">Les paquets s’ouvrent en ligne. {partie.serveur.message} <button type="button" className="bouton outil" onClick={() => void synchroniser()}>Réessayer</button></p>}
        {erreur && erreur !== HORS_LIGNE && !(partie.serveur.etat === 'hors ligne' && erreur === partie.serveur.message) && <p className="bloc bloc--alerte" role="alert">{erreur}</p>}
      </div>

      <div className="comptoir__scene" ref={scene} style={{ '--masque-paquet': MASQUE_DU_PAQUET } as CSSProperties}>
        {/* La pile : de vrais paquets, un peu dans l'ombre, qui s'en vont quand la réserve baisse. */}
        <div className={`comptoir__fantome comptoir__fantome--1${stock < 2 ? ' comptoir__fantome--parti' : ''}`} aria-hidden="true"><PaquetDeCeremonie modele={profil.paquet} vivant={false} /></div>
        <div className={`comptoir__fantome comptoir__fantome--2${stock < 3 ? ' comptoir__fantome--parti' : ''}`} aria-hidden="true"><PaquetDeCeremonie modele={profil.paquet} vivant={false} /></div>
        <button type="button" className="comptoir__paquet" disabled={stock <= 0 || ouverture !== null} aria-label="Ouvrir un paquet"
          style={{ visibility: ouverture ? 'hidden' : undefined }} onClick={() => ouvrir(ouvrirUnPaquet, true)}>
          <PaquetDeCeremonie modele={profil.paquet} />
        </button>
      </div>

      {ouverture && <Ceremonie premier={ouverture.premier} tirer={ouverture.tirer} continuer={ouverture.continuer} reserve={stock} numero={partie.sauvegarde.paquets.ouverts} depuis={ouverture.depuis}
        modelePaquet={profil.paquet} dos={profilVisible(profil, formule ?? null).dos} premiersJours={premiersJours} sons={reglages.sonsPaquets} onSons={(actifs) => changerUnReglage('sonsPaquets', actifs)}
        reduire={reglages.reduireAnimations} onFermer={fermer} onRanger={ranger} onErreur={setErreur} />}
    </section>

    <div className={aCote ? 'comptoir-bas comptoir-bas--double' : 'comptoir-bas'}>
      {/* Le catalogue ne se charge pas : on le dit, avec « Réessayer » (l’aperçu restait sur « … » pour toujours). */}
      {edition.etat === 'erreur'
        ? <section className="album-apercu" aria-labelledby="titre-album-apercu"><h2 id="titre-album-apercu">Ta collection</h2><ErreurDeChargement quoi="Le catalogue des timbres" reessayer={edition.relancer} /></section>
        : <ApercuDeLAlbum sauvegarde={ouverture?.avant ?? partie.sauvegarde} cartes={edition.etat === 'pret' ? edition.donnees.cartes : null}
          cachees={vol?.cachees} compte={vol?.compte ?? null} refAlbum={album} />}
      {aCote}
    </div>

    {vol && createPortal(<div className="envol" aria-hidden="true">
      {vol.cartes.map((obtenue, i) => <div key={i} ref={(el) => { clones.current[i] = el; }} className="envol__timbre"
        style={{ left: vol.places[i].left, top: vol.places[i].top, width: vol.places[i].width }}>
        <Timbre carte={obtenue.carte} finition={obtenue.finition} oblitere premierJour={vol.premiers.has(obtenue.carte.id)} cliquable={false} reagir={false} />
      </div>)}
      <canvas className="ceremonie__particules" ref={toile} />
    </div>, document.body)}
  </>);
}
