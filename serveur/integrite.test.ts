import { it } from 'node:test';
import assert from 'node:assert/strict';
import { baseDeTest } from './test-base.ts';
import { EQUILIBRAGE } from '../src/config/equilibrage.ts';

it('rembourse les deux bourses lors de la suppression du vendeur, même via auth.users', async () => {
  const { db, ids, admin, joueur, vendre } = await baseDeTest();
  try {
    const vente = await vendre(150);
    await joueur(1); await db.query('select public.encherir($1,150)', [vente]);
    await admin(); await db.query('delete from auth.users where id=$1', [ids[0]]);
    const c = (await db.query<{ encre: number; encre_achetee: number }>('select encre,encre_achetee from public.comptes where utilisateur=$1', [ids[1]])).rows[0];
    assert.deepEqual(c, { encre: 200, encre_achetee: 100 });
  } finally { await db.close(); }
});

it('rend le timbre au vendeur si le gagnant disparaît, sans bloquer les autres comptes', async () => {
  const { db, ids, admin, joueur, vendre } = await baseDeTest();
  try {
    const vente = await vendre();
    await joueur(1); await db.query('select public.encherir($1,100)', [vente]);
    await admin(); await db.query('delete from auth.users where id=$1', [ids[1]]);
    await db.query("update public.encheres set ferme_le=now()-interval '1 minute' where id=$1", [vente]);
    await joueur(2); await db.query('select public.mon_compte()');
    await admin();
    assert.equal((await db.query<{ n: number }>("select (finitions->>'Normale')::integer n from public.possessions where utilisateur=$1", [ids[0]])).rows[0].n, 1);
    assert.equal((await db.query<{ etat: string }>('select etat from public.encheres where id=$1', [vente])).rows[0].etat, 'invendue');
  } finally { await db.close(); }
});

it('quitter les joutes conserve le compte, les timbres et les droits', async () => {
  const { db, ids, admin, joueur } = await baseDeTest();
  try {
    await db.query('update public.comptes set achat_unique=true where utilisateur=$1', [ids[0]]);
    await joueur(0); await db.query('select public.supprimer_mon_profil()');
    await admin();
    assert.equal((await db.query('select * from auth.users where id=$1', [ids[0]])).rows.length, 1);
    assert.equal((await db.query<{ achat_unique: boolean }>('select achat_unique from public.comptes where utilisateur=$1', [ids[0]])).rows[0].achat_unique, true);
    assert.equal((await db.query('select * from public.profils where utilisateur=$1', [ids[0]])).rows.length, 0);
  } finally { await db.close(); }
});

it('un achat immédiat tient compte de la mise déjà bloquée et du prix plafond', async () => {
  const { db, ids, admin, joueur, vendre } = await baseDeTest();
  try {
    const vente = await vendre(99, 100);
    await admin(); await db.query('update public.comptes set encre=0,encre_achetee=100 where utilisateur=$1', [ids[1]]);
    await joueur(1); await db.query('select public.encherir($1,99)', [vente]);
    await db.query('select public.encherir($1,100)', [vente]);
    await admin();
    assert.deepEqual((await db.query('select encre,encre_achetee from public.comptes where utilisateur=$1', [ids[1]])).rows[0], { encre: 0, encre_achetee: 0 });
    assert.equal((await db.query<{ etat: string }>('select etat from public.encheres where id=$1', [vente])).rows[0].etat, 'vendue');
    await joueur(2); await assert.rejects(db.query('select public.encherir($1,100)', [vente]), /terminée/);
  } finally { await db.close(); }
});

it('récupérer un compte rembourse les mises des tiers sur le compte remplacé', async () => {
  const { db, ids, admin, joueur, vendre } = await baseDeTest();
  try {
    const vente = await vendre(150);
    await joueur(1); await db.query('select public.encherir($1,150)', [vente]);
    await joueur(2); await db.query("select public.definir_un_code_de_secours('ABCDEFGHJKMNPQRSTUVW')");
    await joueur(0); await db.query("select public.recuperer_par_code('ABCDEFGHJKMNPQRSTUVW')");
    await admin();
    assert.deepEqual((await db.query('select encre,encre_achetee from public.comptes where utilisateur=$1', [ids[1]])).rows[0], { encre: 200, encre_achetee: 100 });
    assert.equal((await db.query('select * from public.comptes where utilisateur=$1', [ids[2]])).rows.length, 0);
  } finally { await db.close(); }
});

it('un achat immédiat se termine même si plus de deux lots de clôtures sont en retard', async () => {
  const { db, ids, admin, joueur, vendre } = await baseDeTest();
  try {
    const vente = await vendre(100, 100);
    await admin();
    await db.query("insert into public.encheres(vendeur,carte,finition,obtenue_le,mise_de_depart,ferme_le) select $1,'mot-nom','Normale',now(),100,now()-interval '1 day' from generate_series(1,$2)", [ids[2], EQUILIBRAGE.marche.cloturesParAppel * 2 + 1]);
    await joueur(1);
    const r = (await db.query<{ r: { enchere: { etat: string } } }>('select public.encherir($1,100) r', [vente])).rows[0].r;
    assert.equal(r.enchere.etat, 'vendue');
  } finally { await db.close(); }
});
