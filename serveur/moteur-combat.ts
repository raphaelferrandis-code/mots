// Exécuté par la fonction serveur. Aucun état privé ni tirage ne vient du navigateur.
import { EQUILIBRAGE } from '../src/config/equilibrage.ts';
import { chancesDeLOrdinateur, choisirPourLOrdinateur, commencerLeDuel, deckDeLOrdinateur, jouerLaManche, taillesDesFactions } from '../src/jeu/duel.ts';
import { composerLEpreuve } from '../src/jeu/epreuve.ts';
import type { Definitions } from '../src/jeu/epreuve.ts';
import type { Hasard } from '../src/jeu/hasard.ts';
import { chancesDuDouble } from '../src/jeu/joute.ts';
import type { ProfilDeJoute } from '../src/jeu/joute.ts';
import type { ActionCombat, AdversaireCombat, ChoixCombat, EtapeCombat, ReponseCombat, VueCombat } from '../src/jeu/combat.ts';
import type { Apprentissage } from '../src/jeu/sauvegarde.ts';
import type { CarteIndex, Rarete, Registre } from '../src/partage/types.ts';
import type { Resultat } from '../src/jeu/progression.ts';

export class RefusCombat extends Error {}
export const VERSION_MOTEUR = 1;
export const DUREE_COMBAT = 24 * 60 * 60 * 1000; // y compris le temps illimité d'accessibilité
const R = EQUILIBRAGE.duel;
export type CatalogueCombat = { cartes: CarteIndex[]; definitions: Definitions };
export type EtatCombatPrive = VueCombat & {
  versionMoteur: number; masques: Registre[]; possedees: string[]; deckDepart: string[];
  apprentissages: Record<string, Apprentissage>; resultat: Resultat | null;
  abandonne: boolean; archive: boolean;
};
export type EffetReponse = { carte: string; rarete: Rarete; reussie: boolean; parade: boolean; apprentissage: boolean };
export type TransitionCombat = { etat: EtatCombatPrive; reponse?: EffetReponse };

function visibles(catalogue: CatalogueCombat, masques: Registre[]): CarteIndex[] {
  return catalogue.cartes.filter(c => !c.registre.some(r => masques.includes(r))
    && (catalogue.definitions.get(c.id)?.some(d => !d.registre?.some(r => masques.includes(r))) ?? true));
}
function adverse(duel: VueCombat['duel'], adversaire: AdversaireCombat, catalogue: CatalogueCombat, hasard: Hasard): CarteIndex {
  return choisirPourLOrdinateur(duel, adversaire.type === 'joute' ? 'Normal' : adversaire.niveau, hasard, taillesDesFactions(catalogue.cartes), R);
}
export function creerCombat(choix: ChoixCombat, compte: { deck: string[]; possedees: string[]; apprentissages: Record<string, Apprentissage> }, profil: ProfilDeJoute | null, catalogue: CatalogueCombat, hasard: Hasard, maintenant: number): EtatCombatPrive {
  const disponibles = visibles(catalogue, choix.masques);
  const parId = new Map(disponibles.map(c => [c.id, c]));
  const deck = [...new Set(compte.deck)].flatMap(id => compte.possedees.includes(id) && parId.has(id) ? [parId.get(id)!] : []);
  if (deck.length !== R.tailleDuDeck) throw new RefusCombat(`Ton deck doit compter ${R.tailleDuDeck} cartes jouables.`);
  if (choix.mode === 'joute' && (!profil || profil.id !== choix.adversaire)) throw new RefusCombat('Cet adversaire est indisponible.');
  const adversaire: AdversaireCombat = choix.mode === 'entrainement' ? { type: 'entrainement', niveau: choix.niveau } : { type: 'joute', profil: profil! };
  const autre = adversaire.type === 'entrainement' ? deckDeLOrdinateur(deck, disponibles, adversaire.niveau, hasard, R)
    : [...new Set(adversaire.profil.deck)].flatMap(id => parId.has(id) ? [parId.get(id)!] : []);
  if (autre.length !== R.tailleDuDeck) throw new RefusCombat('Le deck adverse contient des mots masqués ou est incomplet.');
  const duel = commencerLeDuel(deck, autre, hasard, R);
  return {
    versionMoteur: VERSION_MOTEUR, duel, adversaire, masques: choix.masques, temps: choix.temps,
    possedees: compte.possedees, deckDepart: compte.deck, apprentissages: structuredClone(compte.apprentissages),
    etape: { nom: 'choix', adverse: adverse(duel, adversaire, catalogue, hasard), choisie: null },
    creeLe: maintenant, expireLe: maintenant + DUREE_COMBAT, termine: false, resultat: null, abandonne: false, archive: false,
    bilan: { attaques: 0, attaquesReussies: 0, parades: 0, paradesReussies: 0, maitrises: [] },
  };
}

