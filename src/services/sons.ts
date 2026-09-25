// La sortie sonore du jeu. Tous les sons sont fabriqués sur place (souffles filtrés et notes brèves) : aucun
// fichier à charger. Le contexte audio est créé ou repris dans un geste du joueur, jamais au chargement
// (les navigateurs l'exigent). Les familles de sons en héritent : sonsPaquets.ts, sonsDuDuel.ts.
export class SortieSonore {
  private fabriquerContexte: () => AudioContext;
  private contexte: AudioContext | null = null;
  private sortie: GainNode | null = null;
  private sources = new Set<AudioScheduledSourceNode>();
  private actif = true;
  // Onglet caché : silence, sauf pour une alerte qui doit justement faire revenir le joueur (sonsDuDirect.ts).
  protected seTaitEnArrierePlan = true;

  constructor(fabriquerContexte: () => AudioContext = () => new AudioContext()) {
    this.fabriquerContexte = fabriquerContexte;
  }

  activer(actif: boolean): void {
    this.actif = actif;
    if (!actif) this.arreter();
  }

  // À appeler dans un geste du joueur (clic, toucher), avant le premier son.
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

  // La sortie, si un son peut être joué maintenant (son coupé, onglet caché, audio indisponible : silence).
  private pret(): { contexte: AudioContext; sortie: GainNode } | null {
    const c = this.contexte;
    if (!this.actif || !c || !this.sortie || c.state === 'closed' || (this.seTaitEnArrierePlan && typeof document !== 'undefined' && document.hidden)) return null;
    return { contexte: c, sortie: this.sortie };
  }

  private jouer(source: AudioScheduledSourceNode, noeuds: AudioNode[], debut: number, duree: number): void {
    this.sources.add(source);
    source.onended = () => { this.sources.delete(source); source.disconnect(); for (const noeud of noeuds) noeud.disconnect(); };
    source.start(debut); source.stop(debut + duree);
  }

  // Un souffle filtré : papier, frottement, choc mat selon la fréquence.
  protected bruit(duree: number, frequence: number, volume: number, delai = 0): void {
    const pret = this.pret();
    if (!pret) return;
    const c = pret.contexte;
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
    source.connect(filtre).connect(gain).connect(pret.sortie);
    this.jouer(source, [filtre, gain], debut, duree);
  }

  // Une note brève et douce, qui s'éteint d'elle-même (une lame de boîte à musique plutôt qu'un bip).
  protected note(frequence: number, duree: number, volume: number, delai = 0): void {
    const pret = this.pret();
    if (!pret) return;
    const c = pret.contexte;
    const debut = c.currentTime + delai;
    const source = c.createOscillator();
    source.type = 'triangle';
    source.frequency.value = frequence;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, debut);
    gain.gain.linearRampToValueAtTime(volume, debut + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, debut + duree);
    source.connect(gain).connect(pret.sortie);
    this.jouer(source, [gain], debut, duree);
  }

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
