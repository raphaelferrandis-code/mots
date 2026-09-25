import { it } from 'node:test';
import assert from 'node:assert/strict';
import { baseDeTest } from './test-base.ts';
import { migrationPortraits } from './fabriquer-le-script.ts';
import type { CarnetAmis } from '../src/services/amis.ts';
import type { MonEquipe } from '../src/services/equipes.ts';

async function laboratoire() {
  const b = await baseDeTest(true);
  const profils = (await b.db.query<{ id: string }>('select id from public.profils order by pseudo')).rows.map(p => p.id);
  const rpc = async <T = void>(nom: string, args: unknown[] = []) => (await b.db.query<{ r: T }>(`select public.${nom}(${args.map((_, i) => `$${i + 1}`).join(',')}) r`, args)).rows[0].r;
  const demander = async (a: number, c: number) => { await b.joueur(a); await rpc('demander_ami', [`lecteur${c}`]); };
  const lier = async (a: number, c: number) => { await demander(a, c); await b.joueur(c); await rpc('repondre_ami', [profils[a], 'accepter']); };
  return { ...b, profils, rpc, demander, lier };
}

it('portraits : le format est contrôlé et seul son propre profil change', async () => {
  const l = await laboratoire();
  try {
    await l.joueur(0);
    await assert.rejects(l.rpc('signaler_presence', ['<script>', 'simple']), /Portrait invalide/);
    await assert.rejects(l.rpc('signaler_presence', ['', 'simple']), /Portrait invalide/);
    await assert.rejects(l.rpc('signaler_presence', ['renard', 'x'.repeat(41)]), /Portrait invalide/);
    await l.rpc('signaler_presence', ['renard', 'grand-philateliste']);
    await l.rpc('signaler_presence', ['colombe', '']);
    await l.admin();
    const lignes = (await l.db.query<{ avatar: string; cadre: string; vu: boolean }>('select avatar, cadre, vu_le is not null vu from public.profils order by pseudo')).rows;
    assert.deepEqual(lignes, [{ avatar: 'colombe', cadre: '', vu: true }, { avatar: 'plume', cadre: 'simple', vu: false }, { avatar: 'plume', cadre: 'simple', vu: false }]);
    await l.db.exec('set role anon');
    await assert.rejects(l.rpc('signaler_presence', ['renard', 'simple']), /permission denied/);
    await l.admin(); await l.db.exec('set role authenticated');
    await assert.rejects(l.rpc('vitrine_du_profil', [l.ids[0]]), /permission denied/);
    await assert.rejects(l.rpc('xp_du_profil', [l.ids[0]]), /permission denied/);
  } finally { await l.db.close(); }
});

it('amis : portrait et niveau pour tous, présence et vitrine pour les seuls amis', async () => {
  const l = await laboratoire();
  try {
    await l.admin();
    await l.db.exec(`insert into public.cartes values ('rare-nom','Rare','{}'), ('legende-nom','Légendaire','{}'), ('epique-nom','Épique','{}'), ('peu-nom','Peu commune','{}')`);
    await l.db.query(`insert into public.possessions(utilisateur,carte,finitions) values
      ($1,'mot-nom','{"Holographique":1}'), ($1,'rare-nom','{"Normale":2}'), ($1,'legende-nom','{"Normale":1,"Brillante":1}'),
      ($1,'epique-nom','{"Normale":1}'), ($1,'peu-nom','{"Normale":1}'), ($1,'perdu-nom','{"Normale":0}')`, [l.ids[1]]);
    await l.db.query('update public.comptes set progression_active = (utilisateur = $1), xp = 900', [l.ids[1]]);
    await l.joueur(1); await l.rpc('signaler_presence', ['renard', 'simple']);

    await l.demander(0, 1);
    await l.joueur(0);
    const demande = (await l.rpc<CarnetAmis>('mes_amis')).relations[0];
    assert.equal(demande.avatar, 'renard');
    assert.equal(demande.xp, 900);
    assert.equal(demande.vu_le, null);
    assert.equal(demande.vitrine, undefined);
    assert.equal(demande.timbres, undefined);

    await l.joueur(1); await l.rpc('repondre_ami', [l.profils[0], 'accepter']);
    await l.joueur(0);
    const ami = (await l.rpc<CarnetAmis>('mes_amis')).relations[0];
    assert.equal(typeof ami.vu_le, 'number');
    assert.equal(ami.timbres, 5);
    assert.deepEqual(ami.vitrine, [
      { carte: 'legende-nom', finition: 'Brillante' }, { carte: 'epique-nom', finition: 'Normale' },
      { carte: 'rare-nom', finition: 'Normale' }, { carte: 'peu-nom', finition: 'Normale' },
    ]);
    await l.joueur(1);
    const moiVuParLui = (await l.rpc<CarnetAmis>('mes_amis')).relations[0];
    assert.equal(moiVuParLui.xp, null, 'sans progression vérifiée, pas de niveau');
    assert.equal(moiVuParLui.vu_le, null, 'jamais signalé');
    assert.equal(moiVuParLui.timbres, 0);
  } finally { await l.db.close(); }
});

it('équipe : portraits des membres et cote 2v2 lue dans les joutes en direct', async () => {
  const l = await laboratoire();
  try {
    await l.lier(0, 1);
    await l.joueur(0);
    const id = crypto.randomUUID();
    await l.rpc('creer_equipe', [id, 'Les Encriers', 'plume']);
    await l.rpc('signaler_presence', ['loupe', 'simple']);
    let equipe = (await l.rpc<MonEquipe>('mon_equipe')).equipe!;
    assert.equal(equipe.cote, null, 'sans les joutes en direct');
    assert.equal(equipe.membres[0].avatar, 'loupe');
    assert.equal(typeof equipe.membres[0].vu_le, 'number');
    await l.admin();
    await l.db.exec(`create table public.direct_cotes (mode text not null, sujet uuid not null, cote integer not null default 1000, primary key(mode,sujet))`);
    await l.db.query(`insert into public.direct_cotes values ('duo_equipe',$1,1042), ('solo',$1,900)`, [id]);
    await l.joueur(0);
    equipe = (await l.rpc<MonEquipe>('mon_equipe')).equipe!;
    assert.equal(equipe.cote, 1042);
  } finally { await l.db.close(); }
});

it('la migration 15 s’applique deux fois sur une base existante', async () => {
  const l = await laboratoire();
  try {
    await l.admin();
    await l.db.exec(migrationPortraits());
    await l.db.exec(migrationPortraits());
    await l.lier(0, 1);
    await l.joueur(0);
    assert.equal((await l.rpc<CarnetAmis>('mes_amis')).relations[0].avatar, 'plume');
  } finally { await l.db.close(); }
});
