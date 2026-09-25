import { PGlite } from '@electric-sql/pglite';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';
import { structure } from './fabriquer-le-script.ts';

export async function baseDeTest(combats = false) {
  const db = new PGlite({ extensions: { unaccent } });
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create schema extensions;
    create table auth.users(id uuid primary key, is_anonymous boolean not null default false);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;`);
  if (combats) await db.exec('create role service_role;');
  await db.exec(structure({ combats }));
  const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'];
  for (const [i, id] of ids.entries()) {
    await db.query('insert into auth.users values ($1)', [id]);
    // Des joueurs installés depuis un mois : un compte neuf n'aurait ni échanges ni marché (serveur/parrainage.ts).
    await db.query("insert into public.comptes(utilisateur,encre,encre_achetee,cree_le) values ($1,200,100,now()-interval '30 days')", [id]);
    await db.query('insert into public.profils(utilisateur,pseudo,pseudo_cle) values ($1,$2,$2)', [id, `lecteur${i}`]);
  }
  await db.exec(`insert into public.cartes values ('mot-nom','Commune','{}');`);
  const admin = async () => { await db.exec('reset role;'); };
  const joueur = async (i: number) => {
    await admin();
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [ids[i]]);
    await db.exec('set role authenticated;');
  };
  const vendre = async (prix = 100, immediat: number | null = null) => {
    await admin();
    await db.query(`insert into public.possessions(utilisateur,carte,finitions) values ($1,'mot-nom','{"Normale":1}')
      on conflict (utilisateur,carte) do update set finitions='{"Normale":1}'`, [ids[0]]);
    await joueur(0);
    return (await db.query<{ r: { enchere: { id: number } } }>("select public.mettre_en_vente('mot-nom','Normale',$1,$2,12) r", [prix, immediat])).rows[0].r.enchere.id;
  };
  return { db, ids, admin, joueur, vendre };
}
