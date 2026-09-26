// L'apparence suit le compte (décision de Raphaël du 26/09/2026, script 22) : le serveur garde chaque choix d'avatar,
// de cadre, de titre, de dos, de couleur et de paquet, et le rend avec l'état du compte.

import { it } from 'node:test';
import assert from 'node:assert/strict';
import { baseDeTest } from './test-base.ts';
import { migrationApparence } from './fabriquer-le-script.ts';
import { ORNEMENTS, PAQUETS } from '../src/jeu/personnalisation.ts';

async function laboratoire() {
  const b = await baseDeTest();
  const rpc = async <T = unknown>(nom: string, args: unknown[] = []) => (await b.db.query<{ r: T }>(`select public.${nom}(${args.map((_, i) => `$${i + 1}`).join(',')}) r`, args)).rows[0].r;
  const changer = (apparence: unknown) => rpc<Record<string, string>>('changer_d_apparence', [JSON.stringify(apparence)]);
  const apparence = async () => (await rpc<{ apparence: Record<string, string> | null }>('mon_compte')).apparence;
  return { ...b, rpc, changer, apparence };
}

it('apparence : chaque choix remplace le même, les autres restent, et l’état du compte la rend', async () => {
  const l = await laboratoire();
  try {
    await l.joueur(0);
    assert.equal(await l.apparence(), null, 'rien tant qu’aucun appareil n’a rien envoyé');
    assert.deepEqual(await l.changer({ avatar: 'renard' }), { avatar: 'renard' });
    assert.deepEqual(await l.changer({ cadre: 'sceau-cire', titre: '' }), { avatar: 'renard', cadre: 'sceau-cire', titre: '' });
    assert.deepEqual(await l.changer({ avatar: 'papillon', inconnu: 'ignore' }), { avatar: 'papillon', cadre: 'sceau-cire', titre: '' });
    assert.deepEqual(await l.apparence(), { avatar: 'papillon', cadre: 'sceau-cire', titre: '' });
    await l.joueur(1);
    assert.equal(await l.apparence(), null, 'les choix d’un joueur ne touchent pas les autres');
  } finally { await l.db.close(); }
});

it('apparence : le format est contrôlé, et seuls les joueurs qui ont un compte l’enregistrent', async () => {
  const l = await laboratoire();
  try {
    await l.joueur(0);
    for (const invalide of ['renard', ['renard'], {}, { inconnu: 'x' }, { avatar: '' }, { avatar: '<script>' }, { avatar: 'Renard' },
      { cadre: 'x'.repeat(41) }, { titre: 3 }, { dos: null }, { avatar: 'renard', paquet: 'celeste!' }]) {
      await assert.rejects(l.changer(invalide), /Apparence invalide/, JSON.stringify(invalide));
    }
    assert.equal(await l.apparence(), null, 'un envoi refusé n’enregistre rien, même en partie');
    await l.admin();
    await l.db.query('insert into auth.users values ($1)', ['44444444-4444-4444-8444-444444444444']);
    await l.db.query("select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false)");
    await l.db.exec('set role authenticated');
    await assert.rejects(l.changer({ avatar: 'renard' }), /Ouvre d'abord ton compte/);
    await l.admin(); await l.db.exec('set role anon');
    await assert.rejects(l.changer({ avatar: 'renard' }), /permission denied/);
  } finally { await l.db.close(); }
});

it('apparence : tous les objets du jeu passent le contrôle du format du serveur', async () => {
  const l = await laboratoire();
  try {
    await l.joueur(0);
    for (const o of ORNEMENTS) assert.equal((await l.changer({ [o.categorie]: o.id }))[o.categorie], o.id, o.id);
    for (const p of PAQUETS) assert.equal((await l.changer({ paquet: p.id })).paquet, p.id, p.id);
  } finally { await l.db.close(); }
});

it('la migration 22 s’applique deux fois sur une base existante, sans perdre les choix déjà gardés', async () => {
  const l = await laboratoire();
  try {
    await l.joueur(0);
    await l.changer({ avatar: 'chouette' });
    await l.admin();
    await l.db.exec(migrationApparence());
    await l.db.exec(migrationApparence());
    await l.joueur(0);
    assert.deepEqual(await l.apparence(), { avatar: 'chouette' });
    assert.deepEqual(await l.changer({ couleur: 'cuivre' }), { avatar: 'chouette', couleur: 'cuivre' });
  } finally { await l.db.close(); }
});
