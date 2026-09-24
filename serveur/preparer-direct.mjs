import { build } from 'vite';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { direct } from './direct.ts';
await writeFile('serveur/12-joutes-direct.sql', '-- Après 11-equipes.sql. Nouvelle fonction joutes-direct requise avant le client.\nbegin;\n'+direct()+'\ncommit;\n');
await mkdir('serveur/deploiement-direct',{recursive:true});
await build({configFile:false,publicDir:false,build:{outDir:'serveur/deploiement-direct',emptyOutDir:false,minify:true,target:'es2022',
  lib:{entry:'supabase/functions/joutes-direct/index.ts',formats:['es'],fileName:()=>'joutes-direct.js'}}});
await writeFile('serveur/deploiement-direct/joutes-direct.ts.txt','// @ts-nocheck\n// Généré par preparer-direct.mjs\n'+await readFile('serveur/deploiement-direct/joutes-direct.js','utf8'));
await unlink('serveur/deploiement-direct/joutes-direct.js');
