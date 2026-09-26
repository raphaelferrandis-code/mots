import { nouveauProfil, relireProfil } from './personnalisation.ts';
import type { ProfilPersonnel } from './personnalisation.ts';
// La sauvegarde du joueur : ce qu'elle contient, comment on en crée une, et comment on relit
// une sauvegarde venue d'ailleurs (fichier importé, ancienne version du jeu) sans jamais planter.

import { FINITIONS, RARETES } from '../partage/types.ts';
import type { Finition, Rarete } from '../partage/types.ts';
import type { EtatDesPaquets } from './recharge.ts';

// Version 1 : première sauvegarde. Version 2 : chaque carte compte ses finitions (normale, brillante, holographique).
// Version 3 : le duel — deck, bonnes réponses et maîtrise de chaque carte, bilan des duels, temps de réponse.
// Version 4 : les joutes — questions posées sur chaque carte, parades par rareté, pseudonyme et cote du joueur.
// Version 5 : expérience et personnalisations du profil, des dos et des paquets.
// Version 6 : succès permanents et titres gagnés.
// Version 7 : les apprentissages survivent à la vente du dernier exemplaire.
// Version 8 : progression serveur et archive de l'ancienne progression locale.
export const VERSION_DE_SAUVEGARDE = 8;

// Des réponses données à une épreuve : combien de fois la question a été posée, combien de fois la définition a été retrouvée.
export type Savoir = { posees: number; reussies: number };

export type CartePossedee = {
  obtenueLe: number; // date de la première obtention (millisecondes)
  doublons: number; // nombre de fois où la carte a été changée en Encre
  finitions: Partial<Record<Finition, number>>; // nombre de fois où la carte a été obtenue dans chaque finition
  posees: number; // nombre de fois où la définition de ce mot a été demandée en duel
  reussites: number; // bonnes réponses données en duel pour ce mot
  maitriseeLe: number | null; // date à laquelle le mot a été maîtrisé (assez de bonnes réponses), sinon null
};
export type Apprentissage = Pick<CartePossedee, 'posees' | 'reussites' | 'maitriseeLe'>;

// Temps accordé pour l'épreuve de maîtrise : celui du jeu, le double, ou sans limite (accessibilité).
export const TEMPS_DE_REPONSE = ['normal', 'double', 'illimite'] as const;
export type TempsDeReponse = (typeof TEMPS_DE_REPONSE)[number];

export type ReglagesDuJoueur = {
  masquerFamiliers: boolean;
  masquerInjurieux: boolean;
  reduireAnimations: boolean;
  sonsPaquets: boolean;
  tempsDeReponse: TempsDeReponse;
};

export type BilanDesDuels = {
  joues: number;
  gagnes: number;
  // Le jour (AAAA-MM-JJ) des dernières victoires comptées, pour le plafond quotidien des récompenses.
  jour: string;
  victoiresDuJour: number;
};

export type Joutes = {
  pseudo: string; // tiré au sort parmi les mots du jeu ; vide tant que le joueur n'a pas ouvert les joutes
  cote: number | null; // null = pas encore classé (la cote de départ est dans equilibrage.ts)
  jouees: number;
  gagnees: number;
  recents: string[]; // derniers adversaires affrontés, pour ne pas les reproposer aussitôt
};

export type Sauvegarde = {
  identiteLocale?: string; // Sépare les copies locales lors d'un changement de compte.
  version: number;
  profil: ProfilPersonnel;
  creeLe: number;
  encre: number;
  paquets: EtatDesPaquets & {
    ouverts: number; // total de paquets ouverts
    sansLegendaire: number; // paquets ouverts d'affilée sans Légendaire (pour la garantie)
  };
  // Clé : identifiant de carte. Une carte qui n'existe plus dans l'édition est conservée mais ignorée par le jeu.
  cartes: Record<string, CartePossedee>;
  apprentissages?: Record<string, Apprentissage>;
  progressionServeur?: { id: string; version: 1 };
  ancienneProgression?: { le: number; xp: number; apprentissages: Record<string, Apprentissage> };
  deck: string[]; // identifiants des cartes du deck ; il peut être incomplet pendant qu'on le compose
  duels: BilanDesDuels;
  parades: Partial<Record<Rarete, Savoir>>; // les mots adverses reconnus en duel, par rareté
  joutes: Joutes;
  reglages: ReglagesDuJoueur;
  dernierExport: { le: number; paquetsOuverts: number } | null;
};

