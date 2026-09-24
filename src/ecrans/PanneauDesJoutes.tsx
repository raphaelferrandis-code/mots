import type { Sauvegarde } from '../jeu/sauvegarde.ts';
import type { ProfilDeJoute } from '../jeu/joute.ts';
import { lien } from '../navigation/routes.ts';

export function PanneauDesJoutes(_props: { sauvegarde: Sauvegarde; enPreparation: boolean; onDefier: (profil: ProfilDeJoute) => void }) {
  return <section className="rubrique">
    <h2>Les joutes passent en direct</h2>
    <p>Affronte un joueur connecté en solo, rencontre un partenaire aléatoire en 2v2 ou joue avec ton équipe.</p>
    <p>Trois modes, trois classements indépendants. Tu conserves ta cote de départ en solo ; les deux classements 2v2 commencent à 1 000 points.</p>
    <div className="rangee-de-boutons"><a className="bouton bouton-presse" href={lien({ecran:'joutes'})}>Jouer en direct</a><a className="bouton bouton--discret" href={lien({ecran:'classement'})}>Voir les classements</a></div>
  </section>;
}
