import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { choisirModePaiements } from './src/services/mode-paiements.ts';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

// L'empreinte des fichiers de l'édition (public/data), ajoutée à leur adresse par src/services/cartes.ts : elle change
// avec les données, et le navigateur ne ressert jamais une ancienne édition depuis son cache après une mise à jour.
function empreinteDesDonnees(): string {
  const hache = createHash('sha256');
  const parcourir = (dossier: string): void => {
    for (const entree of readdirSync(dossier, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const chemin = path.join(dossier, entree.name);
      if (entree.isDirectory()) parcourir(chemin);
      else if (entree.name.endsWith('.json')) hache.update(entree.name).update(readFileSync(chemin));
    }
  };
  parcourir(path.join(process.cwd(), 'public', 'data'));
  return hache.digest('hex').slice(0, 12);
}
process.env.VITE_VERSION_DES_DONNEES = empreinteDesDonnees();

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
