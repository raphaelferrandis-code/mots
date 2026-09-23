import { actualiserLesSucces } from '../jeu/succes.ts';
import type { CarteIndex } from '../partage/types.ts';
import { cosmetiquesPremium } from '../jeu/formule.ts';
import { XP, acheterOrnement, estDisponible, ornement, PAQUETS } from '../jeu/personnalisation.ts';
import type { Categorie } from '../jeu/personnalisation.ts';
import { examinerLePseudo } from '../jeu/pseudo.ts';
import { PSEUDOS_INTERDITS } from '../config/pseudos-interdits.ts';
// La partie du joueur : sa sauvegarde en mémoire, les actions qui la modifient, et son enregistrement.
// Les écrans ne touchent jamais au stockage : ils passent par ici.
//
// Deux fonctionnements, selon src/config/serveur.ts (collectionsSurLeServeur, BRIEF-marche.md §5a) :
//  • la partie vit sur l'appareil : les règles de src/jeu/ s'appliquent ici, et tout est enregistré sur place ;
//  • le serveur en est propriétaire : tout ce qui a de la valeur (timbres, Encre, paquets, deck, récompenses) passe
//    par ses fonctions (src/services/collections.ts), et l'appareil n'en garde qu'une copie, tenue à jour après
//    chaque action. Ce qu'il garde en propre — réglages, résultats en duel, maîtrise, joutes — ne bouge pas.

import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { hasardDuSysteme } from '../jeu/hasard.ts';
import { preparerReserve } from '../jeu/paquets.ts';
import type { Reserve } from '../jeu/paquets.ts';
import type { Niveau } from '../jeu/duel.ts';
import { mettreAJour, ouvrirUnPaquetGratuit, registresMasques } from '../jeu/partie.ts';
import type { CarteObtenue, Ouverture } from '../jeu/partie.ts';
import type { ProfilDeJoute } from '../jeu/joute.ts';
import { enregistrerLeDeck, noterUneParade, noterUneReponse, terminerUnDuel, terminerUneJoute } from '../jeu/progression.ts';
import type { Resultat } from '../jeu/progression.ts';
import type { CotesDUnTimbre, HistoireDeLaCote } from '../jeu/cote.ts';
import type { Formule } from '../jeu/formule.ts';
import type { Enchere } from '../jeu/marche.ts';
import type { Finition, Rarete } from '../partage/types.ts';
import { nouvelleSauvegarde, relireSauvegarde } from '../jeu/sauvegarde.ts';
import type { ReglagesDuJoueur, Sauvegarde } from '../jeu/sauvegarde.ts';
import { afficherUnCode, estUnCodeValable, fabriquerUnCode, normaliserUnCode } from '../jeu/codeDeSecours.ts';
import { aQuelqueChoseAImporter, fusionner } from '../jeu/synchronisation.ts';
import type { EtatDuCompte, ProfilRetrouve } from '../jeu/synchronisation.ts';
import { chargerEdition } from './cartes.ts';
import { serveurDesCollections } from './collections.ts';
import { serveurDuMarche } from './marche.ts';
import type { MesEncheres, PageDuMarche } from './marche.ts';
import { demanderUnStockageDurable, ecrireLaSauvegarde, effacerLaSauvegarde, lireLaSauvegarde } from './stockage.ts';
import type { Emplacement } from './stockage.ts';
import { ErreurDuServeur } from './supabase.ts';

// Où en est le serveur des collections : « appareil » quand il n'en est pas propriétaire.
export type EtatDuServeur =
  | { etat: 'appareil' }
  | { etat: 'synchronisation' }
  | { etat: 'en ligne' }
  | { etat: 'hors ligne'; message: string };

// Ce que le serveur sait du compte et que l'appareil n'enregistre pas : la date du code de secours, la formule payée.
export type Compte = { codeDeSecoursLe: number | null; formule: Formule };

