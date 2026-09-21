// Les écrans du jeu et leurs adresses.
// L'adresse d'un écran est la partie après le « # » : monsite.fr/#/collection. Ce système fonctionne
// chez n'importe quel hébergeur sans aucun réglage, et le bouton « retour » du navigateur marche.

export type Route =
  | { ecran: 'accueil' }
  | { ecran: 'paquet' }
  | { ecran: 'collection' }
  | { ecran: 'carte'; id: string }
  | { ecran: 'deck' }
  | { ecran: 'duel' }
  | { ecran: 'reglages' }
  | { ecran: 'confidentialite' }
  | { ecran: 'galerie' }; // contrôle visuel des timbres, pendant le développement seulement

const ECRANS_SIMPLES = ['paquet', 'collection', 'deck', 'duel', 'reglages', 'confidentialite', 'galerie'] as const;

export function lireRoute(hash: string): Route {
  const [premier = '', second = ''] = hash.replace(/^#\/?/, '').split('/');
  if (premier === 'carte' && second) {
    try {
      return { ecran: 'carte', id: decodeURIComponent(second) };
    } catch {
      return { ecran: 'accueil' };
    }
  }
  const simple = ECRANS_SIMPLES.find((e) => e === premier);
  return simple ? { ecran: simple } : { ecran: 'accueil' };
}

// Le titre de l'onglet du navigateur. Il change avec l'écran : on s'y retrouve dans l'historique, et un lecteur
// d'écran annonce où l'on arrive. (Pour une carte, le mot se lit dans son identifiant : « callipyge-adj ».)
const TITRES: Record<Exclude<Route['ecran'], 'carte'>, string> = {
  accueil: '', paquet: 'Paquets', collection: 'Album', deck: 'Deck', duel: 'Duels', reglages: 'Réglages', confidentialite: 'Confidentialité', galerie: 'Galerie',
};
export function titreDeLaRoute(route: Route): string {
  const nom = route.ecran === 'carte' ? route.id.replace(/-(?:nom|verbe|adj|adv)$/, '') : TITRES[route.ecran];
  return nom ? `${nom} — MOTS` : 'MOTS';
}

export function lien(route: Route): string {
  if (route.ecran === 'accueil') return '#/';
  if (route.ecran === 'carte') return `#/carte/${encodeURIComponent(route.id)}`;
  return `#/${route.ecran}`;
}
