import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Chemins relatifs : le site fonctionne aussi bien à la racine d'un domaine que dans un sous-dossier
  // (cas de GitHub Pages), sans rien avoir à régler chez l'hébergeur.
  base: './',
  server: { port: 5173, strictPort: true },
});