export type Partie =
  | { etat: 'chargement' }
  | { etat: 'erreur'; message: string }
  | { etat: 'prete'; sauvegarde: Sauvegarde; emplacement: Emplacement; stockageDurable: boolean; serveur: EtatDuServeur; compte: Compte | null };

export const HORS_LIGNE = "Le serveur du jeu ne répond pas. Les paquets s'ouvrent en ligne : réessaie dans un moment.";

// L'heure du jeu : celle de l'appareil, recalée sur celle du serveur quand c'est lui qui tient la collection
// (le compte à rebours des paquets suit alors la même horloge que le serveur).
let decalage = 0;
const maintenant = (): number => Date.now() + decalage;
export const decalageDuServeur = (): number => decalage;

let editionDesSucces: ReadonlyMap<string, CarteIndex> | undefined;
let chargementSucces: Promise<void> | undefined;
let partie: Partie = { etat: 'chargement' };
const abonnes = new Set<() => void>();
let ecritures: Promise<unknown> = Promise.resolve();

export const lirePartie = (): Partie => partie;
export function abonner(prevenir: () => void): () => void {
  abonnes.add(prevenir);
  return () => abonnes.delete(prevenir);
}

function publier(nouvelle: Partie): void {
  partie = nouvelle;
  for (const prevenir of abonnes) prevenir();
}

// Enregistre la sauvegarde. Les écritures se suivent une à une, pour que la dernière gagne toujours.
function enregistrer(sauvegarde: Sauvegarde): void {
  if (partie.etat !== 'prete') return;
  sauvegarde = actualiserLesSucces(sauvegarde, editionDesSucces);
  publier({ ...partie, sauvegarde });
  ecritures = ecritures.then(() => ecrireLaSauvegarde(sauvegarde)).then((emplacement) => {
    if (partie.etat === 'prete' && partie.emplacement !== emplacement) publier({ ...partie, emplacement });
  });
}

export function chargerLesSucces(): Promise<void> {
  chargementSucces ??= chargerEdition().then(edition => {
    editionDesSucces = new Map(edition.cartes.map(c => [c.id, c]));
    if (partie.etat === 'prete') enregistrer(partie.sauvegarde);
  }).catch(erreur => { chargementSucces = undefined; throw erreur; });
  return chargementSucces;
}

const etatDuServeurAuDepart = (): EtatDuServeur => (serveurDesCollections.actif ? { etat: 'synchronisation' } : { etat: 'appareil' });

let demarrage: Promise<void> | undefined;
export function demarrerLaPartie(): Promise<void> {
  demarrage ??= (async () => {
    try {
      const { contenu, emplacement } = await lireLaSauvegarde();
      const lue = contenu === undefined ? nouvelleSauvegarde(maintenant(), EQUILIBRAGE.paquets.paquetsDeDepart) : relireSauvegarde(contenu, maintenant());
      const sauvegarde = mettreAJour(lue, maintenant(), EQUILIBRAGE);
      publier({ etat: 'prete', sauvegarde, emplacement, stockageDurable: false, serveur: etatDuServeurAuDepart(), compte: null });
      enregistrer(sauvegarde);
      void chargerLesSucces().catch(() => { /* La page Succès proposera de réessayer. */ });
      if (serveurDesCollections.actif) void synchroniser();
      const durable = await demanderUnStockageDurable();
      if (partie.etat === 'prete') publier({ ...partie, stockageDurable: durable });
    } catch (erreur) {
      publier({ etat: 'erreur', message: erreur instanceof Error ? erreur.message : String(erreur) });
    }
  })();
  return demarrage;
}

// ── Le serveur des collections ─────────────────────────────────────────────

// Ce que le serveur vient de dire remplace ce que l'appareil croyait.
function appliquer(etat: EtatDuCompte): void {
  if (partie.etat !== 'prete') return;
  decalage = etat.maintenant - Date.now();
  publier({ ...partie, serveur: { etat: 'en ligne' }, compte: { codeDeSecoursLe: etat.codeDeSecoursLe, formule: etat.formule } });
  enregistrer(fusionner(partie.sauvegarde, etat));
}

