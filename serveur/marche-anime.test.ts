// Les joueurs simulés au marché (décision de Raphaël du 28/09/2026, dosage « équilibré ») : leurs ventes, leur retrait,
// l'achat d'un de leurs timbres, le rachat d'une vente restée sans mise, la cote qui les ignore. Base PGlite.

import { it } from 'node:test';
import assert from 'node:assert/strict';
import { EQUILIBRAGE } from '../src/config/equilibrage.ts';
import { baseDeTest } from './test-base.ts';

const M = EQUILIBRAGE.marche;
const S = M.simules;
const MAISON = ['aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000003'];

async function avecDesJoueursSimules() {
  const b = await baseDeTest();
  await b.admin();
  for (const [i, id] of MAISON.entries()) await b.db.query("insert into public.profils(id, maison, pseudo, pseudo_cle) values ($1, true, $2, $2)", [id, `Simule${i}`]);
  await b.db.exec(`insert into public.cartes(id, rarete) values ('c2-nom','Commune'),('p1-nom','Peu commune'),('r1-nom','Rare'),('e1-nom','Épique'),('l1-nom','Légendaire'),('h1-nom','Hors-série');`);
  return b;
}
type Ligne = { id: number; carte: string; rarete: string; simulee: boolean; vendeur: string | null; vendeur_maison: string | null; mise_de_depart: number; achat_immediat: number; etat: string };
const simulees = (b: Awaited<ReturnType<typeof baseDeTest>>) => b.db.query<Ligne>(
  "select e.*, k.rarete from public.encheres e join public.cartes k on k.id = e.carte where e.simulee and e.etat = 'ouverte' order by e.id").then((r) => r.rows);

it('les joueurs simulés tiennent leurs ventes ouvertes, aux prix prévus, et le marché le dit', async () => {
  const b = await avecDesJoueursSimules();
  try {
    await b.joueur(1);
    const page = (await b.db.query<{ r: { encheres: { vendeur: string; vendeurSimule: boolean; mienne: boolean | null }[]; animation: boolean } }>("select public.marche('', 0) r")).rows[0].r;
    assert.equal(page.animation, true);
    await b.admin();
    const ventes = await simulees(b);
    assert.equal(ventes.length, S.ventesEnCours);
    for (const v of ventes) {
      assert.equal(v.vendeur, null);
      assert.ok(MAISON.includes(v.vendeur_maison ?? ''), 'un joueur maison');
      assert.ok(Object.keys(S.raretes).includes(v.rarete), `rareté permise : ${v.rarete}`);
      const plancher = M.planchers[v.rarete as keyof typeof M.planchers];
      assert.equal(v.mise_de_depart, Math.ceil(plancher * S.miseDeDepart));
      assert.equal(v.achat_immediat, Math.ceil(plancher * S.achatImmediat));
    }
    assert.ok(page.encheres.every((e) => e.vendeurSimule && /^Simule\d$/.test(e.vendeur) && !e.mienne), 'le marché les montre, au nom du joueur maison');
    // Pas de seconde fournée tant que les leurs sont ouvertes.
    await b.joueur(2);
    await b.db.query("select public.marche('', 0)");
    await b.admin();
    assert.equal((await simulees(b)).length, S.ventesEnCours);
  } finally { await b.db.close(); }
});

it('ils se retirent quand les vrais joueurs vendent assez, ou quand il n’y a plus de joueur maison', async () => {
  const b = await avecDesJoueursSimules();
  try {
    await b.db.query(`insert into public.encheres(vendeur, carte, finition, obtenue_le, mise_de_depart, ferme_le)
      select $1, 'mot-nom', 'Normale', now(), 10, now() + interval '1 day' from generate_series(1, ${S.retraitDes})`, [b.ids[0]]);
    await b.joueur(1);
    await b.db.query("select public.mes_encheres()");
    await b.admin();
    assert.equal((await simulees(b)).length, 0, 'marché assez vivant : pas de vente simulée');
    await b.db.exec("delete from public.encheres; delete from public.profils where maison;");
    await b.joueur(1);
    await b.db.query("select public.mes_encheres()");
    await b.admin();
    assert.equal((await simulees(b)).length, 0, 'sans joueur maison : rien');
  } finally { await b.db.close(); }
});

it('un timbre acheté à un joueur simulé est neuf : l’Encre de l’acheteur disparaît, et la cote l’ignore', async () => {
  const b = await avecDesJoueursSimules();
  try {
    await b.joueur(1);
    await b.db.query("select public.marche('', 0)");
    await b.admin();
    const [v] = await simulees(b);
    await b.db.query('update public.comptes set encre = 10000, encre_achetee = 0 where utilisateur = $1', [b.ids[1]]);
    const encreAvant = (await b.db.query<{ total: number }>('select sum(encre + encre_achetee)::integer total from public.comptes')).rows[0].total;
    await b.joueur(1);
    await b.db.query('select public.encherir($1, $2)', [v.id, v.achat_immediat]);
    await b.admin();
    const fin = (await b.db.query<{ etat: string; acheteur: string; prix_final: number }>('select etat, acheteur, prix_final from public.encheres where id = $1', [v.id])).rows[0];
    assert.deepEqual(fin, { etat: 'vendue', acheteur: b.ids[1], prix_final: v.achat_immediat });
    const possession = (await b.db.query<{ provenance: string }>('select provenance from public.possessions where utilisateur = $1 and carte = $2', [b.ids[1], v.carte])).rows[0];
    assert.match(possession.provenance, /^Simule\d$/, 'le cachet de provenance : le joueur maison');
    const encreApres = (await b.db.query<{ total: number }>('select sum(encre + encre_achetee)::integer total from public.comptes')).rows[0].total;
    assert.equal(encreApres, encreAvant - v.achat_immediat, 'personne ne reçoit l’Encre : elle disparaît');
    await b.db.exec('delete from public.cotes_calculees; select public.calculer_les_cotes();');
    assert.equal((await b.db.query('select 1 from public.cotes where carte = $1', [v.carte])).rows.length, 0, 'pas de cote');
  } finally { await b.db.close(); }
});

