// Les formules payantes (décision n° 34, offre arrêtée le 22 septembre 2026), telles que le serveur les décrit.
// Trois étages qui se contiennent : « Le nécessaire » (5,99 € une fois), « Collectionneur » et « Expert » (par mois).
// Les chiffres sont dans src/config/equilibrage.ts ; le serveur a le dernier mot (serveur/collections.ts).
//
// L'Encre achetée — celle reçue contre de l'argent, ou versée par la rente de la formule Expert — est comptée à
// part : elle ne sert qu'au marché, jamais à acheter un paquet. C'est ce qui empêche l'argent d'acheter un tirage.

import { EQUILIBRAGE } from '../config/equilibrage.ts';

export type CleDeFormule = 'necessaire' | 'collectionneur' | 'expert';
export type Abonnement = 'aucun' | 'collectionneur' | 'expert';

export type Formule = {
  niveau: number; // 0 gratuit, 1 Le nécessaire, 2 Collectionneur, 3 Expert
  achatUnique: boolean;
  abonnement: Abonnement;
  jusquAu: number | null; // fin de l'abonnement, en millisecondes
  encreAchetee: number;
  anneeDeNaissance: number | null;
};

export const FORMULE_GRATUITE: Formule = { niveau: 0, achatUnique: false, abonnement: 'aucun', jusquAu: null, encreAchetee: 0, anneeDeNaissance: null };

const estUnObjet = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const nombre = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const ABONNEMENTS: Abonnement[] = ['aucun', 'collectionneur', 'expert'];

// Relit la formule envoyée par le serveur ; tout ce qui est illisible ramène à la version gratuite.
export function lireFormule(brut: unknown): Formule {
  if (!estUnObjet(brut)) return { ...FORMULE_GRATUITE };
  const niveau = Math.min(3, Math.max(0, Math.floor(nombre(brut.niveau))));
  return {
    niveau,
    achatUnique: brut.achatUnique === true,
    abonnement: ABONNEMENTS.find((a) => a === brut.abonnement) ?? 'aucun',
    jusquAu: typeof brut.jusquAu === 'number' && Number.isFinite(brut.jusquAu) ? brut.jusquAu : null,
    encreAchetee: Math.max(0, Math.floor(nombre(brut.encreAchetee))),
    anneeDeNaissance: typeof brut.anneeDeNaissance === 'number' && Number.isFinite(brut.anneeDeNaissance) ? brut.anneeDeNaissance : null,
  };
}

// Les avantages, étage par étage. Chaque étage contient le précédent.
export const paquetsPlusVite = (f: Formule): boolean => f.niveau >= 1;
export const encreDoublee = (f: Formule): boolean => f.niveau >= 2;
export const marcheSansLimite = (f: Formule): boolean => f.niveau >= 2;
export const histoireDesPrix = (f: Formule): boolean => f.niveau >= 3;
export const renteQuotidienne = (f: Formule): boolean => f.niveau >= 3;

// Ce que donne chaque formule, dit au joueur. La première ligne d'un étage rappelle qu'il contient le précédent.
export type Etage = { cle: CleDeFormule; niveau: number; nom: string; prix: number; parMois: boolean; avantages: string[] };

const P = EQUILIBRAGE.payant;
export const ETAGES: Etage[] = [
  {
    ...P.formules[0], cle: 'necessaire',
    avantages: [
      `Un paquet toutes les ${P.minutesEntreDeuxPaquets} minutes au lieu de ${EQUILIBRAGE.paquets.minutesEntreDeuxPaquets}`,
      `Une réserve de ${P.stockMaximum} paquets au lieu de ${EQUILIBRAGE.paquets.stockMaximum}`,
      'Versé une seule fois, acquis pour toujours',
    ],
  },
  {
    ...P.formules[1], cle: 'collectionneur',
    avantages: [
      `Toute l'Encre gagnée en jouant est multipliée par ${P.multiplicateurDEncre}`,
      'Aucune limite de ventes ni d’achats au marché',
    ],
  },
  {
    ...P.formules[2], cle: 'expert',
    avantages: [
      'L’histoire des prix de chaque timbre : la courbe, les statistiques, les dernières ventes',
      `${P.renteQuotidienne} Encre versée chaque jour, utilisable au marché`,
    ],
  },
];

// Le prix en toutes lettres : « 5,99 € une fois », « 5 € par mois ».
export const prixEnClair = (etage: Etage): string =>
  `${etage.prix.toFixed(2).replace('.', ',').replace(',00', '')} € ${etage.parMois ? 'par mois' : 'une fois'}`;

// L'âge du joueur d'après son année de naissance, et le droit de payer qui en découle.
export function peutPayer(f: Formule, anneeActuelle: number): boolean {
  return f.anneeDeNaissance !== null && anneeActuelle - f.anneeDeNaissance >= P.ageMinimumPourPayer;
}

// Le nom de la formule en cours, pour l'afficher. Null quand le joueur n'a rien payé.
export function nomDeLaFormule(f: Formule): string | null {
  return ETAGES.filter((e) => e.niveau <= f.niveau).at(-1)?.nom ?? null;
}