// ── Le code de secours (décision n° 36) ────────────────────────────────────
// Le jeu tire le code, le serveur n'en garde que l'empreinte : il est montré une seule fois, au joueur, qui le note.
export async function definirUnCodeDeSecours(): Promise<string> {
  const code = fabriquerUnCode(hasardDuSysteme);
  appliquer(await surLeServeur(() => serveurDesCollections.definirUnCode(code)));
  return afficherUnCode(code);
}

// Sur un autre appareil : la collection (et le profil de joute) reviennent ; la partie de cet appareil est remplacée.
export async function recupererAvecUnCode(saisie: string): Promise<{ timbres: number; profil: ProfilRetrouve | null }> {
  const code = normaliserUnCode(saisie);
  if (!estUnCodeValable(code)) throw new Error('Ce code est incomplet : il compte vingt lettres et chiffres, en quatre groupes de cinq.');
  const retrouvee = await surLeServeur(() => serveurDesCollections.recupererParCode(code));
  if (partie.etat !== 'prete') throw new Error("La partie n'est pas encore chargée");
  // Le profil de joute retrouvé remplace celui de l'appareil ; ce que l'appareil sait des mots (maîtrise) reste à lui.
  const joutes = retrouvee.profil
    ? { ...partie.sauvegarde.joutes, pseudo: retrouvee.profil.pseudo, cote: retrouvee.profil.cote, jouees: retrouvee.profil.jouees, gagnees: retrouvee.profil.gagnees }
    : nouvelleSauvegarde(maintenant(), 0).joutes;
  enregistrer({ ...partie.sauvegarde, joutes });
  appliquer(retrouvee.etat);
  return { timbres: Object.keys(retrouvee.etat.cartes).length, profil: retrouvee.profil };
}

function signalerLaPanne(erreur: unknown): void {
  if (partie.etat === 'prete') publier({ ...partie, serveur: { etat: 'hors ligne', message: erreur instanceof Error ? erreur.message : String(erreur) } });
}

// Au démarrage, et après une panne : l'état du serveur remplace celui de l'appareil. Un joueur qui n'a pas encore de
// compte sur le serveur en reçoit un — en y important, une seule fois, la partie qui vivait sur son appareil.
// Rend vrai si le serveur a répondu.
let synchronisation: Promise<boolean> | undefined;
export function synchroniser(): Promise<boolean> {
  synchronisation ??= (async () => {
    try {
      if (partie.etat !== 'prete' || !serveurDesCollections.actif) return false;
      publier({ ...partie, serveur: { etat: 'synchronisation' } });
      let etat = await serveurDesCollections.monCompte();
      if (partie.etat !== 'prete') return false;
      etat ??= aQuelqueChoseAImporter(partie.sauvegarde) ? await serveurDesCollections.importer(partie.sauvegarde) : await serveurDesCollections.ouvrirMonCompte();
      appliquer(etat);
      return true;
    } catch (erreur) {
      signalerLaPanne(erreur);
      return false;
    } finally {
      synchronisation = undefined;
    }
  })();
  return synchronisation;
}

// Avant une action qui a de la valeur : le serveur doit répondre.
async function serveurPret(): Promise<void> {
  if (partie.etat === 'prete' && partie.serveur.etat === 'en ligne') return;
  if (!(await synchroniser())) throw new Error(HORS_LIGNE);
}

// Une action sur le serveur. Un refus motivé (« Aucun paquet en réserve… ») remonte tel quel ; une panne met
// l'appareil hors ligne, et l'action suivante réessaiera.
async function surLeServeur<T>(action: () => Promise<T>): Promise<T> {
  await serveurPret();
  try {
    return await action();
  } catch (erreur) {
    if (!(erreur instanceof ErreurDuServeur && erreur.refus)) signalerLaPanne(erreur);
    throw erreur;
  }
}