it('une vente restée sans mise est rachetée une fois par jour, à un prix raisonnable ; sinon le timbre revient', async () => {
  const b = await avecDesJoueursSimules();
  try {
    const plancher = M.planchers.Commune;
    const echoir = async (id: number) => { await b.admin(); await b.db.query("update public.encheres set ferme_le = now() - interval '1 second' where id = $1", [id]); await b.joueur(2); await b.db.query('select public.mes_encheres()'); await b.admin(); };
    const etat = async (id: number) => (await b.admin(), await b.db.query<{ etat: string; acheteur_maison: string | null; prix_final: number | null }>('select etat, acheteur_maison, prix_final from public.encheres where id = $1', [id])).rows[0];
    const encre = async () => { await b.admin(); return (await b.db.query<{ encre: number }>('select encre from public.comptes where utilisateur = $1', [b.ids[0]])).rows[0].encre; };
    const album = async () => { await b.admin(); return (await b.db.query('select 1 from public.possessions where utilisateur = $1 and carte = $2', [b.ids[0], 'mot-nom'])).rows.length; };

    const prix = plancher * S.rachatJusqua;
    const premiere = await b.vendre(prix);
    const avant = await encre();
    await echoir(premiere);
    const rachat = await etat(premiere);
    assert.equal(rachat.etat, 'vendue');
    assert.ok(MAISON.includes(rachat.acheteur_maison ?? ''), 'racheté par un joueur maison');
    assert.equal(await encre(), avant + prix - Math.ceil(prix * M.commission), 'le prix, moins la commission');
    assert.equal(await album(), 0, 'le timbre racheté quitte le jeu');
    await b.joueur(0);
    const miennes = (await b.db.query<{ r: { ventes: { id: number; acheteur: string; acheteurSimule: boolean }[] } }>('select public.mes_encheres() r')).rows[0].r;
    const vue = miennes.ventes.find((x) => x.id === premiere);
    assert.ok(vue?.acheteurSimule && /^Simule\d$/.test(vue.acheteur), 'le vendeur voit le nom du joueur maison');

    const seconde = await b.vendre(prix);
    await echoir(seconde);
    assert.equal((await etat(seconde)).etat, 'invendue', `${S.rachatsParJour} rachat par jour et par vendeur`);
    assert.equal(await album(), 1, 'le timbre est revenu');

    await b.db.exec("delete from public.encheres where acheteur_maison is not null");
    const chere = await b.vendre(prix + 1);
    await echoir(chere);
    assert.equal((await etat(chere)).etat, 'invendue', 'trop cher pour un rachat');
  } finally { await b.db.close(); }
});

it('un compte neuf apprend quand le marché s’ouvre pour lui', async () => {
  const b = await avecDesJoueursSimules();
  try {
    await b.db.query("update public.comptes set cree_le = now() - interval '1 day' where utilisateur = $1", [b.ids[2]]);
    await b.joueur(2);
    const neuf = (await b.db.query<{ r: { ouvertLe: number | null } }>('select public.mes_encheres() r')).rows[0].r;
    const attendu = Date.now() + (EQUILIBRAGE.comptesNeufs.joursAvantLesEchanges - 1) * 86_400_000;
    assert.ok(neuf.ouvertLe !== null && Math.abs(neuf.ouvertLe - attendu) < 60_000, 'trois jours après son arrivée');
    await b.joueur(1);
    assert.equal((await b.db.query<{ r: { ouvertLe: number | null } }>('select public.mes_encheres() r')).rows[0].r.ouvertLe, null, 'déjà ouvert');
  } finally { await b.db.close(); }
});

it('effacer un joueur en tête d’une vente simulée ne casse rien : la vente est close', async () => {
  const b = await avecDesJoueursSimules();
  try {
    await b.joueur(1);
    await b.db.query("select public.marche('', 0)");
    await b.admin();
    const [v] = await simulees(b);
    await b.db.query('update public.comptes set encre = 10000 where utilisateur = $1', [b.ids[1]]);
    await b.joueur(1);
    await b.db.query('select public.encherir($1, $2)', [v.id, v.mise_de_depart]);
    await b.admin();
    await b.db.query('delete from auth.users where id = $1', [b.ids[1]]);
    assert.equal((await b.db.query<{ etat: string }>('select etat from public.encheres where id = $1', [v.id])).rows[0].etat, 'invendue');
  } finally { await b.db.close(); }
});
