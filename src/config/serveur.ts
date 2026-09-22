// ─────────────────────────────────────────────────────────────────────────────
// LE SERVEUR DU JEU (Supabase) : les joutes classées, et les collections quand on le lui demande.
// Tant que les deux valeurs ci-dessous sont vides, le jeu se passe de serveur : les joutes se jouent contre les
// « joueurs maison », et la cote du joueur reste sur son appareil.
//
// Pour brancher le serveur : suivre GUIDE-supabase.md, puis écrire les deux valeurs PUBLIQUES du projet
// tout en bas de ce fichier, ENTRE LES GUILLEMETS (les lignes qui commencent par « // » ne comptent pas) :
//   • adresse      : « Project URL », de la forme https://xxxxxxxx.supabase.co
//   • clePublique  : la clé « publishable » (elle commence par sb_publishable_). Elle est faite pour être visible.
//
// ⚠️ Ne JAMAIS mettre ici la clé « secret » (sb_secret_…) ni l'ancienne clé « service_role » : ce fichier est public.
// ─────────────────────────────────────────────────────────────────────────────

export const SERVEUR = {
  adresse: 'https://cgubfyxyivgufslpwlld.supabase.co',
  clePublique: 'sb_publishable_e0z7sHui3kHetOMNXF1lYw_1shQroI4',
  // Le serveur tient-il les collections (timbres, Encre, paquets, deck) ? À passer à « true » une fois les scripts
  // 1-structure.sql et 3-cartes.sql collés dans Supabase (GUIDE-supabase.md, étape 8). Tant que c'est « false »,
  // la partie vit sur l'appareil, comme avant.
  collectionsSurLeServeur: false,
};
