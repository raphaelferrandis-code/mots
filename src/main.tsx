import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { appliquerLaPolice, policeChoisie } from './theme/polices.ts';
import './theme/theme.css';
import './theme/styles.css';

appliquerLaPolice(policeChoisie());

createRoot(document.getElementById('racine')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
