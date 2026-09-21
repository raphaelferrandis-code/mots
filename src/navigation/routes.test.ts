import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { lien, lireRoute } from './routes.ts';
import type { Route } from './routes.ts';

describe('adresses des écrans', () => {
  it('ouvre l\'accueil par défaut et pour une adresse inconnue', () => {
    for (const hash of ['', '#', '#/', '#/nimporte-quoi', '#/carte', '#/carte/%E0%A4%A']) {
      assert.deepEqual(lireRoute(hash), { ecran: 'accueil' }, hash);
    }
  });
  it('reconnaît chaque écran', () => {
    assert.deepEqual(lireRoute('#/collection'), { ecran: 'collection' });
    assert.deepEqual(lireRoute('#/reglages'), { ecran: 'reglages' });
    assert.deepEqual(lireRoute('#/duel'), { ecran: 'duel' });
  });
  it('fait l\'aller-retour pour toutes les routes, y compris les mots accentués ou composés', () => {
    const routes: Route[] = [
      { ecran: 'accueil' }, { ecran: 'paquet' }, { ecran: 'collection' }, { ecran: 'deck' }, { ecran: 'duel' }, { ecran: 'reglages' },
      { ecran: 'carte', id: 'callipyge-adj' }, { ecran: 'carte', id: 'sérendipité-nom' }, { ecran: 'carte', id: 'arc-en-ciel-nom' },
    ];
    for (const route of routes) assert.deepEqual(lireRoute(lien(route)), route);
  });
});
