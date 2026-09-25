// La parade (docs/duel/BRIEF-duel.md § 3) : un panneau plein écran avec le mot adverse en grand, sa nature, un minuteur
// circulaire qui vire au rouge dans les cinq dernières secondes (avec un bip doux), et les quatre définitions
// (touches 1 à 4). Le retour est immédiat : la bonne réponse en vert, la mauvaise en rouge, la bonne toujours révélée.
//
// En ligne, le serveur ne dit quelle était la bonne réponse qu'après avoir reçu la tienne : le panneau montre ton
// choix « en attente » le temps de sa réponse, puis la correction (« correction »), avant de laisser place au bilan.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMaintenant } from '../../composants/usePartie.ts';
import { useRacineInerte } from '../../composants/useRacineInerte.ts';
import type { Epreuve } from '../../jeu/epreuve.ts';
import type { Nature } from '../../partage/types.ts';

const DELAI_AVANT_REPONSE = 500; // les règles ignorent une réponse donnée plus tôt (clic involontaire)
const PRESSE = 5; // secondes restantes à partir desquelles le minuteur presse
const RAYON = 25;
const CERCLE = 2 * Math.PI * RAYON;

export type Correction = { bonne: number; choisie: number | null; juste: boolean };

type Props = {
  epreuve: Epreuve;
  nature: Nature;
  debut: number;
  secondes: number | null; // null : sans limite de temps
  correction: Correction | null;
  bloque: boolean;
  onRepondre: (choisie: number) => void;
  onTic: (restantes: number) => void;
};

export function Parade({ epreuve, nature, debut, secondes, correction, bloque, onRepondre, onTic }: Props) {
  useRacineInerte(); // au clavier, Tab reste dans la parade
  const [choisie, setChoisie] = useState<number | null>(null);
  const titre = useRef<HTMLHeadingElement>(null);
  const repondu = choisie !== null || correction !== null;

  const repondre = (i: number): void => {
    if (repondu || bloque || Date.now() - debut < DELAI_AVANT_REPONSE) return;
    setChoisie(i);
    onRepondre(i);
  };

  // Le mot reçoit le focus : un lecteur d'écran l'annonce, et Tab mène droit aux quatre définitions.
  useEffect(() => { titre.current?.focus({ preventScroll: true }); }, []);

  // Les touches 1 à 4 répondent.
  const repondreAuClavier = useRef(repondre);
  repondreAuClavier.current = repondre;
  useEffect(() => {
    const touche = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const i = Number(e.key) - 1;
      if (/^[1-9]$/.test(e.key) && i < epreuve.propositions.length) { e.preventDefault(); repondreAuClavier.current(i); }
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [epreuve.propositions.length]);

  const etatDe = (i: number): 'bonne' | 'fausse' | 'attente' | 'autre' | undefined => {
    if (correction) return i === correction.bonne ? 'bonne' : i === correction.choisie ? 'fausse' : 'autre';
    return choisie === null ? undefined : i === choisie ? 'attente' : 'autre';
  };
  const note = !correction
    ? choisie !== null ? 'Réponse envoyée…' : 'Bonne réponse : les dégâts que tu subis sont divisés par deux.'
    : correction.juste ? 'Parade réussie. Ses dégâts sont divisés par deux.'
    : correction.choisie === null ? 'Temps écoulé. Tu encaisses le coup plein.' : 'Raté. Tu encaisses le coup plein.';

  return createPortal(
    <div className="parade" role="dialog" aria-modal="true" aria-labelledby="parade-mot" data-corrigee={!!correction}>
      <div className="parade__carte" data-nature={nature}>
        <div className="parade__tete">
          <p className="parade__surtitre">Pare son attaque</p>
          {secondes === null ? <span className="parade__minuteur" data-illimite="true" aria-label="Sans limite de temps">∞</span>
            : <Minuteur debut={debut} secondes={secondes} arrete={repondu} onTic={onTic} />}
        </div>
        <h2 className="parade__mot" id="parade-mot" lang="fr" tabIndex={-1} ref={titre}>{epreuve.mot}</h2>
        <p className="parade__question"><span className="c-pastille c-vignette" data-nature={nature}>{nature}</span>Quelle est sa définition ?</p>
        <ol className="parade__propositions">
          {epreuve.propositions.map((texte, i) => {
            const etat = etatDe(i);
            const lue = etat === 'bonne' ? (i === correction?.choisie ? 'Ta réponse, la bonne : ' : 'La bonne réponse : ') : etat === 'fausse' ? 'Ta réponse, fausse : ' : '';
            return (
              <li key={i}>
                <button type="button" className="parade__proposition" data-etat={etat} aria-disabled={repondu || bloque} onClick={() => repondre(i)}>
                  <kbd aria-hidden="true">{i + 1}</kbd>
                  <span lang="fr">{lue && <span className="visuellement-cache">{lue}</span>}{texte}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="parade__note" role="status" data-ton={correction ? (correction.juste ? 'bon' : 'mauvais') : undefined}>{note}</p>
      </div>
    </div>,
    document.body,
  );
}

// Le temps qui reste : un anneau qui se vide, les secondes au centre ; rouge et un bip doux par seconde à la fin.
function Minuteur({ debut, secondes, arrete, onTic }: { debut: number; secondes: number; arrete: boolean; onTic: (restantes: number) => void }) {
  const maintenant = useMaintenant(100);
  const [figee, setFigee] = useState<number | null>(null);
  useEffect(() => { if (arrete && figee === null) setFigee(Date.now()); }, [arrete, figee]);
  const reste = Math.max(0, debut + secondes * 1000 - (figee ?? maintenant));
  const restantes = Math.ceil(reste / 1000);
  const presse = restantes <= PRESSE;
  const tic = useRef(onTic);
  tic.current = onTic;
  useEffect(() => { if (!arrete && restantes > 0 && restantes <= PRESSE) tic.current(restantes); }, [restantes, arrete]);
  return (
    <span className="parade__minuteur" data-presse={presse} role="timer" aria-label={`${restantes} secondes restantes`}>
      <svg viewBox="0 0 58 58" aria-hidden="true">
        <circle className="parade__minuteur-fond" cx="29" cy="29" r={RAYON} />
        <circle className="parade__minuteur-anneau" cx="29" cy="29" r={RAYON} strokeDasharray={CERCLE} strokeDashoffset={(CERCLE * (1 - reste / (secondes * 1000))).toFixed(2)} />
      </svg>
      <b aria-hidden="true">{restantes}</b>
    </span>
  );
}
