import { AVenir, Entete } from '../composants/Entete.tsx';

export function Reglages() {
  return (
    <main className="ecran">
      <Entete surtitre="Réglages" titre="Réglages et crédits" />

      <AVenir phase="phases 2 et 3">
        <ul className="liste-nue">
          <li>Masquer les mots familiers · Masquer les mots injurieux</li>
          <li>Allonger ou couper le chronomètre du duel</li>
          <li>Réduire les animations · Couper le son</li>
          <li>Exporter et importer ta sauvegarde dans un fichier</li>
          <li>Probabilités de chaque rareté dans un paquet</li>
        </ul>
      </AVenir>

      <section className="bloc">
        <h2>Crédits et sources</h2>
        <p>
          Les définitions et les étymologies sont adaptées (raccourcies, nettoyées) du{' '}
          <a href="https://fr.wiktionary.org" target="_blank" rel="noreferrer">Wiktionnaire</a>, le dictionnaire libre,
          sous licence <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>.
          Chaque fiche de carte renvoie vers la page du mot, où figure la liste de ses auteurs.
          Données extraites grâce au projet wiktextract (kaikki.org).
        </p>
        <p>
          La fréquence des mots et la part des gens qui les connaissent viennent de{' '}
          <a href="http://www.lexique.org" target="_blank" rel="noreferrer">Lexique 4</a>, sous licence CC BY-SA 4.0 :
          New, B., Pallier, C., Schalchli, G., Bourgin, J., &amp; Gimenes, M. (2026). Lexique 4: A major upgrade of the
          “Lexique” French lexical database. <em>Behavior Research Methods</em>, 58(5), 140.
        </p>
        <p className="texte-doux petit">
          Les fichiers de cartes du jeu, tirés de ces deux sources, sont eux aussi sous licence CC BY-SA 4.0.
          Ce jeu ne collecte aucune donnée personnelle et n'utilise aucun outil de mesure d'audience.
        </p>
      </section>
    </main>
  );
}
