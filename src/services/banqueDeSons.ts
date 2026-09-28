// La banque de sons du jeu (étape 5 des finitions, audit du 26/09/2026 § 5.4) : une seule définition des sons du
// « bureau de poste », partagée par la cérémonie des paquets, le duel, les joutes et les récompenses. Raphaël les a
// choisis à l'oreille sur une page d'écoute, le 28/09/2026, son par son ; ce qu'il a préféré garder reste dans
// effets.ts (cérémonie) et sonsDuDuel.ts (duel). Tout est synthétisé sur place : aucun fichier à charger.
//
// Quatre voies, une par niveau de moment (1 : à chaque geste … 4 : l'émission exceptionnelle), un volume général et un
// compresseur qui empêche toute saturation. Les écarts entre voies sont plus serrés que dans l'audit (−18, −10, −4,
// 0 dB) : les sons des grands moments sont déjà plus longs et plus riches. Réglés par la mesure (niveau perçu sur un
// haut-parleur de téléphone) : un tampon léger sonne comme le coup d'aujourd'hui, la Hors-série nettement au-dessus.

export type NiveauSonore = 1 | 2 | 3 | 4;

export type Banque = {
  // Le tampon : un clic de 2 à 3 kHz, un corps de bois qui descend de 600 à 300 Hz (ce qu'un téléphone restitue), un
  // grave court de 120 à 50 Hz (ordinateur, casque). poids : 0 (léger) à 1 (lourd).
  tampon(t: number, n: NiveauSonore, poids?: number): void;
  // Glissé dans la pochette : un souffle doux qui descend de 2,5 à 1,2 kHz, puis le timbre bute au fond.
  glisse(t: number, n: NiveauSonore, duree?: number): void;
  // Tic-tac : deux clics filtrés en alternance (1,8 et 1,4 kHz), un peu plus forts quand le temps presse.
  tic(t: number, n: NiveauSonore, pair: boolean, urgence?: number): void;
  // Sonnette de guichet : une note claire (mi) et deux harmoniques de cloche qui s'éteignent vite.
  sonnette(t: number, n: NiveauSonore, force?: number): void;
  // La cloche du bureau : la signature sol-do-mi du jeu, en cloche ; 2 ou 3 notes.
  cloche(t: number, n: NiveauSonore, notes?: number): void;
  // La cloche grave, sous le tampon de la Hors-série.
  glas(t: number, n: NiveauSonore): void;
  // Deux notes ensemble, à la quinte (do et sol) : ni joyeuses ni tristes.
  quinte(t: number, n: NiveauSonore): void;
  // Le cor de poste : sol, do, mi.
  cor(t: number, n: NiveauSonore): void;
  // Le grattement d'une plume.
  plume(t: number, n: NiveauSonore): void;
  // Du papier qu'on froisse de plus en plus fort, pendant d secondes.
  froisse(t: number, n: NiveauSonore, d?: number): void;
};

export const VOLUME_DE_LA_BANQUE = 0.4;
export const NIVEAUX_DB: Record<NiveauSonore, number> = { 1: -12, 2: -8, 3: -3, 4: 0 };
// La signature du jeu (celle de l'alerte des joutes en direct) : sol, do, mi.
export const SIGNATURE = [784, 1046.5, 1318.5] as const;
// Le cor de poste en do : ses harmoniques naturelles 3, 4 et 5 donnent sol, do, mi (ce mi-là est un peu plus bas que
// celui du piano).
export const COR_EN_DO = 130.81;

const bruits = new WeakMap<BaseAudioContext, AudioBuffer>();
function bruitBlanc(ctx: BaseAudioContext): AudioBuffer {
  let b = bruits.get(ctx);
  if (!b) {
    const n = Math.floor(ctx.sampleRate * 1.6);
    b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    bruits.set(ctx, b);
  }
  return b;
}
const hasard = (a: number, b: number): number => a + Math.random() * (b - a);

type Souffle = { duree: number; type?: BiquadFilterType; f: number; f2?: number | null; q?: number; crete: number; a?: number };
type Onde = { type?: OscillatorType; f: number; f2?: number | null; crete: number; a?: number; d: number };

