// Catalogue et fonction autonomes, pour la CLI Supabase comme pour l'éditeur de fonctions.
import { build } from 'vite';
import { mkdir, readFile, readdir, writeFile, unlink } from 'node:fs/promises';
const racine = new URL('../', import.meta.url);
const edition = JSON.parse(await readFile(new URL('public/data/edition-1.index.json', racine), 'utf8'));
const definitions = [];
const dossier = new URL('public/data/details/', racine);
for (const nom of (await readdir(dossier)).filter(n => n.endsWith('.json')).sort()) {
  const lot = JSON.parse(await readFile(new URL(nom, dossier),'utf8'));
  for (const [id, c] of Object.entries(lot)) definitions.push([id, c.definitions]);
}
const catalogue = { version: edition.meta.version, cartes: edition.cartes, definitions: definitions.sort(([a],[b]) => a.localeCompare(b)) };
await writeFile(new URL('supabase/functions/_shared/catalogue-combat.json',racine),JSON.stringify(catalogue));
await mkdir(new URL('serveur/deploiement-combats/',racine),{ recursive:true });
await build({ configFile:false,publicDir:false,build:{ outDir:'serveur/deploiement-combats',emptyOutDir:false,minify:true,target:'es2022',
  lib:{entry:'supabase/functions/combats/index.ts',formats:['es'],fileName:()=>'combats.js'} } });
const fichier = new URL('serveur/deploiement-combats/combats.js',racine);
await writeFile(new URL('serveur/deploiement-combats/combats.ts.txt',racine),'// @ts-nocheck\n// Généré par node serveur/preparer-combats.mjs. Ne pas modifier à la main.\n'+await readFile(fichier,'utf8'));
await unlink(fichier);
