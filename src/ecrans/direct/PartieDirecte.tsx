// La partie d'une joute en direct, au niveau du duel (audit de finition du 26/09/2026, chantier 6) : les mêmes pièces
// que le duel d'entraînement (ecrans/duel/Partie.tsx) — les barres de vie des deux camps, le face-à-face autour du
// médaillon (deux face-à-face en 2 contre 2), la barre d'action toujours au même endroit, la main, la parade plein
// écran avec son minuteur, les dégâts qui s'envolent, les sons du duel, puis la carte de fin avec la cote avant et
// après. L'écran n'applique aucune règle : le serveur mène la partie (serveur/moteur-direct.ts), l'écran la raconte.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { SceauDuel } from '../../composants/SceauDuel.tsx';
import { FondAnime } from '../../composants/accueil/FondAnime.tsx';
import { Carte } from '../../composants/carte/Carte.tsx';
import { Timbre } from '../../composants/timbre/Timbre.tsx';
import { useMaintenant } from '../../composants/usePartie.ts';
import { useGardeDeSortie } from '../../composants/useGardeDeSortie.ts';
import type { useJouteDirecte } from '../../composants/useJouteDirecte.ts';
import { lienDeSignalement } from '../../composants/legal/signalement.ts';
import { EQUILIBRAGE } from '../../config/equilibrage.ts';
import { NOMS_DIRECTS } from '../../jeu/direct.ts';
import type { BilanDirect, PoseDirect } from '../../jeu/direct.ts';
import { ID_FACE_CACHEE } from '../../jeu/duel.ts';
import { registresMasques } from '../../jeu/partie.ts';
import { meilleureFinition } from '../../jeu/sauvegarde.ts';
import type { Sauvegarde } from '../../jeu/sauvegarde.ts';
import { bilanDuCamp, campAdverse, contexteDeFin, coupSurLaVoie, dePseudo, enEquipe, facesAFace, monCamp, partenaire, poseurActuel, resultatPourMoi, secondesRestantes, voiesPourMoi } from '../../jeu/vueDirecte.ts';
import { lien } from '../../navigation/routes.ts';
import type { CarteIndex } from '../../partage/types.ts';
import type { SonsDuDuel } from '../../services/sonsDuDuel.ts';
import { BarreDeVie } from '../duel/BarreDeVie.tsx';
import { CarteDeFin, NoteDeCote } from '../duel/FinDuDuel.tsx';
import { Garde } from '../duel/Partie.tsx';
import { useParticules } from '../duel/useParticules.tsx';
import { ParadeDirecte } from './ParadeDirecte.tsx';

const CORRECTION = 1600; // le temps de voir la bonne réponse, une fois la manche résolue
const AVANT_LA_FIN = 1500; // puis le choc et les dégâts, avant la carte de fin
const PRESSE = 5;

type Direct = ReturnType<typeof useJouteDirecte>;
type Props = { sauvegarde: Sauvegarde; direct: Direct; sons: SonsDuDuel; reduit: boolean };