// La banque, sur un contexte audio (celui du jeu, ou un contexte hors ligne pour la mesure) ; elle sort vers
// « destination ».
export function creerBanque(ctx: BaseAudioContext, destination: AudioNode): Banque {
  const maitre = ctx.createGain();
  maitre.gain.value = VOLUME_DE_LA_BANQUE;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .2;
  maitre.connect(comp); comp.connect(destination);
  const voie = {} as Record<NiveauSonore, GainNode>;
  for (const n of [1, 2, 3, 4] as const) {
    const g = ctx.createGain();
    g.gain.value = 10 ** (NIVEAUX_DB[n] / 20);
    g.connect(maitre);
    voie[n] = g;
  }
  const bruit = bruitBlanc(ctx);
  function enveloppe(param: AudioParam, t: number, a: number, crete: number, d: number): void {
    param.setValueAtTime(.0001, t); param.exponentialRampToValueAtTime(crete, t + a); param.exponentialRampToValueAtTime(.0001, t + a + d);
  }
  // Un souffle filtré (papier, frottement, choc mat selon le filtre).
  function souffle(t: number, n: NiveauSonore, { duree, type = 'bandpass', f, f2 = null, q = 1, crete, a = .002 }: Souffle): void {
    const s = ctx.createBufferSource(); s.buffer = bruit;
    const fi = ctx.createBiquadFilter(); fi.type = type; fi.Q.value = q;
    fi.frequency.setValueAtTime(f, t); if (f2) fi.frequency.exponentialRampToValueAtTime(f2, t + a + duree);
    const g = ctx.createGain(); enveloppe(g.gain, t, a, crete, duree);
    s.connect(fi); fi.connect(g); g.connect(voie[n]);
    s.start(t, Math.random() * Math.max(0, bruit.duration - a - duree - .1)); s.stop(t + a + duree + .05);
  }
  // Une onde qui s'éteint d'elle-même.
  function onde(t: number, n: NiveauSonore, { type = 'sine', f, f2 = null, crete, a = .003, d }: Onde): void {
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    const g = ctx.createGain(); enveloppe(g.gain, t, a, crete, d);
    o.connect(g); g.connect(voie[n]); o.start(t); o.stop(t + a + d + .05);
  }
  // Une note de cloche : la fondamentale et sa jumelle un rien désaccordée (le battement du métal), l'octave, et les
  // deux partiels d'une lame (× 2,76 et × 5,4), qui s'éteignent vite.
  function tinte(t: number, n: NiveauSonore, f: number, { crete = .3, resonance = 1.3, clair = 1 } = {}): void {
    souffle(t, n, { duree: .005, type: 'highpass', f: 3500, crete: .1 * clair, a: .0005 });
    onde(t, n, { f, crete, a: .003, d: resonance });
    onde(t, n, { f: f * 1.0025, crete: crete * .45, a: .003, d: resonance * .85 });
    onde(t, n, { f: f * 2, crete: crete * .3, a: .002, d: resonance * .5 });
    onde(t, n, { f: f * 2.76, crete: crete * .22 * clair, a: .001, d: resonance * .3 });
    onde(t, n, { f: f * 5.4, crete: crete * .09 * clair, a: .001, d: .14 });
  }
  return {
    // Chaque coup varie un peu, comme à la main.
    tampon(t, n, poids = 0) {
      const k = poids, v = hasard(.97, 1.03);
      souffle(t, n, { duree: .006, f: 2600 * v, q: 1.2, crete: .62, a: .0008 });
      onde(t, n, { f: 620 * v, f2: 300 * v, crete: .7 + .2 * k, a: .0015, d: .06 + .03 * k });
      souffle(t, n, { duree: .045 + .03 * k, f: 520 * v, f2: 330, q: 2, crete: .38 + .19 * k, a: .0015 });
      onde(t, n, { f: 120, f2: 50, crete: .6 + .45 * k, a: .003, d: .1 + .2 * k });
      if (k > .5) souffle(t + .004, n, { duree: .16, type: 'lowpass', f: 900, f2: 180, q: .6, crete: .3 * k, a: .003 });
    },
    glisse(t, n, duree = .12) {
      souffle(t, n, { duree, f: 2500, f2: 1200, q: .9, crete: .8, a: .035 });
      souffle(t, n, { duree: duree * .8, type: 'highpass', f: 5000, crete: .12, a: .03 });
      souffle(t + duree + .02, n, { duree: .018, f: 1100, q: 1.4, crete: .22, a: .002 });
    },
    tic(t, n, pair, urgence = 0) {
      const f = pair ? 1400 : 1800, v = .75 + .25 * urgence;
      souffle(t, n, { duree: .02, f, q: 4, crete: 1 * v, a: .0006 });
      souffle(t, n, { duree: .004, type: 'highpass', f: 5000, crete: .3 * v, a: .0004 });
      onde(t, n, { f, crete: .42 * v, a: .001, d: .045 });
    },
    sonnette(t, n, force = 1) {
      const f = 1318.5;
      souffle(t, n, { duree: .004, type: 'highpass', f: 4500, crete: .22 * force, a: .0005 });
      onde(t, n, { f, crete: .34 * force, a: .002, d: 1.1 });
      onde(t, n, { f: f * 1.0021, crete: .16 * force, a: .002, d: .9 });
      onde(t, n, { f: f * 2.76, crete: .14 * force, a: .001, d: .4 });
      onde(t, n, { f: f * 5.4, crete: .06 * force, a: .001, d: .16 });
    },
    cloche(t, n, notes = 3) { SIGNATURE.slice(0, notes).forEach((f, i) => tinte(t + i * .16, n, f)); },
    glas(t, n) { tinte(t, n, 261.63, { crete: .42, resonance: 2.4, clair: .8 }); },
    quinte(t, n) { tinte(t, n, 523.25, { crete: .16, resonance: 1, clair: .6 }); tinte(t, n, 784, { crete: .14, resonance: 1, clair: .6 }); },
    // Dent de scie adoucie sous 1,5 kHz, attaque lente, léger vibrato sur la note tenue.
    cor(t, n) {
      ([[3, 0, .2], [4, .25, .2], [5, .5, 1.25]] as const).forEach(([h, debut, duree]) => {
        const f = COR_EN_DO * h, u = t + debut, fin = u + duree;
        const filtre = ctx.createBiquadFilter(); filtre.type = 'lowpass'; filtre.Q.value = .8;
        filtre.frequency.setValueAtTime(450, u); filtre.frequency.exponentialRampToValueAtTime(1450, u + .08); filtre.frequency.exponentialRampToValueAtTime(1100, fin);
        const g = ctx.createGain();
        g.gain.setValueAtTime(.0001, u); g.gain.exponentialRampToValueAtTime(.32, u + .06); g.gain.exponentialRampToValueAtTime(.24, fin); g.gain.exponentialRampToValueAtTime(.0001, fin + .18);
        filtre.connect(g); g.connect(voie[n]);
        const vibrato = ctx.createOscillator(); vibrato.frequency.value = 5.3;
        const profondeur = ctx.createGain();
        profondeur.gain.setValueAtTime(0, u); profondeur.gain.setValueAtTime(0, u + .15); profondeur.gain.linearRampToValueAtTime(f * .0035, u + .45);
        vibrato.connect(profondeur);
        for (const ecart of [-4, 4]) {
          const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = ecart;
          profondeur.connect(o.frequency); o.connect(filtre);
          o.start(u); o.stop(fin + .22);
        }
        vibrato.start(u); vibrato.stop(fin + .22);
        souffle(u, n, { duree: .05, f: 1300, q: 1, crete: .05, a: .01 });
      });
    },
    // De courts traits de souffle aigu (3 à 6 kHz), une levée au milieu, puis le paraphe.
    plume(t, n) {
      let u = t;
      for (let i = 0; i < 10; i++) {
        const d = hasard(.018, .04), f = hasard(3000, 6000);
        souffle(u, n, { duree: d, f, f2: f * hasard(.8, 1.2), q: 2.2, crete: hasard(.5, .9), a: .003 });
        u += d * .7 + hasard(0, .012) + (i === 5 ? .07 : 0);
      }
      souffle(u + .02, n, { duree: .1, f: 3500, f2: 6000, q: 2.5, crete: .7, a: .012 });
    },
    // Un souffle qui monte de 0,8 à 2,5 kHz, un tremblement qui accélère, des craquements de plus en plus serrés. Il
    // s'arrête net : le timbre se retourne.
    froisse(t, n, d = 1) {
      const s = ctx.createBufferSource(); s.buffer = bruit; s.loop = true;
      const fi = ctx.createBiquadFilter(); fi.type = 'bandpass'; fi.Q.value = 1.1;
      fi.frequency.setValueAtTime(800, t); fi.frequency.exponentialRampToValueAtTime(2500, t + d);
      const tremble = ctx.createGain(); tremble.gain.value = .55;
      const lfo = ctx.createOscillator(); lfo.type = 'triangle';
      lfo.frequency.setValueAtTime(6, t); lfo.frequency.exponentialRampToValueAtTime(24, t + d);
      const ampleur = ctx.createGain(); ampleur.gain.value = .45;
      lfo.connect(ampleur); ampleur.connect(tremble.gain);
      const g = ctx.createGain();
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.3, t + d * .92); g.gain.exponentialRampToValueAtTime(.0001, t + d + .03);
      s.connect(fi); fi.connect(tremble); tremble.connect(g); g.connect(voie[n]);
      s.start(t, Math.random() * .1); s.stop(t + d + .08); lfo.start(t); lfo.stop(t + d + .08);
      for (let u = t + .05; u < t + d - .02;) {
        const x = (u - t) / d;
        souffle(u, n, { duree: hasard(.006, .018), f: hasard(1500, 5000), q: hasard(2, 4), crete: .06 + x * hasard(.1, .32), a: .001 });
        u += .11 * (.2 ** x) + hasard(0, .01);
      }
    },
  };
}
