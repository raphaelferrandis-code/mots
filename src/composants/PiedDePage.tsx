// Le pied de page du jeu, discret, sur l'accueil et dans les réglages (audit de finition du 26/09/2026, E15) : ce qu'on
// attend en bas de tout site — les mentions légales, la confidentialité, les conditions, un contact — et le chemin vers
// les pages des mots (pour les visiteurs, et pour Google). Les pages légales fixes vivent à la racine du site.
import { SITE } from '../config/site.ts';
import { lien } from '../navigation/routes.ts';
import './piedDePage.css';

export function PiedDePage() {
  return (
    <footer className="pied-de-page">
      <nav aria-label="Informations sur le site">
        <a href="./mots/">Tous les mots</a>
        <a href="./mentions-legales/">Mentions légales</a>
        <a href={lien({ ecran: 'confidentialite' })}>Confidentialité</a>
        <a href="./conditions/">Conditions d’utilisation</a>
        <a href={`mailto:${SITE.contact}`}>Contact</a>
      </nav>
      <p>{SITE.nom} · gratuit, sans publicité · définitions adaptées du Wiktionnaire (CC BY-SA 4.0)</p>
    </footer>
  );
}
