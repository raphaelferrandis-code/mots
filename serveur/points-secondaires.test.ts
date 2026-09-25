// Les points secondaires de l'audit du 25/09/2026, sur une vraie base PostgreSQL (PGlite) : une demande répétée après
// une coupure de réseau (paquet, cadeau, mise en vente) n'est servie qu'une fois ; les filtres des paquets ; le code de
// secours ; l'histoire des prix ; une vente conclue qui survit à son vendeur ; les vieux essais de récupération ; le fil
// d'activité réservé aux paquets.

import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { baseDeTest } from './test-base.ts';
import { cartes } from './collections.ts';
import { direct } from './direct.ts';
import { EQUILIBRAGE } from '../src/config/equilibrage.ts';
import type { IndexEdition } from '../src/partage/types.ts';

const edition = JSON.parse(readFileSync(new URL('../public/data/edition-1.index.json', import.meta.url), 'utf8')) as IndexEdition;
const registreDe = new Map(edition.cartes.map((c) => [c.id, c.registre]));
type Tiree = { id: string; finition: string };
type Ouverture = { cartes: Tiree[]; etat: { paquets: { ouverts: number } } };

async function avecLEdition() {
  const b = await baseDeTest();
  await b.db.exec(cartes(edition));
  await b.db.exec("delete from public.cartes where id = 'mot-nom'"); // la carte d'essai de baseDeTest n'est pas de l'édition
  await b.db.query('update public.comptes set stock = 100, reference = now()');
  await b.db.exec('select setseed(0.42)');
  const compte = async (i: number) => {
    await b.admin();
    return (await b.db.query<{ stock: number; ouverts: number }>('select stock, ouverts from public.comptes where utilisateur=$1', [b.ids[i]])).rows[0];
  };
  const ouvrir = async (demande: string | null, masques: string[] = []) =>
    (await b.db.query<{ r: Ouverture }>('select public.ouvrir_un_paquet($1, $2) r', [masques, demande])).rows[0].r;
  return { ...b, compte, ouvrir };
}

it('un paquet redemandé après une coupure de réseau n’est ouvert qu’une fois', async () => {
  const b = await avecLEdition();
  try {
    const avant = await b.compte(0);
    const demande = randomUUID();
    await b.joueur(0);
    const premiere = await b.ouvrir(demande);
    const seconde = await b.ouvrir(demande);
    assert.deepEqual(seconde.cartes, premiere.cartes, 'les mêmes cartes, rendues telles quelles');
    assert.equal(seconde.etat.paquets.ouverts, avant.ouverts + 1, 'avec l’état du compte à jour');
    assert.deepEqual(await b.compte(0), { stock: avant.stock - 1, ouverts: avant.ouverts + 1 });
    // Une autre demande, un autre paquet ; sans demande (un jeu resté ouvert sur l'ancienne version), chaque appel compte.
    await b.joueur(0);
    assert.notDeepEqual((await b.ouvrir(randomUUID())).cartes, premiere.cartes);
    await b.ouvrir(null); await b.ouvrir(null);
    assert.equal((await b.compte(0)).ouverts, avant.ouverts + 4);
    // La même demande venue d'un autre joueur ne lui rend pas le paquet du premier.
    await b.joueur(1);
    assert.notDeepEqual((await b.ouvrir(demande)).cartes, premiere.cartes);
    assert.equal((await b.compte(1)).ouverts, 1);
    // Les réponses gardées restent au serveur.
    await b.joueur(0);
    await assert.rejects(b.db.query('select * from public.demandes_traitees'), /permission denied/);
    await assert.rejects(b.db.query('select public.demande_deja_traitee($1, $2)', [b.ids[0], demande]), /permission denied/);
    await assert.rejects(b.db.query("select public.noter_la_demande($1, $2, '{}')", [b.ids[0], randomUUID()]), /permission denied/);
  } finally { await b.db.close(); }
});

it('des filtres de contenu inconnus ou répétés sont ignorés, les vrais s’appliquent', async () => {
  const b = await avecLEdition();
  try {
    await b.joueur(0);
    const masques = ['Familier', 'Familier', 'Injurieux', 'Vieilli', 'Littéraire', 'n’importe quoi', '', ...Array.from({ length: 500 }, (_, i) => `faux${i}`)];
    for (let i = 0; i < 8; i++) {
      for (const c of (await b.ouvrir(null, masques)).cartes) assert.deepEqual(registreDe.get(c.id), [], `${c.id} n'a aucun registre filtré`);
    }
  } finally { await b.db.close(); }
});

