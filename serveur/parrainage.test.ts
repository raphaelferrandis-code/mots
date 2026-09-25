// Le parrainage et l'adversaire de secours, sur une vraie base PostgreSQL (PGlite) : les garde-fous contre les faux
// comptes, le premier duel vérifié qui déclenche la récompense, la réserve qui ne déborde jamais, les droits.

import { it } from 'node:test';
import assert from 'node:assert/strict';
import { baseDeTest } from './test-base.ts';
import { parrainage, ALPHABET_DU_CODE, LONGUEUR_DU_CODE, PLAFOND_DES_PAQUETS_OFFERTS } from './parrainage.ts';
import { secours } from './secours.ts';
import { migrationParrainageConfirme, migrationSecoursEtParrainage } from './fabriquer-le-script.ts';
import { EQUILIBRAGE } from '../src/config/equilibrage.ts';

const PA = EQUILIBRAGE.parrainage;
const NOUVEAU = '44444444-4444-4444-8444-444444444444';
const AUTRE = '55555555-5555-4555-8555-555555555555';

type Parrainage = {
  code: string; paquets: number; confirmation: boolean; invites: number; valides: number; recompenses: number; aConfirmer: number;
  nouveaux: (string | null)[]; enAttente: number;
  parrain: { pseudo: string | null; valide: boolean; verse: boolean; verseMaintenant: boolean;
    confirme: boolean; manqueCompte: boolean; manqueJour: boolean; echu: boolean } | null;
  etat: { paquets: { stock: number } } | null;
};

async function laboratoire() {
  const b = await baseDeTest(true);
  await b.db.exec(secours() + parrainage());
  // Deux nouveaux venus, sans profil ni compte relié (invités) : ils arrivent par un lien d'invitation.
  for (const id of [NOUVEAU, AUTRE]) {
    await b.db.query('insert into auth.users(id,is_anonymous) values ($1,true)', [id]);
    await b.db.query('insert into public.comptes(utilisateur) values ($1)', [id]);
  }
  const ids = [...b.ids, NOUVEAU, AUTRE];
  const en = async (i: number) => {
    await b.admin();
    await b.db.query("select set_config('request.jwt.claim.sub',$1,false)", [ids[i]]);
    await b.db.exec('set role authenticated;');
  };
  const rpc = async <T>(i: number, sql: string, valeurs: unknown[] = []): Promise<T> => {
    await en(i);
    return (await b.db.query<{ r: T }>(`select ${sql} r`, valeurs)).rows[0].r;
  };
  const monParrainage = (i: number) => rpc<Parrainage>(i, 'public.mon_parrainage()');
  const declarer = (i: number, code: string) => rpc<{ accepte: boolean; raison?: string; pseudo?: string | null }>(i, 'public.declarer_mon_parrain($1)', [code]);
  const stock = async (i: number) => { await b.admin(); return (await b.db.query<{ stock: number }>('select stock from public.comptes where utilisateur=$1', [ids[i]])).rows[0].stock; };
  // Un combat vérifié qui se termine : c'est le serveur des combats qui passe « termine » à vrai.
  const terminerUnCombat = async (i: number, abandonne = false) => {
    await b.admin();
    const id = crypto.randomUUID();
    await b.db.query("insert into public.combats(id,utilisateur,etat,vue) values ($1,$2,'{}','{}')", [id, ids[i]]);
    await b.db.query('update public.combats set termine=true, etat=$2 where id=$1', [id, JSON.stringify({ termine: true, abandonne })]);
    await b.db.query('update public.combats set archive=true where id=$1', [id]); // comme combat_creer au combat suivant
    await b.db.query('update public.comptes set combats_joues=combats_joues+1 where utilisateur=$1', [ids[i]]);
  };
  // Le filleul relie un compte Google ou e-mail (ou redevient un simple invité).
  const relierUnCompte = async (i: number, relie = true) => { await b.admin(); await b.db.query('update auth.users set is_anonymous=$2 where id=$1', [ids[i], !relie]); };
  // Le lendemain : son premier duel recule d'un jour, et il en termine un autre.
  const revenirLeLendemain = async (i: number) => {
    await b.admin(); await b.db.query("update public.parrainages set valide_le=valide_le-interval '1 day' where filleul=$1", [ids[i]]);
    await terminerUnCombat(i);
  };
  const confirmer = async (i: number) => { await relierUnCompte(i); await revenirLeLendemain(i); };
  return { ...b, ids, en, rpc, monParrainage, declarer, stock, terminerUnCombat, relierUnCompte, revenirLeLendemain, confirmer };
}

