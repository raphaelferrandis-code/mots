// Deux droits indépendants. Expert n'est relu que pour les anciens comptes de test.
import { EQUILIBRAGE } from '../config/equilibrage.ts';
export type CleDeFormule = 'necessaire' | 'collectionneur';
export type Abonnement = 'aucun' | 'collectionneur' | 'expert';
export type Formule = {
  niveau: number; achatUnique: boolean; abonnement: Abonnement; jusquAu: number | null;
  encreAchetee: number; anneeDeNaissance: number | null; moisDeNaissance: number | null;
  cadeauAchatReclame?: boolean; paquetsHebdomadaires?: number; prochainPaquetHebdomadaire?: number | null;
};
export const FORMULE_GRATUITE: Formule = { niveau: 0, achatUnique: false, abonnement: 'aucun', jusquAu: null, encreAchetee: 0, anneeDeNaissance: null, moisDeNaissance: null };
const objet = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const nombre = (v: unknown): number => typeof v === 'number' && Number.isFinite(v) ? v : 0;
export function lireFormule(brut: unknown): Formule {
  if (!objet(brut)) return { ...FORMULE_GRATUITE };
  return {
    niveau: Math.min(3, Math.max(0, Math.floor(nombre(brut.niveau)))), achatUnique: brut.achatUnique === true,
    abonnement: brut.abonnement === 'collectionneur' || brut.abonnement === 'expert' ? brut.abonnement : 'aucun',
    jusquAu: typeof brut.jusquAu === 'number' && Number.isFinite(brut.jusquAu) ? brut.jusquAu : null,
    encreAchetee: Math.max(0, Math.floor(nombre(brut.encreAchetee))),
    anneeDeNaissance: typeof brut.anneeDeNaissance === 'number' && Number.isFinite(brut.anneeDeNaissance) ? brut.anneeDeNaissance : null,
    moisDeNaissance: typeof brut.moisDeNaissance === 'number' && Number.isInteger(brut.moisDeNaissance) && brut.moisDeNaissance >= 1 && brut.moisDeNaissance <= 12 ? brut.moisDeNaissance : null,
    ...(typeof brut.cadeauAchatReclame === 'boolean' ? { cadeauAchatReclame: brut.cadeauAchatReclame } : {}),
    ...(typeof brut.paquetsHebdomadaires === 'number' ? { paquetsHebdomadaires: Math.max(0, Math.floor(nombre(brut.paquetsHebdomadaires))) } : {}),
    ...(typeof brut.prochainPaquetHebdomadaire === 'number' ? { prochainPaquetHebdomadaire: nombre(brut.prochainPaquetHebdomadaire) } : {}),
  };
}
export const abonnementActif = (f: Formule, maintenant = Date.now()): boolean => f.abonnement !== 'aucun' && f.jusquAu !== null && f.jusquAu > maintenant;
export const cosmetiquesPremium = (f: Formule, _maintenant = Date.now()): boolean => f.achatUnique;
export const paquetsPlusVite = abonnementActif;
export const encreDoublee = (_f: Formule): boolean => false;
export const marcheSansLimite = (_f: Formule): boolean => false;
export const renteQuotidienne = (_f: Formule): boolean => false;
export const histoireDesPrix = (f: Formule): boolean => f.abonnement === 'expert' && abonnementActif(f);
// Conserver les centièmes entre réponses rend le bonus exact même pour des gains de 5 XP.
export function calculerGainXp(base: number, reste: number, f: Formule | null, maintenant: number): { gain: number; reste: number } {
  if (!f || !abonnementActif(f, maintenant)) return { gain: base, reste };
  const bonus = base * EQUILIBRAGE.payant.bonusXpPourcent + reste;
  return { gain: base + Math.floor(bonus / 100), reste: bonus % 100 };
}
export type Etage = { cle: CleDeFormule; niveau: number; nom: string; prix: number; parMois: boolean; avantages: string[] };
const P = EQUILIBRAGE.payant;
export const ETAGES: Etage[] = [
  { ...P.formules[0], cle: 'necessaire', avantages: [
    'Tous les cosmétiques premium débloqués définitivement',
    'Une carte tirée au hasard parmi toutes les Hors-série, reçue une seule fois',
    'Doublons possibles, convertis en Encre selon les règles habituelles',
    'Les titres se gagnent uniquement par les succès',
  ] },
  { ...P.formules[1], cle: 'collectionneur', avantages: [
    `Un paquet toutes les ${P.minutesEntreDeuxPaquets} minutes, réserve de ${P.stockMaximum} paquets`,
    `Un paquet spécial dès l’activation, puis tous les ${P.joursEntrePaquetsHebdomadaires} jours d’abonnement`,
    'Six cartes dont au moins une Épique ou mieux ; dernière carte : 89 % Épique, 10 % Légendaire, 1 % Hors-série',
    `+${P.bonusXpPourcent} % d’XP sur les duels et les bonnes réponses`,
    'Les cartes, l’XP et les paquets déjà acquis restent après expiration',
  ] },
];
export const prixEnClair = (etage: Etage): string => `${etage.prix.toFixed(2).replace('.', ',').replace(',00', '')} € ${etage.parMois ? 'par mois' : 'une fois'}`;
// 18 ans révolus au mois près (décision du 25/09/2026) : à partir du premier jour du mois qui suit celui de ses 18 ans.
// Même règle que le serveur de paiement (majeur, supabase/functions/_shared/paiements.ts).
export const peutPayer = (f: Formule, maintenant = Date.now()): boolean => f.anneeDeNaissance !== null && f.moisDeNaissance !== null
  && Date.UTC(f.anneeDeNaissance + P.ageMinimumPourPayer, f.moisDeNaissance, 1) <= maintenant;
// Ce qu'un joueur perdrait en effaçant son compte : ses achats (Écrin, un abonnement qui court encore).
export const achatsEnCours = (f: Formule, maintenant = Date.now()): boolean => f.achatUnique || abonnementActif(f, maintenant);
export function nomDeLaFormule(f: Formule): string | null {
  return [f.achatUnique ? 'Écrin' : '', abonnementActif(f) ? 'Collectionneur' : ''].filter(Boolean).join(' + ') || null;
}