// ── Les paquets ────────────────────────────────────────────────────────────

// Les cartes disponibles au tirage, selon ce que le joueur a choisi de masquer.
const reserves = new Map<string, Reserve>();
async function reservePour(sauvegarde: Sauvegarde): Promise<Reserve> {
  const masques = registresMasques(sauvegarde);
  const cle = masques.join('+');
  if (!reserves.has(cle)) reserves.set(cle, preparerReserve((await chargerEdition()).cartes, masques));
  return reserves.get(cle)!;
}

async function ouvrirSurLAppareil(action: (sauvegarde: Sauvegarde, contexte: Parameters<typeof ouvrirUnPaquetGratuit>[1]) => Ouverture): Promise<CarteObtenue[]> {
  if (partie.etat !== 'prete') throw new Error("La partie n'est pas encore chargée");
  const reserve = await reservePour(partie.sauvegarde);
  if (partie.etat !== 'prete') throw new Error("La partie n'est pas encore chargée");
  const ouverture = action(partie.sauvegarde, { reserve, maintenant: maintenant(), hasard: hasardDuSysteme, equilibrage: EQUILIBRAGE });
  enregistrer(ouverture.sauvegarde);
  return ouverture.cartes;
}

async function ouvrirSurLeServeur(): Promise<CarteObtenue[]> {
  if (partie.etat !== 'prete') throw new Error("La partie n'est pas encore chargée");
  const masques = registresMasques(partie.sauvegarde);
  const [reponse, edition] = await Promise.all([surLeServeur(() => serveurDesCollections.ouvrirUnPaquet(masques)), chargerEdition()]);
  const connues = new Map(edition.cartes.map((c) => [c.id, c]));
  appliquer(reponse.etat);
  return reponse.cartes.flatMap((t) => {
    const carte = connues.get(t.id);
    return carte ? [{ carte, finition: t.finition, nouvelle: t.nouvelle, nouvelleFinition: t.nouvelleFinition, encre: t.encre }] : [];
  });
}

export async function ouvrirUnPaquet(): Promise<CarteObtenue[]> {
  const cartes = await (serveurDesCollections.actif ? ouvrirSurLeServeur() : ouvrirSurLAppareil(ouvrirUnPaquetGratuit));
  gagnerExperience(XP.paquet + cartes.filter((c) => c.nouvelle).length * XP.decouverte);
  return cartes;
}
function gagnerExperience(xp: number): void {
  if (partie.etat !== 'prete') return;
  enregistrer({ ...partie.sauvegarde, profil: { ...partie.sauvegarde.profil, xp: partie.sauvegarde.profil.xp + xp } });
}
export function personnaliser(categorie: Categorie | 'paquet', id: string): void {
  if (partie.etat !== 'prete') return;
  const profil = partie.sauvegarde.profil;
  if (categorie === 'titre' && id === '') { enregistrer({ ...partie.sauvegarde, profil: { ...profil, titre: '' } }); return; }
  const choix = ornement(id);
  if (categorie === 'paquet' ? !PAQUETS.some((p) => p.id === id) : !choix || choix.categorie !== categorie || !estDisponible(profil, choix, partie.compte !== null && cosmetiquesPremium(partie.compte.formule, maintenant()))) return;
  enregistrer({ ...partie.sauvegarde, profil: { ...profil, [categorie]: id } });
}
export function nommerMonProfil(saisie: string): void {
  if (partie.etat !== 'prete') return;
  const verdict = examinerLePseudo(saisie, PSEUDOS_INTERDITS);
  if (!verdict.accepte) throw new Error(verdict.raison);
  enregistrer({ ...partie.sauvegarde, profil: { ...partie.sauvegarde.profil, pseudo: verdict.pseudo } });
}
let achatEnCours = false;
export async function acheterUnePersonnalisation(id: string): Promise<void> {
  if (partie.etat !== 'prete') throw new Error('La partie est en cours de chargement.');
  if (achatEnCours) throw new Error('Un achat est déjà en cours.');
  const o = ornement(id);
  if (!o) throw new Error('Personnalisation inconnue.');
  if (o.categorie === 'titre') throw new Error('Ce titre se gagne en accomplissant son succès.');
  if (o.premium) throw new Error('Cette personnalisation est réservée aux formules payantes.');
  if (estDisponible(partie.sauvegarde.profil, o)) return;
  achatEnCours = true;
  try {
    if (serveurDesCollections.actif) {
      await serveurPret();
      const etat = await serveurDesCollections.monCompte();
      if (!etat?.achatsPersonnalisation) throw new Error('Les achats de personnalisations seront disponibles après la mise à jour du serveur.');
      appliquer(etat);
      appliquer(await surLeServeur(() => serveurDesCollections.acheterPersonnalisation(id)));
    }
    else {
      const achat = acheterOrnement(partie.sauvegarde.profil, partie.sauvegarde.encre, id);
      enregistrer({ ...partie.sauvegarde, ...achat });
    }
  } finally { achatEnCours = false; }
}

