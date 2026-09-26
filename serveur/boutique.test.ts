// La boutique de l'Encre (décision de Raphaël du 26/09/2026, script 25) : des cosmétiques payés avec l'Encre gagnée en
// jouant, et un Hors-série au choix parmi ceux qui manquent à l'album. L'Encre achetée n'y sert jamais.

import { it } from 'node:test';
import assert from 'node:assert/strict';
import { baseDeTest } from './test-base.ts';
import { migrationBoutique } from './fabriquer-le-script.ts';
import { PRIX_DU_HORS_SERIE } from './boutique.ts';
import { ARTICLES_DE_LA_BOUTIQUE } from '../src/jeu/personnalisation.ts';

type Etat = { encre: number; achatsPersonnalisation: string[]; cartes: Record<string, { finitions: Record<string, number> }>; formule: { encreAchetee: number } };
const DEMANDE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const AUTRE_DEMANDE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

async function laboratoire() {
  const b = await baseDeTest();
  await b.db.exec("insert into public.cartes values ('amour-nom','Hors-série','{}'), ('hapax-nom','Hors-série','{}');");
  const rpc = async <T = unknown>(nom: string, args: unknown[] = []) => (await b.db.query<{ r: T }>(`select public.${nom}(${args.map((_, i) => `$${i + 1}`).join(',')}) r`, args)).rows[0].r;
  const acheter = (article: string) => rpc<Etat>('acheter_a_la_boutique', [article]);
  const commander = (carte: string, demande: string | null = null) => rpc<{ carte: string; etat: Etat }>('commander_un_hors_serie', [carte, demande]);
  const donnerDeLEncre = async (i: number, encre: number, achetee = 100) => {
    await b.admin();
    await b.db.query('update public.comptes set encre = $2, encre_achetee = $3 where utilisateur = $1', [b.ids[i], encre, achetee]);
    await b.joueur(i);
  };
  const achatsNotes = async () => { await b.admin(); const n = (await b.db.query<{ n: number }>('select count(*)::integer n from public.achats_boutique')).rows[0].n; return n; };
  return { ...b, rpc, acheter, commander, donnerDeLEncre, achatsNotes };
}

it('boutique : une pièce s’achète une fois, avec l’Encre gagnée, et rejoint les achats du compte', async () => {
  const l = await laboratoire();
  try {
    await l.donnerDeLEncre(0, 20_000);
    const etat = await l.acheter('pieuvre');
    assert.equal(etat.encre, 12_000);
    assert.deepEqual(etat.achatsPersonnalisation, ['pieuvre']);
    assert.equal(etat.formule.encreAchetee, 100, 'l’Encre achetée ne sert pas à la boutique');
    const encore = await l.acheter('pieuvre');
    assert.equal(encore.encre, 12_000, 'un second clic ne débite rien');
    assert.deepEqual(encore.achatsPersonnalisation, ['pieuvre']);
    assert.equal(await l.achatsNotes(), 1);
    await l.joueur(1);
    assert.deepEqual((await l.rpc<Etat>('mon_compte')).achatsPersonnalisation, [], 'les achats d’un joueur ne touchent pas les autres');
  } finally { await l.db.close(); }
});

it('boutique : chaque pièce du catalogue du jeu est vendue au prix affiché', async () => {
  const l = await laboratoire();
  try {
    const total = ARTICLES_DE_LA_BOUTIQUE.reduce((s, a) => s + a.prix, 0);
    await l.donnerDeLEncre(0, total);
    let encre = total;
    for (const article of ARTICLES_DE_LA_BOUTIQUE) {
      const etat = await l.acheter(article.id);
      encre -= article.prix;
      assert.equal(etat.encre, encre, article.id);
      assert.ok(etat.achatsPersonnalisation.includes(article.id), article.id);
    }
    assert.equal(encre, 0);
    assert.equal(await l.achatsNotes(), ARTICLES_DE_LA_BOUTIQUE.length);
  } finally { await l.db.close(); }
});