it('un cadeau réclamé deux fois avec la même demande n’est donné qu’une fois', async () => {
  const b = await avecLEdition();
  try {
    await b.db.query('update public.comptes set achat_unique = true where utilisateur = $1', [b.ids[0]]);
    await b.joueur(0);
    const demande = randomUUID();
    const reclamer = async (d: string) => (await b.db.query<{ r: Ouverture }>("select public.reclamer_recompense('achat', '{}', $1) r", [d])).rows[0].r;
    const cadeau = await reclamer(demande);
    assert.equal(cadeau.cartes.length, 1);
    assert.deepEqual((await reclamer(demande)).cartes, cadeau.cartes);
    await assert.rejects(reclamer(randomUUID()), /Aucune Hors-série/);
    await b.admin();
    const { rows } = await b.db.query<{ n: number }>(`select count(*)::int n from public.possessions p join public.cartes c on c.id = p.carte
      where p.utilisateur = $1 and c.rarete = 'Hors-série'`, [b.ids[0]]);
    assert.equal(rows[0].n, 1);
  } finally { await b.db.close(); }
});

it('une mise en vente redemandée ne crée qu’une enchère et ne retire qu’un timbre ; les vieilles demandes s’effacent', async () => {
  const b = await baseDeTest();
  try {
    await b.db.query(`insert into public.possessions(utilisateur,carte,finitions) values ($1,'mot-nom','{"Normale":2}')`, [b.ids[0]]);
    const vieille = randomUUID();
    await b.db.query("insert into public.demandes_traitees(utilisateur, demande, reponse, le) values ($1, $2, '{}', now() - interval '3 days')", [b.ids[0], vieille]);
    await b.joueur(0);
    const demande = randomUUID();
    const vendre = async (d: string) => (await b.db.query<{ r: { enchere: { id: number }; etat: { encre: number } } }>(
      "select public.mettre_en_vente('mot-nom', 'Normale', 10, null, 12, $1) r", [d])).rows[0].r;
    const premiere = await vendre(demande);
    const seconde = await vendre(demande);
    assert.equal(seconde.enchere.id, premiere.enchere.id);
    assert.equal(typeof seconde.etat.encre, 'number');
    await b.admin();
    assert.equal((await b.db.query<{ n: number }>('select count(*)::int n from public.encheres')).rows[0].n, 1);
    assert.equal((await b.db.query<{ n: number }>("select (finitions->>'Normale')::int n from public.possessions where utilisateur = $1 and carte = 'mot-nom'", [b.ids[0]])).rows[0].n, 1);
    assert.deepEqual((await b.db.query<{ demande: string }>('select demande from public.demandes_traitees')).rows.map((l) => l.demande), [demande]);
  } finally { await b.db.close(); }
});

it('un code de secours : seulement les signes que le jeu tire, et jamais le même pour deux comptes', async () => {
  const b = await baseDeTest();
  try {
    await b.joueur(0);
    await assert.rejects(b.db.query("select public.definir_un_code_de_secours('ABCDEFGHIJKLMNOPQRST')"), /ne peut pas servir/, 'I, L et O ne sont jamais tirés');
    await assert.rejects(b.db.query("select public.definir_un_code_de_secours('ABCDE')"), /ne peut pas servir/);
    await b.db.query("select public.definir_un_code_de_secours('mots-abcd-efgh-jkmn-pqrs-tuvw')"); // tel que le joueur le recopie
    await b.joueur(1);
    await assert.rejects(b.db.query("select public.definir_un_code_de_secours('ABCDEFGHJKMNPQRSTUVW')"), /déjà pris/);
    await b.joueur(2);
    const r = (await b.db.query<{ r: { refus?: string } }>("select public.recuperer_par_code('ABCD EFGH JKMN PQRS TUVW') r")).rows[0].r;
    assert.equal(r.refus, undefined, 'le code du joueur 0, et lui seul');
    await b.admin();
    assert.equal((await b.db.query('select 1 from public.comptes where utilisateur = $1', [b.ids[2]])).rows.length, 1);
    assert.equal((await b.db.query('select 1 from public.comptes where utilisateur = $1', [b.ids[0]])).rows.length, 0);
  } finally { await b.db.close(); }
});

it('l’histoire des prix reste réservée à la formule Expert, même pour un joueur sans compte', async () => {
  const b = await baseDeTest();
  try {
    const inconnu = '55555555-5555-4555-8555-555555555555';
    await b.db.query('insert into auth.users values ($1)', [inconnu]);
    await b.db.query("select set_config('request.jwt.claim.sub', $1, false)", [inconnu]);
    await b.db.exec('set role authenticated;');
    await assert.rejects(b.db.query("select public.historique_de_la_cote('mot-nom')"), /formule Expert/);
    await b.joueur(0);
    await assert.rejects(b.db.query("select public.historique_de_la_cote('mot-nom')"), /formule Expert/);
    await b.admin();
    await b.db.query("update public.comptes set abonnement = 'expert', abonnement_jusqu_au = now() + interval '1 day' where utilisateur = $1", [b.ids[0]]);
    await b.joueur(0);
    const h = (await b.db.query<{ r: { ventes: unknown[] } }>("select public.historique_de_la_cote('mot-nom') r")).rows[0].r;
    assert.deepEqual(h.ventes, []);
  } finally { await b.db.close(); }
});

