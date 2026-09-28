import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { FiletDErreur } from './composants/FiletDErreur.tsx';
import { auCalme } from './services/auCalme.ts';
import { chargerEdition } from './services/cartes.ts';
import { surveillerConnexion, traiterRetourConnexion } from './services/connexion.ts';
import { retenirLInvitation } from './services/invitation.ts';
import './theme/polices.ts';
import './theme/theme.css';
import './theme/styles.css';
import './theme/responsive.css';
import './theme/coherence.css';
import './theme/boutons.css';
import './theme/pastilles.css';

// Le catalogue part tout de suite : l'accueil l'attend, et rien ne sert de le demander seulement une fois affiché.
void chargerEdition().catch(() => undefined);

// La police du grand titre de l'accueil, que la page a demandée d'avance (vite.config.ts, « demander-tot ») : prête
// avant le premier affichage, le titre ne change pas de forme sous les yeux. Au plus 0,3 s d'attente.
const policeDuTitre = (): Promise<unknown> => Promise.race([
  document.fonts?.load('900 1em "Playfair Display"').catch(() => undefined),
  new Promise((fin) => setTimeout(fin, 300)),
]);

async function demarrer() {
  // Avant le retour de Google, qui réécrit l'adresse.
  retenirLInvitation();
  await Promise.all([traiterRetourConnexion(), policeDuTitre()]);
  surveillerConnexion();
  createRoot(document.getElementById('racine')!).render(<StrictMode><FiletDErreur><App /></FiletDErreur></StrictMode>);
}
void demarrer();

// Le « service worker » (dist/sw.js, fabriqué par la construction depuis scripts/sw.modele.js) : les fichiers du jeu gardés
// sur l'appareil, pour des retours instantanés, la consultation hors ligne et l'installation sur l'écran d'accueil.
// Seulement dans le site construit, et au calme : à la première visite, il télécharge tout le jeu, et ne doit rien
// disputer à l'accueil (le catalogue et les polices arrivent d'abord).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  auCalme(() => { void navigator.serviceWorker.register('./sw.js').catch(() => undefined); });
}
