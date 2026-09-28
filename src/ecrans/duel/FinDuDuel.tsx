// L'écran de fin (docs/duel/BRIEF-duel.md § 3) : un sceau, le titre (Victoire, Défaite, Égalité) et une phrase de contexte,
// les gains d'Encre et d'XP qui défilent, trois statistiques, et les boutons dans l'ordre de la hiérarchie.
// Les gains affichés sont ceux que le serveur (ou la sauvegarde locale) a réellement accordés.
// La carte elle-même (CarteDeFin) sert aussi à la fin d'une joute en direct (ecrans/direct/FinDeJoute.tsx).

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MomentsDeProgres, useRecompensesDuMoment } from '../../composants/Recompenses.tsx';
import { SceauDuel } from '../../composants/SceauDuel.tsx';
import { useRacineInerte } from '../../composants/useRacineInerte.ts';
import { EQUILIBRAGE } from '../../config/equilibrage.ts';
import type { Duel } from '../../jeu/duel.ts';
import { ligueDe } from '../../jeu/joute.ts';
import type { Resultat } from '../../jeu/progression.ts';
import { lien } from '../../navigation/routes.ts';
import type { Jaillissement } from '../../composants/ceremonie/effets.ts';

const REGLES = EQUILIBRAGE.duel;
const TITRES: Record<Resultat, string> = { victoire: 'Victoire', defaite: 'Défaite', nul: 'Égalité' };

type Jaillir = (element: Element | null, reglages: Jaillissement) => void;

type Props = {
  resultat: Resultat;
  interrompu: boolean; // abandon ou duel expiré
  duel: Duel; // l'état final
  nomAdverse: string;
  encre: number; xp: number; reduite: boolean;
  cote: { avant: number; apres: number } | null;
  nonEnregistree: boolean;
  bilan: { parades: number; paradesReussies: number };
  reduit: boolean;
  bloque: boolean;
  jaillir: Jaillir;
  rejouer: (() => void) | null; // à l'entraînement seulement
  onChangerDAdversaire: () => void;
};

export function FinDuDuel(p: Props) {
  const { duel, resultat } = p;
  const moi = duel.camps.joueur.pv;
  const lui = duel.camps.adversaire.pv;
  const manches = duel.manches.length;
  const aTerre = moi === 0 || lui === 0;
  const contexte = p.interrompu ? 'Duel interrompu : défaite enregistrée, sans récompense de fin.'
    : resultat === 'victoire' ? (aTerre ? `${p.nomAdverse} tombe à la manche ${manches}.` : `Aux points, ${moi} à ${lui}.`)
    : resultat === 'defaite' ? (aTerre ? `Tu tombes à la manche ${manches}. Revanche ?` : `Aux points, ${moi} à ${lui}.`)
    : `${manches} manches, et personne ne cède.`;

  const infliges = duel.manches.map((m) => m.joueur.infliges);
  const total = infliges.reduce((a, b) => a + b, 0);
  const meilleure = duel.manches.reduce<(typeof duel.manches)[number] | null>((m, x) => (!m || x.joueur.infliges > m.joueur.infliges ? x : m), null);

  return (
    <CarteDeFin resultat={resultat} contexte={contexte} encre={p.encre} xp={p.xp} reduit={p.reduit} jaillir={p.jaillir}
      notes={<>
        {p.reduite && <p className="fin-duel__note">Gains réduits après {REGLES.victoiresPleinesParJour} victoires aujourd’hui.</p>}
        {p.nonEnregistree && <p className="fin-duel__note" role="alert">Serveur indisponible : résultat non enregistré, cote inchangée.</p>}
        {p.cote && !p.nonEnregistree && <NoteDeCote cote={p.cote} />}
      </>}
      stats={[
        { nom: 'Parades réussies', valeur: `${p.bilan.paradesReussies} sur ${p.bilan.parades}` },
        { nom: 'Dégâts infligés', valeur: total },
        { nom: 'Meilleur coup', valeur: meilleure && meilleure.joueur.infliges > 0 ? <><span lang="fr">{meilleure.joueur.carte.mot}</span> · {meilleure.joueur.infliges}</> : '—' },
      ]}
      actions={<>
        {p.rejouer
          ? <button type="button" className="btn-primary" disabled={p.bloque} onClick={p.rejouer}>Rejouer</button>
          : <button type="button" className="btn-primary" disabled={p.bloque} onClick={p.onChangerDAdversaire}>Retour aux duels</button>}
        {p.rejouer && <button type="button" className="btn-secondary" disabled={p.bloque} onClick={p.onChangerDAdversaire}>Changer d’adversaire</button>}
        <a className="btn-tertiary" href={lien({ ecran: 'deck' })}>Modifier mon carnet</a>
      </>} />
  );
}

