// La partie du joueur : sa sauvegarde en mémoire, les actions qui la modifient, et son enregistrement.
// Les écrans ne touchent jamais au stockage : ils passent par ici. Le jour où la sauvegarde vivra sur
// un serveur, seul ce dossier changera.

import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { hasardDuSysteme } from '../jeu/hasard.ts';
import { preparerReserve } from '../jeu/paquets.ts';
import type { Reserve } from '../jeu/paquets.ts';
import type { Niveau } from '../jeu/duel.ts';
import { acheterUnPaquet, mettreAJour, ouvrirUnPaquetGratuit, registresMasques } from '../jeu/partie.ts';
import type { CarteObtenue, Ouverture } from '../jeu/partie.ts';
import type { ProfilDeJoute } from '../jeu/joute.ts';
import { enregistrerLeDeck, noterUneParade, noterUneReponse, terminerUnDuel, terminerUneJoute } from '../jeu/progression.ts';
import type { Resultat } from '../jeu/progression.ts';
import type { Rarete } from '../partage/types.ts';
import { nouvelleSauvegarde, relireSauvegarde } from '../jeu/sauvegarde.ts';
import type { ReglagesDuJoueur, Sauvegarde } from '../jeu/sauvegarde.ts';
import { chargerEdition } from './cartes.ts';
import { demanderUnStockageDurable, ecrireLaSauvegarde, effacerLaSauvegarde, lireLaSauvegarde } from './stockage.ts';
import type { Emplacement } from './stockage.ts';

export type Partie =
  | { etat: 'chargement' }
  | { etat: 'erreur'; message: string }
  | { etat: 'prete'; sauvegarde: Sauvegarde; emplacement: Emplacement; stockageDurable: boolean };

// L'heure du jeu. Aujourd'hui celle de l'appareil ; demain celle d'un serveur.
const maintenant = (): number => Date.now();

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
  publier({ ...partie, sauvegarde });
  ecritures = ecritures.then(() => ecrireLaSauvegarde(sauvegarde)).then((emplacement) => {
    if (partie.etat === 'prete' && partie.emplacement !== emplacement) publier({ ...partie, emplacement });
  });
}

let demarrage: Promise<void> | undefined;
export function demarrerLaPartie(): Promise<void> {
  demarrage ??= (async () => {
    try {
      const { contenu, emplacement } = await lireLaSauvegarde();
      const lue = contenu === undefined ? nouvelleSauvegarde(maintenant(), EQUILIBRAGE.paquets.paquetsDeDepart) : relireSauvegarde(contenu, maintenant());
      const sauvegarde = mettreAJour(lue, maintenant(), EQUILIBRAGE);
      publier({ etat: 'prete', sauvegarde, emplacement, stockageDurable: false });
      enregistrer(sauvegarde);
      const durable = await demanderUnStockageDurable();
      if (partie.etat === 'prete') publier({ ...partie, stockageDurable: durable });
    } catch (erreur) {
      publier({ etat: 'erreur', message: erreur instanceof Error ? erreur.message : String(erreur) });
    }
  })();
  return demarrage;
}

// Les cartes disponibles au tirage, selon ce que le joueur a choisi de masquer.
const reserves = new Map<string, Reserve>();
async function reservePour(sauvegarde: Sauvegarde): Promise<Reserve> {
  const masques = registresMasques(sauvegarde);
  const cle = masques.join('+');
  if (!reserves.has(cle)) reserves.set(cle, preparerReserve((await chargerEdition()).cartes, masques));
  return reserves.get(cle)!;
}

async function ouvrir(action: (sauvegarde: Sauvegarde, contexte: Parameters<typeof ouvrirUnPaquetGratuit>[1]) => Ouverture): Promise<CarteObtenue[]> {
  if (partie.etat !== 'prete') throw new Error("La partie n'est pas encore chargée");
  const reserve = await reservePour(partie.sauvegarde);
  if (partie.etat !== 'prete') throw new Error("La partie n'est pas encore chargée");
  const ouverture = action(partie.sauvegarde, { reserve, maintenant: maintenant(), hasard: hasardDuSysteme, equilibrage: EQUILIBRAGE });
  enregistrer(ouverture.sauvegarde);
  return ouverture.cartes;
}

export const ouvrirUnPaquet = (): Promise<CarteObtenue[]> => ouvrir(ouvrirUnPaquetGratuit);
export const acheterEtOuvrirUnPaquet = (): Promise<CarteObtenue[]> => ouvrir(acheterUnPaquet);

