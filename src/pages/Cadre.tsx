// Le cadre des pages fixes (pages des mots, liste des mots, pages légales, page introuvable) : le bandeau avec le logo
// et « Jouer », et le pied de page commun (audit de finition du 26/09/2026, E15, E25) — les crédits, puis les liens
// qu'on attend en bas de tout site : tous les mots, mentions légales, confidentialité, conditions, contact.
// « racine » : le chemin vers la racine du site (relatif, « ../../ », ou absolu, « / », pour la page introuvable).

import { SITE } from '../config/site.ts';

export function Bandeau({ racine }: { racine: string }) {
  return (
    <header className="page-mot__bandeau">
      <a className="page-mot__marque" href={racine}><img src={`${racine}identite/philamots-clair.svg`} alt="Philamots" width="150" height="36" /></a>
      <a className="btn-secondary page-mot__jouer" href={racine}>Jouer</a>
    </header>
  );
}

// wiktionnaire : la page du mot sur le Wiktionnaire (les pages des mots) ; credits : la ligne des sources (pages des
// mots et liste des mots) ; actuelle : la page où l'on est, dont le lien est marqué comme tel.
export function Pied({ racine, wiktionnaire, credits = true, actuelle }: { racine: string; wiktionnaire?: string; credits?: boolean; actuelle?: string }) {
  const vers = (page: string) => ({ href: `${racine}${page}/`, 'aria-current': page === actuelle ? 'page' as const : undefined });
  return (
    <footer className="page-mot__pied">
      {credits && <p>
        Définitions et étymologies adaptées du{' '}
        <a href={wiktionnaire ?? 'https://fr.wiktionary.org/'}>Wiktionnaire</a>, fréquences de <a href="http://www.lexique.org">Lexique 4</a>, sous licence{' '}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr">CC BY-SA 4.0</a> : ces textes sont réutilisables
        sous la même licence. Le dessin des timbres et la marque Philamots ne le sont pas.
      </p>}
      <nav className="page-mot__liens" aria-label="Informations sur le site">
        <a {...vers('mots')}>Tous les mots</a>
        <a {...vers('mentions-legales')}>Mentions légales</a>
        <a {...vers('confidentialite')}>Confidentialité</a>
        <a {...vers('conditions')}>Conditions d’utilisation</a>
        <a href={`mailto:${SITE.contact}`}>Contact</a>
      </nav>
    </footer>
  );
}