export function nouvelleSauvegarde(maintenant: number, paquetsDeDepart: number): Sauvegarde {
  return {
    version: VERSION_DE_SAUVEGARDE,
    profil: nouveauProfil(),
    creeLe: maintenant,
    encre: 0,
    paquets: { stock: paquetsDeDepart, reference: maintenant, ouverts: 0, sansLegendaire: 0 },
    cartes: {},
    apprentissages: {},
    deck: [],
    duels: { joues: 0, gagnes: 0, jour: '', victoiresDuJour: 0 },
    parades: {},
    joutes: { pseudo: '', cote: null, jouees: 0, gagnees: 0, recents: [] },
    // 30 s par définition pour commencer (audit de finition du 26/09/2026 : 15 s pour lire quatre définitions, c'était
    // court pour un premier duel) ; le joueur passe à 15 s quand il veut. Une ancienne sauvegarde garde son réglage.
    reglages: { masquerFamiliers: false, masquerInjurieux: false, reduireAnimations: false, sonsPaquets: true, tempsDeReponse: 'double' },
    dernierExport: null,
  };
}

// La plus belle finition possédée d'une carte : c'est celle que la collection affiche.
export function meilleureFinition(carte: CartePossedee): Finition {
  return [...FINITIONS].reverse().find((f) => (carte.finitions[f] ?? 0) > 0) ?? 'Normale';
}

const estUnObjet = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const entierPositif = (v: unknown, defaut: number): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : defaut);

export function relireApprentissages(brut: unknown): Record<string, Apprentissage> {
  const apprentissages: Record<string, Apprentissage> = {};
  for (const [id, valeur] of Object.entries(estUnObjet(brut) ? brut : {})) {
    if (!estUnObjet(valeur)) continue;
    const reussites = entierPositif(valeur.reussites, 0);
    apprentissages[id] = { posees: Math.max(reussites, entierPositif(valeur.posees, 0)), reussites,
      maitriseeLe: typeof valeur.maitriseeLe === 'number' && Number.isFinite(valeur.maitriseeLe) ? valeur.maitriseeLe : null };
  }
  return apprentissages;
}

function relireFinitions(brut: unknown, doublons: number): CartePossedee['finitions'] {
  const finitions: CartePossedee['finitions'] = {};
  if (estUnObjet(brut)) {
    for (const f of FINITIONS) { const n = entierPositif(brut[f], 0); if (n > 0) finitions[f] = n; }
  }
  // Sauvegarde de version 1, ou finitions abîmées : avant les finitions, toutes les cartes étaient « Normales ».
  return Object.keys(finitions).length > 0 ? finitions : { Normale: 1 + doublons };
}

