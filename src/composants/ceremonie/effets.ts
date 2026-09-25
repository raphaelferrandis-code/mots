// Les effets partagés de la cérémonie, repris de la maquette : sons synthétisés (aucun fichier) et particules
// dessinées sur un canevas (poussière, étincelles, confettis, fibres de papier).

// ── Les sons ─────────────────────────────────────────────────────────────────
// L'AudioContext se débloque au premier geste du joueur. « muet » suit le réglage « Sons du jeu ».

type Rafale = { t?: number; duree?: number; type?: BiquadFilterType; f?: number; f2?: number | null; q?: number; crete?: number; a?: number };
type Note = { t?: number; f?: number; f2?: number | null; type?: OscillatorType; crete?: number; a?: number; dec?: number };

class SonsDeLaCeremonie {
  private ctx: AudioContext | null = null;
  private maitre: GainNode | null = null;
  private bruit: AudioBuffer | null = null;
  private coupe = false;

  preparer(): void {
    if (this.ctx) { if (this.ctx.state === 'suspended') void this.ctx.resume(); return; }
    const Contexte = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Contexte) return;
    try {
      const ctx = new Contexte();
      const maitre = ctx.createGain();
      maitre.gain.value = this.coupe ? 0 : .55;
      const compresseur = ctx.createDynamicsCompressor();
      compresseur.threshold.value = -14; compresseur.ratio.value = 4;
      maitre.connect(compresseur); compresseur.connect(ctx.destination);
      const longueur = Math.floor(ctx.sampleRate * 1.6);
      const bruit = ctx.createBuffer(1, longueur, ctx.sampleRate);
      const canal = bruit.getChannelData(0);
      for (let i = 0; i < longueur; i++) canal[i] = Math.random() * 2 - 1;
      this.ctx = ctx; this.maitre = maitre; this.bruit = bruit;
    } catch { this.ctx = null; }
  }

  set muet(m: boolean) {
    this.coupe = m;
    if (this.ctx && this.maitre) this.maitre.gain.setTargetAtTime(m ? 0 : .55, this.ctx.currentTime, .02);
  }
  get muet(): boolean { return this.coupe; }

  private pret(): boolean { return !!this.ctx && !this.coupe && this.ctx.state === 'running'; }
  private enveloppe(g: GainNode, t: number, a: number, crete: number, dec: number): void {
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(crete, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + dec);
  }
  private rafale({ t = 0, duree = .05, type = 'bandpass', f = 2500, f2 = null, q = 1, crete = .3, a = .002 }: Rafale): void {
    if (!this.pret() || !this.ctx || !this.maitre || !this.bruit) return;
    const now = this.ctx.currentTime + t;
    const source = this.ctx.createBufferSource(); source.buffer = this.bruit;
    const filtre = this.ctx.createBiquadFilter(); filtre.type = type; filtre.frequency.setValueAtTime(f, now);
    if (f2) filtre.frequency.exponentialRampToValueAtTime(f2, now + a + duree);
    filtre.Q.value = q;
    const g = this.ctx.createGain(); this.enveloppe(g, now, a, crete, duree);
    source.connect(filtre); filtre.connect(g); g.connect(this.maitre);
    source.start(now, Math.random() * 1.2); source.stop(now + a + duree + .05);
  }
  private note({ t = 0, f = 440, f2 = null, type = 'sine', crete = .2, a = .005, dec = .6 }: Note): void {
    if (!this.pret() || !this.ctx || !this.maitre) return;
    const now = this.ctx.currentTime + t;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, now);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, now + a + dec);
    const g = this.ctx.createGain(); this.enveloppe(g, now, a, crete, dec);
    o.connect(g); g.connect(this.maitre); o.start(now); o.stop(now + a + dec + .05);
  }

  grain(v = 1): void { this.rafale({ duree: .025 + Math.random() * .04, f: 1600 + Math.random() * 3200, q: .7 + Math.random() * 2, crete: .1 + .22 * v * Math.random() }); }
  dechirure(): void {
    for (let i = 0; i < 16; i++) this.rafale({ t: i * .022 + Math.random() * .01, duree: .04 + Math.random() * .05, f: 1400 + Math.random() * 3000, crete: .22 + Math.random() * .2 });
    this.rafale({ duree: .35, type: 'lowpass', f: 3000, f2: 600, q: .5, crete: .16 });
  }
  souffle(): void { this.rafale({ duree: .3, f: 500, f2: 2600, q: .8, crete: .2, a: .07 }); }
  coup(): void { this.note({ f: 150, f2: 42, crete: .9, dec: .22 }); this.rafale({ duree: .03, type: 'highpass', f: 2500, crete: .22 }); this.rafale({ duree: .12, type: 'lowpass', f: 500, crete: .3 }); }
  carillon(niveau = 1): void {
    const base = [659.25, 830.61, 987.77, 1318.5, 1661.2];
    for (let i = 0; i < 2 + niveau; i++) { this.note({ t: i * .075, f: base[i], crete: .13, dec: 1.3 }); this.note({ t: i * .075, f: base[i] * 2.01, crete: .035, dec: .7 }); }
  }
  scintillement(): void { for (let i = 0; i < 14; i++) this.note({ t: i * .045, f: 1800 + Math.random() * 3400, crete: .045, dec: .5 }); }
  montee(d = .9): void { this.rafale({ duree: .08, f: 300, f2: 3500, q: 1.2, crete: .22, a: d }); this.note({ f: 110, f2: 240, type: 'sawtooth', crete: .07, a: d * .9, dec: .12 }); }
  eclat(): void {
    this.note({ f: 90, f2: 28, crete: 1, dec: 1.1 }); this.rafale({ duree: .9, type: 'lowpass', f: 900, f2: 120, crete: .45 });
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => this.note({ t: .14 + i * .07, f, type: 'triangle', crete: .11, dec: 1.6 }));
  }
  bulle(): void { this.note({ f: 520, f2: 880, type: 'triangle', crete: .1, dec: .09 }); }
}

