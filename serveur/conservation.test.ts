// La conservation des comptes sans visite (décision de Raphaël du 28/09/2026) : le dernier passage noté à l'ouverture
// du jeu, la purge d'un invité après 12 mois et d'un compte relié après 3 ans, jamais d'un compte qui a payé. Base PGlite.

import { it } from 'node:test';
import assert from 'node:assert/strict';
import { SITE } from '../src/config/site.ts';
import { HEURE_DE_PURGE, TACHE_DE_PURGE } from './conservation.ts';
import { migrationConservation, structure } from './fabriquer-le-script.ts';
import { baseDeTest } from './test-base.ts';

type Base = Awaited<ReturnType<typeof baseDeTest>>;
const { inviteMois, relieAns } = SITE.conservation;

// Un joueur de plus : invité ou relié, venu pour la dernière fois il y a « absence » (un intervalle PostgreSQL), avec
// ou sans collection sur le serveur.
async function joueurAbsent(b: Base, id: string, { invite, absence, collection = true }: { invite: boolean; absence: string; collection?: boolean }) {
  await b.admin();
  await b.db.query('insert into auth.users(id, is_anonymous, created_at, last_sign_in_at) values ($1, $2, now() - $3::interval, now() - $3::interval)', [id, invite, absence]);
  if (collection) await b.db.query('insert into public.comptes(utilisateur, dernier_passage) values ($1, now() - $2::interval)', [id, absence]);
}
const existe = async (b: Base, id: string) => (await b.db.query('select 1 from auth.users where id = $1', [id])).rows.length === 1;
const purger = async (b: Base) => { await b.admin(); return (await b.db.query<{ n: number }>('select public.purger_les_comptes_inactifs() n')).rows[0].n; };
const id = (n: number) => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, '0')}`;

it('note le dernier passage à l’ouverture du jeu, au plus une fois par heure', async () => {
  const b = await baseDeTest();
  try {
    const passage = async () => (await b.db.query<{ il_y_a: number }>('select extract(epoch from now() - dernier_passage)::integer il_y_a from public.comptes where utilisateur = $1', [b.ids[0]])).rows[0].il_y_a;
    await b.db.query("update public.comptes set dernier_passage = now() - interval '2 hours' where utilisateur = $1", [b.ids[0]]);
    await b.joueur(0);
    await b.db.query('select public.mon_compte()');
    await b.admin();
    assert.ok(await passage() < 5, 'passage noté');
    await b.db.query("update public.comptes set dernier_passage = now() - interval '30 minutes' where utilisateur = $1", [b.ids[0]]);
    await b.joueur(0);
    await b.db.query('select public.mon_compte()');
    await b.admin();
    assert.ok(Math.abs(await passage() - 1800) < 5, 'pas de nouvelle écriture dans l’heure');
  } finally { await b.db.close(); }
});

it(`supprime un invité après ${inviteMois} mois sans visite, un compte relié après ${relieAns} ans, jamais un compte qui a payé`, async () => {
  const b = await baseDeTest();
  try {
    await joueurAbsent(b, id(1), { invite: true, absence: `${inviteMois} months 1 day` });
    await joueurAbsent(b, id(2), { invite: true, absence: `${inviteMois - 1} months` });
    await joueurAbsent(b, id(3), { invite: false, absence: `${relieAns * 12 - 1} months` });
    await joueurAbsent(b, id(4), { invite: false, absence: `${relieAns} years 1 day` });
    await joueurAbsent(b, id(5), { invite: true, absence: `${inviteMois * 3} months` });
    await b.db.query('update public.comptes set achat_unique = true where utilisateur = $1', [id(5)]);
    await joueurAbsent(b, id(6), { invite: false, absence: `${relieAns * 2} years` });
    await b.db.query("update public.comptes set abonnement = 'collectionneur', abonnement_jusqu_au = now() - interval '1 year' where utilisateur = $1", [id(6)]);
    // Des comptes jamais ouverts (une session, sans collection) : ils comptent depuis leur création.
    await joueurAbsent(b, id(7), { invite: true, absence: `${inviteMois} months 1 day`, collection: false });
    await joueurAbsent(b, id(8), { invite: true, absence: '2 months', collection: false });
    await b.db.query("insert into public.profils(utilisateur, pseudo, pseudo_cle) values ($1, 'Lointain', 'lointain')", [id(4)]);

    assert.equal(await purger(b), 3);
    const restes = await Promise.all([1, 2, 3, 4, 5, 6, 7, 8].map(async (n) => [n, await existe(b, id(n))] as const));
    assert.deepEqual(Object.fromEntries(restes), { 1: false, 2: true, 3: true, 4: false, 5: true, 6: true, 7: false, 8: true });
    assert.equal((await b.db.query("select 1 from public.profils where pseudo_cle = 'lointain'")).rows.length, 0, 'le pseudonyme part avec le compte');
    assert.equal((await b.db.query('select 1 from public.comptes where utilisateur = $1', [id(1)])).rows.length, 0, 'la collection aussi');
    for (const joueur of b.ids) assert.ok(await existe(b, joueur), 'les joueurs actifs restent');
    assert.equal(await purger(b), 0, 'une seconde purge ne trouve plus rien');
  } finally { await b.db.close(); }
});

it('rembourse l’enchérisseur d’une vente dont le vendeur est purgé', async () => {
  const b = await baseDeTest();
  try {
    const vente = await b.vendre(150);
    await b.joueur(1);
    await b.db.query('select public.encherir($1, 150)', [vente]);
    await b.admin();
    await b.db.query("update auth.users set is_anonymous = true where id = $1", [b.ids[0]]);
    await b.db.query(`update public.comptes set dernier_passage = now() - interval '${inviteMois + 1} months' where utilisateur = $1`, [b.ids[0]]);
    assert.equal(await purger(b), 1);
    assert.equal(await existe(b, b.ids[0]), false);
    const bourse = (await b.db.query<{ encre: number; encre_achetee: number }>('select encre, encre_achetee from public.comptes where utilisateur = $1', [b.ids[1]])).rows[0];
    assert.deepEqual(bourse, { encre: 200, encre_achetee: 100 }, 'la mise est rendue');
  } finally { await b.db.close(); }
});

it('garde un compte qu’un contrôle refuse de supprimer, sans arrêter la purge', async () => {
  const b = await baseDeTest();
  try {
    await joueurAbsent(b, id(1), { invite: true, absence: `${inviteMois + 2} months` });
    await joueurAbsent(b, id(2), { invite: true, absence: `${inviteMois + 1} months` });
    // Comme la protection des paiements (un abonnement qui se renouvelle encore) : un refus au moment de la suppression.
    await b.db.exec(`create function public.refuser_un_compte() returns trigger language plpgsql as $$
      begin if old.utilisateur = '${id(1)}' then raise exception 'Abonnement en cours.'; end if; return old; end $$;
      create trigger refuser_un_compte before delete on public.comptes for each row execute function public.refuser_un_compte();`);
    assert.equal(await purger(b), 1);
    assert.equal(await existe(b, id(1)), true, 'le compte refusé reste');
    assert.equal(await existe(b, id(2)), false, 'le suivant est supprimé');
  } finally { await b.db.close(); }
});

it('n’est ouverte ni aux visiteurs ni aux joueurs', async () => {
  const b = await baseDeTest();
  try {
    await b.joueur(0);
    await assert.rejects(b.db.query('select public.purger_les_comptes_inactifs()'), /permission denied/);
    await b.admin();
    await b.db.exec('set role anon;');
    await assert.rejects(b.db.query('select public.purger_les_comptes_inactifs()'), /permission denied/);
  } finally { await b.db.close(); }
});

it('se planifie chaque nuit avec pg_cron, sous un nom fixe, et le script 27 se rejoue sans danger', async () => {
  const script = migrationConservation();
  assert.ok(script.includes(`perform cron.schedule('${TACHE_DE_PURGE}', '${HEURE_DE_PURGE}', 'select public.purger_les_comptes_inactifs()');`));
  assert.ok(structure().includes(`perform cron.schedule('${TACHE_DE_PURGE}'`), 'une installation neuve planifie aussi la purge');
  assert.match(script, new RegExp(`interval '${inviteMois} months' else interval '${relieAns} years'`), 'les durées des pages légales');
  const b = await baseDeTest();
  try {
    await b.admin();
    await b.db.exec(script);
    await b.db.exec(script);
    assert.equal(await purger(b), 0);
  } finally { await b.db.close(); }
});
