import { it } from 'node:test';
import assert from 'node:assert/strict';
import { creerLeStockage } from './stockage.ts';

it('retrouve la copie récente après une panne de la base et conserve un effacement', async () => {
  let base: unknown = { version: 6, encre: 1 };
  let secours: unknown;
  let panne = false;
  const io = {
    lireBase: async () => { if (panne) throw Error('base indisponible'); return base; },
    ecrireBase: async (copie: unknown) => { if (panne) throw Error('base indisponible'); base = copie; },
    lireSecours: () => secours,
    ecrireSecours: (copie: unknown) => { secours = JSON.parse(JSON.stringify(copie)); },
    maintenant: () => 100,
  };
  const stockage = creerLeStockage(io);
  assert.deepEqual((await stockage.lireLaSauvegarde()).contenu, base, 'lit les anciennes copies sans enveloppe');
  await stockage.ecrireLaSauvegarde({ encre: 2 });
  panne = true;
  assert.equal(await stockage.ecrireLaSauvegarde({ encre: 3 }), 'stockage simple');
  panne = false;
  const recharge = creerLeStockage(io);
  assert.deepEqual((await recharge.lireLaSauvegarde()).contenu, { encre: 3 });
  panne = true;
  await recharge.effacerLaSauvegarde();
  panne = false;
  assert.equal((await creerLeStockage(io).lireLaSauvegarde()).contenu, undefined, 'une ancienne base ne ressuscite pas une partie effacée');
});

it('garde une copie en mémoire quand les deux stockages sont indisponibles', async () => {
  const panne = () => { throw Error('indisponible'); };
  const stockage = creerLeStockage({ lireBase: async () => panne(), ecrireBase: async () => panne(), lireSecours: panne, ecrireSecours: panne, maintenant: () => 1 });
  assert.equal(await stockage.ecrireLaSauvegarde({ encre: 4 }), 'mémoire seulement');
  assert.deepEqual((await stockage.lireLaSauvegarde()).contenu, { encre: 4 });
});
