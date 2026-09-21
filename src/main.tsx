import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './theme/polices.ts';
import './theme/theme.css';
import './theme/styles.css';
import './theme/responsive.css';

createRoot(document.getElementById('racine')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
