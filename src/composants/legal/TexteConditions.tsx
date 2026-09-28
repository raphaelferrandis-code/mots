// Les conditions d'utilisation (audit de finition du 26/09/2026, E20 : règles écrites pour les comptes, les
// pseudonymes, le marché, la triche et le signalement ; règlement européen sur les services numériques). Courtes, dans
// le ton du jeu. Page fixe /conditions/, liée depuis le pied de page et depuis Mon compte.
// À faire relire par un juriste (voir A-FAIRE-RAPHAEL.md). Les chiffres viennent de l'équilibrage et de la config.

import { EQUILIBRAGE } from '../../config/equilibrage.ts';
import { SITE } from '../../config/site.ts';

export function TexteConditions({ liens }: { liens: { confidentialite: string; mentions: string } }) {
  const contact = <a href={`mailto:${SITE.contact}`}>{SITE.contact}</a>;
  const { inviteMois, relieAns } = SITE.conservation;
  return (
    <>
      <section className="rubrique">
        <p>En jouant à Philamots, tu acceptes ces conditions. Elles sont courtes : prends le temps de les lire.</p>
      </section>

      <section className="rubrique">
        <h2>1. Le jeu</h2>
        <p>
          Philamots est un jeu gratuit et sans publicité : on y collectionne de vrais mots de la langue française, imprimés
          comme des timbres, et l’on s’affronte en duels de définitions. Le jeu évolue : ses règles, son équilibrage (les
          chances des paquets, l’Encre, les récompenses) et ses écrans peuvent changer, pour le rendre meilleur ou plus
          juste. Aucun achat n’est ouvert ; s’il y en a un jour, des conditions de vente le diront avant.
        </p>
      </section>

      <section className="rubrique">
        <h2>2. Ton compte</h2>
        <ul className="regles">
          <li>À ton premier passage, le jeu t’ouvre un compte invité, lié à ce navigateur. Relie-le à Google ou à ton adresse e-mail, ou crée un code de secours, pour retrouver ta collection ailleurs.</li>
          <li>Garde ton code de secours pour toi : qui le connaît peut ouvrir ta collection.</li>
          <li>Tu as moins de 15 ans ? Demande à un parent avant de relier ton adresse e-mail ou ton compte Google.</li>
          <li>Tu peux supprimer ton compte à tout moment, dans Mon compte. C’est définitif : ta collection, ton Encre et tes timbres disparaissent.</li>
          <li>Un compte invité sans visite depuis {inviteMois} mois est supprimé, un compte relié à Google ou à une adresse e-mail après {relieAns} ans sans visite.</li>
        </ul>
      </section>

      <section className="rubrique">
        <h2>3. Ton pseudonyme et ton équipe</h2>
        <p>
          Ils sont publics. Ils ne doivent ni insulter, ni harceler, ni se faire passer pour quelqu’un d’autre, ni contenir
          d’informations personnelles (les tiennes ou celles d’un autre), ni faire de publicité. Un filtre en refuse
          certains d’office. Un pseudonyme ou un nom d’équipe contraire à ces règles peut être retiré : on te dit alors
          pourquoi, et tu peux en choisir un autre.
        </p>
      </section>

      <section className="rubrique">
        <h2>4. Jouer loyalement</h2>
        <p>
          Pas de triche : ni programme qui joue à ta place, ni faille exploitée, ni comptes multiples pour t’offrir des
          paquets par le parrainage, des points au classement ou des timbres au marché. En cas d’abus, le compte concerné
          peut être remis à zéro ou supprimé, et l’on t’en donne la raison.
        </p>
      </section>

      <section className="rubrique">
        <h2>5. L’Encre, les timbres et le marché</h2>
        <ul className="regles">
          <li>L’Encre et les timbres n’existent que dans le jeu : ils n’ont aucune valeur en argent, et ne s’achètent ni ne se revendent en dehors du jeu.</li>
          <li>Au marché, une enchère remportée est définitive. Le vendeur reçoit le prix, moins une commission de {Math.round(EQUILIBRAGE.marche.commission * 100)} % en Encre.</li>
          <li>Pour animer le marché tant qu’il y a peu de monde, Philamots peut y faire vendre des timbres, et racheter des ventes restées sans mise, par des joueurs simulés : leur fiche le dit, et leurs ventes ne comptent pas dans la cote.</li>
          <li>Le parrainage offre des paquets au nouveau venu et à celui qui l’a invité, dans les limites décrites dans le jeu (au plus {EQUILIBRAGE.parrainage.filleulsRecompensesParMois} filleuls récompensés par mois).</li>
        </ul>
      </section>

      <section className="rubrique">
        <h2>6. Les mots du jeu</h2>
        <p>
          Philamots contient tout le vocabulaire de la langue, y compris des mots familiers, grossiers ou injurieux : ils
          font partie du dictionnaire. Les réglages du jeu permettent de les masquer. Les définitions sont adaptées du
          Wiktionnaire et peuvent contenir des erreurs : signale-les.
        </p>
      </section>

      <section className="rubrique">
        <h2>7. Signaler</h2>
        <p>
          Un pseudonyme, un nom d’équipe, un comportement ou une erreur à signaler : utilise le lien « Signaler » de la fiche
          d’un joueur ou d’une équipe, ou écris à {contact} en disant qui ou quoi, et pourquoi. Chaque signalement est lu ;
          un retrait est toujours expliqué.
        </p>
      </section>

      <section className="rubrique">
        <h2>8. Ce que le jeu garantit, et ce qu’il ne garantit pas</h2>
        <p>
          Philamots est fait avec soin, mais sans garantie d’être toujours disponible ni exempt d’erreurs. En cas de panne ou
          d’erreur qui touche ta collection, le jeu fait de son mieux pour la rétablir.
        </p>
      </section>

      <section className="rubrique">
        <h2>9. Propriété</h2>
        <p>
          Le nom et le logo Philamots, le dessin des timbres et le code du jeu sont protégés. Les définitions, les étymologies
          et les fréquences sont sous licence CC BY-SA 4.0 : voir les <a href={liens.mentions}>mentions légales</a>.
        </p>
      </section>

      <section className="rubrique">
        <h2>10. Tes données, les changements, le droit applicable</h2>
        <p>
          Ce que le jeu garde et comment tout effacer est décrit dans la page <a href={liens.confidentialite}>Confidentialité</a>.
          Ces conditions peuvent évoluer : la date en haut de la page dit laquelle s’applique. Elles relèvent du droit français.
          Une question : {contact}.
        </p>
      </section>
    </>
  );
}
