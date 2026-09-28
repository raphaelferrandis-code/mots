import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SIGNATURE } from './banqueDeSons.ts';
import { SonsDuDirect } from './sonsDuDirect.ts';
import { SonsDuDuel } from './sonsDuDuel.ts';

// Une fausse sortie audio : elle note chaque son programmé (souffle ou note), quand il commence, à quelle fréquence, à
// quel volume, et ce qui est branché sur la sortie de l'appareil.
type Parametre = { value: number; pics: number[] };
type Noeud = { vers: unknown[]; debranche: boolean; gain?: Parametre };
type Source = Noeud & { genre: 'souffle' | 'note'; debut: number | null; arrets: number; frequency: Parametre };
function contexteDeTest() {
  const sons: Source[] = [];
  const versLaSortie: Noeud[] = [];
  const destination = {};
  const noeud = () => ({
    vers: [] as unknown[], debranche: false,
    connect(d: unknown) { this.vers.push(d); if (d === destination) versLaSortie.push(this); return d; },
    disconnect() { this.debranche = true; },
  });
  const parametre = () => ({
    value: 0, pics: [] as number[],
    setValueAtTime(v: number) { this.value = v; }, setTargetAtTime() {}, linearRampToValueAtTime() {},
    exponentialRampToValueAtTime(v: number) { this.pics.push(v); },
  });
  const source = (genre: 'souffle' | 'note') => {
    const s = { ...noeud(), genre, debut: null as number | null, arrets: 0, onended: null, type: '', loop: false, buffer: null,
      frequency: parametre(), detune: parametre(), start(quand: number) { this.debut = quand; }, stop() { this.arrets++; } };
    sons.push(s);
    return s;
  };
  const contexte = {
    state: 'running', currentTime: 10, sampleRate: 8000, destination,
    resume: () => Promise.resolve(), close: () => Promise.resolve(),
    createGain: () => ({ ...noeud(), gain: parametre() }),
    createBiquadFilter: () => ({ ...noeud(), type: '', frequency: parametre(), Q: parametre() }),
    createDynamicsCompressor: () => ({ ...noeud(), threshold: parametre(), knee: parametre(), ratio: parametre(), attack: parametre(), release: parametre() }),
    createBuffer: (_: number, taille: number, frequence: number) => ({ duration: taille / frequence, getChannelData: () => new Float32Array(taille) }),
    createBufferSource: () => source('souffle'),
    createOscillator: () => source('note'),
  };
  return { fabriquer: () => contexte as unknown as AudioContext, sons, versLaSortie };
}
function sortieDeTest() {
  const c = contexteDeTest();
  return { duel: new SonsDuDuel(c.fabriquer), ...c };
}
// Le volume de crête d'un son : celui de la première enveloppe rencontrée en suivant ses branchements.
function creteDe(source: Noeud): number {
  let n = source.vers[0] as Noeud | undefined;
  while (n && !n.gain?.pics.length) n = n.vers[0] as Noeud | undefined;
  return n?.gain?.pics[0] ?? 0;
}
const notes = (sons: Source[]) => sons.filter((s) => s.genre === 'note');

