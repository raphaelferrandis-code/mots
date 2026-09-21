// Bruitages synthétisés localement : papier sec, souffle et petites percussions.
// Le contexte est créé/repris dans un geste utilisateur, jamais au chargement.
export class SonsPaquets {
  private fabriquerContexte: () => AudioContext;
  private contexte: AudioContext | null = null;
  private sortie: GainNode | null = null;
  private sources = new Set<AudioScheduledSourceNode>();
  private actif = true;

  constructor(fabriquerContexte: () => AudioContext = () => new AudioContext()) {
    this.fabriquerContexte = fabriquerContexte;
  }

  activer(actif: boolean): void {
    this.actif = actif;
    if (!actif) this.arreter();
  }

  preparer(): void {
    if (!this.actif) return;
    try {
      this.contexte ??= this.fabriquerContexte();
      if (!this.sortie) {
        this.sortie = this.contexte.createGain();
        this.sortie.gain.value = 0.22;
        this.sortie.connect(this.contexte.destination);
      }
      if (this.contexte.state === 'suspended') void this.contexte.resume().catch(() => {});
    } catch { /* Le jeu fonctionne aussi sans sortie audio. */ }
  }

  private bruit(duree: number, frequence: number, volume: number, delai = 0): void {
    const c = this.contexte;
    if (!this.actif || !c || !this.sortie || c.state === 'closed' || (typeof document !== 'undefined' && document.hidden)) return;
    const debut = c.currentTime + delai;
    const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * duree), c.sampleRate);
    const donnees = buffer.getChannelData(0);
    for (let i = 0; i < donnees.length; i++) donnees[i] = (Math.random() * 2 - 1) * (0.7 + 0.3 * Math.sin(i / 83));
    const source = c.createBufferSource();
    source.buffer = buffer;
    const filtre = c.createBiquadFilter();
    filtre.type = 'bandpass'; filtre.frequency.value = frequence; filtre.Q.value = 0.65;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, debut);
    gain.gain.linearRampToValueAtTime(volume, debut + Math.min(0.025, duree / 3));
    gain.gain.exponentialRampToValueAtTime(0.001, debut + duree);
    source.connect(filtre).connect(gain).connect(this.sortie);
    this.sources.add(source);
    source.onended = () => { this.sources.delete(source); source.disconnect(); filtre.disconnect(); gain.disconnect(); };
    source.start(debut); source.stop(debut + duree);
  }

  ouvrir(): void {
    this.bruit(0.07, 1800, 0.6);
    this.bruit(0.32, 2600, 0.7, 0.1);
    this.bruit(0.4, 650, 0.35, 0.23);
  }

  carte(position = 0, delai = 0): void {
    this.bruit(0.13, 1100 + position * 150, 0.35, delai);
    this.bruit(0.065, 280, 0.65, delai + 0.085);
  }

  retourner(): void { this.preparer(); this.carte(); }

  arreter(): void {
    for (const source of this.sources) { try { source.stop(); } catch { /* Déjà terminé. */ } }
    this.sources.clear();
  }

  fermer(): void {
    this.arreter();
    if (this.contexte) void this.contexte.close().catch(() => {});
    this.contexte = null; this.sortie = null;
  }
}
