// Le message d'une erreur, tel qu'on le montre au joueur : celui de l'erreur elle-même, ou sa forme écrite.
export const messageDe = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));
