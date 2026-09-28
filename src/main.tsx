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

// Le « service worker » (dist/sw.js, fabriqué par la construction depuis scripts/sw.modele.js) : les fichiers du jeu gardés
// sur l'appareil, pour des retours instantanés, la consultation hors ligne et l'installation sur l'écran d'accueil.
// Seulement dans le site construit, et une fois la page chargée (il ne doit rien retarder).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('./sw.js').catch(() => undefined); });
}
