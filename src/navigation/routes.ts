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
  | { ecran: 'atelier' };

const ECRANS_SIMPLES = ['paquet', 'collection', 'deck', 'duel', 'reglages', 'atelier'] as const;

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

export function lien(route: Route): string {
  if (route.ecran === 'accueil') return '#/';
  if (route.ecran === 'carte') return `#/carte/${encodeURIComponent(route.id)}`;
  return `#/${route.ecran}`;
}
