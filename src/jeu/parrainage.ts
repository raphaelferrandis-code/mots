// Le parrainage vu par le jeu (serveur/parrainage.ts) : le lien d'invitation, la lecture de ce que dit le serveur, et
// les nouvelles à annoncer au joueur. Aucune règle ici : le serveur décide seul de qui reçoit quoi.

import { lireEtat } from './synchronisation.ts';
import type { EtatDuCompte } from './synchronisation.ts';

export type MonParrainage = {
  code: string;
  paquets: number; // offerts à chacun
  invites: number; // arrivés par son lien
  valides: number; // ont terminé leur premier duel
  nouveaux: (string | null)[]; // filleuls dont les paquets viennent d'être versés au joueur (pseudonyme, s'ils en ont un)
  enAttente: number; // lots de paquets gagnés, en attente de place dans la réserve
  parrain: { pseudo: string | null; valide: boolean; verse: boolean } | null; // qui a invité le joueur
  etat: EtatDuCompte | null; // le compte, quand des paquets viennent d'y être versés
};

// Le paramètre d'adresse qui porte le code : https://philamots.fr/?parrain=ABCD2345
export const PARAMETRE_D_INVITATION = 'parrain';
const CODE = /^[A-Za-z0-9]{4,16}$/;

export function lienDInvitation(adresseDuSite: string, code: string): string {
  const adresse = new URL(adresseDuSite);
  adresse.searchParams.set(PARAMETRE_D_INVITATION, code);
  return adresse.toString();
}

// Le code d'invitation d'une adresse, s'il y en a un de plausible (tirets et espaces ignorés).
export function codeDeLAdresse(adresse: string): string | null {
  let brut: string | null;
  try { brut = new URL(adresse).searchParams.get(PARAMETRE_D_INVITATION); } catch { return null; }
  const code = (brut ?? '').replace(/[\s-]/g, '').toUpperCase();
  return CODE.test(code) ? code : null;
}

const entier = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const texte = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
const objet = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function lireParrainage(brut: unknown): MonParrainage {
  const lu = objet(brut) ? brut : {};
  const parrain = objet(lu.parrain) ? lu.parrain : null;
  return {
    code: texte(lu.code) ?? '',
    paquets: entier(lu.paquets),
    invites: entier(lu.invites),
    valides: entier(lu.valides),
    nouveaux: Array.isArray(lu.nouveaux) ? lu.nouveaux.map(texte) : [],
    enAttente: entier(lu.enAttente),
    parrain: parrain ? { pseudo: texte(parrain.pseudo), valide: parrain.valide === true, verse: parrain.verse === true } : null,
    etat: objet(lu.etat) ? lireEtat(lu.etat) : null,
  };
}

// Les nouvelles de l'accueil, de la plus réjouissante à la plus pratique. « bienvenueVue » : le joueur a déjà fermé
// l'annonce de son cadeau de bienvenue (retenu sur l'appareil).
export type Nouvelle = { cle: string; titre: string; texte: string; lien?: 'duel' | 'paquet'; fermable?: boolean };
export function nouvellesDuParrainage(p: MonParrainage, bienvenueVue: boolean): Nouvelle[] {
  const nouvelles: Nouvelle[] = [];
  const paquets = (n: number) => `${n} paquet${n > 1 ? 's' : ''}`;
  if (p.nouveaux.length > 0) {
    const noms = p.nouveaux.map(n => n ?? 'un ami');
    const liste = noms.length === 1 ? noms[0] : `${noms.slice(0, -1).join(', ')} et ${noms.at(-1)}`;
    nouvelles.push({ cle: 'parrain', titre: 'Merci pour l’invitation !', lien: 'paquet', fermable: true,
      texte: `${liste.charAt(0).toUpperCase()}${liste.slice(1)} ${noms.length > 1 ? 'ont' : 'a'} joué ${noms.length > 1 ? 'leur' : 'son'} premier duel : ${paquets(p.paquets * noms.length)} ajoutés à ta réserve.` });
  }
  if (p.parrain && !p.parrain.valide) {
    nouvelles.push({ cle: 'invite', titre: 'Bienvenue !', lien: 'duel',
      texte: `${p.parrain.pseudo ?? 'Un ami'} t’a invité. Termine ton premier duel : vous recevrez chacun ${paquets(p.paquets)}.` });
  } else if (p.parrain?.verse && !bienvenueVue) {
    nouvelles.push({ cle: 'bienvenue', titre: 'Cadeau de bienvenue', lien: 'paquet', fermable: true,
      texte: `${paquets(p.paquets)} ajoutés à ta réserve, grâce à l’invitation de ${p.parrain.pseudo ?? 'ton ami'}.` });
  }
  if (p.enAttente > 0) {
    nouvelles.push({ cle: 'attente', titre: 'Des paquets t’attendent', lien: 'paquet',
      texte: `${paquets(p.paquets * p.enAttente)} de parrainage arriveront dès que ta réserve aura de la place : ouvre quelques paquets.` });
  }
  return nouvelles;
}