export const SONS = new SonsDeLaCeremonie();
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => SONS.preparer(), { passive: true });
  window.addEventListener('keydown', () => SONS.preparer());
}

// ── Les particules ──────────────────────────────────────────────────────────
// La boucle s'arrête d'elle-même quand il n'y a plus rien à dessiner.

type Genre = 'poussiere' | 'etincelle' | 'confetti' | 'fibre';
type Particule = { x: number; y: number; vx: number; vy: number; g: number; frein: number; vie: number; duree: number; taille: number; couleur: string; genre: Genre; rot: number; vr: number };
export type Jaillissement = { n?: number; genre?: Genre; couleurs?: string[]; vitesse?: [number, number]; taille?: [number, number]; g?: number; duree?: [number, number]; frein?: number; ouverture?: number; angle?: number };

const entre = (a: number, b: number): number => a + Math.random() * (b - a);

export class Particules {
  private parts: Particule[] = [];
  private enCours = false;
  private dernier = 0;
  private dpr = 1;
  private readonly c: CanvasRenderingContext2D | null;
  private readonly toile: HTMLCanvasElement;
  private readonly reduit: () => boolean;

  constructor(toile: HTMLCanvasElement, reduit: () => boolean) {
    this.toile = toile;
    this.reduit = reduit;
    this.c = toile.getContext('2d');
    this.ajuster();
  }

  ajuster(): void {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.toile.width = Math.round(window.innerWidth * this.dpr);
    this.toile.height = Math.round(window.innerHeight * this.dpr);
  }

  jaillir(x: number, y: number, { n = 30, genre = 'poussiere', couleurs = ['#f0c48f'], vitesse = [80, 380], taille = [1.5, 4], g = 0, duree = [.6, 1.4], frein = .96, ouverture = Math.PI * 2, angle = -Math.PI / 2 }: Jaillissement = {}): void {
    if (!this.c) return;
    if (this.reduit()) n = Math.ceil(n / 5);
    for (let i = 0; i < n; i++) {
      const a = angle + (Math.random() - .5) * ouverture;
      const s = entre(vitesse[0], vitesse[1]);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g, frein, vie: 1, duree: entre(duree[0], duree[1]), taille: entre(taille[0], taille[1]), couleur: couleurs[i % couleurs.length], genre, rot: Math.random() * 6, vr: (Math.random() - .5) * 12 });
    }
    if (!this.enCours) { this.enCours = true; this.dernier = performance.now(); requestAnimationFrame(this.boucle); }
  }

  vider(): void { this.parts = []; }

  private boucle = (maintenant: number): void => {
    const c = this.c;
    if (!c) return;
    const dt = Math.min(.05, (maintenant - this.dernier) / 1000);
    this.dernier = maintenant;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.vie -= dt / p.duree;
      if (p.vie <= 0) { this.parts.splice(i, 1); continue; }
      const fr = Math.pow(p.frein, dt * 60);
      p.vx *= fr; p.vy = p.vy * fr + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      c.globalAlpha = Math.min(1, p.vie * 1.6);
      if (p.genre === 'poussiere') {
        c.globalCompositeOperation = 'lighter'; c.fillStyle = p.couleur;
        c.beginPath(); c.arc(p.x, p.y, p.taille * (.4 + .6 * p.vie), 0, 6.283); c.fill();
      } else if (p.genre === 'etincelle') {
        c.globalCompositeOperation = 'lighter'; c.strokeStyle = p.couleur; c.lineWidth = p.taille; c.lineCap = 'round';
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * .035, p.y - p.vy * .035); c.stroke();
      } else {
        c.globalCompositeOperation = 'source-over'; c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, Math.cos(p.rot * 1.7));
        c.fillStyle = p.couleur; c.fillRect(-p.taille / 2, -p.taille * .3, p.taille, p.taille * (p.genre === 'fibre' ? .35 : .6)); c.restore();
      }
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    if (this.parts.length) requestAnimationFrame(this.boucle);
    else { this.enCours = false; c.clearRect(0, 0, window.innerWidth, window.innerHeight); }
  };
}
