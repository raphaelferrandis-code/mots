// L'écran de fin (docs/duel/BRIEF-duel.md § 3) : un sceau, le titre (Victoire, Défaite, Égalité) et une phrase de contexte,
// les gains d'Encre et d'XP qui défilent, trois statistiques, et les boutons dans l'ordre de la hiérarchie.
// Les gains affichés sont ceux que le serveur (ou la sauvegarde locale) a réellement accordés.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

type Props = {
  resultat: Resultat;
  interrompu: boolean; // abandon ou duel expiré
  duel: Duel; // l'état final
  nomAdverse: string;
  encre: number; xp: number; reduite: boolean;
  cote: { avant: number; apres: number } | null;
  nonEnregistree: boolean;
  bilan: { parades: number; paradesReussies: number; maitrises: string[] };
  reduit: boolean;
  bloque: boolean;
  jaillir: (element: Element | null, reglages: Jaillissement) => void;
  rejouer: (() => void) | null; // à l'entraînement seulement
  onChangerDAdversaire: () => void;
};

export function FinDuDuel(p: Props) {
  useRacineInerte(); // les onglets derrière le voile ne quittent pas le duel par erreur
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

  const sceau = useRef<HTMLDivElement>(null);
  const principal = useRef<HTMLElement>(null);
  const [depart, setDepart] = useState(p.reduit);
  useEffect(() => {
    principal.current?.focus({ preventScroll: true });
    if (p.reduit) return;
    const minuterie = window.setTimeout(() => {
      setDepart(true);
      if (resultat === 'victoire') p.jaillir(sceau.current, { n: 120, genre: 'confetti', couleurs: ['#f0c48f', '#d89a5c', '#f1e7d0', '#3557a8', '#b0404b'], vitesse: [200, 720], g: 700, duree: [1.4, 2.6], taille: [5, 10], frein: .97 });
    }, 560);
    return () => window.clearTimeout(minuterie);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ligueAvant = p.cote ? ligueDe(p.cote.avant, EQUILIBRAGE.joute) : null;
  const ligueApres = p.cote ? ligueDe(p.cote.apres, EQUILIBRAGE.joute) : null;

  return createPortal(
    <div className="fin-duel" role="dialog" aria-modal="true" aria-labelledby="fin-duel-titre" data-resultat={resultat}>
      <div className="fin-duel__carte">
        <div className="fin-duel__sceau" ref={sceau} aria-hidden="true"><SceauDuel empreinte /></div>
        <h2 id="fin-duel-titre">{TITRES[resultat]}</h2>
        <p className="fin-duel__contexte">{contexte}</p>

        <div className="fin-duel__gains">
          <div><b><Compteur valeur={p.encre} depart={depart} duree={900} /></b><small>Encre</small></div>
          <div><b><Compteur valeur={p.xp} depart={depart} duree={1100} /></b><small>XP</small></div>
        </div>
        {p.reduite && <p className="fin-duel__note">Gains réduits après {REGLES.victoiresPleinesParJour} victoires aujourd’hui.</p>}
        {p.nonEnregistree && <p className="fin-duel__note" role="alert">Serveur indisponible : résultat non enregistré, cote inchangée.</p>}
        {p.cote && !p.nonEnregistree && ligueAvant && ligueApres && (
          <p className="fin-duel__note">
            Cote : <b>{p.cote.avant} → {p.cote.apres}</b> ({p.cote.apres >= p.cote.avant ? '+' : ''}{p.cote.apres - p.cote.avant})
            {ligueApres.rang > ligueAvant.rang && <> — <b>tu montes en ligue {ligueApres.nom} !</b></>}
            {ligueApres.rang < ligueAvant.rang && <> — tu redescends en ligue {ligueApres.nom}.</>}
          </p>
        )}

        <dl className="fin-duel__stats">
          <div><dt>Parades réussies</dt><dd>{p.bilan.paradesReussies} sur {p.bilan.parades}</dd></div>
          <div><dt>Dégâts infligés</dt><dd>{total}</dd></div>
          <div><dt>Meilleur coup</dt><dd>{meilleure && meilleure.joueur.infliges > 0 ? <><span lang="fr">{meilleure.joueur.carte.mot}</span> · {meilleure.joueur.infliges}</> : '—'}</dd></div>
        </dl>
        {p.bilan.maitrises.length > 0 && <p className="fin-duel__note">Cachet « Maîtrisé » : {p.bilan.maitrises.join(', ')}.</p>}

        <div className="fin-duel__actions">
          {p.rejouer
            ? <button type="button" className="btn-primary" ref={(b) => { principal.current = b; }} disabled={p.bloque} onClick={p.rejouer}>Rejouer</button>
            : <button type="button" className="btn-primary" ref={(b) => { principal.current = b; }} disabled={p.bloque} onClick={p.onChangerDAdversaire}>Retour aux duels</button>}
          {p.rejouer && <button type="button" className="btn-secondary" disabled={p.bloque} onClick={p.onChangerDAdversaire}>Changer d’adversaire</button>}
          <a className="btn-tertiary" href={lien({ ecran: 'deck' })}>Modifier mon deck</a>
        </div>
      </div>
    </div>,
    document.body,
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