export function changerUnReglage<C extends keyof ReglagesDuJoueur>(cle: C, valeur: ReglagesDuJoueur[C]): void {
  if (partie.etat !== 'prete') return;
  enregistrer({ ...partie.sauvegarde, reglages: { ...partie.sauvegarde.reglages, [cle]: valeur } });
}

// ── Le duel ─────────────────────────────────────────────────────────────────
// Le deck change sur l'appareil tout de suite ; le serveur, s'il tient la collection, le reçoit ensuite et a le dernier mot.
export function changerLeDeck(ids: readonly string[]): void {
  if (partie.etat !== 'prete') return;
  enregistrer(enregistrerLeDeck(partie.sauvegarde, ids, EQUILIBRAGE.duel));
  if (!serveurDesCollections.actif || partie.serveur.etat !== 'en ligne') return;
  void serveurDesCollections.changerDeDeck(partie.sauvegarde.deck).then((propre) => {
    if (partie.etat === 'prete' && JSON.stringify(propre) !== JSON.stringify(partie.sauvegarde.deck)) enregistrer({ ...partie.sauvegarde, deck: propre });
  }).catch(signalerLaPanne);
}

// Note la réponse du joueur à une épreuve de maîtrise. Rend vrai si le mot vient d'être maîtrisé.
export function noterLaReponse(idCarte: string, reussi: boolean): boolean {
  if (partie.etat !== 'prete') return false;
  const reponse = noterUneReponse(partie.sauvegarde, idCarte, reussi, maintenant(), EQUILIBRAGE.duel);
  if (reponse.sauvegarde !== partie.sauvegarde) enregistrer(reponse.sauvegarde);
  if (reussi && partie.sauvegarde.cartes[idCarte]) gagnerExperience(XP.reponse);
  return reponse.vientDEtreMaitrisee;
}

// Note une tentative de parade (le joueur a-t-il reconnu le mot adverse ?), par rareté.
export function noterLaParade(rarete: Rarete, reussie: boolean): void {
  if (partie.etat !== 'prete') return;
  enregistrer(noterUneParade(partie.sauvegarde, rarete, reussie));
  if (reussie) gagnerExperience(XP.reponse);
}

// Un duel d'entraînement commence : quand le serveur tient la collection, il donne un ticket (c'est lui qui versera l'Encre).
export async function commencerUnDuel(niveau: Niveau): Promise<number | null> {
  if (!serveurDesCollections.actif) return null;
  return surLeServeur(() => serveurDesCollections.commencerUnDuel(niveau));
}

export type FinDeDuel = { encre: number; reduite: boolean; cote: { avant: number; apres: number } | null };
export type RecompenseDuServeur = { encre: number; reduite: boolean };

