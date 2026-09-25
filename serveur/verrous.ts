// Les verrous communs du serveur (pg_advisory_xact_lock, rendus à la fin de la transaction). Chacun ne fait attendre
// que les opérations de son domaine : consulter les joutes en direct ne fait plus attendre le marché, et inversement.
//
// Ordre à respecter dans une même transaction : le verrou du marché d'abord, puis celui du direct, puis les verrous
// d'un joueur et les lignes. Deux transactions qui les prennent dans le même ordre ne peuvent pas s'attendre l'une
// l'autre (pas d'interblocage).
export const VERROU_DU_MARCHE = 20260923; // enchères, échanges de timbres, amis, récupération et effacement de compte
export const VERROU_DU_DIRECT = 20260924; // file et parties en direct, équipes, retrait ou transfert d'un profil