// La carte de fin, commune au duel et à la joute en direct : le sceau, le titre, le contexte, les gains qui défilent,
// les notes (gains réduits, cote), trois chiffres, les progrès du moment (niveau, succès) et les boutons, le premier
// étant l'action principale (il reçoit le focus).
export function CarteDeFin({ resultat, contexte, encre, xp, notes, stats, reduit, jaillir, actions }: {
  resultat: Resultat; contexte: string; encre: number; xp: number; notes: ReactNode;
  stats: { nom: string; valeur: ReactNode }[]; reduit: boolean; jaillir: Jaillir; actions: ReactNode;
}) {
  useRacineInerte(); // les onglets derrière le voile ne quittent pas l'écran par erreur
  // Le niveau et les succès gagnés pendant la partie s’affichent sur la carte (et non plus dans un bandeau par-dessus).
  const progres = useRecompensesDuMoment(true);
  const carte = useRef<HTMLDivElement>(null);
  const sceau = useRef<HTMLDivElement>(null);
  const [depart, setDepart] = useState(reduit);
  useEffect(() => {
    carte.current?.querySelector<HTMLElement>('.fin-duel__actions :is(button, a)')?.focus({ preventScroll: true });
    if (reduit) return;
    const minuterie = window.setTimeout(() => {
      setDepart(true);
      if (resultat === 'victoire') jaillir(sceau.current, { n: 120, genre: 'confetti', couleurs: ['#f0c48f', '#d89a5c', '#f1e7d0', '#3557a8', '#b0404b'], vitesse: [200, 720], g: 700, duree: [1.4, 2.6], taille: [5, 10], frein: .97 });
    }, 560);
    return () => window.clearTimeout(minuterie);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(
    <div className="fin-duel" role="dialog" aria-modal="true" aria-labelledby="fin-duel-titre" data-resultat={resultat}>
      <div className="fin-duel__carte" ref={carte}>
        <div className="fin-duel__sceau" ref={sceau} aria-hidden="true"><SceauDuel empreinte /></div>
        <h2 id="fin-duel-titre">{TITRES[resultat]}</h2>
        <p className="fin-duel__contexte">{contexte}</p>

        <div className="fin-duel__gains">
          <div><b><Compteur valeur={encre} depart={depart} duree={900} /></b><small>Encre</small></div>
          <div><b><Compteur valeur={xp} depart={depart} duree={1100} /></b><small>XP</small></div>
        </div>
        {notes}

        <dl className="fin-duel__stats">
          {stats.map((s) => <div key={s.nom}><dt>{s.nom}</dt><dd>{s.valeur}</dd></div>)}
        </dl>
        <MomentsDeProgres recompenses={progres} />

        <div className="fin-duel__actions">{actions}</div>
      </div>
    </div>,
    document.body,
  );
}

// La cote, avant et après, et la ligue quand elle change.
export function NoteDeCote({ cote }: { cote: { avant: number; apres: number } }) {
  const avant = ligueDe(cote.avant, EQUILIBRAGE.joute);
  const apres = ligueDe(cote.apres, EQUILIBRAGE.joute);
  return (
    <p className="fin-duel__note">
      Cote : <b>{cote.avant} → {cote.apres}</b> ({cote.apres >= cote.avant ? '+' : ''}{cote.apres - cote.avant})
      {apres.rang > avant.rang && <> — <b>tu montes en ligue {apres.nom} !</b></>}
      {apres.rang < avant.rang && <> — tu redescends en ligue {apres.nom}.</>}
    </p>
  );
}

// Un gain qui défile de 0 à sa valeur, une fois l'écran posé.
function Compteur({ valeur, depart, duree }: { valeur: number; depart: boolean; duree: number }) {
  const [affiche, setAffiche] = useState(depart ? valeur : 0);
  useEffect(() => {
    if (!depart) return;
    let cadre = 0;
    const debut = performance.now();
    const pas = (maintenant: number): void => {
      const k = Math.min(1, (maintenant - debut) / duree);
      setAffiche(Math.round(valeur * (1 - Math.pow(1 - k, 3))));
      if (k < 1) cadre = requestAnimationFrame(pas);
    };
    cadre = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(cadre);
  }, [depart, valeur, duree]);
  return <>+{affiche}</>;
}
