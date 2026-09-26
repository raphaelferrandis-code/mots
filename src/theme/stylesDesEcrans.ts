// Les feuilles de style des écrans et de leurs composants : chargées d'emblée, dans cet ordre, avant celles du thème
// (main.tsx). Les écrans, eux, se chargent à la demande (App.tsx) ; mais une feuille arrivée avec eux passerait
// après le thème et l'emporterait sur ses réglages (responsive.css, coherence.css…) : l'apparence du jeu changerait.
// L'ordre est celui d'avant le découpage (25/09/2026). Une nouvelle feuille s'ajoute à la fin ;
// stylesDesEcrans.test.ts signale celles qui manquent. (Les écrans d'essai, réservés au développement, n'y sont pas.)
import '../composants/confirmation.css';
import '../ecrans/reglages.css';
import '../composants/succes.css';
import '../composants/profil.css';
import '../composants/carte/timbre.css';
import '../composants/timbre/timbre.css';
import '../composants/ceremonie/ceremonie.css';
import '../composants/choixDuPseudonyme.css';
import '../composants/correspondance/correspondance.css';
import '../ecrans/amis.css';
import '../ecrans/equipe.css';
import '../ecrans/joutesDirectes.css';
import '../ecrans/compte.css';
import '../composants/recompenses.css';
import '../ecrans/classement.css';
import '../composants/navigation.css';
import '../composants/ceremonie/comptoir.css';
import '../composants/accueil/accueil.css';
import '../composants/accueil/refonte.css';
import '../ecrans/duel/preparation.css';
import '../composants/sceauDuel.css';
import '../ecrans/duel/partie.css';
import '../composants/carte/timbreManipulable.css';
import '../composants/carte/choixFinition.css';
import '../ecrans/formules.css';
import '../composants/ceremonie/feuille.css';