it('boutique : refuse ce qui ne se vend pas, l’Encre qui manque, et les inconnus, sans rien débiter', async () => {
  const l = await laboratoire();
  try {
    await l.donnerDeLEncre(0, 7_999, 1_000_000);
    for (const article of ['boussole', 'astral', 'titre-premier-pas', 'original', '', 'inconnu']) {
      await assert.rejects(l.acheter(article), /ne se vend pas à la boutique/, article);
    }
    await assert.rejects(l.acheter('pieuvre'), /Il te manque 1 Encre/, 'l’Encre achetée ne compte pas');
    assert.equal((await l.rpc<Etat>('mon_compte')).encre, 7_999);
    assert.equal(await l.achatsNotes(), 0);
    await l.admin();
    await l.db.query('insert into auth.users values ($1)', ['44444444-4444-4444-8444-444444444444']);
    await l.db.query("select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false)");
    await l.db.exec('set role authenticated');
    await assert.rejects(l.acheter('pieuvre'), /Ouvre d'abord ton compte/);
    await l.admin(); await l.db.exec('set role anon');
    await assert.rejects(l.acheter('pieuvre'), /permission denied/);
    await assert.rejects(l.commander('amour-nom'), /permission denied/);
    await l.admin(); await l.db.exec('set role authenticated');
    await assert.rejects(l.db.query('select * from public.achats_boutique'), /permission denied/);
  } finally { await l.db.close(); }
});

it('hors-série : un seul au choix, qui manque à l’album, servi une fois même si la commande est relancée', async () => {
  const l = await laboratoire();
  try {
    await l.donnerDeLEncre(0, PRIX_DU_HORS_SERIE + 500);
    const commande = await l.commander('amour-nom', DEMANDE);
    assert.equal(commande.carte, 'amour-nom');
    assert.equal(commande.etat.encre, 500);
    assert.deepEqual(commande.etat.cartes['amour-nom'].finitions, { Normale: 1 });
    const relancee = await l.commander('amour-nom', DEMANDE);
    assert.equal(relancee.etat.encre, 500, 'la même demande n’est pas servie deux fois');
    assert.equal(relancee.carte, 'amour-nom');
    await l.donnerDeLEncre(0, PRIX_DU_HORS_SERIE * 2);
    await assert.rejects(l.commander('amour-nom', AUTRE_DEMANDE), /déjà dans ton album/);
    await assert.rejects(l.commander('mot-nom'), /n'est pas un Hors-série/);
    await assert.rejects(l.commander('inconnu-nom'), /n'est pas un Hors-série/);
    assert.equal((await l.rpc<Etat>('mon_compte')).encre, PRIX_DU_HORS_SERIE * 2, 'un refus ne débite rien');
    assert.equal(await l.achatsNotes(), 1);
  } finally { await l.db.close(); }
});

it('hors-série : l’Encre achetée ne compte pas, et un timbre vendu peut se recommander', async () => {
  const l = await laboratoire();
  try {
    await l.donnerDeLEncre(0, PRIX_DU_HORS_SERIE - 1, PRIX_DU_HORS_SERIE);
    await assert.rejects(l.commander('hapax-nom'), /Il te manque 1 Encre pour ce Hors-série/);
    await l.admin();
    await l.db.query(`insert into public.possessions (utilisateur, carte, finitions) values ($1, 'hapax-nom', '{"Normale": 0}')`, [l.ids[0]]);
    await l.donnerDeLEncre(0, PRIX_DU_HORS_SERIE);
    const etat = (await l.commander('hapax-nom')).etat;
    assert.equal(etat.encre, 0);
    assert.deepEqual(etat.cartes['hapax-nom'].finitions, { Normale: 1 });
  } finally { await l.db.close(); }
});

it('la migration 25 s’applique deux fois sur une base existante, sans perdre les achats', async () => {
  const l = await laboratoire();
  try {
    await l.donnerDeLEncre(0, 10_000);
    await l.acheter('prusse');
    await l.admin();
    await l.db.exec(migrationBoutique());
    await l.db.exec(migrationBoutique());
    assert.equal(await l.achatsNotes(), 1);
    await l.joueur(0);
    const etat = await l.acheter('absinthe');
    assert.deepEqual(etat.achatsPersonnalisation, ['prusse', 'absinthe']);
    assert.equal(etat.encre, 6_000);
  } finally { await l.db.close(); }
});
