import { EQUILIBRAGE } from '../src/config/equilibrage.ts';
import { bonusDEnchainement, faceCachee, melanger, prevoirLAttaque, taillesDesFactions } from '../src/jeu/duel.ts';
import type { Duel, TaillesDesFactions } from '../src/jeu/duel.ts';
import { composerLEpreuve } from '../src/jeu/epreuve.ts';
import type { Epreuve } from '../src/jeu/epreuve.ts';
import type { Hasard } from '../src/jeu/hasard.ts';
import { TEMPS_DIRECT } from '../src/jeu/direct.ts';
import type { ActionDirect, ModeDirect, PhaseDirect, PoseDirect, BilanDirect, VueDirect } from '../src/jeu/direct.ts';
import type { CarteIndex, Registre } from '../src/partage/types.ts';
import type { CatalogueCombat } from './moteur-combat.ts';

const R = EQUILIBRAGE.duel;
export class RefusDirect extends Error {}
type Participant = { utilisateur: string; pseudo: string; equipe: number; deck: string[]; masques: Registre[] };
export type EtatDirect = {
  version: 1; mode: ModeDirect; manche: number; phase: PhaseDirect; echeance: number;
  joueurs: (Participant & { main: CarteIndex[]; pioche: CarteIndex[]; derniere: CarteIndex | null; absences: number })[];
  noms: string[]; masques: Registre[]; pv: number[]; ordre: number[]; arbitres: number[]; poses: PoseDirect[];
  questions: { cible: number; epreuve: Epreuve; reponses: Record<number, number>; decision: number | null }[];
  bilan: BilanDirect[]; vainqueur: number | 'nul' | null; raison: string | null;
  reponsesValidees: { utilisateur: string; carte: string; rarete: string; reussie: boolean }[];
};

function preparerManche(e: EtatDirect, maintenant: number) {
  const a = e.joueurs.flatMap((j, i) => j.equipe === 0 ? [i] : []);
  const b = e.joueurs.flatMap((j, i) => j.equipe === 1 ? [i] : []);
  // A1 B1 B2 A2, puis B2 A2 A1 B1. Les équipes et les arbitres alternent.
  e.ordre = a.length === 1 ? (e.manche % 2 ? [a[0], b[0]] : [b[0], a[0]])
    : e.manche % 2 ? [a[0], b[0], b[1], a[1]] : [b[1], a[1], a[0], b[0]];
  e.arbitres = [0, 1].map(c => e.ordre.filter(i => e.joueurs[i].equipe === c).at(-1)!);
  e.poses = []; e.questions = []; e.phase = 'pose'; e.echeance = maintenant + TEMPS_DIRECT.pose;
}

export function creerDirect(mode: ModeDirect, participants: Participant[], noms: string[], catalogue: CatalogueCombat, hasard: Hasard, maintenant: number): EtatDirect {
  const n = mode === 'solo' ? 2 : 4;
  if (participants.length !== n || new Set(participants.map(p => p.utilisateur)).size !== n
    || [0, 1].some(c => participants.filter(p => p.equipe === c).length !== n / 2)) throw new RefusDirect('Participants invalides.');
  const masques = [...new Set(participants.flatMap(p => p.masques))];
  const cartes = new Map(catalogue.cartes.filter(c => !c.registre.some(r => masques.includes(r))
    && (catalogue.definitions.get(c.id)?.some(d => !d.registre?.some(r => masques.includes(r))) ?? true)).map(c => [c.id, c]));
  const joueurs = participants.map(p => {
    const deck = [...new Set(p.deck)].flatMap(id => cartes.get(id) ?? []);
    if (deck.length !== R.tailleDuDeck) throw new RefusDirect('Les decks ne sont pas compatibles avec les filtres de contenu de cette partie.');
    const pioche = melanger(deck, hasard);
    return { ...p, main: pioche.splice(0, R.cartesEnMain), pioche, derniere: null, absences: 0 };
  });
  const e: EtatDirect = { version: 1, mode, manche: 1, phase: 'pose', echeance: maintenant, joueurs, noms, masques,
    pv: [R.pointsDeVie * n / 2, R.pointsDeVie * n / 2], ordre: [], arbitres: [], poses: [], questions: [], bilan: [], vainqueur: null, raison: null, reponsesValidees: [] };
  preparerManche(e, maintenant); return e;
}

