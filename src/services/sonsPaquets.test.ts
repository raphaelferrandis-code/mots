import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SonsPaquets } from './sonsPaquets.ts';

function sortieDeTest() {
  const sources: { debut: number | null; arrets: number; onended: (() => void) | null }[] = [];
  let creations = 0;
  let fermetures = 0;
  const noeud = () => ({ connect(destination: unknown) { return destination; }, disconnect() {} });
  const parametre = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const contexte = {
    state: 'suspended', currentTime: 2, sampleRate: 8000, destination: {},
    resume() { this.state = 'running'; return Promise.resolve(); },
    close() { fermetures++; this.state = 'closed'; return Promise.resolve(); },
    createGain: () => ({ ...noeud(), gain: parametre() }),
    createBiquadFilter: () => ({ ...noeud(), frequency: parametre(), Q: parametre() }),
    createBuffer: (_: number, taille: number) => ({ getChannelData: () => new Float32Array(taille) }),
    createBufferSource: () => {
      const source = { ...noeud(), debut: null as number | null, arrets: 0, onended: null as (() => void) | null, start(quand: number) { this.debut = quand; }, stop() { this.arrets++; } };
      sources.push(source);
      return source;
    },
  };
  const sons = new SonsPaquets(() => { creations++; return contexte as unknown as AudioContext; });
  return { sons, sources, creations: () => creations, fermetures: () => fermetures };
}

describe('sons des paquets', () => {
  it('ne crée aucune sortie avant une interaction et réutilise son contexte', () => {
    const t = sortieDeTest();
    t.sons.ouvrir();
    assert.equal(t.creations(), 0);
    t.sons.preparer(); t.sons.preparer(); t.sons.ouvrir(); t.sons.carte(2, 0.4);
    assert.equal(t.creations(), 1);
    assert.equal(t.sources.length, 5);
    assert.equal(t.sources[3].debut, 2.4);
  });
  it('coupe les sons programmés et garde le silence tant que le son est désactivé', () => {
    const t = sortieDeTest();
    t.sons.activer(false); t.sons.preparer();
    assert.equal(t.creations(), 0);
    t.sons.activer(true); t.sons.preparer(); t.sons.carte(0, 1);
    t.sons.activer(false);
    assert.ok(t.sources.every((s) => s.arrets === 2));
    t.sons.retourner();
    assert.equal(t.sources.length, 2);
  });
  it('libère la sortie et tolère un navigateur sans audio', () => {
    const t = sortieDeTest();
    t.sons.preparer(); t.sons.ouvrir(); t.sons.fermer();
    assert.equal(t.fermetures(), 1);
    assert.ok(t.sources.every((s) => s.arrets === 2));
    const sansAudio = new SonsPaquets(() => { throw new Error('indisponible'); });
    assert.doesNotThrow(() => { sansAudio.preparer(); sansAudio.ouvrir(); sansAudio.fermer(); });
  });
});