// Fin d'un duel : l'Encre gagnée est versée — et, en joute, la cote du joueur bouge.
// Quand le serveur tient la collection, c'est lui qui verse l'Encre : d'après le ticket du duel d'entraînement, ou
// d'après ce que le serveur des joutes a répondu (« recompenseDuServeur »). Sinon, le jeu calcule tout lui-même.
export async function finirLeDuel(
  adversaire: { type: 'entrainement'; niveau: Niveau } | { type: 'joute'; profil: ProfilDeJoute },
  resultat: Resultat,
  ticket: number | null = null,
  coteDuServeur?: { avant: number; apres: number },
  recompenseDuServeur?: RecompenseDuServeur,
): Promise<FinDeDuel> {
  if (partie.etat !== 'prete') return { encre: 0, reduite: false, cote: null };
  gagnerExperience(XP.duel + (resultat === 'victoire' ? XP.victoire : 0));
  const avant = partie.sauvegarde.encre;
  if (adversaire.type === 'entrainement') {
    const fin = terminerUnDuel(partie.sauvegarde, adversaire.niveau, resultat, maintenant(), EQUILIBRAGE.duel);
    enregistrer(fin.sauvegarde);
    if (serveurDesCollections.actif && ticket !== null) {
      try {
        const recompense = await surLeServeur(() => serveurDesCollections.terminerUnDuel(ticket, resultat));
        appliquer(recompense.etat);
        return { encre: recompense.encre, reduite: recompense.reduite, cote: null };
      } catch {
        // Le serveur n'a pas pu compter ce duel : l'Encre affichée est celle du jeu, jusqu'à la prochaine synchronisation.
      }
    }
    return { encre: fin.encre, reduite: fin.reduite, cote: null };
  }
  const fin = terminerUneJoute(partie.sauvegarde, adversaire.profil, resultat, maintenant(), EQUILIBRAGE.duel, EQUILIBRAGE.joute, coteDuServeur);
  if (serveurDesCollections.actif && recompenseDuServeur) {
    enregistrer({ ...fin.sauvegarde, encre: avant + recompenseDuServeur.encre });
    return { encre: recompenseDuServeur.encre, reduite: recompenseDuServeur.reduite, cote: { avant: fin.coteAvant, apres: fin.coteApres } };
  }
  enregistrer(fin.sauvegarde);
  return { encre: fin.encre, reduite: fin.reduite, cote: { avant: fin.coteAvant, apres: fin.coteApres } };
}

// Le pseudonyme du joueur dans les joutes, et sa cote quand c'est le serveur qui la tient.
export function changerDePseudonyme(pseudo: string): void {
  if (partie.etat !== 'prete') return;
  enregistrer({ ...partie.sauvegarde, joutes: { ...partie.sauvegarde.joutes, pseudo } });
}

// Le joueur quitte les joutes : pseudonyme, cote et compteurs de joutes repartent de zéro sur l'appareil.
// Ce qu'il sait de ses mots (questions réussies, parades) lui reste : cela sert aussi à l'entraînement.
// Le profil gardé par le serveur se supprime à part (src/services/joutes.ts).
export function quitterLesJoutes(): void {
  if (partie.etat !== 'prete') return;
  enregistrer({ ...partie.sauvegarde, joutes: nouvelleSauvegarde(maintenant(), 0).joutes });
}

export function recevoirLaCoteDuServeur(cote: number): void {
  if (partie.etat !== 'prete' || partie.sauvegarde.joutes.cote === cote) return;
  enregistrer({ ...partie.sauvegarde, joutes: { ...partie.sauvegarde.joutes, cote } });
}

// ── Le marché (BRIEF-marche.md, étape M3) ───────────────────────────────────
// Les enchères vivent sur le serveur : l'appareil les affiche, et après chaque action, l'état du compte que le
// serveur renvoie (Encre, timbres) remplace le sien.
export const lireLeMarche = (recherche: string, page: number): Promise<PageDuMarche> => surLeServeur(() => serveurDuMarche.marche(recherche, page));