describe('sons du duel', () => {
  it('reste muet tant que le joueur n’a rien touché, puis joue chaque son du duel', () => {
    const t = sortieDeTest();
    t.duel.juste();
    assert.equal(t.sons.length, 0, 'pas de sortie audio avant un geste du joueur');

    t.duel.preparer();
    for (const jouer of [() => t.duel.poser(), () => t.duel.juste(), () => t.duel.faux(), () => t.duel.tic(), () => t.duel.victoire(), () => t.duel.victoire(true),
      () => t.duel.egalite(), () => t.duel.defaite(), () => t.duel.selection(), () => t.duel.piocher(), () => t.duel.souffle(), () => t.duel.bouclier(),
      () => t.duel.fissure(), () => t.duel.choc(4), () => t.duel.frappe()]) {
      const avant = t.sons.length;
      jouer();
      assert.ok(t.sons.length > avant, 'chaque son programme au moins une source');
    }
    assert.ok(t.sons.every((s) => s.debut !== null && s.debut >= 10), 'rien ne commence dans le passé');
  });

  it('sonne « juste » à la sonnette du guichet (mi), et garde pour « faux » son choc et ses deux notes qui descendent', () => {
    const t = sortieDeTest();
    t.duel.preparer();
    t.duel.juste();
    assert.ok(notes(t.sons).some((s) => s.frequency.value === 1318.5), 'la sonnette sonne mi');
    const avant = t.sons.length;
    t.duel.faux();
    assert.deepEqual(notes(t.sons.slice(avant)).map((s) => s.frequency.value), [196, 146.8]);
  });

  it('fait partir les coups après la réponse', () => {
    const t = sortieDeTest();
    t.duel.preparer();
    t.duel.coup(6, 0.45);
    assert.ok(t.sons.length === 2 && t.sons.every((s) => s.genre === 'souffle' && s.debut === 10.45));
  });

  it('compte les cinq dernières secondes au tic-tac d’une horloge : deux clics en alternance, un peu plus forts à la fin', () => {
    const t = sortieDeTest();
    t.duel.preparer();
    const clics = [5, 4, 3, 2, 1].map((restantes) => {
      const avant = t.sons.length;
      t.duel.tic(restantes);
      const clic = notes(t.sons.slice(avant))[0];
      return { frequence: clic.frequency.value, crete: creteDe(clic) };
    });
    assert.deepEqual(clics.map((c) => c.frequence), [1800, 1400, 1800, 1400, 1800]);
    assert.ok(clics.every((c, i) => i === 0 || c.crete > clics[i - 1].crete), `de plus en plus forts : ${clics.map((c) => c.crete.toFixed(3)).join(', ')}`);
  });

  it('sonne la victoire à la cloche du bureau : sol et do, et mi en plus pour une joute classée', () => {
    const fondamentales = (classee: boolean) => {
      const t = sortieDeTest();
      t.duel.preparer();
      t.duel.victoire(classee);
      return notes(t.sons).filter((s) => (SIGNATURE as readonly number[]).includes(s.frequency.value)).map((s) => [s.frequency.value, Number(((s.debut ?? 0) - 10).toFixed(2))]);
    };
    assert.deepEqual(fondamentales(false), [[784, 0], [1046.5, 0.16]]);
    assert.deepEqual(fondamentales(true), [[784, 0], [1046.5, 0.16], [1318.5, 0.32]]);
  });

  it('fait taire la banque en cours quand le son s’arrête (onglet caché), puis la rebranche au son suivant', () => {
    const t = sortieDeTest();
    t.duel.preparer();
    t.duel.victoire();
    const banque = t.versLaSortie.filter((n) => n.gain?.value !== 0.22);
    assert.equal(banque.length, 1, 'la banque a sa propre sortie');
    t.duel.arreter();
    assert.ok(banque[0].debranche, 'la cloche en cours se tait');
    t.duel.juste();
    assert.equal(t.versLaSortie.filter((n) => n.gain?.value !== 0.22 && !n.debranche).length, 1, 'une nouvelle sortie pour la sonnette');
  });

  it('ne fait aucun bruit pour une attaque sans dégât, ni quand le son est coupé', () => {
    const t = sortieDeTest();
    t.duel.preparer();
    t.duel.coup(0);
    assert.equal(t.sons.length, 0);
    t.duel.activer(false);
    t.duel.victoire(); t.duel.tic(); t.duel.egalite();
    assert.equal(t.sons.length, 0);
  });

  it('se tait onglet caché, sauf l’alerte des joutes en direct, qui doit justement faire revenir le joueur', () => {
    Object.defineProperty(globalThis, 'document', { value: { hidden: true }, configurable: true });
    try {
      const t = sortieDeTest();
      t.duel.preparer();
      t.duel.victoire();
      assert.equal(t.sons.length, 0, 'le duel se tait');
      const c = contexteDeTest(), direct = new SonsDuDirect(c.fabriquer);
      direct.preparer();
      direct.adversaireTrouve();
      assert.deepEqual(notes(c.sons).filter((s) => (SIGNATURE as readonly number[]).includes(s.frequency.value)).map((s) => s.frequency.value), [...SIGNATURE], 'sol, do, mi à la cloche');
    } finally {
      Reflect.deleteProperty(globalThis, 'document');
    }
  });
});