export function PartieDirecte({ sauvegarde, direct, sons, reduit }: Props) {
  const p = direct.etat!.partie!;
  const v = p.vue;
  const moi = v.joueurs[v.moi];
  const equipe = enEquipe(v);
  const nous = monCamp(v), eux = campAdverse(v);
  const ami = partenaire(v);
  const pseudo = (i: number): string => (i === v.moi ? 'Toi' : v.joueurs[i]?.pseudo ?? '');
  const heure = useMaintenant(250) + direct.decalage;
  const restantes = secondesRestantes(v, heure);
  const bloque = direct.occupe || direct.reessayer;
  const poseur = poseurActuel(v);
  const aMoiDePoser = poseur === v.moi && restantes > 0;
  const voies = aMoiDePoser ? voiesPourMoi(v) : [];
  const faces = facesAFace(v);

  // Quitter l'écran pendant la partie se confirme.
  useGardeDeSortie(v.phase !== 'fin', {
    titre: 'Quitter la partie ?',
    message: 'La partie continue sans toi : à chaque tour, ta première carte part toute seule, et deux tours sans jouer font perdre ton camp.',
    confirmer: 'Quitter la partie', annuler: 'Rester', danger: true, surtitre: 'Joute en cours',
  });

  // ── La chronologie d'une manche, du point de vue du joueur : les sons, la correction, le choc, la fin ──
  // La sortie audio s'ouvre dès l'arrivée : le joueur vient de presser « J'y vais ! », le navigateur l'autorise.
  useEffect(() => { sons.preparer(); }, [sons]);
  const { toile, jaillir } = useParticules(reduit);
  const medaillons = useRef<(HTMLDivElement | null)[]>([]);
  const [correctionJusqua, setCorrectionJusqua] = useState(0);
  const [choc, setChoc] = useState(false);
  const [finVisible, setFinVisible] = useState(v.phase === 'fin');
  const precedent = useRef<{ phase: string; manche: number; poses: number } | null>(null);
  const minuteries = useRef<number[]>([]);
  // Les chiffres de la carte de fin, relevés manche après manche (la vue du serveur ne garde que la dernière manche) :
  // parades réussies, dégâts infligés par mon camp, mon meilleur coup. Une partie reprise en cours de route n'a pas tout
  // vu : sa carte de fin montre alors les points de vie.
  const releve = useRef({ partie: '', manches: [] as number[], parades: 0, attaques: 0, infliges: 0, meilleur: null as { mot: string; degats: number } | null });
  const noterLaManche = (b: ReturnType<typeof bilanDuCamp>): void => {
    if (releve.current.partie !== p.id) releve.current = { partie: p.id, manches: [], parades: 0, attaques: 0, infliges: 0, meilleur: null };
    const r = releve.current;
    if (r.manches.includes(v.manche)) return;
    r.manches.push(v.manche); r.parades += b.parades; r.attaques += b.attaques; r.infliges += b.infliges;
    for (const coup of b.nosCoups) if (coup.joueur === v.moi && coup.degats > (r.meilleur?.degats ?? 0)) r.meilleur = { mot: coup.mot, degats: coup.degats };
  };
  useEffect(() => () => { for (const m of minuteries.current) window.clearTimeout(m); }, []);
  useEffect(() => {
    const avant = precedent.current;
    precedent.current = { phase: v.phase, manche: v.manche, poses: v.poses.length };
    if (!avant) return; // premier affichage (partie reprise) : pas de son rétroactif
    const plusTard = (ms: number, faire: () => void): void => { minuteries.current.push(window.setTimeout(faire, reduit ? 0 : ms)); };
    if (v.poses.length > (avant.manche === v.manche ? avant.poses : 0)) sons.poser();
    if (v.phase === 'reponses' && avant.phase === 'pose') sons.souffle();
    const resolue = (avant.phase === 'reponses' || avant.phase === 'arbitrage') && (v.phase === 'bilan' || v.phase === 'fin');
    if (resolue) {
      const b = bilanDuCamp(v);
      noterLaManche(b);
      if (b.attaques > 0) { if (b.parades > 0) sons.juste(); else sons.faux(); }
      setCorrectionJusqua(Date.now() + (reduit ? 900 : CORRECTION));
      plusTard(CORRECTION, () => {
        sons.choc(Math.max(b.infliges, b.subis));
        for (const m of medaillons.current) jaillir(m, { n: 30 + Math.max(b.infliges, b.subis) * 4, genre: 'encre', couleurs: ['#16284a', '#2a3f66', '#d89a5c', '#f1e7d0'], vitesse: [160, 560], g: 600, duree: [.7, 1.3], taille: [3, 7], frein: .95 });
        setChoc(true);
        plusTard(420, () => setChoc(false));
      });
    }
    if (v.phase === 'fin' && avant.phase !== 'fin') {
      const resultat = resultatPourMoi(v);
      plusTard(resolue ? CORRECTION + AVANT_LA_FIN : 300, () => {
        if (resultat === 'victoire') sons.victoire(true); else if (resultat === 'defaite') sons.defaite(); else sons.egalite();
        setFinVisible(true);
      });
    }
  }, [v.phase, v.manche, v.poses.length]); // eslint-disable-line react-hooks/exhaustive-deps
  // La correction commence au premier affichage de la manche résolue (l'effet ci-dessus ne fixe son terme qu'après) :
  // la parade reste ainsi ouverte d'un seul tenant, sans se fermer puis se rouvrir.
  const vientDeSeResoudre = !!precedent.current && (precedent.current.phase === 'reponses' || precedent.current.phase === 'arbitrage') && (v.phase === 'bilan' || v.phase === 'fin');
  const enCorrection = vientDeSeResoudre || Date.now() < correctionJusqua;

  // Le tic-tac des cinq dernières secondes, quand c'est à moi de poser.
  useEffect(() => { if (aMoiDePoser && v.phase === 'pose' && restantes > 0 && restantes <= PRESSE) sons.tic(restantes); }, [restantes, aMoiDePoser]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Poser un timbre : le choisir dans la main, puis le poser (sur l'une des voies libres, en 2 contre 2) ──
  const [choisie, setChoisie] = useState<string | null>(null);
  useEffect(() => { setChoisie(null); }, [v.manche, poseur]);
  const carteChoisie = moi.main.find((c) => c.id === choisie) ?? null;
  const poser = (carte: CarteIndex, voie: number): void => {
    sons.preparer();
    void direct.agir({ type: 'poser', carte: carte.id, voie });
  };
  const choisir = (id: string): void => {
    if (!aMoiDePoser || bloque) return;
    sons.preparer(); sons.selection();
    const carte = moi.main.find((c) => c.id === id);
    if (carte && choisie === id && voies.length === 1) poser(carte, voies[0]);
    else setChoisie(id);
  };
  // Les touches 1 à 3 choisissent un timbre de la main.
  const auClavier = useRef(choisir);
  auClavier.current = choisir;
  useEffect(() => {
    if (!aMoiDePoser) return;
    const touche = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.target instanceof HTMLElement && e.target.closest('input, textarea, select'))) return;
      const carte = moi.main[Number(e.key) - 1];
      if (carte && /^[1-9]$/.test(e.key)) { e.preventDefault(); auClavier.current(carte.id); }
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [aMoiDePoser, moi.main]);

  // ── Abandonner : en deux temps, comme au duel ──
  const [abandonArme, setAbandonArme] = useState(false);

  // ── La fin : rejouer (la même joute) ou revenir aux joutes ──
  const quitter = async (rejouer: boolean): Promise<void> => {
    sons.preparer();
    await direct.quitter();
    if (rejouer && !direct.courant()?.partie) await direct.chercher(v.mode, registresMasques(sauvegarde));
  };

  // ── La barre d'action ──
  const bilan = bilanDuCamp(v);
  let phrase: ReactNode = null;
  let boutons: ReactNode = null;
  if (v.phase === 'pose' && aMoiDePoser) {
    const face = voies.length === 1 ? faces[voies[0]].eux : null;
    phrase = !carteChoisie
      ? (face ? <>Il a posé un <b>{face.carte.type.toLowerCase()}</b>. Quel timbre lui opposes-tu ?</> : <>À toi de poser : choisis un timbre de ta main.</>)
      : <>Prêt à poser <b>« {carteChoisie.mot} »</b>{voies.length > 1 ? ' : face à quel timbre ?' : ' ?'}</>;
    boutons = carteChoisie && voies.map((voie) => {
      const enFace = faces[voie].eux;
      const libelle = voies.length === 1 ? `Jouer « ${carteChoisie.mot} »` : enFace ? `Face à son ${enFace.carte.type.toLowerCase()}` : `Au face-à-face ${voie + 1}`;
      return <button key={voie} type="button" className={voie === voies[0] ? 'btn-primary sm' : 'btn-secondary sm'} disabled={bloque} onClick={() => poser(carteChoisie, voie)}>{libelle}</button>;
    });
    if (!carteChoisie) boutons = <button type="button" className="btn-primary sm" disabled>Choisis un timbre dans ta main</button>;
  } else if (v.phase === 'pose' && poseur !== null) {
    phrase = <span className="partie__attente">{poseur === ami ? `${pseudo(poseur)}, ton partenaire, pose son timbre…` : `${pseudo(poseur)} pose son timbre…`}</span>;
  } else if (v.phase === 'reponses' || v.phase === 'arbitrage') {
    phrase = <span className="partie__attente">{equipe ? 'Retrouvez les définitions des mots adverses.' : 'Retrouve la définition du mot adverse.'}</span>;
  } else if ((v.phase === 'bilan' || v.phase === 'fin') && v.bilan.length) {
    phrase = equipe
      ? <>Ton camp inflige <b>{bilan.infliges}</b> dégâts et en subit <b>{bilan.subis}</b> · {bilan.parades} parade{bilan.parades > 1 ? 's' : ''} réussie{bilan.parades > 1 ? 's' : ''} sur {bilan.attaques}.</>
      : <>Tu infliges <b>{bilan.infliges}</b> {bilan.nosCoups[0]?.paree ? '(il a paré)' : '(coup plein)'} · tu subis <b>{bilan.subis}</b> {bilan.leursCoups[0]?.paree ? '(parade réussie)' : bilan.leursCoups[0]?.choisie === null ? '(temps écoulé)' : '(parade manquée)'}.</>;
  }
  const minuterie = v.phase === 'pose' || v.phase === 'bilan'
    ? <span className="direct__temps" data-presse={aMoiDePoser && restantes <= PRESSE} role="timer" aria-label={v.phase === 'bilan' ? `Manche suivante dans ${restantes} secondes` : `${restantes} secondes pour poser`}>{v.phase === 'bilan' ? `Suite dans ${restantes} s` : `${restantes} s`}</span>
    : null;

  const habiller = (carte: CarteIndex) => {
    const possedee = sauvegarde.cartes[carte.id];
    return { carte, finition: possedee ? meilleureFinition(possedee) : 'Normale' as const };
  };
  const pvDeDepart = EQUILIBRAGE.duel.pointsDeVie * (v.joueurs.length / 2);
  const statsDeFin = (): { nom: string; valeur: ReactNode }[] => {
    const r = releve.current;
    const complet = r.partie === p.id && r.manches[0] === 1 && r.manches.length >= v.manche - 1;
    return complet ? [
      { nom: 'Parades réussies', valeur: `${r.parades} sur ${r.attaques}` },
      { nom: equipe ? 'Dégâts de ton camp' : 'Dégâts infligés', valeur: r.infliges },
      { nom: 'Ton meilleur coup', valeur: r.meilleur ? <><span lang="fr">{r.meilleur.mot}</span> · {r.meilleur.degats}</> : '—' },
    ] : [
      { nom: 'Manches', valeur: v.manche },
      { nom: equipe ? 'Vie de ton camp' : 'Tes points de vie', valeur: v.pv[nous] },
      { nom: equipe ? 'Vie adverse' : 'Ses points de vie', valeur: v.pv[eux] },
    ];
  };
  const bilanVisible = (v.phase === 'bilan' || v.phase === 'fin') && !enCorrection && v.bilan.length > 0;
  const pioche = Math.max(0, moi.restantes - moi.main.length);

  return (
    <main className="ecran partie partie--direct" data-etape={v.phase} data-equipe={equipe} aria-busy={bloque}>
      <FondAnime />
      {toile}
      <h1 className="visuellement-cache">Joute en direct : {v.noms[eux]} contre {equipe ? v.noms[nous] : 'toi'}</h1>
      {direct.erreur && <div className="bloc bloc--alerte" role="alert"><p>{direct.erreur}</p>{direct.reessayer && <button type="button" className="btn-secondary sm" disabled={direct.occupe} onClick={() => void direct.retenter()}>Réessayer</button>}</div>}
      <div className="partie__haut direct__haut">
        <p className="direct__mode">Joute en direct · {NOMS_DIRECTS[v.mode]}{!direct.connecte && <span title="La partie continue : l’écran se met à jour un peu moins vite."> · connexion lente</span>}</p>
        {v.phase !== 'fin' && <button type="button" className="btn-tertiary danger" data-arme={abandonArme} disabled={bloque}
          onClick={() => { if (abandonArme) { setAbandonArme(false); void direct.agir({ type: 'abandonner' }); } else setAbandonArme(true); }}
          onBlur={() => setAbandonArme(false)}>{abandonArme ? 'Confirmer l’abandon (défaite pour ton camp)' : 'Abandonner'}</button>}
      </div>
      <header className="partie__camps">
        <BarreDeVie camp="adversaire" maximum={pvDeDepart} pv={v.pv[eux]} nom={v.noms[eux]} detail={equipe ? 'Le camp adverse' : 'En direct'} />
        <BarreDeVie camp="joueur" maximum={pvDeDepart} pv={v.pv[nous]} nom={equipe ? v.noms[nous] : 'Toi'} detail={ami !== null ? `Ton camp, avec ${pseudo(ami)}` : undefined} />
      </header>
      <p className="historique__manche direct__manche">Manche {v.manche}</p>

      <div className="direct__faces" data-nombre={faces.length}>
        {faces.map((f) => {
          const notreCoup = coupSurLaVoie(v, f.voie, true), leurCoup = coupSurLaVoie(v, f.voie, false);
          return (
            <section key={f.voie} className="ring" aria-label={equipe ? `Face-à-face ${f.voie + 1}` : 'Les mots de la manche'} data-secousse={choc}
              style={{ '--secousse': `${Math.min(14, 2 + Math.max(bilan.infliges, bilan.subis) * 1.2)}px` } as CSSProperties}>
              <figure className="ring__place" data-camp="adversaire">
                <figcaption>{equipe ? (f.eux ? pseudo(f.eux.joueur) : `Face-à-face ${f.voie + 1}`) : 'Son mot'}</figcaption>
                <div className="ring__timbre">
                  {f.eux ? <Timbre key={`${f.eux.carte.id}-${v.manche}`} carte={f.eux.carte} oblitere cliquable={false} verso dosRenseigne montrerVerso={f.eux.carte.id === ID_FACE_CACHEE} /> : <span className="ring__vide" />}
                  {bilanVisible && notreCoup && <Garde key={`garde-${v.manche}-${f.voie}`} paree={notreCoup.paree} />}
                  {bilanVisible && notreCoup && <DegatsVolants key={`eux-${v.manche}-${f.voie}`} coup={notreCoup} />}
                </div>
                {f.eux && f.eux.carte.id !== ID_FACE_CACHEE && <Puces pose={f.eux} resultat={bilanVisible ? notreCoup : null} deMonCamp={false} />}
              </figure>
              <div className="ring__medaillon" ref={(m) => { medaillons.current[f.voie] = m; }} aria-hidden="true"><SceauDuel empreinte /></div>
              <figure className="ring__place" data-camp="joueur">
                <figcaption>{equipe ? (f.nous ? pseudo(f.nous.joueur) : 'Ton camp') : 'Ton mot'}</figcaption>
                <div className="ring__timbre">
                  {f.nous ? <Carte key={f.nous.carte.id} {...habiller(f.nous.carte)} cliquable={false} /> : <span className="ring__vide" />}
                  {bilanVisible && leurCoup && <DegatsVolants key={`nous-${v.manche}-${f.voie}`} coup={leurCoup} subis />}
                </div>
                {f.nous && <Puces pose={f.nous} resultat={bilanVisible ? leurCoup : null} deMonCamp />}
              </figure>
            </section>
          );
        })}
      </div>

      <div className="partie__action" data-etape={v.phase}>
        <div className="partie__etat" aria-live="polite"><p>{phrase}</p></div>
        {minuterie}
        {boutons}
      </div>

      <div className="partie__bas">
        <div className="main-du-joueur">
          <ul className="main-du-joueur__timbres" aria-label="Ta main : touche un timbre pour le choisir, touche-le encore pour le jouer (touches 1 à 3)">
            {moi.main.map((carte, i) => {
              const pressee = carte.id === choisie;
              return (
                <li key={carte.id}>
                  <button type="button" className="main-du-joueur__timbre" aria-pressed={pressee} disabled={!aMoiDePoser || bloque}
                    aria-label={`${carte.mot}, ${carte.type}, ${carte.faction}${pressee ? ' — touche encore pour le jouer' : ''}`} onClick={() => choisir(carte.id)}>
                    <Carte {...habiller(carte)} cliquable={false} />
                    <kbd aria-hidden="true">{i + 1}</kbd>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="pioche" aria-label={`${pioche} timbre${pioche > 1 ? 's' : ''} en pioche`}>
            <span className="pioche__pile" aria-hidden="true" data-vide={pioche === 0} />
            <span className="pioche__compte"><b>{pioche}</b> en pioche</span>
          </div>
        </div>
        {ami !== null && v.joueurs[ami].main.length > 0 && (
          <details className="direct__partenaire">
            <summary>La main {dePseudo(pseudo(ami))}</summary>
            <ul className="direct__partenaire-main">{v.joueurs[ami].main.map((c) => <li key={c.id}><Carte carte={c} finition="Normale" cliquable={false} /></li>)}</ul>
          </details>
        )}
      </div>

      {(v.phase === 'reponses' || v.phase === 'arbitrage' || enCorrection) && v.questions.length > 0 && (
        <ParadeDirecte vue={v} decalage={direct.decalage} correction={enCorrection} bloque={bloque}
          onProposer={(cible, choix) => { sons.preparer(); sons.selection(); void direct.agir({ type: 'proposer', cible, choix }); }}
          onTrancher={(cible, choix) => { sons.preparer(); sons.selection(); void direct.agir({ type: 'trancher', cible, choix }); }}
          onTic={(r) => sons.tic(r)} />
      )}

      {v.phase === 'fin' && finVisible && resultatPourMoi(v) && (
        <CarteDeFin resultat={resultatPourMoi(v)!} contexte={contexteDeFin(v)} encre={p.gains.encre} xp={p.gains.xp} reduit={reduit} jaillir={jaillir}
          notes={<>
            {p.gains.reduite && <p className="fin-duel__note">Récompense du jour atteinte : les gains de cette joute sont réduits.</p>}
            {p.cotes ? <NoteDeCote cote={p.cotes} />
              : <p className="fin-duel__note">Tu as déjà affronté {equipe ? 'ces adversaires' : 'ce joueur'} {EQUILIBRAGE.joute.rencontresClasseesParJour} fois aujourd’hui : cette joute ne change pas la cote.</p>}
            <p className="fin-duel__note"><a className="fin-duel__signaler" href={lienDeSignalement({ genre: equipe ? 'equipe' : 'joueur', nom: v.noms[eux] })}>Signaler {equipe ? 'cette équipe' : 'ce joueur'}</a></p>
          </>}
          stats={statsDeFin()}
          actions={<>
            <button type="button" className="btn-primary" disabled={bloque} onClick={() => void quitter(true)}>Rejouer</button>
            <button type="button" className="btn-secondary" disabled={bloque} onClick={() => void quitter(false)}>Retour aux joutes</button>
            <a className="btn-tertiary" href={lien({ ecran: 'classement' })}>Voir le classement</a>
          </>} />
      )}
    </main>
  );
}

// Sous un timbre posé : sa nature et son origine, puis, au bilan, le coup qu'il a reçu (en vert ce qui sert mon camp :
// notre coup plein sur leur timbre, notre parade sur le nôtre).
function Puces({ pose, resultat, deMonCamp }: { pose: PoseDirect; resultat: BilanDirect | null; deMonCamp: boolean }) {
  const ton = !resultat ? '' : deMonCamp ? (resultat.paree ? 'c-tampon--bon' : 'c-tampon--mauvais') : (resultat.paree ? '' : 'c-tampon--bon');
  return (
    <ul className="c-pastilles ring__puces">
      <li className="c-pastille c-vignette" data-nature={pose.carte.type}>{pose.carte.type}</li>
      <li className="c-pastille c-vignette">{pose.carte.faction}</li>
      {resultat && <li className={`c-pastille c-tampon ${ton}`}>−{resultat.degats} · {resultat.paree ? 'paré' : 'coup plein'}</li>}
    </ul>
  );
}

// Au-dessus du timbre touché : les dégâts s'envolent.
function DegatsVolants({ coup, subis = false }: { coup: BilanDirect; subis?: boolean }) {
  return (
    <span className="degats-volants" data-subis={subis} aria-hidden="true">
      −{coup.degats}<small>{coup.paree ? 'paré' : 'coup plein'}</small>
    </span>
  );
}
