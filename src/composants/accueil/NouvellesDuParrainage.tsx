// Les nouvelles du parrainage sur l'accueil : le nouveau venu invité par un ami, son cadeau de bienvenue, les paquets
// gagnés par le parrain. Rien ne s'affiche quand il n'y a rien à dire, ni quand le serveur ne répond pas.

import { useState } from 'react';
import { nouvellesDuParrainage } from '../../jeu/parrainage.ts';
import { lien } from '../../navigation/routes.ts';
import { secoursEtParrainage } from '../../services/compte.ts';
import { oublierLesFilleulsRecompenses } from '../../services/invitation.ts';
import { lireMonParrainage } from '../../services/partie.ts';
import { useChargement } from '../useChargement.ts';

const CLE_BIENVENUE = 'mots.bienvenue-vue';
function bienvenueDejaVue(): boolean {
  try { return localStorage.getItem(CLE_BIENVENUE) === 'oui'; } catch { return false; }
}

export function NouvellesDuParrainage() {
  const parrainage = useChargement(() => (secoursEtParrainage ? lireMonParrainage() : Promise.resolve(null)), 'parrainage-accueil');
  const [bienvenueVue, setBienvenueVue] = useState(bienvenueDejaVue);
  const [merciVu, setMerciVu] = useState(false);
  if (parrainage.etat !== 'pret' || !parrainage.donnees) return null;
  const fermer = (cle: string): void => {
    if (cle === 'parrain') { oublierLesFilleulsRecompenses(); setMerciVu(true); return; }
    try { localStorage.setItem(CLE_BIENVENUE, 'oui'); } catch { /* elle reviendra à la prochaine visite */ }
    setBienvenueVue(true);
  };
  const donnees = merciVu ? { ...parrainage.donnees, nouveaux: [] } : parrainage.donnees;
  return <>
    {nouvellesDuParrainage(donnees, bienvenueVue).map((n) => (
      <aside key={n.cle} className="accueil__rappel" role="status">
        <div><h2>{n.titre}</h2><p>{n.texte}</p></div>
        <div className="rangee-de-boutons">
          {n.lien && <a className="accueil-lien" href={lien({ ecran: n.lien })}>{n.lien === 'duel' ? 'Jouer mon premier duel' : 'Ouvrir un paquet'}</a>}
          {n.fermable && <button className="bouton bouton--discret" onClick={() => fermer(n.cle)}>Fermer</button>}
        </div>
      </aside>
    ))}
  </>;
}
