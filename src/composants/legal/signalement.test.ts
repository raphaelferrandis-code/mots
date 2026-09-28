import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { lienDeSignalement, lienDeSignalementDansLeClassement } from './signalement.ts';

describe('le signalement', () => {
  it('prépare un e-mail vers le contact du jeu, qui dit qui l’on signale', () => {
    const lien = lienDeSignalement({ genre: 'joueur', nom: 'Crapaud & Co' });
    assert.ok(lien.startsWith('mailto:contact@philamots.fr?subject='));
    const parametres = new URLSearchParams(lien.slice(lien.indexOf('?') + 1));
    assert.equal(parametres.get('subject'), 'Signalement : joueur « Crapaud & Co »');
    assert.match(parametres.get('body') ?? '', /Je signale le pseudonyme « Crapaud & Co » dans Philamots\./);
    assert.ok(!/[\s&]/.test(lien.slice(lien.indexOf('?') + 1).replace(/&body=/, '')), 'aucun espace ni « & » brut dans les paramètres');
  });

  it('parle d’équipe pour une équipe', () => {
    const parametres = new URLSearchParams(lienDeSignalement({ genre: 'equipe', nom: 'Les Encriers' }).split('?')[1]);
    assert.equal(parametres.get('subject'), 'Signalement : équipe « Les Encriers »');
    assert.match(parametres.get('body') ?? '', /le nom d’équipe « Les Encriers »/);
  });

  it('laisse le joueur nommer lui-même le nom signalé dans le classement', () => {
    const parametres = new URLSearchParams(lienDeSignalementDansLeClassement().split('?')[1]);
    assert.equal(parametres.get('subject'), 'Signalement : un nom du classement');
    assert.match(parametres.get('body') ?? '', /Je signale un nom du classement de Philamots : \n/);
  });
});