it('donne à chaque joueur un code d’invitation stable et lisible', async () => {
  const l = await laboratoire();
  try {
    const premier = await l.monParrainage(0);
    assert.equal(premier.code.length, LONGUEUR_DU_CODE);
    assert.ok([...premier.code].every(c => ALPHABET_DU_CODE.includes(c)));
    assert.equal((await l.monParrainage(0)).code, premier.code);
    assert.notEqual((await l.monParrainage(1)).code, premier.code);
    assert.deepEqual({ ...premier, code: '' }, { code: '', paquets: PA.paquetsOfferts, confirmation: true, invites: 0, valides: 0, recompenses: 0, aConfirmer: 0, nouveaux: [], enAttente: 0, parrain: null, etat: null });
  } finally { await l.db.close(); }
});

it('n’accepte que les vrais nouveaux venus, une seule fois, sans boucle', async () => {
  const l = await laboratoire();
  try {
    const { code } = await l.monParrainage(0);
    assert.deepEqual(await l.declarer(3, 'INCONNU1'), { accepte: false, raison: 'Ce lien d\'invitation n\'est pas valable.' });
    await l.admin(); await l.db.query('update public.comptes set cree_le=now() where utilisateur=$1', [l.ids[0]]);
    assert.match((await l.declarer(0, code)).raison!, /propre lien/);
    // Un compte de plus de sept jours n'est plus un nouveau venu.
    await l.admin(); await l.db.query("update public.comptes set cree_le=now()-interval '8 days' where utilisateur=$1", [l.ids[4]]);
    assert.match((await l.declarer(4, code)).raison!, /nouveaux joueurs/);
    await l.admin(); await l.db.query('update public.comptes set cree_le=now() where utilisateur=$1', [l.ids[4]]);
    // Le code se recopie en minuscules ou avec des tirets.
    const accepte = await l.declarer(3, `${code.slice(0, 4).toLowerCase()}-${code.slice(4)}`);
    assert.deepEqual(accepte, { accepte: true, pseudo: 'lecteur0' });
    assert.match((await l.declarer(3, code)).raison!, /déjà été invité/);
    // Le filleul ne peut pas devenir le parrain de son parrain, ni se parrainer lui-même.
    const codeDuFilleul = (await l.monParrainage(3)).code;
    assert.match((await l.declarer(3, codeDuFilleul)).raison!, /déjà été invité/);
    await l.admin(); await l.db.query('update public.comptes set cree_le=now(), combats_joues=0 where utilisateur=$1', [l.ids[0]]);
    assert.match((await l.declarer(0, codeDuFilleul)).raison!, /l'un l'autre/);
    assert.match((await l.declarer(4, (await l.monParrainage(4)).code)).raison!, /propre lien/);
    // Un joueur qui a déjà terminé un duel n'est plus un nouveau venu.
    await l.terminerUnCombat(4);
    assert.match((await l.declarer(4, code)).raison!, /nouveaux joueurs/);
    assert.equal((await l.monParrainage(0)).invites, 1);
  } finally { await l.db.close(); }
});

