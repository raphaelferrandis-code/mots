// Règles d'affichage de la cérémonie, sans écran : quel effet pour quel timbre, et les phrases du résumé.
// Les quatre effets de la maquette correspondent aux vraies raretés et finitions du jeu (décision de Raphaël) :
// doré pour une Brillante ou une Épique, holographique pour une Holographique, et la grande révélation
// (secousse, éclair, confettis) pour une Légendaire ou une Hors-série.

import type { CarteObtenue } from '../../jeu/partie.ts';
import type { Nature } from '../../partage/types.ts';

export type Eclat = 'courant' | 'dore' | 'holo' | 'grand';
export const RANG_DE_L_ECLAT: Record<Eclat, number> = { courant: 0, dore: 1, holo: 2, grand: 3 };

export function eclatDe({ carte, finition }: Pick<CarteObtenue, 'carte' | 'finition'>): Eclat {
  if (carte.rarete === 'Légendaire' || carte.rarete === 'Hors-série') return 'grand';
  if (finition === 'Holographique') return 'holo';
  if (finition === 'Brillante' || carte.rarete === 'Épique') return 'dore';
  return 'courant';
}

export const NOM_DE_LA_FINITION = { Normale: 'Courant', Brillante: 'Doré à chaud', Holographique: 'Holographique' } as const;
export const ABREGE_DE_LA_NATURE: Record<Nature, string> = { Nom: 'nom', Verbe: 'verbe', Adjectif: 'adj.', Adverbe: 'adv.' };

// Les nombres en toutes lettres, pour les titres (« Dix paquets t'attendent »).
const EN_LETTRES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf', 'vingt'];
export const enLettres = (n: number): string => EN_LETTRES[n] ?? n.toLocaleString('fr-FR');
const majuscule = (texte: string): string => texte.charAt(0).toLocaleUpperCase('fr') + texte.slice(1);

export function titreDuComptoir(paquets: number): string {
  if (paquets <= 0) return 'Plus de paquet pour l’instant.';
  if (paquets === 1) return 'Un dernier paquet t’attend.';
  return `${majuscule(enLettres(paquets))} paquets t’attendent.`;
}

// Combien de paquets avant la Légendaire garantie (au plus tard le « seuil »-ième paquet d'affilée sans Légendaire).
export function paquetsAvantLaGarantie(sansLegendaire: number, seuil: number): number {
  return Math.max(1, seuil - sansLegendaire);
}
export function phraseDeLaGarantie(sansLegendaire: number, seuil: number): string {
  const reste = paquetsAvantLaGarantie(sansLegendaire, seuil);
  return reste === 1 ? 'Ton prochain paquet contient une Légendaire, c’est garanti.' : `Une Légendaire garantie d’ici ${reste} paquets.`;
}

export function titreDuResume(cartes: readonly CarteObtenue[]): string {
  if (cartes.length === 1) return cartes[0].carte.rarete === 'Hors-série' ? 'Ta Hors-série.' : 'Un timbre de plus.';
  return `${majuscule(enLettres(cartes.length))} timbres de plus.`;
}

function liste(parties: string[]): string {
  return parties.length > 1 ? `${parties.slice(0, -1).join(', ')} et ${parties[parties.length - 1]}` : parties[0] ?? '';
}

// « 2 courants, 1 doré à chaud et 1 holographique, dont 1 Légendaire »
export function bilanDuPaquet(cartes: readonly CarteObtenue[]): string {
  const noms: Record<string, [string, string]> = { Normale: ['courant', 'courants'], Brillante: ['doré à chaud', 'dorés à chaud'], Holographique: ['holographique', 'holographiques'], 'Hors-série': ['Hors-série', 'Hors-série'] };
  const compte = new Map<string, number>();
  for (const { carte, finition } of cartes) {
    const cle = carte.rarete === 'Hors-série' ? 'Hors-série' : finition;
    compte.set(cle, (compte.get(cle) ?? 0) + 1);
  }
  const finitions = ['Normale', 'Brillante', 'Holographique', 'Hors-série'].filter((k) => compte.has(k)).map((k) => `${compte.get(k)} ${noms[k][compte.get(k)! > 1 ? 1 : 0]}`);
  const remarquables = ['Épique', 'Légendaire'].flatMap((r) => {
    const n = cartes.filter((c) => c.carte.rarete === r).length;
    return n ? [`${n} ${r}${n > 1 ? 's' : ''}`] : [];
  });
  return liste(finitions) + (remarquables.length ? `, dont ${liste(remarquables)}` : '');
}

// « 2 nouveaux · +12 Encre »
export function gainsDuPaquet(cartes: readonly CarteObtenue[]): string {
  const nouveaux = cartes.filter((c) => c.nouvelle).length;
  const encre = cartes.reduce((s, c) => s + c.encre, 0);
  const parties = [nouveaux === 0 ? 'aucun nouveau' : `${nouveaux} nouveau${nouveaux > 1 ? 'x' : ''}`];
  if (encre > 0) parties.push(`+${encre.toLocaleString('fr-FR')} Encre`);
  return parties.join(' · ');
}
