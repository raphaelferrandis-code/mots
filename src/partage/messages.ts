// Le message d'une erreur, tel qu'on le montre au joueur.
//
// Les refus écrits pour lui, par le jeu ou par le serveur (« Aucun paquet en réserve… »), passent tels quels : ce
// sont des Error ordinaires (ou dérivées, comme ErreurDuServeur). Les erreurs techniques du navigateur, elles, sont
// souvent en anglais (« Failed to fetch », « Load failed ») ou incompréhensibles : le joueur lit une phrase en
// français, et le détail reste dans la console pour qui cherche la cause (audit de finition du 26/09/2026).

export const CONNEXION_IMPOSSIBLE = 'Connexion impossible. Vérifie ton réseau, puis réessaie.';
export const IMPREVU = 'Un imprévu est survenu. Réessaie ; si cela se reproduit, écris à contact@philamots.fr.';

// Les pannes de réseau selon les navigateurs : Chrome, Safari, Firefox, et un écran du jeu qui ne se charge pas.
const RESEAU = /failed to fetch|load failed|networkerror|network request failed|fetch dynamically imported module|importing a module script failed|error loading dynamically imported module/i;

export function messageDe(erreur: unknown): string {
  if (erreur instanceof Error) {
    // Une Error du jeu garde le nom « Error » ; TypeError, SyntaxError, DOMException… viennent du navigateur.
    if (erreur.name === 'Error' && erreur.message) return erreur.message;
    const reseau = RESEAU.test(erreur.message) || erreur.name === 'AbortError' || erreur.name === 'TimeoutError';
    console.error(erreur);
    return reseau ? CONNEXION_IMPOSSIBLE : IMPREVU;
  }
  if (typeof erreur === 'string' && erreur) return erreur;
  console.error(erreur);
  return IMPREVU;
}

// Le détail d'une erreur imprévue, pour le support : il se range dans un repli, sous la phrase du joueur.
export const detailDe = (erreur: unknown): string =>
  erreur instanceof Error ? `${erreur.name} : ${erreur.message}` : String(erreur);