it('récompense le filleul dès son premier duel, et le parrain quand le filleul est confirmé', async () => {
  const l = await laboratoire();
  try {
    const { code } = await l.monParrainage(0);
    await l.declarer(3, code);
    const departFilleul = await l.stock(3);
    const departParrain = await l.stock(0);
    const attendu = { pseudo: 'lecteur0', valide: false, verse: false, verseMaintenant: false, confirme: false, manqueCompte: true, manqueJour: true, echu: false };
    assert.deepEqual((await l.monParrainage(3)).parrain, attendu);
    // Un duel abandonné ne compte pas.
    await l.terminerUnCombat(3, true);
    assert.equal(await l.stock(3), departFilleul);
    // Le premier duel : le filleul est récompensé aussitôt, le parrain pas encore.
    await l.terminerUnCombat(3);
    assert.equal(await l.stock(3), departFilleul + PA.paquetsOfferts);
    assert.deepEqual((await l.monParrainage(3)).parrain, { ...attendu, valide: true, verse: true });
    let visite = await l.monParrainage(0);
    assert.deepEqual([visite.invites, visite.valides, visite.recompenses, visite.aConfirmer, visite.nouveaux, visite.enAttente], [1, 1, 0, 1, [], 0]);
    // Un autre duel le même jour ne compte pas pour la confirmation, et ne rapporte rien de plus au filleul.
    await l.terminerUnCombat(3);
    assert.equal(await l.stock(3), departFilleul + PA.paquetsOfferts);
    assert.equal((await l.monParrainage(3)).parrain!.manqueJour, true);
    // Revenu le lendemain, mais toujours simple invité : pas encore confirmé.
    await l.revenirLeLendemain(3);
    assert.deepEqual((await l.monParrainage(3)).parrain, { ...attendu, valide: true, verse: true, manqueJour: false });
    assert.deepEqual((await l.monParrainage(0)).nouveaux, []);
    assert.equal(await l.stock(0), departParrain);
    // Il relie un compte (sans rien jouer de plus) : la visite suivante du parrain le confirme et lui verse ses paquets.
    await l.relierUnCompte(3);
    visite = await l.monParrainage(0);
    assert.deepEqual([visite.recompenses, visite.aConfirmer, visite.nouveaux, visite.enAttente], [1, 0, [null], 0]);
    assert.equal(visite.etat!.paquets.stock, departParrain + PA.paquetsOfferts);
    assert.equal(await l.stock(0), departParrain + PA.paquetsOfferts);
    const suivante = await l.monParrainage(0);
    assert.deepEqual([suivante.nouveaux, suivante.etat], [[], null], 'versé une seule fois');
    assert.deepEqual((await l.monParrainage(3)).parrain, { ...attendu, valide: true, verse: true, manqueJour: false, manqueCompte: false, confirme: true });
    // D'autres duels ne rapportent rien de plus à personne.
    await l.revenirLeLendemain(3);
    assert.equal(await l.stock(3), departFilleul + PA.paquetsOfferts);
    assert.deepEqual((await l.monParrainage(0)).nouveaux, []);
  } finally { await l.db.close(); }
});

it('ne confirme ni un compte jetable, ni un filleul revenu trop tard', async () => {
  const l = await laboratoire();
  try {
    const { code } = await l.monParrainage(0);
    await l.declarer(3, code);
    await l.declarer(4, code);
    // Un compte jetable : il joue deux jours de suite, mais ne relie jamais de compte.
    await l.terminerUnCombat(3);
    await l.revenirLeLendemain(3);
    // Un filleul qui relie un compte, mais revient jouer après le délai.
    await l.terminerUnCombat(4);
    await l.relierUnCompte(4);
    await l.admin(); await l.db.query(`update public.comptes set cree_le=now()-interval '${PA.joursPourRevenirJouer + 1} days' where utilisateur=$1`, [l.ids[4]]);
    await l.revenirLeLendemain(4);
    assert.deepEqual((await l.monParrainage(4)).parrain!.echu, true);
    const visite = await l.monParrainage(0);
    assert.deepEqual([visite.valides, visite.recompenses, visite.aConfirmer, visite.nouveaux], [2, 0, 1, []], 'seul le compte jetable pourrait encore l’être, s’il reliait un compte');
  } finally { await l.db.close(); }
});

it('garde acquis les parrainages validés avant la règle de confirmation, une seule fois', async () => {
  const l = await laboratoire();
  try {
    // Une base d'avant le 25/09 : un filleul validé à son premier duel, parrain récompensé mais pas encore payé.
    await l.admin();
    await l.db.exec('alter table public.parrainages drop column deuxieme_jour_le, drop column confirme_le');
    await l.db.query('insert into public.parrainages(filleul,parrain,valide_le,filleul_verse_le,parrain_du) values ($1,$2,now(),now(),true)', [l.ids[3], l.ids[0]]);
    await l.db.exec(parrainage());
    const premiere = await l.monParrainage(0);
    assert.deepEqual([premiere.valides, premiere.recompenses, premiere.nouveaux], [1, 1, [null]], 'payé à sa visite, comme avant');
    await l.declarer(4, premiere.code);
    await l.terminerUnCombat(4);
    await l.admin(); await l.db.exec(parrainage()); // le script relancé ne confirme pas les nouveaux venus
    const visite = await l.monParrainage(0);
    assert.deepEqual([visite.valides, visite.recompenses, visite.aConfirmer, visite.nouveaux], [2, 1, 1, []]);
  } finally { await l.db.close(); }
});

