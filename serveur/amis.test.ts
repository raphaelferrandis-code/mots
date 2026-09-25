import { it } from 'node:test';
import assert from 'node:assert/strict';
import { baseDeTest } from './test-base.ts';
import { migrationAmis } from './fabriquer-le-script.ts';
import type { CarnetAmis } from '../src/services/amis.ts';

async function laboratoire() {
  const b = await baseDeTest(true);
  const profils = (await b.db.query<{ id: string }>('select id from public.profils order by pseudo')).rows.map(p => p.id);
  await b.db.exec("insert into public.cartes values('autre-nom','Rare','{}')");
  await b.db.query(`insert into public.possessions(utilisateur,carte,finitions) values
    ($1,'mot-nom','{"Normale":1}'),($2,'autre-nom','{"Brillante":1}')`, [b.ids[0], b.ids[1]]);
  const rpc = async <T>(nom: string, args: unknown[] = []) => (await b.db.query<{ r: T }>(`select public.${nom}(${args.map((_, i) => `$${i + 1}`).join(',')}) r`, args)).rows[0].r;
  const lier = async () => { await b.joueur(0); await rpc('demander_ami', ['lecteur1']); await b.joueur(1); await rpc('repondre_ami', [profils[0], 'accepter']); };
  const proposer = async (id = crypto.randomUUID()) => { await b.joueur(0); await rpc('proposer_echange', [id, profils[1], 'mot-nom', 'Normale', 'autre-nom', 'Brillante']); return id; };
  return { ...b, profils, rpc, lier, proposer };
}

it('les demandes sont réciproques, privées et seul le destinataire peut accepter', async () => {
  const l = await laboratoire();
  try {
    await l.joueur(0);
    await assert.rejects(l.rpc('demander_ami', ['lecteur0']), /le tien/);
    await assert.rejects(l.rpc('demander_ami', ['inconnu']), /Aucun joueur/);
    await assert.rejects(l.rpc('album_ami', [l.profils[1]]), /amis/);
    await l.rpc('demander_ami', ['LECTEUR 1']);
    await assert.rejects(l.rpc('repondre_ami', [l.profils[1], 'accepter']), /pas permise/);
    assert.equal((await l.rpc<CarnetAmis>('mes_amis')).relations[0].etat, 'envoyee');
    await l.joueur(2);
    assert.deepEqual((await l.rpc<CarnetAmis>('mes_amis')).relations, []);
    await assert.rejects(l.db.query('select * from public.amities'), /permission denied/);
    await assert.rejects(l.rpc('repondre_ami', [l.profils[0], 'accepter']), /existe plus/);
    await l.joueur(1);
    await assert.rejects(l.rpc('demander_ami', ['lecteur0']), /en attente/);
    assert.equal((await l.rpc<CarnetAmis>('mes_amis')).relations[0].etat, 'recue');
    await l.rpc('repondre_ami', [l.profils[0], 'accepter']);
    await l.rpc('repondre_ami', [l.profils[0], 'accepter']);
    assert.deepEqual(await l.rpc('album_ami', [l.profils[0]]), [{ carte: 'mot-nom', finitions: { Normale: 1 } }]);
    await l.admin(); await l.db.exec('set role anon');
    await assert.rejects(l.rpc('mes_amis'), /permission denied/);
    await assert.rejects(l.rpc('demander_ami', ['lecteur0']), /permission denied/);
  } finally { await l.db.close(); }
});

it('un échange transfère les deux timbres une seule fois, nettoie les decks et conserve les apprentissages', async () => {
  const l = await laboratoire();
  try {
    await l.lier();
    await l.admin();
    await l.db.query(`update public.comptes set deck='["mot-nom"]' where utilisateur=$1`, [l.ids[0]]);
    await l.db.query(`update public.profils set deck='["mot-nom"]' where utilisateur=$1`, [l.ids[0]]);
    await l.db.query(`insert into public.apprentissages(utilisateur,carte,posees,reussites,maitrisee_le) values($1,'mot-nom',5,5,now())`, [l.ids[0]]);
    const id = await l.proposer();
    await l.proposer(id);
    assert.equal((await l.rpc<CarnetAmis>('mes_amis')).echanges.length, 1);
    await assert.rejects(l.rpc('repondre_echange', [id, 'accepter']), /pas permise/);
    await l.joueur(2);
    await assert.rejects(l.rpc('repondre_echange', [id, 'accepter']), /introuvable/);
    await assert.rejects(l.rpc('prelever_echange', [l.ids[0], 'mot-nom', 'Normale']), /permission denied/);
    await assert.rejects(l.db.query('select * from public.echanges'), /permission denied/);
    await l.joueur(1);
    await l.rpc('repondre_echange', [id, 'accepter']);
    await l.rpc('repondre_echange', [id, 'accepter']);
    await l.admin();
    const possessions = (await l.db.query('select utilisateur,carte,finitions from public.possessions order by utilisateur')).rows;
    assert.deepEqual(possessions, [
      { utilisateur: l.ids[0], carte: 'autre-nom', finitions: { Brillante: 1 } },
      { utilisateur: l.ids[1], carte: 'mot-nom', finitions: { Normale: 1 } },
    ]);
    assert.deepEqual((await l.db.query('select deck,encre,encre_achetee from public.comptes where utilisateur=$1', [l.ids[0]])).rows[0], { deck: [], encre: 200, encre_achetee: 100 });
    assert.deepEqual((await l.db.query('select deck from public.profils where utilisateur=$1', [l.ids[0]])).rows[0], { deck: [] });
    assert.equal((await l.db.query<{ reussites: number }>('select reussites from public.apprentissages where utilisateur=$1', [l.ids[0]])).rows[0].reussites, 5);
    await l.db.exec(migrationAmis()); await l.db.exec(migrationAmis());
    assert.deepEqual((await l.db.query('select utilisateur,carte,finitions from public.possessions order by utilisateur')).rows, possessions);
  } finally { await l.db.close(); }
});

