// Fichiers autonomes à coller dans l'éditeur Supabase, sans import à ajouter.
import { build } from 'vite';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
const dossier = new URL('./deploiement-paiements/', import.meta.url);
await mkdir(dossier, { recursive: true });
for (const nom of ['paiement', 'stripe-webhook', 'paiement-production', 'stripe-webhook-production']) {
  await build({ configFile: false, publicDir: false, build: {
    outDir: 'serveur/deploiement-paiements', emptyOutDir: false, minify: false, target: 'es2022',
    lib: { entry: `supabase/functions/${nom}/index.ts`, formats: ['es'], fileName: () => `${nom}.js` },
  } });
  const js = await readFile(new URL(`${nom}.js`, dossier), 'utf8');
  await writeFile(new URL(`${nom}.ts.txt`, dossier), '// @ts-nocheck\n// Généré par node serveur/preparer-paiements.mjs — coller dans index.ts de Supabase.\n' + js);
  await unlink(new URL(`${nom}.js`, dossier));
}
