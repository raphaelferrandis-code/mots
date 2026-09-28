import { defineConfig, loadEnv, type Plugin } from 'vite';
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

// La devinette du jour n'est ouverte que si son calendrier a un premier jour (npm run motdujour:dater) : éteinte, le jeu
// ne demande même pas son fichier (src/composants/accueil/DevinetteDuJour.tsx).
const calendrier = JSON.parse(readFileSync(path.join(process.cwd(), 'public', 'data', 'devinettes.json'), 'utf8')) as { debut: string | null };
process.env.VITE_DEVINETTES_OUVERTES = calendrier.debut ? 'oui' : 'non';

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
    // L'écran d'attente d'index.html se peint tout de suite : les feuilles de style du jeu passent après lui, dans le
    // <body>, à l'endroit marqué. Dans le <head>, elles empêchaient le navigateur de peindre quoi que ce soit (1,7 s
    // d'écran blanc puis vide sur un téléphone en 4G : audit de finition du 26/09/2026). Le jeu, lui, attend toujours
    // toutes les feuilles de la page avant de s'exécuter (un script de module attend les feuilles de style déjà lues) :
    // jamais d'écran sans style.
    name: 'attente-d-abord',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, contexte) {
        const marque = '<!-- feuilles-du-jeu -->';
        if (!contexte.filename.endsWith('index.html') || !html.includes(marque)) return html;
        const feuilles = html.match(/<link rel="stylesheet"[^>]*>/g) ?? [];
        const sansFeuilles = feuilles.reduce((page, feuille) => page.replace(feuille, ''), html);
        return sansFeuilles.replace(marque, feuilles.join('\n    '));
      },
    },
  }, {
    // Demandés dès la lecture de la page plutôt qu'après le script du jeu (audit de finition du 26/09/2026, P07, P11) :
    // la connexion au serveur du jeu, et la police du grand titre de l'accueil (sans elle, il change de forme sous les
    // yeux une seconde après). Pas le catalogue ni les autres polices : mesuré en 4G lente, leur part de réseau
    // retardait l'accueil lui-même (0,6 s pour le catalogue) — le catalogue part au tout début du script (main.tsx).
    name: 'demander-tot',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, contexte) {
        if (!contexte.filename.endsWith('index.html') || !contexte.bundle) return [];
        const titre = Object.keys(contexte.bundle).find((nom) => nom.startsWith('assets/playfair-display-latin-900-normal-') && nom.endsWith('.woff2'));
        if (!titre) throw new Error('demander-tot : la police du titre (Playfair Display 900) est introuvable dans le site construit');
        return [
          ...(SERVEUR.adresse ? [{ tag: 'link', attrs: { rel: 'preconnect', href: new URL(SERVEUR.adresse).origin, crossorigin: true }, injectTo: 'head' as const }] : []),
          { tag: 'link', attrs: { rel: 'preload', href: `./${titre}`, as: 'font', type: 'font/woff2', crossorigin: true }, injectTo: 'head' as const },
        ];
      },
    },
  }, {
    // Les commentaires de travail restent dans le dépôt, pas dans les pages en ligne (audit de finition du 26/09/2026,
    // E32). En dernier parmi les transformations des pages : « attente-d-abord » a déjà consommé son repère. Restent
    // les deux repères du modèle des pages par mot (<!--tete-->, <!--page-->), remplis ensuite.
    name: 'sans-commentaires',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (html) => html.replace(/[ \t]*<!--(?!tete-->|page-->)[\s\S]*?-->[ \t]*(?:\r?\n)?/g, ''),
    },
  }, (() => {
    // Le service worker (scripts/sw.modele.js) : la liste des fichiers à garder sur l'appareil, et une version qui change
    // avec eux (nouvelle copie à chaque construction qui change quelque chose). Les polices ne gardent que le woff2.
    // En dernier : Vite retire de la liste, juste avant, le script vide des pages sans script (mot.html) ; un fichier
    // listé mais absent ferait échouer toute l'installation (vérifié à l'écriture : la construction s'arrête).
    let liste: string[] = [];
    return {
      name: 'service-worker',
      apply: 'build',
      enforce: 'post',
      generateBundle(_options, bundle) {
        const fichiers = Object.keys(bundle).filter((nom) => nom.startsWith('assets/') && /\.(js|css|woff2)$/.test(nom)).sort();
        liste = ['./', 'demarrage.js', 'manifest.webmanifest', 'identite/favicon-site.svg', 'identite/icone-site-32.png', 'identite/icone-site-192.png',
          'identite/philamots-clair.svg', ...fichiers, `data/edition-1.index.json?v=${process.env.VITE_VERSION_DES_DONNEES}`];
        // Les fichiers sans empreinte dans leur nom (demarrage.js, le manifeste, identite/) comptent par leur contenu :
        // sinon leur nouvelle version ne remplacerait jamais la copie gardée. Le code du service worker aussi : une
        // nouvelle façon de garder repart d'une copie neuve.
        const modele = readFileSync(path.join(process.cwd(), 'scripts', 'sw.modele.js'), 'utf8');
        const hache = createHash('sha256').update(modele).update(liste.join('\n'));
        const publics = ['demarrage.js', 'manifest.webmanifest', ...readdirSync(path.join(process.cwd(), 'public', 'identite'), { withFileTypes: true })
          .filter((entree) => entree.isFile()).map((entree) => `identite/${entree.name}`).sort()];
        for (const nom of publics) hache.update(nom).update(readFileSync(path.join(process.cwd(), 'public', nom)));
        const version = hache.digest('hex').slice(0, 12);
        this.emitFile({ type: 'asset', fileName: 'sw.js', source: modele.replace("'%VERSION%'", JSON.stringify(version)).replace("'%FICHIERS%'", JSON.stringify(liste)) });
      },
      writeBundle(_options, bundle) {
        const absents = liste.filter((nom) => nom.startsWith('assets/') && !(nom in bundle));
        if (absents.length) this.error(`service worker : fichiers listés mais absents du site construit : ${absents.join(', ')}`);
      },
    } satisfies Plugin;
  })(), {
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
