// Les mentions légales (audit de finition du 26/09/2026, E15 ; loi pour la confiance dans l'économie numérique) : qui
// édite le site, qui l'héberge, à qui appartient quoi, comment signaler. Page fixe /mentions-legales/. Décision de
// Raphaël du 28/09/2026 : son nom et l'adresse de contact ; l'adresse postale et le numéro d'entreprise s'ajouteront
// avant l'ouverture de tout achat. Rien d'autre de personnel ici : le dépôt du jeu est public.
// À faire relire par un juriste (voir A-FAIRE-RAPHAEL.md).

import { SITE } from '../../config/site.ts';

export function TexteMentionsLegales({ confidentialite }: { confidentialite: string }) {
  const contact = <a href={`mailto:${SITE.contact}`}>{SITE.contact}</a>;
  return (
    <>
      <section className="rubrique">
        <h2>Éditeur</h2>
        <p>Philamots est édité par {SITE.editeur}. Contact : {contact}.</p>
        <p className="texte-doux petit">Aucune vente n’est ouverte sur le site. Avant l’ouverture de tout achat, cette page indiquera aussi l’adresse et le numéro d’immatriculation du vendeur.</p>
      </section>

      <section className="rubrique">
        <h2>Directeur de la publication</h2>
        <p>{SITE.editeur}.</p>
      </section>

      <section className="rubrique">
        <h2>Hébergement</h2>
        <ul className="regles">
          <li><strong>Le site :</strong> GitHub Pages, un service de GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis.</li>
          <li><strong>Les comptes et les données du jeu :</strong> Supabase Pte. Ltd., 65 Chulia Street #38-02/03, OCBC Centre, Singapour 049513, sur des serveurs situés à Londres (Royaume-Uni).</li>
          <li><strong>Le nom de domaine et la messagerie :</strong> OVH SAS, 2 rue Kellermann, 59100 Roubaix, France.</li>
        </ul>
      </section>

      <section className="rubrique" id="credits">
        <h2>Propriété, crédits et licences</h2>
        <p>
          Le nom et le logo Philamots, le dessin des timbres et des paquets, et le code du jeu sont la propriété de leur
          auteur : ils ne peuvent pas être repris sans son accord.
        </p>
        <p>
          Les définitions et les étymologies sont adaptées (raccourcies, nettoyées) du{' '}
          <a href="https://fr.wiktionary.org">Wiktionnaire</a>, le dictionnaire libre, sous licence{' '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr">CC BY-SA 4.0</a> : chaque page de mot renvoie à
          sa source, où figure la liste de ses auteurs. Données extraites grâce au projet wiktextract (kaikki.org). La
          fréquence des mots et la part des gens qui les connaissent viennent de <a href="http://www.lexique.org">Lexique 4</a>,
          sous licence CC BY-SA 4.0. Ces textes, et les données des timbres qui en sont tirées, restent réutilisables sous la
          même licence.
        </p>
        <p>
          Polices : Playfair Display, Jost et Oswald, sous licence SIL Open Font License 1.1. Les sons sont fabriqués par le
          jeu lui-même.
        </p>
      </section>

      <section className="rubrique">
        <h2>Signaler un contenu ou un comportement</h2>
        <p>
          Un pseudonyme, un nom d’équipe, un comportement ou une définition te semble poser problème ? Écris à {contact} en
          disant qui ou quoi, et pourquoi. Dans le jeu, le lien « Signaler » de la fiche d’un joueur ou d’une équipe prépare
          ce message. Chaque signalement est lu ; un retrait est toujours expliqué.
        </p>
      </section>

      <section className="rubrique">
        <h2>Données personnelles</h2>
        <p>Ce que le jeu garde, pourquoi, combien de temps, et comment tout effacer : voir la page <a href={confidentialite}>Confidentialité</a>.</p>
      </section>
    </>
  );
}
