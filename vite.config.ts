import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { choisirModePaiements } from './src/services/mode-paiements.ts';
import { SERVEUR } from './src/config/serveur.ts';
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

// La politique de sécurité du contenu (CSP) : le navigateur refuse tout script, cadre ou connexion qui ne vient pas du
// jeu, de son serveur (Supabase) ou du contrôle anti-robot (Cloudflare Turnstile). Une ceinture de sécurité : si une
// faille laissait un jour passer du code étranger, il ne pourrait ni s'exécuter, ni envoyer la session ailleurs.
// Seulement dans le site construit : le serveur de développement a besoin de ses propres scripts.
function politiqueDeSecurite(): string {
  const serveur = SERVEUR.adresse ? new URL(SERVEUR.adresse).host : '';
  const turnstile = 'https://challenges.cloudflare.com';
  return [
    "default-src 'self'",
    `script-src 'self' ${turnstile}`,
    "style-src 'self' 'unsafe-inline'", // les styles posés par React (style={…}) et l'écran d'attente d'index.html
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${serveur ? ` https://${serveur} wss://${serveur}` : ''}`,
    `frame-src ${turnstile}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  return {
  plugins: [react(), {
    name: 'politique-de-securite',
    apply: 'build',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: politiqueDeSecurite() }, injectTo: 'head-prepend' }],
  }, {
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
  // Deux pages : le jeu, et le modèle des pages par mot (remplies ensuite par scripts/fabriquer-les-pages.ts).
  build: { rollupOptions: { input: { index: path.join(process.cwd(), 'index.html'), mot: path.join(process.cwd(), 'mot.html') } } },
  server: { port: 5173, strictPort: true },
  };
});
