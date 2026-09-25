// Le fil d'activité, sur une vraie base PostgreSQL (PGlite) : ce qui y entre, ce qui n'y entre pas, l'effacement,
// les droits de lecture, et la garantie qu'un déclencheur en panne ne bloque jamais un tirage.

import { it } from 'node:test';
import assert from 'node:assert/strict';
import { baseDeTest } from './test-base.ts';
import { TAILLE_DU_FIL } from './activite.ts';
import { migrationFilDActivite } from './fabriquer-le-script.ts';

type Evenement = { genre: string; pseudo: string; mot: string | null; rarete: string | null; finition: string | null; cote: number | null; le: number };

async function laboratoire() {
  const b = await baseDeTest();
  await b.db.exec(`insert into public.cartes values ('grimoire-nom','Légendaire','{}'), ('amour-nom','Hors-série','{}');
    delete from public.activite;`);
  const fil = async (): Promise<Evenement[]> => { await b.admin(); return (await b.db.query<{ f: Evenement[] }>('select public.fil_d_activite() f')).rows[0].f; };
  const obtenir = async (i: number, carte: string, finition = 'Normale') => {
    await b.admin();
    await b.db.query(`insert into public.possessions(utilisateur,carte,finitions) values ($1,$2,jsonb_build_object($3::text,1))
      on conflict (utilisateur,carte) do update set finitions = public.possessions.finitions || jsonb_build_object($3::text,1)`, [b.ids[i], carte, finition]);
  };
  return { ...b, fil, obtenir };
}

it('note les trouvailles remarquables, et seulement elles', async () => {
  const b = await laboratoire();
  await b.obtenir(0, 'mot-nom');
  assert.equal((await b.fil()).length, 0, 'une Commune ordinaire ne fait pas de bruit');
  await b.obtenir(0, 'grimoire-nom');
  await b.obtenir(1, 'mot-nom', 'Holographique');
  await b.obtenir(1, 'mot-nom', 'Holographique'); // un doublon holographique n'est pas une nouvelle trouvaille
  const fil = await b.fil();
  assert.deepEqual(fil.map((e) => [e.genre, e.pseudo, e.mot, e.rarete, e.finition]), [
    ['trouvaille', 'lecteur1', 'mot', 'Commune', 'Holographique'],
    ['trouvaille', 'lecteur0', 'grimoire', 'Légendaire', 'Normale'],
  ]);
});

it('ignore les joueurs sans pseudonyme et les joueurs maison, et note victoires et arrivées', async () => {
  const b = await laboratoire();
  await b.db.exec("delete from public.profils where pseudo = 'lecteur2'");
  await b.obtenir(2, 'amour-nom');
  assert.equal((await b.fil()).length, 0, 'sans pseudonyme public, rien ne paraît');
  await b.db.exec("insert into public.profils(maison,pseudo,pseudo_cle) values (true,'Maison','maison'); update public.profils set gagnees = gagnees + 1 where maison;");
  assert.equal((await b.fil()).length, 0, 'les joueurs maison restent discrets');
  await b.db.query("insert into public.profils(utilisateur,pseudo,pseudo_cle) values ($1,'Nouvelle','nouvelle')", [b.ids[2]]);
  await b.db.query('update public.profils set gagnees = gagnees + 1, cote = 1016 where utilisateur = $1', [b.ids[0]]);
  const fil = await b.fil();
  // Les deux événements peuvent tomber dans la même microseconde (c'est arrivé sur GitHub) : leur ordre n'est pas vérifié.
  const lignes = fil.map((e) => [e.genre, e.pseudo, e.cote]).sort((x, y) => String(x[0]).localeCompare(String(y[0])));
  assert.deepEqual(lignes, [['arrivee', 'Nouvelle', null], ['victoire', 'lecteur0', 1016]]);
});

it('suit les changements de pseudonyme et efface un joueur qui retire son profil', async () => {
  const b = await laboratoire();
  await b.obtenir(0, 'grimoire-nom');
  await b.obtenir(1, 'amour-nom');
  await b.db.query("update public.profils set pseudo = 'Plume', pseudo_cle = 'plume' where utilisateur = $1", [b.ids[0]]);
  assert.deepEqual((await b.fil()).map((e) => e.pseudo).sort(), ['Plume', 'lecteur1']);
  await b.joueur(1);
  await b.db.exec('select public.supprimer_mon_profil()');
  assert.deepEqual((await b.fil()).map((e) => e.pseudo), ['Plume']);
});

it('se lit sans compte, mais la table et les aides internes restent fermées', async () => {
  const b = await laboratoire();
  await b.obtenir(0, 'grimoire-nom');
  await b.db.exec('set role anon;');
  assert.equal((await b.db.query<{ f: Evenement[] }>('select public.fil_d_activite() f')).rows[0].f.length, 1);
  await assert.rejects(b.db.exec('select * from public.activite'));
  await assert.rejects(b.db.exec("select public.noter_activite('arrivee','Faux',null,null,null,null)"));
  await b.joueur(0);
  await assert.rejects(b.db.exec('select * from public.activite'));
  await assert.rejects(b.db.exec("select public.noter_activite('arrivee','Faux',null,null,null,null)"));
});

it(`garde les ${TAILLE_DU_FIL} derniers événements, et ne bloque jamais un tirage`, async () => {
  const b = await laboratoire();
  await b.admin();
  for (let i = 0; i < TAILLE_DU_FIL + 5; i++) await b.db.query("select public.noter_activite('arrivee',$1,null,null,null,null)", [`joueur${i}`]);
  assert.equal((await b.fil()).length, TAILLE_DU_FIL);
  // Le fil en panne (table disparue) : le timbre entre quand même dans l'album.
  await b.db.exec('alter table public.activite rename to activite_en_panne;');
  await b.obtenir(0, 'grimoire-nom');
  const { rows } = await b.db.query('select 1 from public.possessions where utilisateur = $1 and carte = $2', [b.ids[0], 'grimoire-nom']);
  assert.equal(rows.length, 1);
});

it('fournit une migration autonome, rejouable sans danger', async () => {
  const b = await laboratoire();
  const script = migrationFilDActivite();
  assert.match(script, /^-- Le fil d’activité/);
  assert.doesNotMatch(script, /create or replace function public\.(tirer_les_cartes|terminer_une_joute|publier_mon_profil)\(/, 'aucune fonction existante n’est redéfinie');
  await b.db.exec(script);
  await b.db.exec(script);
  await b.obtenir(0, 'grimoire-nom');
  assert.equal((await b.fil()).length, 1, 'un seul déclencheur, même après deux installations');
});
