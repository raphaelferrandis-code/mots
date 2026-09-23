import { it } from 'node:test';
import assert from 'node:assert/strict';
import { baseDeTest } from './test-base.ts';
import { migrationIntegrite } from './fabriquer-le-script.ts';

it('une récompense peut être relue sans double versement, y compris pour un duel rapide', async () => {
  const { db, ids, joueur, admin } = await baseDeTest();
  try {
    await joueur(0);
    const ticket = (await db.query<{ id: number }>("select public.commencer_un_duel('Normal') id")).rows[0].id;
    const finir = async () => (await db.query<{ r: { encre: number; etat: { encre: number } } }>("select public.terminer_un_duel($1,'victoire') r", [ticket])).rows[0].r;
    const premiere = await finir();
    await admin(); await db.query('update public.comptes set encre=encre+7 where utilisateur=$1', [ids[0]]);
    await joueur(0);
    const seconde = await finir();
    assert.equal(seconde.encre, premiere.encre);
    assert.equal(seconde.etat.encre, premiere.etat.encre + 7, 'la réponse répétée renvoie le solde actuel');
    await assert.rejects(db.query("select public.terminer_un_duel($1,'defaite')", [ticket]), /autre résultat/);
    await joueur(1); await assert.rejects(db.query("select public.terminer_un_duel($1,'victoire')", [ticket]), /enregistré/);
  } finally { await db.close(); }
});

it('une joute est comptée une fois ; recommencer clôt la précédente en défaite sans Encre', async () => {
  const { db, ids, joueur, admin } = await baseDeTest();
  try {
    const deck = Array.from({ length: 10 }, (_, i) => `carte-${i}`);
    for (const id of deck) await db.query("insert into public.cartes values ($1,'Commune','{}')", [id]);
    for (const uid of ids.slice(0, 2)) {
      await db.query("insert into public.possessions(utilisateur,carte,finitions) select $1,id,'{\"Normale\":1}' from public.cartes", [uid]);
      await db.query('update public.comptes set deck=$2 where utilisateur=$1', [uid, JSON.stringify(deck)]);
    }
    const adverse = (await db.query<{ id: string }>('select id from public.profils where utilisateur=$1', [ids[1]])).rows[0].id;
    await joueur(0);
    const commencer = async () => (await db.query<{ id: number }>('select public.commencer_une_joute($1) id', [adverse])).rows[0].id;
    const ticket = await commencer();
    const premiere = (await db.query<{ r: { avant: number; apres: number; encre: number } }>("select public.terminer_une_joute($1,'victoire') r", [ticket])).rows[0].r;
    const seconde = (await db.query<{ r: { apres: number } }>("select public.terminer_une_joute($1,'victoire') r", [ticket])).rows[0].r;
    assert.equal(seconde.apres, premiere.apres);
    const abandon = await commencer();
    await commencer();
    await admin();
    const profil = (await db.query<{ jouees: number; gagnees: number }>('select jouees,gagnees from public.profils where utilisateur=$1', [ids[0]])).rows[0];
    assert.deepEqual(profil, { jouees: 2, gagnees: 1 });
    assert.deepEqual((await db.query('select resultat,abandonnee from public.joutes where id=$1', [abandon])).rows[0], { resultat: 'defaite', abandonnee: true });
    assert.equal((await db.query<{ encre: number }>('select encre from public.comptes where utilisateur=$1', [ids[0]])).rows[0].encre, 200 + premiere.encre);
    await joueur(0);
    for (let i = 3; i < 40; i++) await commencer();
    await db.query('select public.supprimer_mon_profil()');
    await db.query("select public.publier_mon_profil('Lecteur Neuf',$1,'{}','{}')", [JSON.stringify(deck)]);
    await assert.rejects(commencer(), /Trop de joutes/, 'retirer puis recréer le profil ne réinitialise pas le quota');
  } finally { await db.close(); }
});

it('le profil refuse les cartes inventées, les doublons et les statistiques impossibles ; une vente actualise le double', async () => {
  const { db, ids, admin, joueur, vendre } = await baseDeTest();
  try {
    await db.query("insert into public.possessions(utilisateur,carte,finitions) values ($1,'mot-nom','{\"Normale\":1}')", [ids[0]]);
    await joueur(0);
    const publier = (deck: unknown, savoirs: unknown = {}) => db.query("select public.publier_mon_profil('Lecteur Zero',$1,$2,'{}')", [JSON.stringify(deck), JSON.stringify(savoirs)]);
    await assert.rejects(publier(['inventee']), /cartes distinctes/);
    await assert.rejects(publier(['mot-nom','mot-nom']), /cartes distinctes/);
    await assert.rejects(publier(['mot-nom'], { 'mot-nom': { posees: 1, reussies: 200 } }), /Statistiques/);
    await assert.rejects(publier(null), /profil/);
    await publier(['mot-nom'], { 'mot-nom': { posees: 1, reussies: 1 } });
    await db.query("select public.changer_de_deck('[\"mot-nom\"]')");
    await vendre();
    await admin();
    assert.deepEqual((await db.query<{ deck: string[] }>('select deck from public.profils where utilisateur=$1', [ids[0]])).rows[0].deck, []);
    // Une réinstallation conserve les comptes et les fonctions peuvent être rappelées.
    await db.exec(migrationIntegrite());
    assert.equal((await db.query('select * from public.comptes')).rows.length, 3);
  } finally { await db.close(); }
});

it('les archives locales ne créent des ressources que depuis une copie approuvée hors du client', async () => {
  const { db, ids, admin, joueur } = await baseDeTest();
  try {
    await db.query('delete from public.comptes where utilisateur=$1', [ids[2]]);
    const importer = () => db.query<{ r: { encre: number } }>("select public.importer_ma_collection(0,302000,'{\"ouverts\":10000}','{}','[]') r");
    await joueur(2);
    await assert.rejects(importer(), /validée/);
    await assert.rejects(db.query("insert into public.importations_validees(utilisateur,sauvegarde) values(auth.uid(),'{}')"), /permission denied/);
    await admin();
    await db.query('insert into public.importations_validees(utilisateur,sauvegarde) values($1,$2)', [ids[2], JSON.stringify({ creeLe: Date.now(), encre: 42, paquets: { stock: 3, reference: Date.now(), ouverts: 0 }, cartes: {}, deck: [] })]);
    await joueur(2);
    assert.equal((await importer()).rows[0].r.encre, 42);
    await assert.rejects(importer(), /déjà une collection/);
    await admin();
    assert.equal((await db.query('select * from public.importations_validees')).rows.length, 0);
  } finally { await db.close(); }
});