// Relit une sauvegarde inconnue. Ce qui est absent ou abîmé est remplacé par une valeur saine ;
// seul un contenu qui n'est pas une sauvegarde du tout est refusé.
export function relireSauvegarde(brut: unknown, maintenant: number): Sauvegarde {
  if (!estUnObjet(brut) || typeof brut.version !== 'number' || !estUnObjet(brut.cartes)) {
    throw new Error("Ce fichier n'est pas une sauvegarde du jeu.");
  }
  if (brut.version > VERSION_DE_SAUVEGARDE) {
    throw new Error('Cette sauvegarde vient d\'une version plus récente du jeu. Mets le jeu à jour avant de l\'importer.');
  }

  const paquets = estUnObjet(brut.paquets) ? brut.paquets : {};
  const reglages = estUnObjet(brut.reglages) ? brut.reglages : {};
  const cartes: Record<string, CartePossedee> = {};
  for (const [id, valeur] of Object.entries(brut.cartes)) {
    if (!estUnObjet(valeur)) continue;
    const doublons = entierPositif(valeur.doublons, 0);
    cartes[id] = {
      obtenueLe: entierPositif(valeur.obtenueLe, maintenant),
      doublons,
      finitions: relireFinitions(valeur.finitions, doublons),
      // Avant la version 4, seules les bonnes réponses étaient comptées.
      posees: Math.max(entierPositif(valeur.posees, 0), entierPositif(valeur.reussites, 0)),
      reussites: entierPositif(valeur.reussites, 0),
      maitriseeLe: typeof valeur.maitriseeLe === 'number' && Number.isFinite(valeur.maitriseeLe) ? valeur.maitriseeLe : null,
    };
  }
  // Le deck ne garde que des cartes possédées, chacune une seule fois.
  const deck = Array.isArray(brut.deck) ? [...new Set(brut.deck.filter((id): id is string => typeof id === 'string' && id in cartes))] : [];
  const duels = estUnObjet(brut.duels) ? brut.duels : {};
  const joutes = estUnObjet(brut.joutes) ? brut.joutes : {};
  const parades: Sauvegarde['parades'] = {};
  if (estUnObjet(brut.parades)) {
    for (const rarete of RARETES) {
      const lue = brut.parades[rarete];
      if (!estUnObjet(lue)) continue;
      const posees = entierPositif(lue.posees, 0);
      if (posees > 0) parades[rarete] = { posees, reussies: Math.min(posees, entierPositif(lue.reussies, 0)) };
    }
  }
  const exporte = estUnObjet(brut.dernierExport) ? brut.dernierExport : null;
  const apprentissages = relireApprentissages(brut.apprentissages);

  return {
    version: VERSION_DE_SAUVEGARDE,
    profil: relireProfil(brut.profil),
    ...(typeof brut.identiteLocale === 'string' ? { identiteLocale: brut.identiteLocale } : {}),
    ...(estUnObjet(brut.progressionServeur) && brut.progressionServeur.version === 1 && typeof brut.progressionServeur.id === 'string'
      ? { progressionServeur: { id: brut.progressionServeur.id, version: 1 as const } } : {}),
    ...(estUnObjet(brut.ancienneProgression) ? { ancienneProgression: { le: entierPositif(brut.ancienneProgression.le, maintenant),
      xp: entierPositif(brut.ancienneProgression.xp, 0), apprentissages: relireApprentissages(brut.ancienneProgression.apprentissages) } } : {}),
    creeLe: entierPositif(brut.creeLe, maintenant),
    encre: entierPositif(brut.encre, 0),
    paquets: {
      stock: entierPositif(paquets.stock, 0),
      // Une date dans le futur donnerait des paquets gratuits à l'import : on la ramène à maintenant.
      reference: Math.min(entierPositif(paquets.reference, maintenant), maintenant),
      ouverts: entierPositif(paquets.ouverts, 0),
      sansLegendaire: entierPositif(paquets.sansLegendaire, 0),
    },
    cartes,
    apprentissages,
    deck,
    duels: {
      joues: entierPositif(duels.joues, 0),
      gagnes: entierPositif(duels.gagnes, 0),
      jour: typeof duels.jour === 'string' ? duels.jour : '',
      victoiresDuJour: entierPositif(duels.victoiresDuJour, 0),
    },
    parades,
    joutes: {
      pseudo: typeof joutes.pseudo === 'string' ? joutes.pseudo.slice(0, 40) : '',
      cote: typeof joutes.cote === 'number' && Number.isFinite(joutes.cote) ? Math.round(joutes.cote) : null,
      jouees: entierPositif(joutes.jouees, 0),
      gagnees: entierPositif(joutes.gagnees, 0),
      recents: Array.isArray(joutes.recents) ? joutes.recents.filter((id): id is string => typeof id === 'string').slice(-20) : [],
    },
    reglages: {
      masquerFamiliers: reglages.masquerFamiliers === true,
      masquerInjurieux: reglages.masquerInjurieux === true,
      reduireAnimations: reglages.reduireAnimations === true,
      sonsPaquets: typeof reglages.sonsPaquets === 'boolean' ? reglages.sonsPaquets : true,
      tempsDeReponse: TEMPS_DE_REPONSE.find((t) => t === reglages.tempsDeReponse) ?? 'normal',
    },
    dernierExport: exporte ? { le: entierPositif(exporte.le, maintenant), paquetsOuverts: entierPositif(exporte.paquetsOuverts, 0) } : null,
  };
}
