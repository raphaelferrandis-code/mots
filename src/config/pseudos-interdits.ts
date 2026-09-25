// ─────────────────────────────────────────────────────────────────────────────
// PSEUDONYMES INTERDITS
// La liste des mots refusés dans les pseudonymes des joutes. Raphaël peut la compléter.
// Elle sert deux fois : dans le jeu (src/jeu/pseudo.ts) et sur le serveur — après une modification,
// lancer « npm run serveur:script » puis recoller serveur/supabase.sql dans Supabase (voir docs/GUIDE-supabase.md).
//
// Écrire les mots en minuscules, sans accents ni espaces. Le filtre reconnaît tout seul les accents, les majuscules,
// les lettres répétées (« coooon »), les lettres séparées (« c.o.n ») et les chiffres mis pour des lettres (« c0n »).
//
// ⚠️ Ce fichier contient, par nécessité, des mots grossiers et haineux.
// ─────────────────────────────────────────────────────────────────────────────

export const PSEUDOS_INTERDITS = {
  // Refusés seulement comme MOT ENTIER : ils sont courts, ou se cachent dans des mots innocents
  // (« con » dans « Concorde », « cul » dans « calcul », « viol » dans « violon »).
  motsEntiers: [
    'con', 'cons', 'conne', 'connes', 'cul', 'culs', 'pute', 'putes', 'bite', 'bites', 'teub', 'zob', 'chatte', 'chattes',
    'pd', 'pede', 'pedes', 'fdp', 'ntm', 'tg', 'gogol', 'garce', 'pouffe', 'chienne', 'chier', 'suce', 'baise', 'nique', 'niquer',
    'sexe', 'sex', 'anal', 'anus', 'viol', 'pedo', 'milf', 'bdsm', 'cum', 'dick', 'cock', 'cunt', 'slut', 'shit', 'kys',
    'bicot', 'youtre', 'kike', 'spic', 'chink', 'ss', 'kkk', 'isis',
  ],

  // Refusés PARTOUT où ils apparaissent, même au milieu d'un autre mot.
  fragments: [
    // Injures et vulgarités
    'connard', 'connass', 'conass', 'salope', 'salaud', 'salopard', 'putain', 'encul', 'enfoir', 'batard', 'merd', 'chieur', 'chiasse',
    'tapette', 'tafiole', 'tarlouze', 'tantouze', 'gouine', 'fiotte', 'lopette', 'pouffiass', 'poufiass', 'petasse', 'trouduc', 'couille',
    'nichon', 'branl', 'suceu', 'baiseu', 'niquetam', 'abruti', 'debile', 'cretin', 'mongol', 'attarde',
    // Racisme, antisémitisme, haine
    'negr', 'nigg', 'bougnoul', 'bamboula', 'youpin', 'chinetoq', 'chintok', 'niakou', 'salearab', 'salejuif', 'salenoir', 'saleblanc',
    'nazi', 'hitler', 'heil', 'fuhrer', 'genocid', 'terrorist', 'daesh', 'alqaida', 'alqaeda', 'jihad', 'djihad', 'mortaux',
    // Sexe explicite, violences
    'porn', 'penis', 'vagin', 'sodom', 'fellat', 'ejac', 'sperm', 'orgasm', 'violeu', 'violer', 'pedophil', 'incest', 'zoophil', 'hentai', 'gangbang',
    'pussy', 'fuck', 'bitch', 'whore', 'fagg', 'asshole', 'bastard', 'wank', 'trann', 'suicid',
    // Se faire passer pour le jeu ou pour un responsable
    'admin', 'moderat', 'officiel',
  ],
};