// Mes ventes et mes mises. Le compte est relu d'abord : le serveur clôt au passage les enchères échues, et une
// vente conclue entre-temps (remportée, ou la mienne) a pu changer l'Encre et les timbres.
export async function lireMesEncheres(): Promise<MesEncheres> {
  const etat = await surLeServeur(() => serveurDesCollections.monCompte());
  if (etat) appliquer(etat);
  return surLeServeur(() => serveurDuMarche.mesEncheres());
}

export async function mettreEnVente(carte: string, finition: Finition, mise: number, achatImmediat: number | null, heures: number): Promise<Enchere> {
  const reponse = await surLeServeur(() => serveurDuMarche.mettreEnVente(carte, finition, mise, achatImmediat, heures));
  appliquer(reponse.etat);
  return reponse.enchere;
}

export async function retirerDeLaVente(id: number): Promise<void> {
  appliquer(await surLeServeur(() => serveurDuMarche.retirer(id)));
}

export async function encherir(id: number, montant: number): Promise<Enchere> {
  const reponse = await surLeServeur(() => serveurDuMarche.encherir(id, montant));
  appliquer(reponse.etat);
  return reponse.enchere;
}

// ── La version payante (décision n° 34) ────────────────────────────────────
// L'année de naissance n'est demandée qu'à qui regarde les formules : le paiement est réservé aux majeurs.
export async function declarerMonAge(annee: number): Promise<void> {
  appliquer(await surLeServeur(() => serveurDesCollections.declarerMonAge(annee)));
}

// ── La cote (décision n° 38) ───────────────────────────────────────────────
// La cote du jour d'un timbre, pour tous ; son histoire, pour la version payante (le serveur la refuse aux autres).
export const lireLesCotes = (carte: string): Promise<CotesDUnTimbre> => surLeServeur(() => serveurDuMarche.cotes(carte));
export const lireLHistoireDeLaCote = (carte: string): Promise<HistoireDeLaCote> => surLeServeur(() => serveurDuMarche.histoire(carte));

// ── La sauvegarde ──────────────────────────────────────────────────────────

// Le fichier de sauvegarde à télécharger. L'export est noté, pour espacer les rappels.
export function exporterLaSauvegarde(): { nom: string; contenu: string } | null {
  if (partie.etat !== 'prete') return null;
  const aJour = mettreAJour(partie.sauvegarde, maintenant(), EQUILIBRAGE);
  const exportee: Sauvegarde = { ...aJour, dernierExport: { le: maintenant(), paquetsOuverts: aJour.paquets.ouverts } };
  enregistrer(exportee);
  return { nom: `mots-sauvegarde-${new Date(maintenant()).toISOString().slice(0, 10)}.json`, contenu: JSON.stringify(exportee) };
}

// Remplace la partie par le contenu d'un fichier. Lève une erreur compréhensible si le fichier n'est pas une sauvegarde.
// Quand le serveur tient la collection, un fichier ne peut plus la remplacer.
export function importerUneSauvegarde(texte: string): void {
  if (partie.etat !== 'prete') return;
  if (serveurDesCollections.actif) throw new Error("Ta collection est gardée par le serveur du jeu : elle ne s'importe plus depuis un fichier.");
  let brut: unknown;
  try { brut = JSON.parse(texte); } catch { throw new Error("Ce fichier n'est pas une sauvegarde du jeu."); }
  enregistrer(mettreAJour(relireSauvegarde(brut, maintenant()), maintenant(), EQUILIBRAGE));
}

// Tout effacer sur l'appareil. (Le compte du serveur, lui, est supprimé par src/services/joutes.ts, juste avant.)
export async function toutEffacer(): Promise<void> {
  if (partie.etat !== 'prete') return;
  await ecritures;
  await effacerLaSauvegarde();
  publier({ ...partie, serveur: etatDuServeurAuDepart(), compte: null });
  enregistrer(nouvelleSauvegarde(maintenant(), EQUILIBRAGE.paquets.paquetsDeDepart));
  if (serveurDesCollections.actif) void synchroniser();
}
