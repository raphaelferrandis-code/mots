import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SonsDuDuel } from './sonsDuDuel.ts';

// Une fausse sortie audio : elle note chaque son programmé (souffle ou note), et quand il commence.
function sortieDeTest() {
  const sons: { genre: 'souffle' | 'note'; debut: number | null; arrets: number }[] = [];
  const noeud = () => ({ connect(destination: unknown) { return destination; }, disconnect() {} });
  const parametre = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const source = (genre: 'souffle' | 'note') => {
    const s = { ...noeud(), genre, debut: null as number | null, arrets: 0, onended: null, type: '', frequency: parametre(), start(quand: number) { this.debut = quand; }, stop() { this.arrets++; } };
    sons.push(s);
    return s;
  };
  const contexte = {
    state: 'running', currentTime: 10, sampleRate: 8000, destination: {},
    resume: () => Promise.resolve(), close: () => Promise.resolve(),
    createGain: () => ({ ...noeud(), gain: parametre() }),
    createBiquadFilter: () => ({ ...noeud(), frequency: parametre(), Q: parametre() }),
    createBuffer: (_: number, taille: number) => ({ getChannelData: () => new Float32Array(taille) }),
    createBufferSource: () => source('souffle'),
    createOscillator: () => source('note'),
  };
  return { duel: new SonsDuDuel(() => contexte as unknown as AudioContext), sons };
}

describe('sons du duel', () => {
  it('reste muet tant que le joueur n’a rien touché, puis joue chaque son du duel', () => {
    const t = sortieDeTest();
    t.duel.juste();
    assert.equal(t.sons.length, 0, 'pas de sortie audio avant un geste du joueur');

    t.duel.preparer();
    for (const jouer of [() => t.duel.poser(), () => t.duel.juste(), () => t.duel.faux(), () => t.duel.tic(), () => t.duel.cachet(), () => t.duel.victoire(), () => t.duel.defaite()]) {
      const avant = t.sons.length;
      jouer();
      assert.ok(t.sons.length > avant, 'chaque son programme au moins une source');
    }
    assert.ok(t.sons.every((s) => s.debut !== null && s.debut >= 10), 'rien ne commence dans le passé');
  });

  it('dit « juste » et « faux » avec des notes, et garde les coups sans note', () => {
    const t = sortieDeTest();
    t.duel.preparer();
    t.duel.juste();
    assert.equal(t.sons.filter((s) => s.genre === 'note').length, 2);
    t.duel.coup(6, 0.45);
    const coup = t.sons.slice(-2);
    assert.ok(coup.every((s) => s.genre === 'souffle' && s.debut === 10.45), 'le coup part après la réponse');
  });

  it('ne fait aucun bruit pour une attaque sans dégât, ni quand le son est coupé', () => {
    const t = sortieDeTest();
    t.duel.preparer();
    t.duel.coup(0);
    assert.equal(t.sons.length, 0);
    t.duel.activer(false);
    t.duel.victoire(); t.duel.tic();
    assert.equal(t.sons.length, 0);
  });
});
