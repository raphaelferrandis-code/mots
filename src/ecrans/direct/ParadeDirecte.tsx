// La parade d'une joute en direct, au format de celle du duel (ecrans/duel/Parade.tsx) : un panneau plein écran, le mot
// adverse en grand, sa nature, le minuteur circulaire, les quatre définitions. En 2 contre 2, les deux mots adverses se
// suivent dans le même panneau : chacun voit la proposition de son partenaire et peut changer d'avis jusqu'à la fin du
// temps ; en cas de désaccord, le dernier de l'équipe à avoir posé tranche (phase « arbitrage »). Quand la manche se
// résout, le panneau reste un instant pour montrer la bonne réponse, comme au duel.
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRacineInerte } from '../../composants/useRacineInerte.ts';
import { TEMPS_DIRECT } from '../../jeu/direct.ts';
import type { QuestionDirect, VueDirect } from '../../jeu/direct.ts';
import { bilanDuCamp, dePseudo, enEquipe, monCamp, partenaire, reponseRetenue } from '../../jeu/vueDirecte.ts';
import { Minuteur } from '../duel/Parade.tsx';

type Props = {
  vue: VueDirect;
  decalage: number; // heure du serveur − heure de l'appareil
  correction: boolean; // la manche vient de se résoudre : la bonne réponse s'affiche
  bloque: boolean;
  onProposer: (cible: number, choix: number) => void;
  onTrancher: (cible: number, choix: number) => void;
  onTic: (restantes: number) => void;
};

