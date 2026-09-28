import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { COR_EN_DO, NIVEAUX_DB, SIGNATURE, VOLUME_DE_LA_BANQUE, creerBanque } from './banqueDeSons.ts';
import type { Banque, NiveauSonore } from './banqueDeSons.ts';

// Un faux contexte audio : il note chaque nœud créé, ses branchements, ses départs et ses arrêts.
type Parametre = { value: number };
type Noeud = { nom: string; vers: Noeud[]; gain?: Parametre; type?: string; frequency?: Parametre; detune?: Parametre; debut?: number; fin?: number };
function contexteDeTest() {
  const noeuds: Noeud[] = [];
  const parametre = () => ({ value: 0, setValueAtTime(v: number) { this.value = v; }, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const creer = (nom: string, autres: object = {}): Noeud => {
    const n = { nom, vers: [] as Noeud[], connect(d: Noeud) { this.vers.push(d); return d; }, disconnect() {}, ...autres };
    noeuds.push(n);
    return n;
  };
  const source = (nom: string) => creer(nom, { type: '', loop: false, buffer: null, frequency: parametre(), detune: parametre(),
    start(this: Noeud, t: number) { this.debut = t; }, stop(this: Noeud, t: number) { this.fin = t; } });
  const contexte = {
    sampleRate: 8000, currentTime: 0,
    createGain: () => creer('gain', { gain: parametre() }),
    createDynamicsCompressor: () => creer('compresseur', { threshold: parametre(), knee: parametre(), ratio: parametre(), attack: parametre(), release: parametre() }),
    createBiquadFilter: () => creer('filtre', { type: '', frequency: parametre(), Q: parametre() }),
    createBuffer: (_: number, taille: number, frequence: number) => ({ duration: taille / frequence, getChannelData: () => new Float32Array(taille) }),
    createBufferSource: () => source('souffle'),
    createOscillator: () => source('onde'),
  };
  const sortie = creer('sortie');
  const banque = creerBanque(contexte as unknown as BaseAudioContext, sortie as unknown as AudioNode);
  const maitre = noeuds.find((n) => n.nom === 'gain')!;
  const voies = noeuds.filter((n) => n.nom === 'gain' && n.vers[0] === maitre);
  return { banque, noeuds, maitre, voies, sortie };
}
// Ce qu'un son programme : les sources créées pendant qu'il joue.
function jouer(t: ReturnType<typeof contexteDeTest>, son: (b: Banque) => void): Noeud[] {
  const avant = t.noeuds.length;
  son(t.banque);
  return t.noeuds.slice(avant).filter((n) => n.debut !== undefined);
}
// La voie où aboutit une source, en suivant ses branchements.
function voieDe(t: ReturnType<typeof contexteDeTest>, n: Noeud): number {
  const vus = new Set<Noeud>();
  const pile = [n];
  while (pile.length) {
    const x = pile.pop()!;
    const i = t.voies.indexOf(x);
    if (i >= 0) return i + 1;
    if (vus.has(x)) continue;
    vus.add(x);
    pile.push(...(x.vers ?? []));
  }
  return 0;
}

describe('la banque de sons', () => {
  it('a quatre voies, du plus discret au plus fort, un volume général et un compresseur avant la sortie', () => {
    const t = contexteDeTest();
    assert.equal(t.voies.length, 4);
    assert.deepEqual(t.voies.map((v) => v.gain!.value), ([1, 2, 3, 4] as const).map((n) => 10 ** (NIVEAUX_DB[n] / 20)));
    assert.ok(t.voies.every((v, i) => i === 0 || v.gain!.value > t.voies[i - 1].gain!.value));
    assert.equal(t.maitre.gain!.value, VOLUME_DE_LA_BANQUE);
    assert.equal(t.maitre.vers[0].nom, 'compresseur');
    assert.equal(t.maitre.vers[0].vers[0], t.sortie);
  });

  it('joue chaque son à partir de l’instant demandé, sur la voie demandée, et l’arrête', () => {
    const sons: [string, (b: Banque, n: NiveauSonore) => void][] = [
      ['tampon', (b, n) => b.tampon(5, n, 1)], ['glissé', (b, n) => b.glisse(5, n)], ['tic', (b, n) => b.tic(5, n, true, 1)],
      ['sonnette', (b, n) => b.sonnette(5, n)], ['cloche', (b, n) => b.cloche(5, n, 3)], ['glas', (b, n) => b.glas(5, n)],
      ['quinte', (b, n) => b.quinte(5, n)], ['cor', (b, n) => b.cor(5, n)], ['plume', (b, n) => b.plume(5, n)], ['froissé', (b, n) => b.froisse(5, n, 1.4)],
    ];
    for (const [nom, son] of sons) {
      for (const n of [1, 4] as const) {
        const t = contexteDeTest();
        const sources = jouer(t, (b) => son(b, n));
        assert.ok(sources.length > 0, `${nom} programme des sources`);
        assert.ok(sources.every((s) => s.debut! >= 5 && s.fin! > s.debut!), `${nom} commence à l’heure et s’arrête`);
        // (Les oscillateurs lents d'un vibrato ou d'un tremblement ne sonnent pas : ils règlent un autre son, voie 0.)
        const atteintes = sources.map((s) => voieDe(t, s));
        assert.ok(atteintes.every((v) => v === n || v === 0) && atteintes.includes(n), `${nom} sonne sur la voie ${n} : ${atteintes.join(',')}`);
      }
    }
  });

  it('sonne la signature du jeu à la cloche : sol, do, mi, à 0,16 s d’écart', () => {
    const t = contexteDeTest();
    const fondamentales = jouer(t, (b) => b.cloche(2, 2, 3)).filter((s) => (SIGNATURE as readonly number[]).includes(s.frequency!.value));
    assert.deepEqual(fondamentales.map((s) => [s.frequency!.value, Number((s.debut! - 2).toFixed(2))]), [[784, 0], [1046.5, 0.16], [1318.5, 0.32]]);
  });

  it('fait sonner au cor de poste les harmoniques naturelles 3, 4 et 5 (sol, do, mi), en dent de scie à deux voix', () => {
    const t = contexteDeTest();
    const cuivres = jouer(t, (b) => b.cor(1, 4)).filter((s) => s.type === 'sawtooth');
    assert.deepEqual(cuivres.map((s) => [Number((s.frequency!.value / COR_EN_DO).toFixed(3)), s.detune!.value, s.debut]),
      [[3, -4, 1], [3, 4, 1], [4, -4, 1.25], [4, 4, 1.25], [5, -4, 1.5], [5, 4, 1.5]]);
  });

  it('arrête net le papier froissé au bout de sa durée : le timbre se retourne', () => {
    const t = contexteDeTest();
    const sources = jouer(t, (b) => b.froisse(3, 4, 1.4));
    assert.ok(sources.length > 10, 'des craquements de plus en plus serrés');
    assert.ok(sources.every((s) => s.fin! <= 3 + 1.4 + .1), 'rien après le retournement');
  });
});