it('la vente d’un timbre proposé provoque un refus atomique, sans perte de l’autre timbre', async () => {
  const l = await laboratoire();
  try {
    await l.lier(); const id = await l.proposer();
    await l.joueur(1);
    await l.rpc('mettre_en_vente', ['autre-nom', 'Brillante', 1000, null, 12]);
    await assert.rejects(l.rpc('repondre_echange', [id, 'accepter']), /plus disponible/);
    await l.admin();
    assert.deepEqual((await l.db.query('select finitions from public.possessions where utilisateur=$1', [l.ids[0]])).rows[0], { finitions: { Normale: 1 } });
    assert.equal((await l.db.query<{ etat: string }>('select etat from public.echanges where id=$1', [id])).rows[0].etat, 'attente');
  } finally { await l.db.close(); }
});

it('expiration, refus, annulation et retrait d’un ami interdisent tout transfert ultérieur', async () => {
  const l = await laboratoire();
  try {
    await l.lier(); let id = await l.proposer();
    await l.admin(); await l.db.query("update public.echanges set expire_le=now()-interval '1 second' where id=$1", [id]);
    await l.joueur(1);
    assert.equal((await l.rpc<CarnetAmis>('mes_amis')).echanges[0].etat, 'expire');
    await assert.rejects(l.rpc('repondre_echange', [id, 'accepter']), /expiré/);
    id = await l.proposer(); await l.joueur(1); await l.rpc('repondre_echange', [id, 'refuser']);
    await assert.rejects(l.rpc('repondre_echange', [id, 'accepter']), /terminé/);
    id = await l.proposer(); await l.rpc('repondre_echange', [id, 'annuler']);
    await l.joueur(1); await assert.rejects(l.rpc('repondre_echange', [id, 'accepter']), /terminé/);
    id = await l.proposer(); await l.rpc('repondre_ami', [l.profils[1], 'retirer']);
    await l.joueur(1); await assert.rejects(l.rpc('repondre_echange', [id, 'accepter']), /terminé/);
    await assert.rejects(l.rpc('album_ami', [l.profils[0]]), /amis/);
  } finally { await l.db.close(); }
});

it('récupérer un compte conserve les amis et propositions ; supprimer son profil les efface', async () => {
  const l = await laboratoire();
  try {
    await l.lier(); const id = await l.proposer();
    await l.rpc('definir_un_code_de_secours', ['ABCDEFGHJKMNPQRSTUVW']);
    await l.joueur(2); await l.rpc('recuperer_par_code', ['ABCDEFGHJKMNPQRSTUVW']);
    const carnet = await l.rpc<CarnetAmis>('mes_amis');
    assert.equal(carnet.moi!.id, l.profils[0]); assert.equal(carnet.relations[0].etat, 'ami');
    assert.equal(carnet.echanges[0].id, id);
    await l.joueur(1); await l.rpc('repondre_echange', [id, 'accepter']);
    await l.admin();
    assert.equal((await l.db.query<{ carte: string }>('select carte from public.possessions where utilisateur=$1', [l.ids[2]])).rows[0].carte, 'autre-nom');
    await l.joueur(2); await l.rpc('supprimer_mon_profil');
    await l.joueur(1);
    assert.deepEqual((await l.rpc<CarnetAmis>('mes_amis')).relations, []);
    assert.deepEqual((await l.rpc<CarnetAmis>('mes_amis')).echanges, []);
  } finally { await l.db.close(); }
});

it('un compte neuf ne fait passer aucun timbre ni aucune Encre : ni échange, ni vente, ni enchère', async () => {
  const l = await laboratoire();
  const neuf = async (i: number, oui: boolean) => { await l.admin(); await l.db.query(`update public.comptes set cree_le=now()-interval '${oui ? 1 : 30} days' where utilisateur=$1`, [l.ids[i]]); };
  try {
    await l.lier();
    // Proposer : ni le joueur neuf, ni à un joueur neuf.
    await neuf(1, true);
    await assert.rejects(l.proposer(), /Ce joueur vient d'arriver : les échanges avec lui s'ouvrent le \d\d\/\d\d à \d\d:\d\d\./);
    await neuf(1, false); await neuf(0, true);
    await assert.rejects(l.proposer(), /Les échanges et le marché s'ouvrent 3 jours après ton arrivée : le \d\d\/\d\d/);
    // Accepter une proposition faite avant : même règle.
    await neuf(0, false);
    const id = await l.proposer();
    await neuf(1, true);
    await l.joueur(1);
    await assert.rejects(l.rpc('repondre_echange', [id, 'accepter']), /3 jours après ton arrivée/);
    await l.rpc('repondre_echange', [id, 'refuser']); // refuser reste possible
    // Le marché : un compte neuf ne vend pas et n'enchérit pas.
    await neuf(0, true);
    await assert.rejects(l.vendre(), /3 jours après ton arrivée/);
    await neuf(0, false);
    const vente = await l.vendre();
    await l.joueur(1);
    await assert.rejects(l.rpc('encherir', [vente, 100]), /3 jours après ton arrivée/);
    await neuf(1, false);
    await l.joueur(1);
    await l.rpc('encherir', [vente, 100]);
    await assert.rejects(l.rpc('exiger_un_compte_etabli', [l.ids[0], true]), /permission denied/);
  } finally { await l.db.close(); }
});
