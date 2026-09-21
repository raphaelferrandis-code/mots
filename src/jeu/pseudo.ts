// Le pseudonyme du joueur dans les joutes : il le choisit librement, dans certaines limites.
// Fonctions pures. La même vérification est refaite sur le serveur (serveur/supabase.sql), car un contrôle
// fait seulement dans le jeu se contourne.

import { sansAccents } from '../partage/lettres.ts';

export const LONGUEUR_DU_PSEUDO = { minimum: 3, maximum: 16 };

export type MotsInterdits = { motsEntiers: readonly string[]; fragments: readonly string[] };
export type Verdict = { accepte: true; pseudo: string } | { accepte: false; raison: string };

// Les chiffres et signes mis pour des lettres (« c0n », « s@lope »). Le « 1 » vaut tantôt « i », tantôt « l ».
const DEGUISEMENTS: Record<string, string>[] = [
  { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i', '€': 'e' },
  { '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'l', '€': 'e' },
];

const sansRepetitions = (texte: string): string => texte.replace(/(.)\1+/g, '$1');

// Les façons de lire un pseudonyme : ses mots un par un, et toutes ses lettres collées (« c.o.n » → « con »).
// Un nombre isolé (« Éric 55 ») n'est pas lu comme un mot : sans cela, « 55 » deviendrait « ss ».
function lectures(pseudo: string): { mots: string[]; colle: string }[] {
  // Une majuscule au milieu d'un mot le coupe en deux (« GrosCon » se lit « gros con »).
  const morceaux = sansAccents(pseudo.replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2')).split(/[\s'’_-]+/).filter(Boolean);
  return DEGUISEMENTS.map((deguisement) => {
    const enClair = (morceau: string): string => [...morceau].map((signe) => deguisement[signe] ?? signe).join('').replace(/[^a-z]/g, '');
    return { mots: morceaux.filter((m) => /[a-z]/.test(m)).map(enClair).filter(Boolean), colle: morceaux.map(enClair).join('') };
  });
}

// Les lettres répétées sont retirées du PSEUDONYME (« coooon » → « con »), jamais des mots courts de la liste : réduire
// « trann » à « tran » ferait refuser « tranche », et « conne » réduit à « cone » ferait refuser « cône ». Seuls les
// fragments qui restent assez longs une fois réduits (« connard » → « conard ») sont aussi cherchés sous cette forme.
const LONGUEUR_MINIMALE_D_UN_FRAGMENT_REDUIT = 5;

export function contientUnMotInterdit(pseudo: string, interdits: MotsInterdits): boolean {
  return lectures(pseudo).some(({ mots, colle }) => {
    const reduit = sansRepetitions(colle);
    const lus = [...mots, ...mots.map(sansRepetitions), colle, reduit];
    const entier = interdits.motsEntiers.some((interdit) => lus.includes(interdit));
    const fragment = interdits.fragments.some((interdit) => {
      const interditReduit = sansRepetitions(interdit);
      return colle.includes(interdit) || reduit.includes(interdit) || (interditReduit.length >= LONGUEUR_MINIMALE_D_UN_FRAGMENT_REDUIT && reduit.includes(interditReduit));
    });
    return entier || fragment;
  });
}

// Met le pseudonyme au propre (espaces en trop), puis dit s'il est acceptable — et sinon pourquoi, en clair.
export function examinerLePseudo(brut: string, interdits: MotsInterdits): Verdict {
  const pseudo = brut.normalize('NFC').replace(/\s+/g, ' ').trim();
  const longueur = [...pseudo].length;
  if (longueur < LONGUEUR_DU_PSEUDO.minimum) return { accepte: false, raison: `Il faut au moins ${LONGUEUR_DU_PSEUDO.minimum} caractères.` };
  if (longueur > LONGUEUR_DU_PSEUDO.maximum) return { accepte: false, raison: `Pas plus de ${LONGUEUR_DU_PSEUDO.maximum} caractères.` };
  // Les lettres admises sont celles de l'alphabet latin, accents compris (le serveur applique la même règle).
  const simple = sansAccents(pseudo);
  if (!/^[a-z0-9][a-z0-9 '’_-]*$/.test(simple)) return { accepte: false, raison: 'Seulement des lettres, des chiffres, des espaces, des tirets et des apostrophes.' };
  if (simple.replace(/[^a-z]/g, '').length < 2) return { accepte: false, raison: 'Il faut au moins deux lettres.' };
  if (contientUnMotInterdit(pseudo, interdits)) return { accepte: false, raison: "Ce pseudonyme n'est pas accepté : choisis-en un autre." };
  return { accepte: true, pseudo };
}

// Deux pseudonymes sont « les mêmes » s'ils ne diffèrent que par les majuscules, les accents ou les espaces.
export const cleDuPseudo = (pseudo: string): string => sansAccents(pseudo).replace(/[^a-z0-9]/g, '');
