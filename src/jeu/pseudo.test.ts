// Tests du pseudonyme : ce qui est accepté, ce qui est refusé, et les ruses déjouées.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PSEUDOS_INTERDITS } from '../config/pseudos-interdits.ts';
import { LONGUEUR_DU_PSEUDO, cleDuPseudo, contientUnMotInterdit, examinerLePseudo } from './pseudo.ts';

const accepte = (pseudo: string): boolean => examinerLePseudo(pseudo, PSEUDOS_INTERDITS).accepte;

describe('le pseudonyme', () => {
  it('accepte les pseudonymes ordinaires, avec accents, chiffres, tirets et apostrophes', () => {
    for (const pseudo of ['Raphaël', 'Zeugma 27', 'Frangipane 43', "L'Oiseau", 'Jean-Luc', 'Éric 55', 'Léa 1990', 'Marie_Curie', 'Le Hibou', 'Ōkami']) {
      assert.ok(accepte(pseudo), pseudo);
    }
    const verdict = examinerLePseudo('   Le    Hibou  ', PSEUDOS_INTERDITS);
    assert.deepEqual(verdict, { accepte: true, pseudo: 'Le Hibou' });
  });

  it('refuse ce qui est trop court, trop long, ou écrit avec des signes interdits', () => {
    assert.ok(!accepte('ab'));
    assert.ok(!accepte('x'.repeat(LONGUEUR_DU_PSEUDO.maximum + 1)));
    assert.ok(accepte('x'.repeat(LONGUEUR_DU_PSEUDO.maximum - 1) + 'y'));
    for (const pseudo of ['<script>', 'a@b.fr', 'Jean/Luc', '😀😀😀', '-Tiret', '12345', '7 8 9', 'Привет', '日本語の名前']) assert.ok(!accepte(pseudo), pseudo);
    const verdict = examinerLePseudo('ab', PSEUDOS_INTERDITS);
    assert.ok(!verdict.accepte && verdict.raison.length > 0);
  });

  it('refuse les mots grossiers ou haineux, même déguisés', () => {
    for (const pseudo of ['Connard', 'GrosCon', 'gros con', 'C.o.n', 'c o n', 'Coooonnard', 'c0nnard', 'S@lope', 'sal0pe', 'SALOPE 12', 'Enculé', 'pu-te', 'Hitler88', 'h1tler', 'N4zi', 'le nazi', 'FDP', 'ntm 93', 'Sale Arabe', 'Petite Salope', 'fuck you', 'Adm1n', 'Modérateur']) {
      assert.ok(!accepte(pseudo), pseudo);
    }
  });

  it('ne refuse pas les mots innocents qui contiennent un mot court interdit', () => {
    for (const pseudo of ['Concorde', 'Calcul', 'Violon', 'Violette', 'Analyse', 'Député', 'Habite ici', 'Sussex', 'Conclusion', 'Culture', 'Bitume', 'Tranche', 'Transat', 'Organigramme', 'Énigme', 'Cône', 'S Club', 'K Maro', 'Fagot']) {
      assert.ok(accepte(pseudo), pseudo);
    }
    assert.ok(!contientUnMotInterdit('Tom 55', PSEUDOS_INTERDITS), 'un nombre isolé ne se lit pas comme des lettres');
  });

  it('tient la liste des mots interdits en minuscules, sans accents ni espaces', () => {
    for (const mot of [...PSEUDOS_INTERDITS.motsEntiers, ...PSEUDOS_INTERDITS.fragments]) assert.match(mot, /^[a-z]+$/, mot);
  });

  it('reconnaît deux pseudonymes identiques aux majuscules, accents et espaces près', () => {
    assert.equal(cleDuPseudo('Le Hibou'), cleDuPseudo('le  hibou'));
    assert.equal(cleDuPseudo('Éléonore'), cleDuPseudo('eleonore'));
    assert.notEqual(cleDuPseudo('Zeugma 27'), cleDuPseudo('Zeugma 28'));
  });
});
