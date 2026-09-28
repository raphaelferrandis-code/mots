// Le jeu ouvert dans le navigateur d'une application (Instagram, Facebook…) : sa partie y reste enfermée. Un bandeau le
// dit une fois, avec les deux façons de la retrouver ailleurs ; « Compris » le range pour de bon (audit de finition du
// 26/09/2026, E31 ; services/navigateurIntegre.ts).
import { useState } from 'react';
import { lien } from '../navigation/routes.ts';
import { compteConnecte } from '../services/connexion.ts';
import { applicationHote, deLApplication } from '../services/navigateurIntegre.ts';
import './bandeauNavigateurIntegre.css';

const CLE = 'mots.navigateur-integre-compris';
const dejaCompris = (): boolean => { try { return localStorage.getItem(CLE) === 'oui'; } catch { return false; } };

// « protegee » : la collection a déjà un code de secours ou un compte relié (comme pour le menu du joueur).
export function BandeauNavigateurIntegre({ protegee }: { protegee: boolean }) {
  const [application] = useState(() => (typeof navigator === 'undefined' ? null : applicationHote(navigator.userAgent)));
  const [compris, setCompris] = useState(dejaCompris);
  const [connecte] = useState(compteConnecte);
  if (!application || compris) return null;
  const ranger = (): void => {
    try { localStorage.setItem(CLE, 'oui'); } catch { /* le bandeau reviendra à la prochaine visite */ }
    setCompris(true);
  };
  const monCompte = <a href={lien({ ecran: 'compte' })}>Mon compte</a>;
  return (
    <aside className="bandeau-navigateur message message--info" aria-label="Où est gardée ta collection">
      <p>
        Tu joues dans le navigateur {deLApplication(application)} : ta collection y reste. Pour la retrouver ailleurs,
        ouvre Philamots dans ton navigateur habituel (menu ⋯, puis « Ouvrir dans le navigateur »)
        {connecte || protegee ? <>, puis retrouve-la depuis {monCompte}.</> : <>, ou crée d’abord ton code de secours dans {monCompte}.</>}
      </p>
      <button type="button" className="bouton bouton--discret" onClick={ranger}>Compris</button>
    </aside>
  );
}