export function ParadeDirecte({ vue, decalage, correction, bloque, onProposer, onTrancher, onTic }: Props) {
  useRacineInerte(); // au clavier, Tab reste dans la parade
  const equipe = enEquipe(vue);
  const moi = vue.moi;
  const arbitre = vue.arbitres[monCamp(vue)];
  const autre = partenaire(vue);
  const pseudo = (i: number | null): string => (i === null ? '' : vue.joueurs[i]?.pseudo ?? '');
  const titre = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titre.current?.focus({ preventScroll: true }); }, []);

  // En solo, une seule réponse (comme au duel) : dès que les deux joueurs ont répondu, la manche se résout.
  const repondu = !equipe && vue.questions.every((q) => q.reponses[moi] !== undefined);
  const arbitrage = vue.phase === 'arbitrage';
  const choisir = (q: QuestionDirect, i: number): void => {
    if (correction || bloque) return;
    if (arbitrage) { if (arbitre === moi && q.desaccord && Object.values(q.reponses).includes(i)) onTrancher(q.cible, i); return; }
    if (vue.phase !== 'reponses' || (!equipe && q.reponses[moi] !== undefined) || q.reponses[moi] === i) return;
    onProposer(q.cible, i);
  };

  // Les touches 1 à 4 répondent (en solo : une seule question).
  const auClavier = useRef(choisir);
  auClavier.current = choisir;
  const unique = vue.questions.length === 1 ? vue.questions[0] : null;
  useEffect(() => {
    if (!unique) return;
    const touche = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const i = Number(e.key) - 1;
      if (/^[1-9]$/.test(e.key) && i < unique.propositions.length) { e.preventDefault(); auClavier.current(unique, i); }
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [unique]);

  // Le minuteur de la phase (réponses ou arbitrage) ; pendant la correction, il reste figé tel qu'il était.
  const minuteur = useRef({ cle: '', debut: 0, secondes: 0 });
  if (!correction) {
    const duree = arbitrage ? TEMPS_DIRECT.arbitrage : TEMPS_DIRECT.reponses;
    minuteur.current = { cle: `${vue.manche}-${vue.phase}`, debut: vue.echeance - decalage - duree, secondes: duree / 1000 };
  }
  const bilan = bilanDuCamp(vue);
  const note = correction
    ? equipe ? `${bilan.parades} parade${bilan.parades > 1 ? 's' : ''} réussie${bilan.parades > 1 ? 's' : ''} sur ${bilan.attaques}.`
      : bilan.parades ? 'Parade réussie. Ses dégâts sont divisés par deux.'
      : bilan.leursCoups[0]?.choisie === null ? 'Temps écoulé. Tu encaisses le coup plein.' : 'Raté. Tu encaisses le coup plein.'
    : arbitrage ? (arbitre === moi ? 'Vous n’êtes pas d’accord : choisis la réponse de ton camp.' : `Vous n’êtes pas d’accord : ${pseudo(arbitre)} tranche.`)
    : equipe ? `Chacun propose une définition ; en cas de désaccord, ${arbitre === moi ? 'c’est toi qui trancheras' : `${pseudo(arbitre)} tranchera`}. Tu peux changer d’avis jusqu’à la fin du temps.`
    : repondu ? 'Réponse envoyée. On attend celle de ton adversaire…' : 'Bonne réponse : les dégâts que tu subis sont divisés par deux.';
  const tonNote = correction ? (bilan.parades === bilan.attaques && bilan.attaques > 0 ? 'bon' : bilan.parades === 0 ? 'mauvais' : undefined) : undefined;

  return createPortal(
    <div className="parade parade--direct" role="dialog" aria-modal="true" aria-labelledby="parade-direct-surtitre" data-corrigee={correction} data-questions={vue.questions.length}>
      <div className="parade__carte" data-nature={unique ? natureDe(vue, unique) : undefined}>
        <div className="parade__tete">
          <p className="parade__surtitre" id="parade-direct-surtitre">{equipe ? 'Parez leurs attaques' : 'Pare son attaque'}</p>
          {minuteur.current.cle && <Minuteur key={minuteur.current.cle} debut={minuteur.current.debut} secondes={minuteur.current.secondes}
            arrete={correction || repondu || (arbitrage && arbitre !== moi)} onTic={onTic} />}
        </div>
        {vue.questions.map((q, n) => {
          const retenue = reponseRetenue(vue, q);
          const resultat = vue.bilan.find((b) => b.joueur === q.cible);
          const bonne = resultat ? q.propositions.indexOf(resultat.bonne) : -1;
          const choisie = resultat?.choisie != null ? q.propositions.indexOf(resultat.choisie) : null;
          const etatDe = (i: number): 'bonne' | 'fausse' | 'attente' | 'autre' | undefined => {
            if (correction && resultat) return i === bonne ? 'bonne' : i === choisie ? 'fausse' : 'autre';
            if (arbitrage && q.desaccord) return q.decision === i ? 'attente' : Object.values(q.reponses).includes(i) ? undefined : 'autre';
            if (arbitrage) return i === retenue ? 'attente' : 'autre';
            return q.reponses[moi] === i ? 'attente' : repondu ? 'autre' : undefined;
          };
          const actif = !correction && !bloque && (arbitrage ? arbitre === moi && q.desaccord : !repondu);
          return (
            <section key={q.cible} className="parade__question-directe" data-nature={natureDe(vue, q)}>
              <h2 className="parade__mot" lang="fr" tabIndex={n === 0 ? -1 : undefined} ref={n === 0 ? titre : undefined}>{q.mot}</h2>
              <p className="parade__question">
                <span className="c-pastille c-vignette" data-nature={natureDe(vue, q)}>{natureDe(vue, q)}</span>
                {equipe ? `Le mot ${dePseudo(pseudo(q.cible))} : quelle est sa définition ?` : 'Quelle est sa définition ?'}
              </p>
              <ol className="parade__propositions">
                {q.propositions.map((texte, i) => {
                  const etat = etatDe(i);
                  const lue = etat === 'bonne' ? 'La bonne réponse : ' : etat === 'fausse' ? 'La réponse retenue, fausse : ' : etat === 'attente' ? 'Ta réponse : ' : '';
                  const quiLaPropose = [q.reponses[moi] === i && equipe ? 'Toi' : null, autre !== null && q.reponses[autre] === i ? pseudo(autre) : null].filter(Boolean).join(' · ');
                  return (
                    <li key={i}>
                      <button type="button" className="parade__proposition" data-etat={etat} aria-disabled={!actif} onClick={() => choisir(q, i)}>
                        <kbd aria-hidden="true">{i + 1}</kbd>
                        <span lang="fr">{lue && <span className="visuellement-cache">{lue}</span>}{texte}</span>
                        {equipe && quiLaPropose && <small className="parade__qui">{quiLaPropose}</small>}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
        <p className="parade__note" role="status" data-ton={tonNote}>{note}</p>
      </div>
    </div>,
    document.body,
  );
}

// La nature du mot adverse, lue sur son timbre posé.
function natureDe(vue: VueDirect, q: QuestionDirect): string {
  return vue.poses.find((p) => p.joueur === q.cible)?.carte.type ?? 'Nom';
}
