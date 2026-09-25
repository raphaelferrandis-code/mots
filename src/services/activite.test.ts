import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { phraseDuFil } from './activite.ts';
import type { EvenementDuFil } from './activite.ts';

const evenement = (e: Partial<EvenementDuFil>): EvenementDuFil => ({ genre: 'trouvaille', pseudo: 'Faekia', mot: null, rarete: null, finition: null, cote: null, le: 0, ...e });
const lire = (e: EvenementDuFil): string => phraseDuFil(e).map((m) => (m.fort ? `[${m.texte}]` : m.texte)).join('');

describe('les phrases du fil d’activité', () => {
  it('raconte les trouvailles', () => {
    assert.equal(lire(evenement({ mot: 'palimpseste', rarete: 'Rare', finition: 'Holographique' })), '[Faekia] vient de trouver [Palimpseste] en holographique');
    assert.equal(lire(evenement({ mot: 'grimoire', rarete: 'Légendaire', finition: 'Normale' })), '[Faekia] vient de trouver [Grimoire], une Légendaire');
    assert.equal(lire(evenement({ mot: 'amour', rarete: 'Hors-série', finition: 'Holographique' })), '[Faekia] vient de trouver [Amour] en holographique, une Hors-série');
  });
  it('raconte les victoires et les arrivées', () => {
    assert.equal(lire(evenement({ genre: 'victoire', cote: 1016 })), '[Faekia] remporte une joute classée et monte à [1016]');
    assert.equal(lire(evenement({ genre: 'arrivee' })), '[Faekia] rejoint le bureau des mots');
  });
});
