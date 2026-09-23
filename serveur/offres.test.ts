import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';
import { structure, migrationOffres } from './fabriquer-le-script.ts';
import { cartes } from './collections.ts';
import type { IndexEdition } from '../src/partage/types.ts';

it('exécute les droits, tirages et migrations dans PostgreSQL, sans toucher au serveur réel', async () => {
  const db = new PGlite({ extensions: { unaccent } });
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create schema extensions;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated, anon;`);
    await db.exec(structure());
    const edition = JSON.parse(readFileSync(new URL('../public/data/edition-1.index.json', import.meta.url), 'utf8')) as IndexEdition;
    await db.exec(cartes(edition));
    const id = '11111111-1111-4111-8111-111111111111';
    await db.exec(`insert into auth.users values ('${id}'); set request.jwt.claim.sub = '${id}'; select public.ouvrir_mon_compte();`);
    const etat = async () => (await db.query<{ etat: { encre: number; formule: { paquetsHebdomadaires: number; cadeauAchatReclame: boolean }; paquets: { stock: number; ouverts: number; sansLegendaire: number } } }>('select public.etat_du_compte(auth.uid()) as etat')).rows[0].etat;
    const reclamer = async (type: string) => (await db.query<{ r: { cartes: { id: string; encre: number }[] } }>("select public.reclamer_recompense($1, '{}') as r", [type])).rows[0].r;
    await assert.rejects(reclamer('achat'), /Aucune Hors-série/);
    await assert.rejects(reclamer('hebdomadaire'), /Aucun paquet/);
    await db.exec('set role authenticated;');
    await assert.rejects(db.exec("select public.tirer_les_cartes(auth.uid(), '{}', 'achat');"), /permission denied/);
    await assert.rejects(db.exec('update public.comptes set achat_unique = true;'), /permission denied/);
    await assert.rejects(db.exec("select public.acheter_personnalisation('boussole');"), /réservée aux enchères/);
    await db.exec('reset role; update public.comptes set achat_unique = true where utilisateur = auth.uid();');
    const avant = await etat();
    // Deux demandes concurrentes ne peuvent attribuer deux cadeaux.
    const demandes = await Promise.allSettled([reclamer('achat'), reclamer('achat')]);
    assert.equal(demandes.filter(r => r.status === 'fulfilled').length, 1);
    const cadeau = demandes.find(r => r.status === 'fulfilled');
    assert.ok(cadeau?.status === 'fulfilled');
    assert.equal(cadeau.value.cartes.length, 1);
    assert.equal(edition.cartes.find(c => c.id === cadeau.value.cartes[0].id)?.rarete, 'Hors-série');
    assert.deepEqual((await etat()).paquets, avant.paquets, 'cadeau séparé du stock et de la garantie ordinaire');
    await db.exec(migrationOffres()); // Relancer la migration ne recrée pas un cadeau.
    await assert.rejects(reclamer('achat'), /Aucune Hors-série/);

    await db.exec("update public.comptes set abonnement = 'collectionneur', abonnement_jusqu_au = now() + interval '30 days' where utilisateur = auth.uid();");
    assert.equal((await etat()).formule.paquetsHebdomadaires, 1);
    const avantHebdo = await etat();
    const hebdo = await reclamer('hebdomadaire');
    assert.equal(hebdo.cartes.length, 5);
    assert.equal(new Set(hebdo.cartes.map(c => c.id)).size, 5);
    assert.ok(['Épique', 'Légendaire', 'Hors-série'].includes(edition.cartes.find(c => c.id === hebdo.cartes[4].id)!.rarete));
    assert.deepEqual((await etat()).paquets, avantHebdo.paquets);
    await assert.rejects(reclamer('hebdomadaire'), /Aucun paquet/);
    // Les droits gagnés hors connexion sont réglés avant le renouvellement.
    await db.exec("update public.comptes set prochain_hebdo = now() - interval '14 days' where utilisateur = auth.uid();");
    await db.exec("update public.comptes set abonnement_jusqu_au = abonnement_jusqu_au + interval '30 days' where utilisateur = auth.uid();");
    assert.equal((await etat()).formule.paquetsHebdomadaires, 3);
    await db.exec("update public.comptes set abonnement_jusqu_au = abonnement_jusqu_au where utilisateur = auth.uid();");
    assert.equal((await etat()).formule.paquetsHebdomadaires, 3, 'pas de double crédit en rejouant une mise à jour');
    await db.exec("update public.comptes set abonnement = 'aucun', abonnement_jusqu_au = now() where utilisateur = auth.uid();");
    await reclamer('hebdomadaire');
    assert.equal((await etat()).formule.paquetsHebdomadaires, 2, 'droits conservés et utilisables après expiration');

    // Pas de récompense à la frontière exacte de fin d'abonnement.
    await db.exec("update public.comptes set abonnement = 'collectionneur', abonnement_jusqu_au = now() + interval '1 day' where utilisateur = auth.uid();");
    await db.exec("update public.comptes set reserve_hebdo = 0, prochain_hebdo = abonnement_jusqu_au where utilisateur = auth.uid();");
    assert.equal((await etat()).formule.paquetsHebdomadaires, 0);
    // Garder un stock reçu avant expiration, sans continuer à produire au rythme payant.
    await db.exec("update public.comptes set stock = 15, abonnement = 'aucun', abonnement_jusqu_au = now() where utilisateur = auth.uid();");
    const recharge = (await db.query<{ stock: number }>('select (public.recharger(c)).stock from public.comptes c where utilisateur = auth.uid()')).rows[0].stock;
    assert.equal(recharge, 15);

    // Une Hors-série déjà possédée suit la conversion habituelle, sans relancer un tirage.
    const second = '22222222-2222-4222-8222-222222222222';
    await db.exec(`insert into auth.users values ('${second}'); set request.jwt.claim.sub = '${second}'; select public.ouvrir_mon_compte();
      update public.comptes set achat_unique = true where utilisateur = auth.uid();
      insert into public.possessions(utilisateur, carte, finitions) select auth.uid(), id, '{"Normale":1}'::jsonb from public.cartes where rarete = 'Hors-série';`);
    const doublon = await reclamer('achat');
    assert.equal(doublon.cartes[0].encre, 500);
    assert.equal((await etat()).encre, 500);
    assert.equal((await db.query<{ n: number }>("select (finitions->>'Normale')::integer n from public.possessions where utilisateur=auth.uid() and carte=$1", [doublon.cartes[0].id])).rows[0].n, 1, 'un doublon converti ne crée pas un exemplaire vendable');
    // Si le tirage échoue, le cadeau n'est pas consommé (transaction atomique).
    const troisieme = '33333333-3333-4333-8333-333333333333';
    await db.exec(`insert into auth.users values ('${troisieme}'); set request.jwt.claim.sub = '${troisieme}'; select public.ouvrir_mon_compte(); update public.comptes set achat_unique = true where utilisateur = auth.uid();
      update public.cartes set registre = array['Familier'] where rarete = 'Hors-série';`);
    await assert.rejects(db.query("select public.reclamer_recompense('achat', array['Familier']);"), /Aucune carte disponible/);
    assert.equal((await etat()).formule.cadeauAchatReclame, false);
    await reclamer('achat');
  } finally { await db.close(); }
});
