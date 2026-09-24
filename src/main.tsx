import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { surveillerConnexion, traiterRetourConnexion } from './services/connexion.ts';
import './theme/polices.ts';
import './theme/theme.css';
import './theme/styles.css';
import './theme/responsive.css';
import './theme/coherence.css';

async function demarrer() {
  await traiterRetourConnexion();
  surveillerConnexion();
  createRoot(document.getElementById('racine')!).render(<StrictMode><App /></StrictMode>);
}
void demarrer();