export function changerUnReglage<C extends keyof ReglagesDuJoueur>(cle: C, valeur: ReglagesDuJoueur[C]): void {
  if (partie.etat !== 'prete') return;
  enregistrer({ ...partie.sauvegarde, reglages: { ...partie.sauvegarde.reglages, [cle]: valeur } });
}

// ── Le duel ─────────────────────────────────────────────────────────────────
export function changerLeDeck(ids: readonly string[]): void {
  if (partie.etat !== 'prete') return;
  enregistrer(enregistrerLeDeck(partie.sauvegarde, ids, EQUILIBRAGE.duel));
}

// Note la réponse du joueur à une épreuve de maîtrise. Rend vrai si le mot vient d'être maîtrisé.
export function noterLaReponse(idCarte: string, reussi: boolean): boolean {
  if (partie.etat !== 'prete') return false;
  const reponse = noterUneReponse(partie.sauvegarde, idCarte, reussi, maintenant(), EQUILIBRAGE.duel);
  if (reponse.sauvegarde !== partie.sauvegarde) enregistrer(reponse.sauvegarde);
  return reponse.vientDEtreMaitrisee;
}

// Note une tentative de parade (le joueur a-t-il reconnu le mot adverse ?), par rareté.
export function noterLaParade(rarete: Rarete, reussie: boolean): void {
  if (partie.etat !== 'prete') return;
  enregistrer(noterUneParade(partie.sauvegarde, rarete, reussie));
}

export type FinDeDuel = { encre: number; reduite: boolean; cote: { avant: number; apres: number } | null };

// Fin d'un duel : l'Encre gagnée est versée — et, en joute, la cote du joueur bouge.
export function finirLeDuel(adversaire: { type: 'entrainement'; niveau: Niveau } | { type: 'joute'; profil: ProfilDeJoute }, resultat: Resultat): FinDeDuel {
  if (partie.etat !== 'prete') return { encre: 0, reduite: false, cote: null };
  if (adversaire.type === 'entrainement') {
    const fin = terminerUnDuel(partie.sauvegarde, adversaire.niveau, resultat, maintenant(), EQUILIBRAGE.duel);
    enregistrer(fin.sauvegarde);
    return { encre: fin.encre, reduite: fin.reduite, cote: null };
  }
  const fin = terminerUneJoute(partie.sauvegarde, adversaire.profil, resultat, maintenant(), EQUILIBRAGE.duel, EQUILIBRAGE.joute);
  enregistrer(fin.sauvegarde);
  return { encre: fin.encre, reduite: fin.reduite, cote: { avant: fin.coteAvant, apres: fin.coteApres } };
}

// Le pseudonyme du joueur dans les joutes (tiré au sort parmi les mots du jeu).
export function changerDePseudonyme(pseudo: string): void {
  if (partie.etat !== 'prete') return;
  enregistrer({ ...partie.sauvegarde, joutes: { ...partie.sauvegarde.joutes, pseudo } });
}

// Le fichier de sauvegarde à télécharger. L'export est noté, pour espacer les rappels.
export function exporterLaSauvegarde(): { nom: string; contenu: string } | null {
  if (partie.etat !== 'prete') return null;
  const aJour = mettreAJour(partie.sauvegarde, maintenant(), EQUILIBRAGE);
  const exportee: Sauvegarde = { ...aJour, dernierExport: { le: maintenant(), paquetsOuverts: aJour.paquets.ouverts } };
  enregistrer(exportee);
  return { nom: `mots-sauvegarde-${new Date(maintenant()).toISOString().slice(0, 10)}.json`, contenu: JSON.stringify(exportee) };
}

// Remplace la partie par le contenu d'un fichier. Lève une erreur compréhensible si le fichier n'est pas une sauvegarde.
export function importerUneSauvegarde(texte: string): void {
  if (partie.etat !== 'prete') return;
  let brut: unknown;
  try { brut = JSON.parse(texte); } catch { throw new Error("Ce fichier n'est pas une sauvegarde du jeu."); }
  enregistrer(mettreAJour(relireSauvegarde(brut, maintenant()), maintenant(), EQUILIBRAGE));
}

export async function toutEffacer(): Promise<void> {
  if (partie.etat !== 'prete') return;
  await ecritures;
  await effacerLaSauvegarde();
  enregistrer(nouvelleSauvegarde(maintenant(), EQUILIBRAGE.paquets.paquetsDeDepart));
}
