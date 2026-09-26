// Les nouvelles du parrainage sur l'accueil : le nouveau venu invité par un ami, son cadeau de bienvenue, ce qu'il lui
// reste à faire pour que son parrain soit récompensé, les paquets gagnés par le parrain. Rien ne s'affiche quand il n'y
// a rien à dire, ni quand le serveur ne répond pas.

import { useState } from 'react';
import { nouvellesDuParrainage } from '../../jeu/parrainage.ts';
import type { Nouvelle } from '../../jeu/parrainage.ts';
import { lien } from '../../navigation/routes.ts';
import { secoursEtParrainage } from '../../services/compte.ts';
import { oublierLesFilleulsRecompenses } from '../../services/invitation.ts';
import { lireMonParrainage } from '../../services/partie.ts';
import { useChargement } from '../useChargement.ts';
import { usePartie } from '../usePartie.ts';
import { EQUILIBRAGE } from '../../config/equilibrage.ts';

const CLE_BIENVENUE = 'mots.bienvenue-vue';
const CLE_AIDE = 'mots.aide-au-parrain-vue';
function dejaVue(cle: string): boolean {
  try { return localStorage.getItem(cle) === 'oui'; } catch { return false; }
}

function texteDuLien(n: Nouvelle): string {
  if (n.lien === 'paquet') return 'Ouvrir un paquet';
  if (n.lien === 'compte') return 'Relier un compte';
  return n.cle === 'invite' ? 'Jouer mon premier duel' : 'Jouer un duel';
}

export function NouvellesDuParrainage() {
  const parrainage = useChargement(() => (secoursEtParrainage ? lireMonParrainage() : Promise.resolve(null)), 'parrainage-accueil');
  const partie = usePartie();
  const pret = partie.etat === 'prete' && Object.keys(partie.sauvegarde.cartes).length >= EQUILIBRAGE.duel.tailleDuDeck;
  const [bienvenueVue, setBienvenueVue] = useState(() => dejaVue(CLE_BIENVENUE));
  const [aideVue, setAideVue] = useState(() => dejaVue(CLE_AIDE));
  const [merciVu, setMerciVu] = useState(false);
  if (parrainage.etat !== 'pret' || !parrainage.donnees) return null;
  const fermer = (cle: string): void => {
    if (cle === 'parrain') { oublierLesFilleulsRecompenses(); setMerciVu(true); return; }
    try { localStorage.setItem(cle === 'aider' ? CLE_AIDE : CLE_BIENVENUE, 'oui'); } catch { /* elle reviendra à la prochaine visite */ }
    if (cle === 'aider') setAideVue(true); else setBienvenueVue(true);
  };
  const donnees = merciVu ? { ...parrainage.donnees, nouveaux: [] } : parrainage.donnees;
  return <>
    {nouvellesDuParrainage(donnees, bienvenueVue, aideVue, pret).map((n) => (
      <aside key={n.cle} className="accueil__rappel" role="status">
        <div><h2>{n.titre}</h2><p>{n.texte}</p></div>
        <div className="rangee-de-boutons">
          {n.lien && <a className="accueil-lien" href={lien({ ecran: n.lien })}>{texteDuLien(n)}</a>}
          {n.fermable && <button className="bouton bouton--discret" onClick={() => fermer(n.cle)}>Fermer</button>}
        </div>
      </aside>
    ))}
  </>;
}