export function avancerCombat(avant: EtatCombatPrive, action: ActionCombat, catalogue: CatalogueCombat, hasard: Hasard, maintenant: number): TransitionCombat {
  const etat = structuredClone(avant);
  const e = etat.etape;
  if (etat.archive) throw new RefusCombat('Ce combat est archivé.');
  const expire = !etat.termine && maintenant >= etat.expireLe;
  if ((action.type === 'abandonner' || expire) && !etat.termine) {
    etat.termine = true; etat.resultat = 'defaite'; etat.abandonne = true;
    etat.etape = { nom: 'fin', resultat: 'defaite', abandonne: true, expire };
    return { etat };
  }
  if (action.type === 'quitter' && etat.termine) { etat.archive = true; return { etat }; }
  if (etat.versionMoteur !== VERSION_MOTEUR) throw new RefusCombat('Cette ancienne partie doit être abandonnée avant de continuer.');
  const question = (carte: CarteIndex, autre: CarteIndex) => composerLEpreuve(carte, catalogue.definitions, visibles(catalogue, etat.masques).filter(c => c.id !== autre.id), etat.masques, hasard);
  if (action.type === 'choisir' && e.nom === 'choix') {
    const carte = etat.duel.camps.joueur.main.find(c => c.id === action.carte);
    if (!carte) throw new RefusCombat('Cette carte ne figure pas dans ta main.');
    etat.etape = { nom: 'attaque', carte, adverse: e.adverse, epreuve: question(carte, e.adverse), debut: maintenant };
  } else if (action.type === 'continuer' && e.nom === 'echappe') {
    etat.etape = { ...e, nom: 'parade', epreuve: question(e.adverse, e.carte), debut: maintenant };
  } else if (action.type === 'continuer' && e.nom === 'bilan') {
    etat.duel = e.apres;
    etat.etape = etat.resultat ? { nom: 'fin', resultat: etat.resultat, abandonne: false, expire: false }
      : { nom: 'choix', adverse: adverse(e.apres, etat.adversaire, catalogue, hasard), choisie: null };
  } else if (action.type === 'repondre' && (e.nom === 'attaque' || e.nom === 'parade')) {
    if (action.choisie !== null && (!Number.isInteger(action.choisie) || action.choisie < 0 || action.choisie >= e.epreuve.propositions.length)) throw new RefusCombat('Réponse invalide.');
    const secondes = etat.temps === 'illimite' ? Infinity : R.secondesPourRepondre * (etat.temps === 'double' ? 2 : 1);
    const choisie = maintenant > e.debut + secondes * 1000 ? null : action.choisie;
    const juste = choisie !== null && choisie === e.epreuve.bonne;
    const carte = e.nom === 'attaque' ? e.carte : e.adverse;
    const apprentissage = etat.possedees.includes(carte.id);
    const connu = etat.apprentissages[carte.id] ?? { posees: 0, reussites: 0, maitriseeLe: null };
    const maitrise = apprentissage && juste && connu.maitriseeLe === null && connu.reussites + 1 >= R.reussitesPourLaMaitrise;
    if (apprentissage) etat.apprentissages[carte.id] = { posees: connu.posees + 1, reussites: connu.reussites + Number(juste), maitriseeLe: maitrise ? maintenant : connu.maitriseeLe };
    const reponse: ReponseCombat = { epreuve: e.epreuve, choisie, juste, maitrise };
    if (maitrise) etat.bilan.maitrises.push(carte.mot);
    if (e.nom === 'attaque') {
      etat.bilan.attaques++; etat.bilan.attaquesReussies += Number(juste);
      etat.etape = juste ? { nom: 'parade', carte: e.carte, adverse: e.adverse, attaque: reponse, epreuve: question(e.adverse, e.carte), debut: maintenant }
        : { nom: 'echappe', carte: e.carte, adverse: e.adverse, attaque: reponse };
    } else {
      etat.bilan.parades++; etat.bilan.paradesReussies += Number(juste);
      const chances = etat.adversaire.type === 'entrainement' ? chancesDeLOrdinateur(etat.adversaire.niveau, e.carte, R) : chancesDuDouble(etat.adversaire.profil, e.adverse, e.carte, EQUILIBRAGE.joute);
      const apres = jouerLaManche(etat.duel, e.carte.id, e.adverse.id, { joueurReussit: e.attaque.juste, joueurPare: juste, adversaireReussit: hasard() < chances.reussir, adversairePare: hasard() < chances.parer }, hasard, taillesDesFactions(catalogue.cartes), R);
      etat.etape = { nom: 'bilan', carte: e.carte, adverse: e.adverse, attaque: e.attaque, parade: reponse, apres };
      if (apres.vainqueur) { etat.termine = true; etat.resultat = apres.vainqueur === 'joueur' ? 'victoire' : apres.vainqueur === 'nul' ? 'nul' : 'defaite'; }
    }
    return { etat, reponse: { carte: carte.id, rarete: carte.rarete, reussie: juste, parade: e.nom === 'parade', apprentissage } };
  } else throw new RefusCombat('Cette action ne correspond plus à l’étape du combat. Reprends la partie.');
  return { etat };
}

export function vueCombat(etat: EtatCombatPrive): VueCombat {
  let etape: EtapeCombat = structuredClone(etat.etape);
  if (etape.nom === 'attaque' || etape.nom === 'parade') etape = { ...etape, epreuve: { ...etape.epreuve, bonne: -1 } };
  // Aucun ordre de pioche, main adverse cachée ou statistique privée n'est transmis.
  const dos: CarteIndex = { id: 'cachee', mot: '', definition: '', type: 'Nom', rarete: 'Commune', faction: '', attaque: 0, defense: 0, registre: [] };
  const cacher = (duel: VueCombat['duel']) => ({ ...duel, camps: {
    joueur: { ...duel.camps.joueur, pioche: duel.camps.joueur.pioche.map(() => dos) },
    adversaire: { ...duel.camps.adversaire, main: duel.camps.adversaire.main.map(() => dos), pioche: duel.camps.adversaire.pioche.map(() => dos) },
  } });
  if (etape.nom === 'bilan') etape.apres = cacher(etape.apres);
  const adversaire: AdversaireCombat = etat.adversaire.type === 'entrainement' ? etat.adversaire
    : { type: 'joute', profil: { ...etat.adversaire.profil, deck: [], savoirs: {}, parades: {} } };
  return { duel: cacher(etat.duel), etape, adversaire, temps: etat.temps, creeLe: etat.creeLe, expireLe: etat.expireLe, termine: etat.termine, bilan: etat.bilan };
}
