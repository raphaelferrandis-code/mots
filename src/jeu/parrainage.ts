// Le parrainage vu par le jeu (serveur/parrainage.ts) : le lien d'invitation, la lecture de ce que dit le serveur, et
// les nouvelles à annoncer au joueur. Aucune règle ici : le serveur décide seul de qui reçoit quoi.

import { lireEtat } from './synchronisation.ts';
import type { EtatDuCompte } from './synchronisation.ts';

export type MonParrainage = {
  code: string;
  paquets: number; // offerts à chacun
  // Le serveur ne récompense le parrain qu'à la confirmation du filleul (règle du 25/09/2026). Faux avec un serveur
  // pas encore à jour, qui récompense encore au premier duel : le jeu garde alors les anciens textes.
  confirmation: boolean;
  invites: number; // arrivés par son lien
  valides: number; // ont terminé leur premier duel
  recompenses: number; // filleuls qui lui ont rapporté des paquets ces 30 derniers jours
  aConfirmer: number; // ont joué leur premier duel, pas encore confirmés, et peuvent encore l'être
  nouveaux: (string | null)[]; // filleuls dont les paquets viennent d'être versés au joueur (pseudonyme, s'ils en ont un)
  enAttente: number; // lots de paquets gagnés, en attente de place dans la réserve
  parrain: Parrain | null; // qui a invité le joueur
  etat: EtatDuCompte | null; // le compte, quand des paquets viennent d'y être versés
};
// Qui a invité le joueur, et ce qui manque encore au joueur pour que son parrain soit récompensé.
export type Parrain = {
  pseudo: string | null; valide: boolean; verse: boolean;
  confirme: boolean; manqueCompte: boolean; manqueJour: boolean; echu: boolean;
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
  const confirmation = lu.confirmation === true;
  return {
    code: texte(lu.code) ?? '',
    paquets: entier(lu.paquets),
    confirmation,
    invites: entier(lu.invites),
    valides: entier(lu.valides),
    recompenses: confirmation ? entier(lu.recompenses) : entier(lu.valides),
    aConfirmer: entier(lu.aConfirmer),
    nouveaux: Array.isArray(lu.nouveaux) ? lu.nouveaux.map(texte) : [],
    enAttente: entier(lu.enAttente),
    parrain: parrain ? {
      pseudo: texte(parrain.pseudo), valide: parrain.valide === true, verse: parrain.verse === true,
      confirme: parrain.confirme === true, manqueCompte: parrain.manqueCompte === true, manqueJour: parrain.manqueJour === true, echu: parrain.echu === true,
    } : null,
    etat: objet(lu.etat) ? lireEtat(lu.etat) : null,
  };
}

// Les nouvelles de l'accueil, de la plus réjouissante à la plus pratique. « bienvenueVue » et « aideVue » : le joueur a
// déjà fermé l'annonce de son cadeau de bienvenue, ou celle qui lui dit comment faire récompenser son parrain (retenu
// sur l'appareil).
export type Nouvelle = { cle: string; titre: string; texte: string; lien?: 'duel' | 'paquet' | 'compte'; fermable?: boolean };
export function nouvellesDuParrainage(p: MonParrainage, bienvenueVue: boolean, aideVue = false): Nouvelle[] {
  const nouvelles: Nouvelle[] = [];
  const paquets = (n: number) => `${n} paquet${n > 1 ? 's' : ''}`;
  if (p.nouveaux.length > 0) {
    const noms = p.nouveaux.map(n => n ?? 'un ami');
    const liste = noms.length === 1 ? noms[0] : `${noms.slice(0, -1).join(', ')} et ${noms.at(-1)}`;
    const qui = `${liste.charAt(0).toUpperCase()}${liste.slice(1)} ${noms.length > 1 ? 'ont' : 'a'}`, leur = noms.length > 1 ? 'leur' : 'son';
    nouvelles.push({ cle: 'parrain', titre: 'Merci pour l’invitation !', lien: 'paquet', fermable: true,
      texte: `${qui} ${p.confirmation ? `confirmé ${leur} inscription` : `joué ${leur} premier duel`} : ${paquets(p.paquets * noms.length)} ajoutés à ta réserve.` });
  }
  if (p.parrain && !p.parrain.valide) {
    nouvelles.push({ cle: 'invite', titre: 'Bienvenue !', lien: 'duel',
      texte: `${p.parrain.pseudo ?? 'Un ami'} t’a invité. Termine ton premier duel : ${p.confirmation ? 'tu recevras' : 'vous recevrez chacun'} ${paquets(p.paquets)}.` });
  } else if (p.parrain?.verse && !bienvenueVue) {
    nouvelles.push({ cle: 'bienvenue', titre: 'Cadeau de bienvenue', lien: 'paquet', fermable: true,
      texte: `${paquets(p.paquets)} ajoutés à ta réserve, grâce à l’invitation de ${p.parrain.pseudo ?? 'ton ami'}.` });
  } else if (p.confirmation && p.parrain?.valide && !p.parrain.confirme && !p.parrain.echu && !aideVue) {
    // Après le cadeau de bienvenue : ce qu'il reste à faire pour que le parrain reçoive les siens.
    const { manqueCompte, manqueJour } = p.parrain;
    const reste = manqueCompte && manqueJour ? 'Relie un compte Google ou une adresse e-mail, et reviens jouer un duel un autre jour'
      : manqueCompte ? 'Relie un compte Google ou une adresse e-mail' : 'Reviens jouer un duel un autre jour';
    nouvelles.push({ cle: 'aider', titre: `Remercie ${p.parrain.pseudo ?? 'ton ami'}`, lien: manqueCompte ? 'compte' : 'duel', fermable: true,
      texte: `${reste} : ${p.parrain.pseudo ?? 'ton ami'} recevra à son tour ${paquets(p.paquets)}.` });
  }
  if (p.enAttente > 0) {
    nouvelles.push({ cle: 'attente', titre: 'Des paquets t’attendent', lien: 'paquet',
      texte: `${paquets(p.paquets * p.enAttente)} de parrainage arriveront dès que ta réserve aura de la place : ouvre quelques paquets.` });
  }
  return nouvelles;
}
