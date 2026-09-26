// La partie (docs/duel/BRIEF-duel.md § 3) : l'en-tête (l'adversaire à gauche, toi à droite), l'historique des manches, le ring
// où « Son mot » et « Ton mot » se font face autour du médaillon, la barre d'action toujours au même endroit, et la
// main avec la pioche. L'écran n'applique aucune règle : Duel.tsx mène la partie, ce composant la montre.
//
// Les aides de calcul (indice, rapport de type, dégâts prévus, détail du calcul, enchaînement) ne s'affichent qu'en
// Facile contre l'ordinateur : la condition se lit sur l'adversaire du duel en cours (aidesPermises).

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { BadgeJoueurSimule } from '../../composants/BadgeJoueurSimule.tsx';
import { SceauDuel } from '../../composants/SceauDuel.tsx';
import { FondAnime } from '../../composants/accueil/FondAnime.tsx';
import { Carte } from '../../composants/carte/Carte.tsx';
import { Timbre } from '../../composants/timbre/Timbre.tsx';
import { EQUILIBRAGE, attaqueEnJeu, defenseEnJeu } from '../../config/equilibrage.ts';
import { aidesPermises, enchainement, indiceSurLeMot, pluralDe, prevoirLaManche, rapportDeType } from '../../jeu/aidesDuDuel.ts';
import type { PrevisionDeLaManche } from '../../jeu/aidesDuDuel.ts';
import { faceCachee } from '../../jeu/duel.ts';
import type { Attaque, Cote, Duel, TaillesDesFactions } from '../../jeu/duel.ts';
import { meilleureFinition } from '../../jeu/sauvegarde.ts';
import type { Sauvegarde } from '../../jeu/sauvegarde.ts';
import type { CarteIndex } from '../../partage/types.ts';
import type { Jaillissement } from '../../composants/ceremonie/effets.ts';
import type { Adversaire } from '../../services/duel.ts';
import type { SonsDuDuel } from '../../services/sonsDuDuel.ts';
import type { Etape } from '../Duel.tsx';
import { BarreDeVie } from './BarreDeVie.tsx';
import { Historique } from './Historique.tsx';
import { Parade } from './Parade.tsx';
import { useApercuAuSurvol } from './ApercuAuSurvol.tsx';
import { useDeroulement } from './deroulement.ts';
import { IntroDuDuel } from './IntroDuDuel.tsx';
import { useParticules } from './useParticules.tsx';
import './partie.css';

const REGLES = EQUILIBRAGE.duel;
export type EtapeDePartie = Exclude<Etape, { nom: 'accueil' } | { nom: 'preparation' }>;

const pluriel = (n: number, mot: string): string => `${n} ${mot}${n > 1 ? 's' : ''}`;
const article = (nature: string): string => nature.toLowerCase();
// « le nom adverse », « l’adjectif adverse » : jamais « son nom », qu’on lisait comme le nom de l’adversaire (audit du 26/09/2026).
const leMot = (nature: string): string => (/^[aeiouy]/i.test(nature) ? `l’${article(nature)}` : `le ${article(nature)}`);
const auMot = (nature: string): string => (/^[aeiouy]/i.test(nature) ? `à l’${article(nature)}` : `au ${article(nature)}`);
const majuscule = (texte: string): string => texte.charAt(0).toUpperCase() + texte.slice(1);

type Props = {
  sauvegarde: Sauvegarde;
  etape: EtapeDePartie;
  duel: Duel; // l'état au début de la manche
  affiche: Duel; // l'état à montrer (après la manche, pendant le bilan)
  adversaire: Adversaire; // celui du duel en cours (renvoyé par le serveur des combats quand il tient le duel)
  tailles: TaillesDesFactions;
  bloque: boolean;
  enregistrement: boolean;
  alertes: ReactNode; // incident du serveur, erreur
  incident: boolean; // une erreur est affichée : la parade s'efface pour la laisser voir
  duree: number | null; // secondes pour parer (null : sans limite)
  reduireAnimations: boolean;
  sons: SonsDuDuel;
  bilan: ReactNode; // ce qu'il faut retenir de la manche (définition, maîtrise)
  fin: (jaillir: (element: Element | null, reglages: Jaillissement) => void) => ReactNode; // l'écran de fin
  pseudo: string; // le pseudonyme du joueur (vide s'il n'en a pas), pour l'intro
  abandon: { visible: boolean; arme: boolean; cliquer: () => void; desarmer: () => void };
  viser: (bouton: HTMLButtonElement | null) => void; // donne le focus au bouton principal de l'étape
  onChoisir: (id: string) => void;
  onJouer: (carte: CarteIndex) => void;
  onContinuer: () => void;
  onRepondre: (choisie: number) => void;
  onTic: (restantes: number) => void;
};