it('une vente conclue survit à l’effacement de son vendeur : l’acheteur la retrouve, sans nom', async () => {
  const b = await baseDeTest();
  try {
    const vente = await b.vendre(100, 100);
    await b.joueur(1); await b.db.query('select public.encherir($1, 100)', [vente]);
    await b.admin(); await b.db.query('delete from auth.users where id = $1', [b.ids[0]]);
    const e = (await b.db.query('select vendeur, etat, prix_final, acheteur from public.encheres where id = $1', [vente])).rows[0];
    assert.deepEqual(e, { vendeur: null, etat: 'vendue', prix_final: 100, acheteur: b.ids[1] });
    await b.joueur(1);
    const mes = (await b.db.query<{ r: { mises: { id: number; vendeur: string; remportee: boolean; mienne: boolean }[] } }>('select public.mes_encheres() r')).rows[0].r;
    assert.deepEqual(mes.mises.map((m) => [m.id, m.vendeur, m.remportee, m.mienne]), [[vente, 'Un collectionneur', true, null]]);
  } finally { await b.db.close(); }
});

it('les essais de récupération de plus d’un jour sont oubliés', async () => {
  const b = await baseDeTest();
  try {
    await b.db.query("insert into public.tentatives_de_recuperation(utilisateur, quand) select $1, now() - interval '2 days' from generate_series(1, 20)", [b.ids[1]]);
    await b.db.query("insert into public.tentatives_de_recuperation(utilisateur, quand) values ($1, now() - interval '2 hours')", [b.ids[1]]);
    await b.joueur(0);
    const r = (await b.db.query<{ r: { refus: string } }>("select public.recuperer_par_code('ABCDEFGHJKMNPQRSTUVW') r")).rows[0].r;
    assert.match(r.refus, /aucune collection/);
    await b.admin();
    const reste = (await b.db.query<{ utilisateur: string }>('select utilisateur from public.tentatives_de_recuperation order by quand')).rows.map((l) => l.utilisateur);
    assert.deepEqual(reste, [b.ids[1], b.ids[0]]);
  } finally { await b.db.close(); }
});

it('le fil d’activité note la Légendaire tirée d’un paquet, pas celle achetée ensuite au marché', async () => {
  const b = await avecLEdition();
  try {
    await b.db.exec('delete from public.activite');
    await b.db.query('update public.comptes set ouverts = $2, sans_legendaire = $3 where utilisateur = $1',
      [b.ids[0], EQUILIBRAGE.paquets.paquetsDeDepart, EQUILIBRAGE.paquets.paquetsAvantLegendaireGarantie - 1]);
    await b.db.query('update public.comptes set encre = 5000 where utilisateur = $1', [b.ids[1]]);
    await b.joueur(0);
    const legendaire = (await b.ouvrir(null)).cartes.at(-1)!;
    const fil = async () => { await b.admin(); return (await b.db.query<{ f: { pseudo: string; rarete: string }[] }>('select public.fil_d_activite() f')).rows[0].f; };
    const apresLePaquet = await fil();
    assert.ok(apresLePaquet.some((e) => e.pseudo === 'lecteur0' && e.rarete === 'Légendaire'), 'la Légendaire du paquet paraît');
    await b.joueur(0);
    const prix = EQUILIBRAGE.marche.planchers['Légendaire'];
    const vente = (await b.db.query<{ r: { enchere: { id: number } } }>('select public.mettre_en_vente($1, $2, $3, $3, 12) r', [legendaire.id, legendaire.finition, prix])).rows[0].r.enchere.id;
    await b.joueur(1);
    await b.db.query('select public.encherir($1, $2)', [vente, prix]);
    await b.admin();
    assert.equal((await b.db.query('select 1 from public.possessions where utilisateur = $1 and carte = $2', [b.ids[1], legendaire.id])).rows.length, 1);
    assert.deepEqual(await fil(), apresLePaquet, 'l’achat ne fait pas de bruit');
  } finally { await b.db.close(); }
});

it('une équipe dissoute emporte sa cote 2v2, et seulement elle', async () => {
  const b = await baseDeTest(true);
  try {
    await b.db.exec(direct());
    const equipe = randomUUID();
    const autre = randomUUID();
    await b.db.query("insert into public.equipes(id, nom, nom_cle, embleme) values ($1, 'Les Plumes', 'lesplumes', 'plume'), ($2, 'Les Lunes', 'leslunes', 'lune')", [equipe, autre]);
    await b.db.query("insert into public.direct_cotes(mode, sujet, cote) values ('duo_equipe', $1, 1100), ('duo_equipe', $2, 1050), ('duo_solo', $1, 990)", [equipe, autre]);
    await b.db.query('delete from public.equipes where id = $1', [equipe]);
    const reste = (await b.db.query<{ mode: string; sujet: string }>('select mode, sujet from public.direct_cotes order by mode, sujet')).rows;
    assert.deepEqual(reste.map((r) => [r.mode, r.sujet]), [['duo_equipe', autre], ['duo_solo', equipe]]);
  } finally { await b.db.close(); }
});
