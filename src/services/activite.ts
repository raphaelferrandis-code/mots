// Le fil d'activité de l'accueil : ce que font les autres collectionneurs (serveur/activite.ts).
// Lu sans compte : un simple visiteur ne crée rien sur le serveur. Sans serveur, pas de fil.

import { clientDuServeur, serveurUtilise } from './compte.ts';

export type EvenementDuFil = {
  genre: 'trouvaille' | 'victoire' | 'arrivee';
  pseudo: string;
  mot: string | null;
  rarete: string | null;
  finition: string | null;
  cote: number | null;
  le: number;
};

// Un morceau de phrase ; « fort » : un nom propre ou un mot, mis en valeur.
export type Morceau = { texte: string; fort?: boolean };

const majuscule = (mot: string): string => mot.charAt(0).toLocaleUpperCase('fr') + mot.slice(1);

export function phraseDuFil(e: EvenementDuFil): Morceau[] {
  const qui: Morceau = { texte: e.pseudo, fort: true };
  if (e.genre === 'arrivee') return [qui, { texte: ' rejoint le bureau des mots' }];
  if (e.genre === 'victoire') return e.cote === null ? [qui, { texte: ' remporte une joute classée' }] : [qui, { texte: ' remporte une joute classée et monte à ' }, { texte: String(e.cote), fort: true }];
  const morceaux: Morceau[] = [qui, { texte: ' vient de trouver ' }, { texte: majuscule(e.mot ?? 'un timbre'), fort: true }];
  if (e.finition === 'Holographique') morceaux.push({ texte: ' en holographique' });
  if (e.rarete === 'Légendaire' || e.rarete === 'Hors-série') morceaux.push({ texte: `, une ${e.rarete}` });
  return morceaux;
}

export async function chargerLeFil(): Promise<EvenementDuFil[] | null> {
  if (!serveurUtilise) return null;
  try {
    const fil = await clientDuServeur().lireSansCompte<EvenementDuFil[]>('fil_d_activite');
    return Array.isArray(fil) ? fil : null;
  } catch {
    return null; // fil indisponible (script pas encore installé, réseau) : l'accueil s'en passe
  }
}