export function Partie(p: Props) {
  const { etape, duel, affiche, sauvegarde, tailles } = p;
  const aides = aidesPermises(p.adversaire);
  const { joueur } = affiche.camps;
  // Avant la parade, le mot adverse n'est montré que face cachée : nature, attaque et défense. (Le serveur des combats
  // ne transmet que cela ; en local, la face cachée est tirée ici de la carte.)
  const revele = etape.nom !== 'choix';
  const adverse = etape.nom === 'choix'
    ? etape.adverse && faceCachee(etape.adverse, enchainement(duel, 'adversaire', etape.adverse, tailles, REGLES))
    : 'adverse' in etape ? etape.adverse : null;
  const choisie = etape.nom === 'choix' ? joueur.main.find((c) => c.id === etape.choisie) ?? null : null;
  const jouee = etape.nom === 'parade' || etape.nom === 'bilan' ? etape.carte : null;
  const manche = etape.nom === 'bilan' ? etape.apres.manches.at(-1) : undefined;
  const prevision = aides && choisie && adverse ? prevoirLaManche(duel, choisie, adverse, tailles, REGLES) : null;
  const enJoute = p.adversaire.type === 'joute' ? p.adversaire.profil : null;
  const nomAdverse = enJoute ? enJoute.pseudo : 'L’ordinateur';
  const detailAdverse = p.adversaire.type === 'entrainement' ? `Niveau ${p.adversaire.niveau.toLowerCase()}`
    : p.adversaire.amical ? 'Défi amical · sans classement' : `Joute · cote ${p.adversaire.profil.cote}`;

  // Les éclats d'encre du choc jaillissent du médaillon.
  const medaillon = useRef<HTMLDivElement>(null);
  const reduit = p.reduireAnimations;
  const { toile, jaillir } = useParticules(reduit);
  const eclater = (degats: number): void => {
    jaillir(medaillon.current, { n: 40 + degats * 5, genre: 'encre', couleurs: ['#16284a', '#2a3f66', '#d89a5c', '#f1e7d0'], vitesse: [160, 620], g: 600, duree: [.7, 1.4], taille: [3, 7], frein: .95 });
    jaillir(medaillon.current, { n: 40, genre: 'etincelle', couleurs: ['#ffe3b0', '#ffffff'], vitesse: [200, 700], duree: [.4, .9], taille: [1.2, 2.4] });
  };

  // L'intro, au tout début d'un duel : le premier mot adverse attend qu'elle soit finie pour arriver.
  const [intro, setIntro] = useState(() => !reduit && etape.nom === 'choix' && duel.manche === 1 && duel.manches.length === 0);

  // La chronologie de la manche : arrivée du mot adverse, puis correction, bouclier, élan, choc, récapitulatif.
  const { temps, arrive } = useDeroulement({ etape, duel, reduit, sons: p.sons, eclater, enAttente: intro });
  const enCorrection = etape.nom === 'bilan' && temps === 'correction';
  const apresLeChoc = etape.nom === 'bilan' && (temps === 'choc' || temps === 'recap');
  const recap = etape.nom === 'bilan' && temps === 'recap';
  // Avant le choc, l'en-tête et l'historique montrent encore l'état du début de la manche.
  const montre = etape.nom === 'bilan' && !apresLeChoc ? duel : affiche;
  // Le début de la parade, gardé pour que le minuteur reste figé pendant la correction.
  const debutDeLaParade = useRef(0);
  if (etape.nom === 'parade') debutDeLaParade.current = etape.debut;
  const paradeOuverte = !p.incident && (etape.nom === 'parade' || (etape.nom === 'bilan' && enCorrection));

  // La souris posée une seconde sur un timbre le montre en grand ; l'aperçu se ferme à chaque changement d'étape.
  const { survoler, fermer: fermerLApercu, apercu } = useApercuAuSurvol();
  useEffect(() => fermerLApercu(), [etape.nom]); // eslint-disable-line react-hooks/exhaustive-deps

  // Les touches 1 à 3 choisissent un timbre de la main (hors champ de saisie).
  const main = joueur.main;
  useEffect(() => {
    if (etape.nom !== 'choix' || !arrive) return;
    const touche = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.target instanceof HTMLElement && e.target.closest('input, textarea, select'))) return;
      const carte = main[Number(e.key) - 1];
      if (carte && /^[1-9]$/.test(e.key)) { e.preventDefault(); p.onChoisir(carte.id); }
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [etape.nom, main, arrive, p.onChoisir]); // eslint-disable-line react-hooks/exhaustive-deps

  const habiller = (carte: CarteIndex) => {
    const possedee = sauvegarde.cartes[carte.id];
    return { carte, finition: possedee ? meilleureFinition(possedee) : 'Normale' as const, maitriseeLe: possedee?.maitriseeLe ?? null };
  };

  if (etape.nom === 'fin') {
    return (
      <main className="ecran partie" data-etape="fin">
        <FondAnime />
        {toile}
        {p.alertes}
        <h1 className="visuellement-cache">Duel contre {nomAdverse}</h1>
        <Entete nom={nomAdverse} detail={detailAdverse} maison={enJoute?.maison} affiche={affiche} />
        {p.fin(jaillir)}
      </main>
    );
  }

  // ── La barre d'action : une phrase d'état et le bouton principal de l'étape ──
  let phrase: ReactNode = null;
  let detail: ReactNode = null;
  let bouton: ReactNode = null;
  if (etape.nom === 'choix' && adverse && !arrive) {
    phrase = <>{nomAdverse} pose son mot…</>;
  } else if (etape.nom === 'choix') {
    if (!choisie) {
      phrase = adverse ? <>Il a posé un <b>{article(adverse.type)}</b>. Quel timbre lui opposes-tu ?</> : <>À toi de poser le premier.</>;
      bouton = <button type="button" className="btn-primary sm" disabled>Choisis un timbre dans ta main</button>;
    } else {
      phrase = prevision ? <PhraseDePrevision prevision={prevision} /> : adverse ? <>Prêt à opposer <b>« {choisie.mot} »</b> {auMot(adverse.type)} adverse ?</> : <>Prêt à poser <b>« {choisie.mot} »</b> ?</>;
      detail = prevision && <DetailDuCalcul carte={choisie} prevision={prevision} />;
      bouton = <button type="button" className="btn-primary sm" disabled={p.bloque} onClick={() => p.onJouer(choisie)}>Jouer « {choisie.mot} »</button>;
    }
  } else if (etape.nom === 'parade' && adverse) {
    phrase = <>Pare son attaque : retrouve la définition de <b>« {adverse.mot} »</b>.</>;
  } else if (etape.nom === 'reprise') {
    phrase = 'Reprends cette manche : retrouve la définition du mot adverse.';
    bouton = <button type="button" className="btn-primary sm" ref={p.viser} disabled={p.bloque} onClick={p.onContinuer}>Passer à la parade</button>;
  } else if (etape.nom === 'bilan' && manche && !recap) {
    phrase = <span className="partie__attente">{manche.joueur.paree ? 'Il pare ton mot…' : 'Il ne trouve pas la définition de ton mot…'}</span>;
  } else if (etape.nom === 'bilan' && manche) {
    const fini = etape.apres.vainqueur !== null;
    phrase = <PhraseDuBilan moi={manche.joueur} lui={manche.adversaire} parade={etape.parade} acheve={etape.apres.camps.adversaire.pv === 0} />;
    bouton = <button type="button" className="btn-primary sm" ref={p.viser} disabled={p.enregistrement || p.bloque} onClick={p.onContinuer}>{p.enregistrement ? 'Enregistrement du résultat…' : fini ? 'Voir le résultat' : 'Manche suivante'}</button>;
  }

  // ── Sous le médaillon (Facile) : l'indice sur son mot, puis le rapport de type une fois ton timbre choisi ──
  let indice: ReactNode = null;
  if (aides && adverse && etape.nom === 'choix' && arrive) {
    if (choisie) {
      const rapport = rapportDeType(choisie.type, adverse.type);
      indice = rapport === 'pour' ? <p className="ring__indice" data-ton="bon">Ton {article(choisie.type)} bat {leMot(adverse.type)} adverse : <b>+{REGLES.bonusDeType} pour toi</b></p>
        : rapport === 'contre' ? <p className="ring__indice" data-ton="mauvais">{majuscule(leMot(adverse.type))} adverse bat ton {article(choisie.type)} : <b>+{REGLES.bonusDeType} pour lui</b></p>
        : <p className="ring__indice">Aucun avantage de type</p>;
    } else {
      const conseil = indiceSurLeMot(adverse.type);
      indice = conseil
        ? <p className="ring__indice">{majuscule(leMot(adverse.type))} adverse est fort contre les {pluralDe(conseil.bat, 2)}. <b>Contre-le avec un {article(conseil.contre)}.</b></p>
        : <p className="ring__indice">L’adverbe adverse n’a aucun avantage de type.</p>;
    }
  }

  // ── Les pastilles sous chaque timbre : nature, origine, enchaînement (Facile), puis le résultat de la manche ──
  const puces = (cote: Cote, carte: CarteIndex, resultat: ReactNode) => {
    const bonus = aides ? enchainement(duel, cote, carte, tailles, REGLES) : 0;
    return (
      <ul className="c-pastilles ring__puces" aria-label={`${cote === 'joueur' ? 'Ton mot' : 'Son mot'} : nature et origine`}>
        <li className="c-pastille c-vignette" data-nature={carte.type}>{carte.type}</li>
        <li className="c-pastille c-vignette">{carte.faction}</li>
        {bonus > 0 && <li className="c-pastille c-dorure"><span>Enchaînement +{bonus}</span></li>}
        {resultat}
      </ul>
    );
  };
  const resultatSurLui = recap && manche && <li className="c-pastille c-tampon c-tampon--bon">{resultatCourt(manche.joueur)}</li>;
  const resultatSurMoi = recap && manche && (manche.adversaire.reussie
    ? <li className={`c-pastille c-tampon ${manche.adversaire.paree ? '' : 'c-tampon--mauvais'}`}>{resultatCourt(manche.adversaire)}</li>
    : <li className="c-pastille c-tampon c-tampon--bon">Sans riposte</li>);
  const monTimbre = jouee ?? choisie;

  return (
    <main className="ecran partie" data-etape={etape.nom} aria-busy={p.bloque} inert={paradeOuverte || intro}>
      <FondAnime />
      {toile}
      {p.alertes}
      <h1 className="visuellement-cache">Duel contre {nomAdverse}</h1>
      <div className="partie__haut">
        {p.abandon.visible && <button type="button" className="btn-tertiary danger" data-arme={p.abandon.arme} disabled={p.enregistrement || p.bloque} onClick={p.abandon.cliquer} onBlur={p.abandon.desarmer}>{p.abandon.arme ? 'Confirmer l’abandon' : 'Abandonner'}</button>}
      </div>
      <Entete nom={nomAdverse} detail={detailAdverse} maison={enJoute?.maison} affiche={montre} />
      <Historique manches={montre.manches} enCours={apresLeChoc ? null : duel.manche} />

      <section className="ring" aria-label="Les mots de la manche" data-elan={temps === 'elan' || temps === 'choc'} data-secousse={temps === 'choc'}
        style={{ '--secousse': `${Math.min(14, 2 + Math.max(manche?.joueur.infliges ?? 0, manche?.adversaire.infliges ?? 0) * 1.2)}px` } as CSSProperties}>
        <figure className="ring__place" data-camp="adversaire">
          <figcaption>Son mot</figcaption>
          <div className="ring__timbre" {...(adverse && revele ? survoler({ carte: adverse, finition: 'Normale', maitriseeLe: null }, etape.nom !== 'bilan') : {})}>
            {adverse && !intro ? <Timbre key={`${adverse.id}-${duel.manche}`} carte={adverse} oblitere cliquable={false} verso dosRenseigne montrerVerso={!revele} /> : <span className="ring__vide" />}
            {etape.nom === 'bilan' && manche && (temps === 'bouclier' || temps === 'elan' || temps === 'choc') && <Garde paree={manche.joueur.paree} />}
            {etape.nom === 'bilan' && manche && apresLeChoc && <DegatsVolants key={`lui-${manche.numero}`} attaque={manche.joueur} />}
          </div>
          {adverse && revele && puces('adversaire', adverse, resultatSurLui)}
        </figure>
        <div className="ring__medaillon" ref={medaillon} aria-hidden="true"><SceauDuel empreinte /></div>
        <figure className="ring__place" data-camp="joueur">
          <figcaption>Ton mot</figcaption>
          <div className="ring__timbre" data-apercu={!jouee && !!choisie} {...(monTimbre ? survoler(habiller(monTimbre)) : {})}>
            {monTimbre ? <Carte key={monTimbre.id} {...habiller(monTimbre)} cliquable={false} /> : <span className="ring__vide" />}
            {etape.nom === 'bilan' && manche && apresLeChoc && manche.adversaire.reussie && <DegatsVolants key={`moi-${manche.numero}`} attaque={manche.adversaire} subis />}
          </div>
          {monTimbre && puces('joueur', monTimbre, resultatSurMoi)}
        </figure>
      </section>
      {indice}

      <div className="partie__action" data-etape={etape.nom}>
        <div className="partie__etat" aria-live="polite">
          <p>{phrase}</p>
          {detail}
        </div>
        {bouton}
      </div>

      <div className="partie__bas">
        {recap ? p.bilan
          : (
            <div className="main-du-joueur">
              <ul className="main-du-joueur__timbres" aria-label="Ta main : touche un timbre pour le choisir, touche-le encore pour le jouer (touches 1 à 3)">
                {joueur.main.map((carte, i) => {
                  const pressee = etape.nom === 'choix' && carte.id === etape.choisie;
                  return (
                    <li key={carte.id}>
                      <button type="button" className="main-du-joueur__timbre" aria-pressed={pressee} disabled={etape.nom !== 'choix' || !arrive || p.bloque}
                        aria-label={`${carte.mot}, ${carte.type}, ${carte.faction}, attaque ${attaqueEnJeu(carte.attaque, carte.rarete)}, défense ${defenseEnJeu(carte.defense, carte.rarete)}${pressee ? ' — touche encore pour le jouer' : ''}`}
                        onClick={() => (pressee ? p.onJouer(carte) : p.onChoisir(carte.id))} {...survoler(habiller(carte))}>
                        <Carte {...habiller(carte)} cliquable={false} />
                        <kbd aria-hidden="true">{i + 1}</kbd>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="pioche" aria-label={`${pluriel(joueur.pioche.length, 'timbre')} en pioche`}>
                <span className="pioche__pile" aria-hidden="true" data-vide={joueur.pioche.length === 0} />
                <span className="pioche__compte"><b>{joueur.pioche.length}</b> en pioche</span>
              </div>
            </div>
          )}
      </div>

      {paradeOuverte && (etape.nom === 'parade' || etape.nom === 'bilan') && (
        <Parade key={`parade-${duel.manche}`}
          epreuve={etape.nom === 'parade' ? etape.epreuve : etape.parade.epreuve} nature={etape.adverse.type}
          debut={debutDeLaParade.current} secondes={p.duree}
          correction={etape.nom === 'bilan' ? { bonne: etape.parade.epreuve.bonne, choisie: etape.parade.choisie, juste: etape.parade.juste } : null}
          bloque={p.bloque} onRepondre={p.onRepondre} onTic={p.onTic} />
      )}
      {apercu}
      {intro && <IntroDuDuel adversaire={{ nom: nomAdverse, detail: detailAdverse }} joueur={p.pseudo} sons={p.sons} jaillir={jaillir} onFin={() => setIntro(false)} />}
    </main>
  );
}

function Entete({ nom, detail, maison, affiche }: { nom: string; detail: string; maison?: boolean; affiche: Duel }) {
  return (
    <header className="partie__camps">
      <BarreDeVie camp="adversaire" pv={affiche.camps.adversaire.pv} nom={<>{nom}<BadgeJoueurSimule maison={maison} /></>} detail={detail} />
      <BarreDeVie camp="joueur" pv={affiche.camps.joueur.pv} nom="Toi" />
    </header>
  );
}

// Au-dessus d'un timbre touché : les dégâts s'envolent (« −3 », « paré, au lieu de 6 »).
function DegatsVolants({ attaque, subis = false }: { attaque: Attaque; subis?: boolean }) {
  return (
    <span className="degats-volants" data-subis={subis} aria-hidden="true">
      −{attaque.infliges}<small>{attaque.paree ? `paré, au lieu de ${attaque.degats}` : 'coup plein'}</small>
    </span>
  );
}

// Sur son timbre, avant le choc : un bouclier s'il pare ton mot, une fissure sinon.
function Garde({ paree }: { paree: boolean }) {
  return (
    <span className="garde" data-paree={paree} aria-hidden="true">
      <svg viewBox="0 0 100 120" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
        {paree ? <path d="M50 8 86 24v34c0 24-20 43-36 52C34 101 14 82 14 58V24Z M50 22v72" />
          : <path d="M52 4 44 30l14 12-18 20 12 14-10 22 8 16" />}
      </svg>
    </span>
  );
}

// « −6 · coup plein », « −3 · paré, au lieu de 6 ».
function resultatCourt(attaque: Attaque): string {
  if (!attaque.reussie) return 'Manquée';
  return attaque.paree ? `−${attaque.infliges} · paré, au lieu de ${attaque.degats}` : `−${attaque.infliges} · coup plein`;
}

function PhraseDePrevision({ prevision }: { prevision: PrevisionDeLaManche }) {
  const { moi, lui, acheve } = prevision;
  return (
    <>
      Tu infligerais <b>{pluriel(moi.degats, 'dégât')}</b>, {moi.degatsSiParee} s’il pare.{' '}
      {acheve === 'toujours'
        ? <>Ton coup l’achève : <b>il ne pourra pas riposter</b>.</>
        : <>Il t’en infligerait <b>{lui.degats}</b>, ou {lui.degatsSiParee} si tu pares{acheve === 'sans-parade' ? ' — aucun si ton coup l’achève' : ''}.</>}
    </>
  );
}

// Le détail du calcul de ton attaque, en pastilles : base, type, enchaînement, rareté, défense adverse.
function DetailDuCalcul({ carte, prevision }: { carte: CarteIndex; prevision: PrevisionDeLaManche }) {
  const { moi } = prevision;
  return (
    <ul className="c-pastilles partie__calcul" aria-label="Détail du calcul de ton attaque">
      <li className="c-pastille c-vignette" data-nature={carte.type}>Base {carte.attaque}</li>
      {moi.bonusDeRarete > 0 && <li className="c-pastille c-vignette" data-rarete={carte.rarete}>+{moi.bonusDeRarete} rareté</li>}
      {moi.bonusDeType > 0 && <li className="c-pastille c-dorure"><span>+{moi.bonusDeType} type</span></li>}
      {moi.bonusDeFaction > 0 && <li className="c-pastille c-dorure"><span>+{moi.bonusDeFaction} enchaînement</span></li>}
      <li className="c-pastille c-vignette">−{moi.bloques} défense</li>
    </ul>
  );
}

function PhraseDuBilan({ moi, lui, parade, acheve }: { moi: Attaque; lui: Attaque; parade: { juste: boolean; choisie: number | null }; acheve: boolean }) {
  return (
    <>
      Tu infliges <b>{pluriel(moi.infliges, 'dégât')}</b>{moi.paree ? ` (il a paré, au lieu de ${moi.degats})` : ''}.{' '}
      {acheve || !lui.reussie
        ? <>Il tombe avant de pouvoir riposter.</>
        : <>Tu subis <b>{pluriel(lui.infliges, 'dégât')}</b>{parade.juste ? ` (parade réussie, au lieu de ${lui.degats})` : parade.choisie === null ? ' (temps écoulé)' : ' (parade manquée)'}.</>}
    </>
  );
}
