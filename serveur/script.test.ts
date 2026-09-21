// Tests des scripts du serveur : ils doivent être à jour, et refléter les chiffres et les listes du jeu.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { EQUILIBRAGE } from '../src/config/equilibrage.ts';
import { PSEUDOS_INTERDITS } from '../src/config/pseudos-interdits.ts';
import { NOMBRE_DE_JOUEURS_MAISON, fabriquerLesJoueursMaison } from '../src/jeu/joueursMaison.ts';
import { examinerLePseudo } from '../src/jeu/pseudo.ts';
import type { IndexEdition } from '../src/partage/types.ts';
import { joueursMaison, structure } from './fabriquer-le-script.ts';

const RACINE = path.join(import.meta.dirname, '..');
const edition: IndexEdition = JSON.parse(readFileSync(path.join(RACINE, 'public', 'data', 'edition-1.index.json'), 'utf8'));
const lire = (nom: string): string => readFileSync(path.join(RACINE, 'serveur', nom), 'utf8');

describe('les scripts du serveur', () => {
  it('sont à jour : sinon, lancer « npm run serveur:script » et les recoller dans Supabase', () => {
    assert.equal(lire('1-structure.sql'), structure());
    assert.equal(lire('2-joueurs-maison.sql'), joueursMaison(edition));
  });

  it('reprennent les chiffres du classement et tous les mots interdits du jeu', () => {
    const sql = structure();
    const J = EQUILIBRAGE.joute;
    assert.ok(sql.includes(`default ${J.coteDeDepart}`));
    assert.ok(sql.includes(`greatest(${J.coteMinimale}, round(moi.cote + ${J.facteurK} *`));
    assert.ok(sql.includes(`/ ${J.echelle})`));
    assert.ok(sql.includes(`array[${J.ecartsDeCoteProposes.join(', ')}]`));
    for (const mot of [...PSEUDOS_INTERDITS.motsEntiers, ...PSEUDOS_INTERDITS.fragments]) assert.ok(sql.includes(`('${mot}', `), mot);
    // Aucune table n'est ouverte en lecture ou en écriture directe, et aucune fonction du jeu n'est offerte aux visiteurs sans compte.
    assert.ok(!/create policy/i.test(sql));
    assert.ok(/revoke execute on function[^;]+from public, anon;/.test(sql));
  });

  it('fabriquent toujours les mêmes joueurs maison : decks complets, pseudonymes acceptables et tous différents', () => {
    const joueurs = fabriquerLesJoueursMaison(edition.cartes);
    assert.deepEqual(joueurs, fabriquerLesJoueursMaison(edition.cartes));
    assert.equal(joueurs.length, NOMBRE_DE_JOUEURS_MAISON);
    const connues = new Set(edition.cartes.map((c) => c.id));
    for (const joueur of joueurs) {
      assert.equal(new Set(joueur.deck).size, EQUILIBRAGE.duel.tailleDuDeck);
      assert.ok(joueur.deck.every((id) => connues.has(id)));
      assert.ok(examinerLePseudo(joueur.pseudo, PSEUDOS_INTERDITS).accepte, joueur.pseudo);
      assert.match(joueur.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      for (const savoir of [...Object.values(joueur.savoirs), ...Object.values(joueur.parades)]) assert.ok(savoir.reussies >= 0 && savoir.reussies <= savoir.posees);
    }
    assert.equal(new Set(joueurs.map((j) => j.pseudo)).size, joueurs.length);
    // Aucun mot familier ou injurieux dans leurs decks : ils conviennent à tous les réglages de contenu.
    const sensibles = new Set(edition.cartes.filter((c) => c.registre.length > 0).map((c) => c.id));
    assert.ok(joueurs.every((j) => j.deck.every((id) => !sensibles.has(id))));
  });
});