it('garde les paquets offerts tant que la réserve est pleine, sans perdre ceux gagnés avec le temps', async () => {
  const l = await laboratoire();
  try {
    const { code } = await l.monParrainage(0);
    await l.declarer(3, code);
    await l.admin();
    await l.db.query('update public.comptes set stock=$2, reference=now() where utilisateur=$1', [l.ids[3], PLAFOND_DES_PAQUETS_OFFERTS - 1]);
    await l.db.query('update public.comptes set stock=$2, reference=now() where utilisateur=$1', [l.ids[0], PLAFOND_DES_PAQUETS_OFFERTS]);
    await l.terminerUnCombat(3);
    assert.equal(await l.stock(3), PLAFOND_DES_PAQUETS_OFFERTS - 1, 'pas de place : rien n’est versé');
    assert.equal((await l.monParrainage(3)).enAttente, 1);
    assert.equal((await l.monParrainage(0)).enAttente, 0, 'le filleul n’est pas encore confirmé');
    await l.confirmer(3);
    assert.equal((await l.monParrainage(0)).enAttente, 1);
    // Le filleul ouvre des paquets : la place revient, les paquets offerts arrivent.
    await l.admin(); await l.db.query('update public.comptes set stock=2, reference=now() where utilisateur=$1', [l.ids[3]]);
    const vue = await l.monParrainage(3);
    assert.equal(vue.parrain!.verseMaintenant, true);
    assert.equal(await l.stock(3), 2 + PA.paquetsOfferts);
    // Paquets gagnés avec le temps : 4 paquets de 10 minutes attendaient d'être comptés.
    await l.admin(); await l.db.query("update public.comptes set stock=1, reference=now()-interval '41 minutes' where utilisateur=$1", [l.ids[0]]);
    const visite = await l.monParrainage(0);
    assert.equal(visite.nouveaux.length, 1);
    assert.equal(await l.stock(0), 1 + 4 + PA.paquetsOfferts);
  } finally { await l.db.close(); }
});

it('ne récompense le parrain que pour un nombre limité de filleuls par mois', async () => {
  const l = await laboratoire();
  try {
    const { code } = await l.monParrainage(0);
    await l.admin();
    // Des filleuls déjà confirmés ce mois-ci, jusqu'à la limite.
    for (let i = 0; i < PA.filleulsRecompensesParMois; i++) {
      const id = crypto.randomUUID();
      await l.db.query('insert into auth.users values ($1)', [id]);
      await l.db.query('insert into public.comptes(utilisateur) values ($1)', [id]);
      await l.db.query('insert into public.parrainages(filleul,parrain,valide_le,confirme_le,parrain_du,parrain_verse_le) values ($1,$2,now(),now(),true,now())', [id, l.ids[0]]);
    }
    await l.declarer(3, code);
    await l.terminerUnCombat(3);
    await l.confirmer(3);
    const visite = await l.monParrainage(0);
    assert.deepEqual([visite.valides, visite.recompenses, visite.aConfirmer, visite.nouveaux, visite.enAttente], [PA.filleulsRecompensesParMois + 1, PA.filleulsRecompensesParMois, 0, [], 0]);
    assert.equal((await l.monParrainage(3)).parrain!.verse, true, 'le filleul, lui, est récompensé');
  } finally { await l.db.close(); }
});

