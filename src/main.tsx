import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { FiletDErreur } from './composants/FiletDErreur.tsx';
import { surveillerConnexion, traiterRetourConnexion } from './services/connexion.ts';
import { retenirLInvitation } from './services/invitation.ts';
import './theme/polices.ts';
import './theme/theme.css';
import './theme/styles.css';
import './theme/responsive.css';
import './theme/coherence.css';
import './theme/boutons.css';
import './theme/pastilles.css';

async function demarrer() {
  // Avant le retour de Google, qui réécrit l'adresse.
  retenirLInvitation();
  await traiterRetourConnexion();
  surveillerConnexion();
  createRoot(document.getElementById('racine')!).render(<StrictMode><FiletDErreur><App /></FiletDErreur></StrictMode>);
}
void demarrer();
