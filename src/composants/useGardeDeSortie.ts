import { useEffect, useRef } from 'react';
import { demanderConfirmation } from './Confirmation.tsx';
import type { Question } from './Confirmation.tsx';

// Tant qu'une partie en direct est en cours, quitter l'écran se confirme (audit de finition du 26/09/2026 : la partie
// continue sans le joueur, et deux tours sans jouer font perdre son camp). Trois sorties sont gardées :
// · un lien du jeu (menu, onglets) : le clic est retenu, la question posée, puis le lien suivi si le joueur confirme ;
// · le bouton Retour (navigateur, Android) : l'adresse change sans clic ; on la remet aussitôt, avant que l'écran ne
//   change, puis on pose la question. Il faut passer avant l'écoute du routeur (useRoute.ts, « hashchange ») : le Retour
//   déclenche d'abord « popstate », que l'on écoute, et « hashchange » est écouté en phase de capture, donc avant lui ;
// · la fermeture ou le rechargement de l'onglet : le navigateur pose lui-même sa question.
export function useGardeDeSortie(actif: boolean, question: Question): void {
  const q = useRef(question);
  q.current = question;
  useEffect(() => {
    if (!actif) return;
    const ici = window.location.hash;
    let permise: string | null = null; // une sortie confirmée, à laisser passer
    const demander = (cible: string): void => {
      void demanderConfirmation(q.current).then((oui) => {
        if (!oui) return;
        permise = cible;
        window.location.hash = cible;
      });
    };
    const clic = (e: MouseEvent): void => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const cible = e.target instanceof Element ? e.target.closest('a[href^="#"]')?.getAttribute('href') : null;
      if (!cible || cible === ici) return;
      e.preventDefault();
      demander(cible);
    };
    const changement = (): void => {
      const cible = window.location.hash;
      if (cible === ici || cible === permise) return;
      window.history.replaceState(window.history.state, '', ici);
      demander(cible);
    };
    const avantDeQuitter = (e: BeforeUnloadEvent): void => { e.preventDefault(); e.returnValue = ''; };
    document.addEventListener('click', clic, true);
    window.addEventListener('popstate', changement);
    window.addEventListener('hashchange', changement, true);
    window.addEventListener('beforeunload', avantDeQuitter);
    return () => {
      document.removeEventListener('click', clic, true);
      window.removeEventListener('popstate', changement);
      window.removeEventListener('hashchange', changement, true);
      window.removeEventListener('beforeunload', avantDeQuitter);
    };
  }, [actif]);
}