it('suit le compte quand un joueur récupère sa collection, et l’oublie quand il le supprime', async () => {
  const l = await laboratoire();
  try {
    const { code } = await l.monParrainage(0);
    await l.declarer(3, code);
    await l.admin();
    // Le parrain retrouve sa collection sur un autre appareil : son identifiant change (recuperer_par_code).
    await l.db.query('delete from public.comptes where utilisateur=$1', [l.ids[4]]);
    await l.db.query('delete from public.profils where utilisateur=$1', [l.ids[0]]);
    await l.db.query('update public.comptes set utilisateur=$2 where utilisateur=$1', [l.ids[0], l.ids[4]]);
    assert.equal((await l.db.query<{ parrain: string | null }>('select parrain from public.parrainages where filleul=$1', [l.ids[3]])).rows[0].parrain, l.ids[4]);
    await l.db.query('delete from public.comptes where utilisateur=$1', [l.ids[4]]);
    assert.equal((await l.db.query<{ parrain: string | null }>('select parrain from public.parrainages where filleul=$1', [l.ids[3]])).rows[0].parrain, null);
    await l.terminerUnCombat(3);
    assert.equal((await l.monParrainage(3)).parrain!.verse, true);
  } finally { await l.db.close(); }
});

it('ferme les tables et les fonctions internes aux joueurs', async () => {
  const l = await laboratoire();
  try {
    await l.en(0);
    await assert.rejects(l.db.query('select * from public.parrainages'), /permission denied/);
    await assert.rejects(l.db.query('select public.valider_le_parrainage($1)', [l.ids[0]]), /permission denied/);
    await assert.rejects(l.db.query('select public.verser_les_paquets_de_parrainage($1)', [l.ids[0]]), /permission denied/);
    await assert.rejects(l.db.query('update public.comptes set code_parrain=$1', ['AAAAAAAA']), /permission denied/);
    await l.admin(); await l.db.exec('set role anon;');
    await assert.rejects(l.db.query('select public.mon_parrainage()'), /permission denied/);
    await assert.rejects(l.db.query("select public.declarer_mon_parrain('X')"), /permission denied/);
  } finally { await l.db.close(); }
});

it('propose des joueurs maison proches de la cote, dont le deck respecte les filtres', async () => {
  const l = await laboratoire();
  try {
    await l.admin();
    await l.db.exec(`insert into public.cartes values ('juron-nom','Commune','{Injurieux}');`);
    const deck = (mot: string) => JSON.stringify(Array.from({ length: 10 }, () => mot));
    const maison = async (pseudo: string, cote: number, contenu: string) => (await l.db.query<{ id: string }>(
      'insert into public.profils(maison,pseudo,pseudo_cle,cote,deck) values(true,$1,$1,$2,$3) returning id', [pseudo, cote, contenu])).rows[0].id;
    const proche = await maison('proche', 1010, deck('mot-nom'));
    const loin = await maison('loin', 1900, deck('mot-nom'));
    await maison('grossier', 1000, deck('juron-nom'));
    await maison('incomplet', 1000, JSON.stringify(['mot-nom']));
    await maison('inconnu', 1000, deck('disparu-nom'));
    const sansFiltre = await l.rpc<{ id: string; pseudo: string; cote: number }[]>(0, 'public.adversaires_de_secours($1)', [[]]);
    assert.deepEqual(new Set(sansFiltre.map(a => a.pseudo)), new Set(['proche', 'loin', 'grossier']));
    const filtre = await l.rpc<{ id: string }[]>(0, 'public.adversaires_de_secours($1)', [['Injurieux']]);
    assert.deepEqual(filtre.map(a => a.id), [proche, loin], 'le plus proche de la cote d’abord');
    await assert.rejects(l.rpc(3, 'public.adversaires_de_secours($1)', [[]]), /pseudonyme/);
  } finally { await l.db.close(); }
});

it('le script 13 s’applique deux fois de suite sans erreur', async () => {
  const b = await baseDeTest(true);
  try {
    await b.db.exec(migrationSecoursEtParrainage());
    await b.db.exec(migrationSecoursEtParrainage());
  } finally { await b.db.close(); }
});

it('le script 16 s’applique après le 13, deux fois de suite sans erreur', async () => {
  const b = await baseDeTest(true);
  try {
    await b.db.exec(migrationSecoursEtParrainage());
    await b.db.exec(migrationParrainageConfirme());
    await b.db.exec(migrationParrainageConfirme());
  } finally { await b.db.close(); }
});
