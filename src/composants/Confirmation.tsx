import { useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import './confirmation.css';

// Les questions « Es-tu sûr ? » du jeu, dans une fenêtre à ses couleurs plutôt que la boîte grise du navigateur
// (window.confirm). Une vraie fenêtre modale : Échap ou un clic à côté répondent non, le reste de la page est inerte,
// et le focus revient ensuite où il était. « danger » : une action définitive, le focus part alors sur « Annuler ».
export type Question = { titre: string; message: string; confirmer: string; annuler?: string; danger?: boolean };
type EnAttente = Question & { repondre: (oui: boolean) => void };

let enAttente: EnAttente | null = null;
const abonnes = new Set<() => void>();
const prevenir = (): void => { for (const abonne of abonnes) abonne(); };
const abonner = (abonne: () => void): (() => void) => { abonnes.add(abonne); return () => { abonnes.delete(abonne); }; };

// Pose la question ; rend vrai si le joueur confirme. Une seule question à la fois : la précédente vaut « non ».
export function demanderConfirmation(question: Question): Promise<boolean> {
  enAttente?.repondre(false);
  return new Promise((resoudre) => {
    const courante: EnAttente = {
      ...question,
      repondre: (oui) => {
        if (enAttente === courante) { enAttente = null; prevenir(); }
        resoudre(oui);
      },
    };
    enAttente = courante;
    prevenir();
  });
}

// À placer une fois dans l'application.
export function HoteDesConfirmations() {
  const question = useSyncExternalStore(abonner, () => enAttente);
  const dialogue = useRef<HTMLDialogElement>(null);
  const annuler = useRef<HTMLButtonElement>(null);
  const confirmer = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = dialogue.current;
    if (!element) return;
    if (!question) { if (element.open) element.close(); return; }
    if (!element.open) element.showModal();
    (question.danger ? annuler : confirmer).current?.focus();
  }, [question]);

  return createPortal(
    <dialog ref={dialogue} className={`confirmation${question?.danger ? ' confirmation--danger' : ''}`}
      aria-labelledby="confirmation-titre" aria-describedby="confirmation-message"
      onCancel={(evenement) => { evenement.preventDefault(); question?.repondre(false); }}
      // Seul un clic sur le voile atteint la fenêtre elle-même : son contenu est dans le cadre intérieur.
      onClick={(evenement) => { if (evenement.target === evenement.currentTarget) question?.repondre(false); }}>
      {question && <div className="confirmation__cadre">
        <p className="confirmation__surtitre">{question.danger ? 'Action définitive' : 'Confirmation'}</p>
        <h2 id="confirmation-titre" className="confirmation__titre">{question.titre}</h2>
        <p id="confirmation-message" className="confirmation__message">{question.message}</p>
        <div className="confirmation__boutons">
          <button ref={annuler} type="button" className="confirmation__bouton confirmation__bouton--annuler" onClick={() => question.repondre(false)}>{question.annuler ?? 'Annuler'}</button>
          <button ref={confirmer} type="button" className="confirmation__bouton confirmation__bouton--confirmer" onClick={() => question.repondre(true)}>{question.confirmer}</button>
        </div>
      </div>}
    </dialog>,
    document.body,
  );
}
