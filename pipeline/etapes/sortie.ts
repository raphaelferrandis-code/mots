// Étape 7 — Écriture des fichiers que le jeu chargera.

import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { CarteDetails, IndexEdition } from '../../src/partage/types.ts';
import { lotDeLaCarte, nomDuLot } from '../../src/partage/lots.ts';
import type { CarteComplete } from './cartes.ts';

export type PoidsDesFichiers = { index: number; details: number; lots: number };

export function ecrireEdition(dossier: string, edition: CarteComplete[], numero: number, nombreDeLots: number, version: string): PoidsDesFichiers {
  const dossierDetails = path.join(dossier, 'details');
  mkdirSync(dossierDetails, { recursive: true });
  // Les anciens lots sont retirés : leur nombre a pu changer.
  for (const fichier of readdirSync(dossierDetails)) if (/^lot-\d+\.json$/.test(fichier)) rmSync(path.join(dossierDetails, fichier));

  const cartes = [...edition].sort((a, b) => a.index.id.localeCompare(b.index.id, 'fr'));

  const index: IndexEdition = {
    meta: {
      edition: numero,
      version,
      cartes: cartes.length,
      lots: nombreDeLots,
      sources: 'Wiktionnaire (fr.wiktionary.org) et Lexique 4 (lexique.org)',
      licence: 'CC BY-SA 4.0 — définitions et étymologies adaptées du Wiktionnaire',
    },
    cartes: cartes.map((c) => c.index),
  };
  const cheminIndex = path.join(dossier, `edition-${numero}.index.json`);
  writeFileSync(cheminIndex, JSON.stringify(index));

  const lots = new Map<number, Record<string, CarteDetails>>();
  for (const c of cartes) {
    const lot = lotDeLaCarte(c.index.id, nombreDeLots);
    if (!lots.has(lot)) lots.set(lot, {});
    lots.get(lot)![c.index.id] = c.details;
  }
  let poidsDetails = 0;
  for (const [lot, contenu] of lots) {
    const chemin = path.join(dossierDetails, nomDuLot(lot));
    writeFileSync(chemin, JSON.stringify(contenu));
    poidsDetails += statSync(chemin).size;
  }

  writeFileSync(path.join(dossier, 'LISEZMOI.md'), [
    '# Données des cartes',
    '',
    'Fichiers générés par `npm run pipeline`. Ne pas les modifier à la main : ils seraient écrasés.',
    '',
    '- `edition-N.index.json` : toutes les cartes de l\'édition, en version courte (chargé au démarrage du jeu).',
    '- `details/lot-XX.json` : définitions, étymologie et autres détails, chargés à la demande.',
    '',
    '**Licence de ces données : CC BY-SA 4.0.** Définitions et étymologies adaptées du Wiktionnaire',
    '(fr.wiktionary.org) ; fréquences et prévalences issues de Lexique 4 (lexique.org). Voir `docs/SOURCES.md` à la racine du projet.',
    '',
  ].join('\n'));

  return { index: statSync(cheminIndex).size, details: poidsDetails, lots: lots.size };
}

export function ecrireBaseComplete(chemin: string, cartes: CarteComplete[]): void {
  mkdirSync(path.dirname(chemin), { recursive: true });
  writeFileSync(chemin, cartes.map((c) => JSON.stringify({ ...c.index, ...c.details, factionReconnue: c.factionReconnue })).join('\n'));
}