export function voiesDisponibles(e: Pick<EtatDirect, 'joueurs' | 'poses'>, joueur: number): number[] {
  const equipe = e.joueurs[joueur].equipe;
  const nombre = e.joueurs.length / 2;
  // L'ouvreur fixe la première voie ; le deuxième poseur choisit son opposition.
  return Array.from({ length: nombre }, (_, i) => i).filter(i => !e.poses.some(p => e.joueurs[p.joueur].equipe === equipe && p.voie === i))
    .filter(i => e.poses.length !== 0 || i === 0);
}
function poser(e: EtatDirect, joueur: number, carte: string, voie: number, catalogue: CatalogueCombat, hasard: Hasard, maintenant: number) {
  const j = e.joueurs[joueur];
  const c = j.main.find(c => c.id === carte);
  if (e.phase !== 'pose' || e.ordre[e.poses.length] !== joueur || !c || !voiesDisponibles(e, joueur).includes(voie)) throw new RefusDirect('Ce placement n’est plus possible.');
  e.poses.push({ joueur, voie, carte: c }); j.main = j.main.filter(c => c.id !== carte);
  e.echeance = maintenant + TEMPS_DIRECT.pose;
  if (e.poses.length === e.joueurs.length) {
    const visibles = catalogue.cartes.filter(c => !e.poses.some(p => p.carte.id === c.id));
    e.questions = e.poses.map(p => ({ cible: p.joueur, epreuve: composerLEpreuve(p.carte, catalogue.definitions, visibles, e.masques, hasard), reponses: {}, decision: null }));
    e.phase = 'reponses'; e.echeance = maintenant + TEMPS_DIRECT.reponses;
  }
}
function desaccord(q: EtatDirect['questions'][number]) { return new Set(Object.values(q.reponses)).size > 1; }
function retenir(e: EtatDirect, q: EtatDirect['questions'][number]): number | null {
  const equipe = 1 - e.joueurs[q.cible].equipe;
  return q.decision ?? q.reponses[e.arbitres[equipe]] ?? Object.values(q.reponses)[0] ?? null;
}
function resoudre(e: EtatDirect, catalogue: CatalogueCombat, maintenant: number) {
  const subis = [0, 0];
  const tailles = taillesDesFactions(catalogue.cartes);
  e.bilan = e.poses.map(p => {
    const j = e.joueurs[p.joueur];
    const face = e.poses.find(f => f.voie === p.voie && e.joueurs[f.joueur].equipe !== j.equipe)!;
    const camp = { pv: 0, main: [], pioche: [], defausse: [], derniere: j.derniere };
    const duel: Duel = { manche: e.manche, vainqueur: null, manches: [], camps: { joueur: camp, adversaire: camp } };
    const prevision = prevoirLAttaque(duel, 'joueur', p.carte, face.carte, tailles, R);
    const q = e.questions.find(q => q.cible === p.joueur)!;
    e.joueurs.forEach((defenseur, i) => {
      if (defenseur.equipe === j.equipe) return;
      const proposition = i === e.arbitres[defenseur.equipe] ? q.decision ?? q.reponses[i] : q.reponses[i];
      e.reponsesValidees.push({ utilisateur: defenseur.utilisateur, carte: p.carte.id, rarete: p.carte.rarete, reussie: proposition === q.epreuve.bonne });
    });
    const choix = retenir(e, q); const paree = choix === q.epreuve.bonne;
    const degats = paree ? prevision.degatsSiParee : prevision.degats;
    subis[1 - j.equipe] += degats;
    return { joueur: p.joueur, mot: p.carte.mot, voie: p.voie, degats, paree, bonne: q.epreuve.propositions[q.epreuve.bonne], choisie: choix === null ? null : q.epreuve.propositions[choix] };
  });
  e.pv = e.pv.map((pv, i) => Math.max(0, pv - subis[i]));
  for (const p of e.poses) { const j = e.joueurs[p.joueur]; j.derniere = p.carte; const c = j.pioche.shift(); if (c) j.main.push(c); }
  if (e.pv.includes(0) || e.manche >= R.manchesMaximum || e.joueurs.some(j => j.main.length === 0)) {
    e.phase = 'fin'; e.vainqueur = e.pv[0] === e.pv[1] ? 'nul' : e.pv[0] > e.pv[1] ? 0 : 1;
  } else { e.phase = 'bilan'; e.echeance = maintenant + TEMPS_DIRECT.bilan; }
}
export function avancerDirect(initial: EtatDirect, catalogue: CatalogueCombat, hasard: Hasard, maintenant: number, commande?: { joueur: number; manche: number; phase: PhaseDirect; action: ActionDirect }): EtatDirect {
  // Une commande partie avant l'échéance, arrivée juste après (le temps du réseau), compte comme arrivée à temps : on
  // l'applique à l'instant de l'échéance, puis la partie avance jusqu'à maintenant.
  if (commande && commande.action.type !== 'abandonner' && maintenant >= initial.echeance && maintenant < initial.echeance + R.margeDuReseauEnMillisecondes
    && commande.manche === initial.manche && commande.phase === initial.phase && initial.phase !== 'fin') {
    return avancerDirect(avancerDirect(initial, catalogue, hasard, initial.echeance - 1, commande), catalogue, hasard, maintenant);
  }
  const e = structuredClone(initial);
  // Rattrapage borné, depuis les échéances serveur, même si tous les onglets étaient fermés.
  for (let i = 0; e.phase !== 'fin' && maintenant >= e.echeance && i < 100; i++) {
    const t = e.echeance;
    if (e.phase === 'pose') {
      const joueur = e.ordre[e.poses.length]; const j = e.joueurs[joueur];
      if (++j.absences >= 2) { e.phase = 'fin'; e.vainqueur = 1 - j.equipe; e.raison = `${j.pseudo} n’a pas joué pendant deux tours.`; }
      else poser(e, joueur, j.main[0].id, voiesDisponibles(e, joueur)[0], catalogue, hasard, t);
    } else if (e.phase === 'reponses' && e.questions.some(desaccord)) { e.phase = 'arbitrage'; e.echeance = t + TEMPS_DIRECT.arbitrage; }
    else if (e.phase === 'reponses' || e.phase === 'arbitrage') resoudre(e, catalogue, t);
    else { e.manche++; preparerManche(e, t); }
  }
  if (!commande) return e;
  const { joueur, action } = commande; const j = e.joueurs[joueur];
  if (!j) throw new RefusDirect('Tu ne participes pas à cette partie.');
  if (e.phase === 'fin') return e;
  if (action.type === 'abandonner') { e.phase = 'fin'; e.vainqueur = 1 - j.equipe; e.raison = `${j.pseudo} a abandonné.`; return e; }
  if (maintenant >= initial.echeance) return e;
  // Une commande en retard ne doit jamais devenir une réponse à la manche suivante.
  if (commande.manche !== e.manche || commande.phase !== e.phase) return e;
  if (action.type === 'poser') { poser(e, joueur, action.carte, action.voie, catalogue, hasard, maintenant); j.absences = 0; }
  else {
    const q = e.questions.find(q => q.cible === action.cible);
    if (!q || e.joueurs[q.cible].equipe === j.equipe || !Number.isInteger(action.choix) || action.choix < 0 || action.choix >= q.epreuve.propositions.length) throw new RefusDirect('Proposition invalide.');
    if (action.type === 'proposer' && e.phase === 'reponses') q.reponses[joueur] = action.choix;
    else if (action.type === 'trancher' && e.phase === 'arbitrage' && e.arbitres[j.equipe] === joueur && desaccord(q)
      && Object.values(q.reponses).includes(action.choix)) q.decision = action.choix;
    else throw new RefusDirect('Tu ne peux pas trancher cette réponse.');
    if (e.phase === 'reponses' && e.questions.every(q => Object.keys(q.reponses).length === e.joueurs.length / 2 && !desaccord(q))) resoudre(e, catalogue, maintenant);
    else if (e.phase === 'arbitrage' && e.questions.every(q => !desaccord(q) || q.decision !== null)) resoudre(e, catalogue, maintenant);
  }
  return e;
}
// « tailles » : pour annoncer l'attaque d'un mot face cachée avec son bonus d'enchaînement, comme le duel.
export function vueDirect(e: EtatDirect, utilisateur: string, tailles?: TaillesDesFactions): VueDirect {
  const moi = e.joueurs.findIndex(j => j.utilisateur === utilisateur);
  if (moi < 0) throw new RefusDirect('Tu ne participes pas à cette partie.');
  // Pendant la pose, les mots de l'autre équipe ne se voient que face cachée (nature, attaque, défense) ; tous se
  // retournent à l'ouverture des réponses. Aucune définition n'est transmise avant le bilan.
  const voir = (p: PoseDirect): CarteIndex => e.phase === 'pose' && e.joueurs[p.joueur].equipe !== e.joueurs[moi].equipe
    ? faceCachee(p.carte, tailles ? bonusDEnchainement(e.joueurs[p.joueur].derniere, p.carte, tailles, R) : 0) : { ...p.carte, definition: '' };
  return { mode: e.mode, manche: e.manche, phase: e.phase, echeance: e.echeance, moi,
    joueurs: e.joueurs.map(j => ({ pseudo: j.pseudo, equipe: j.equipe, main: j.equipe === e.joueurs[moi].equipe ? j.main.map(c => ({ ...c, definition: '' })) : [], restantes: j.pioche.length + j.main.length, derniere: j.derniere && { ...j.derniere, definition: '' } })),
    noms: e.noms, pv: e.pv, ordre: e.ordre, arbitres: e.arbitres, poses: e.poses.map(p => ({ ...p, carte: voir(p) })),
    questions: e.questions.filter(q => e.joueurs[q.cible].equipe !== e.joueurs[moi].equipe).map(q => ({ cible: q.cible, mot: q.epreuve.mot, propositions: q.epreuve.propositions, reponses: q.reponses, decision: q.decision, desaccord: desaccord(q) })),
    bilan: e.bilan, vainqueur: e.vainqueur, raison: e.raison };
}
