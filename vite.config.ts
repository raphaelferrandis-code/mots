import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { choisirModePaiements } from './src/services/mode-paiements.ts';

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  return {
  plugins: [react(), {
    name: 'version-paiements',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'paiements-version.json', source: JSON.stringify({
        version: 'philamots-paiements-v1',
        mode: choisirModePaiements(env.VITE_PAIEMENTS_TEST, env.VITE_PAIEMENTS_PRODUCTION),
      }) });
    },
  }],
  // Chemins relatifs : le site fonctionne aussi bien à la racine d'un domaine que dans un sous-dossier
  // (cas de GitHub Pages), sans rien avoir à régler chez l'hébergeur.
  base: './',
  server: { port: 5173, strictPort: true },
  };
});
