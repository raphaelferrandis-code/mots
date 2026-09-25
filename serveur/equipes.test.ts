import { it } from 'node:test';
import assert from 'node:assert/strict';
import { baseDeTest } from './test-base.ts';
import { migrationEquipes } from './fabriquer-le-script.ts';
import type { MonEquipe } from '../src/services/equipes.ts';

async function laboratoire() {
  const b = await baseDeTest(true);
  const profils = (await b.db.query<{ id: string }>('select id from public.profils order by pseudo')).rows.map(p => p.id);
  const rpc = async <T = void>(nom: string, args: unknown[] = []) => (await b.db.query<{ r: T }>(`select public.${nom}(${args.map((_, i) => `$${i + 1}`).join(',')}) r`, args)).rows[0].r;
  const lire = () => rpc<MonEquipe>('mon_equipe');
  const lier = async (a = 0, c = 1) => { await b.joueur(a); await rpc('demander_ami', [`lecteur${c}`]); await b.joueur(c); await rpc('repondre_ami', [profils[a], 'accepter']); };
  const creer = async (joueur = 0, nom = 'Les Encriers') => { await b.joueur(joueur); const id = crypto.randomUUID(); await rpc('creer_equipe', [id, nom, 'plume']); return id; };
  const inviter = async (equipe: string, joueur = 1) => { await rpc('inviter_equipier', [equipe, profils[joueur]]); return (await lire()).equipe!.invitation!.id; };
  return { ...b, profils, rpc, lire, lier, creer, inviter };
}

it('équipes : création modérée, nom unique, répétition et lecture privée', async () => {
  const l = await laboratoire();
  try {
    const id = await l.creer();
    await l.rpc('creer_equipe', [id, 'Les Encriers', 'plume']);
    assert.equal((await l.lire()).equipe!.membres.length, 1);
    await assert.rejects(l.creer(), /déjà partie/);
    await l.joueur(1);
    assert.equal((await l.lire()).equipe, null);
    await assert.rejects(l.creer(1, 'les encriers'), /déjà pris/);
    await assert.rejects(l.creer(1, 'ab'), /au moins/);
    await assert.rejects(l.creer(1, 'connard'), /autre pseudonyme|interdit|respectueux|pas accepté/i);
    await assert.rejects(l.rpc('creer_equipe', [crypto.randomUUID(), 'Les Plumes', 'inconnu']), /emblème/);
    for (const table of ['equipes','equipiers','invitations_equipe']) await assert.rejects(l.db.query(`select * from public.${table}`), /permission denied/);
    await assert.rejects(l.rpc('modifier_equipe', [id, 'Les Voleurs', 'lune']), /capitaine/);
    await assert.rejects(l.rpc('dissoudre_equipe', [id]), /capitaine/);
    await l.admin(); await l.db.exec('set role anon');
    await assert.rejects(l.lire(), /permission denied/);
    await assert.rejects(l.rpc('creer_equipe', [crypto.randomUUID(), 'Les Plumes', 'plume']), /permission denied/);
  } finally { await l.db.close(); }
});

it('équipes : consentement, deux places maximum et une seule équipe par joueur', async () => {
  const l = await laboratoire();
  try {
    await l.lier(); const id = await l.creer();
    await assert.rejects(l.inviter(id, 2), /ami/);
    const invitation = await l.inviter(id);
    await l.inviter(id);
    await assert.rejects(l.rpc('repondre_invitation_equipe', [invitation, 'accepter']), /pas permise/);
    await l.joueur(2);
    assert.deepEqual((await l.lire()).invitations, []);
    await assert.rejects(l.rpc('repondre_invitation_equipe', [invitation, 'accepter']), /pas permise/);
    await l.joueur(1);
    assert.equal((await l.lire()).invitations[0].nom, 'Les Encriers');
    await l.rpc('repondre_invitation_equipe', [invitation, 'accepter']);
    assert.equal((await l.lire()).equipe!.membres.length, 2);
    await assert.rejects(l.rpc('repondre_invitation_equipe', [invitation, 'accepter']), /plus disponible/);
    await assert.rejects(l.rpc('modifier_equipe', [id, 'Les Plumes', 'lune']), /capitaine/);
    await l.lier(0, 2); await l.joueur(0);
    await assert.rejects(l.inviter(id, 2), /complète/);
    await l.admin();
    await assert.rejects(l.db.query('insert into public.equipiers(profil,equipe,place) values($1,$2,3)', [l.profils[2], id]), /check constraint/);
    await l.joueur(0); await l.rpc('modifier_equipe', [id, 'Les Plumes', 'lune']);
    await l.joueur(1); assert.equal((await l.lire()).equipe!.nom, 'Les Plumes');
  } finally { await l.db.close(); }
});

it('équipes : annulation, refus, expiration et fin d’amitié empêchent de rejoindre', async () => {
  const l = await laboratoire();
  try {
    await l.lier(); const id = await l.creer();
    let invitation = await l.inviter(id);
    await l.rpc('repondre_invitation_equipe', [invitation, 'annuler']);
    await l.joueur(1); assert.deepEqual((await l.lire()).invitations, []);
    await l.joueur(0); invitation = await l.inviter(id);
    await l.joueur(1); await l.rpc('repondre_invitation_equipe', [invitation, 'refuser']);
    await l.joueur(0); invitation = await l.inviter(id);
    await l.admin(); await l.db.query("update public.invitations_equipe set expire_le=now()-interval '1 second' where id=$1", [invitation]);
    await l.joueur(1);
    assert.deepEqual((await l.lire()).invitations, []);
    await assert.rejects(l.rpc('repondre_invitation_equipe', [invitation, 'accepter']), /expiré/);
    await l.joueur(0); invitation = await l.inviter(id);
    await l.rpc('repondre_ami', [l.profils[1], 'retirer']);
    await l.joueur(1);
    assert.deepEqual((await l.lire()).invitations, []);
    await assert.rejects(l.rpc('repondre_invitation_equipe', [invitation, 'accepter']), /amis/);
  } finally { await l.db.close(); }
});

it('équipes : accepter une invitation retire les autres ; le capitaine sortant transmet sa place', async () => {
  const l = await laboratoire();
  try {
    await l.lier(); await l.lier(2, 1);
    const premiere = await l.creer(); const invitation = await l.inviter(premiere);
    const seconde = await l.creer(2, 'Les Plumes'); await l.inviter(seconde);
    await l.joueur(1); assert.equal((await l.lire()).invitations.length, 2);
    await l.rpc('repondre_invitation_equipe', [invitation, 'accepter']);
    await l.joueur(2); assert.equal((await l.lire()).equipe!.invitation, null);
    await assert.rejects(l.inviter(seconde), /déjà partie/);
    await l.joueur(0); await l.rpc('quitter_equipe', [premiere]);
    assert.equal((await l.lire()).equipe, null);
    await l.joueur(1); assert.equal((await l.lire()).equipe!.membres[0].capitaine, true);
    await l.rpc('quitter_equipe', [premiere]); await l.rpc('quitter_equipe', [premiere]);
    await l.admin(); assert.equal((await l.db.query('select * from public.equipes where id=$1', [premiere])).rows.length, 0);
    assert.deepEqual((await l.db.query('select encre,encre_achetee from public.comptes')).rows, Array(3).fill({encre:200,encre_achetee:100}));
  } finally { await l.db.close(); }
});

it('équipes : récupération du compte, migration répétée et suppression du profil conservent le partenaire', async () => {
  const l = await laboratoire();
  try {
    await l.lier(); const id = await l.creer(); const invitation = await l.inviter(id);
    await l.joueur(1); await l.rpc('repondre_invitation_equipe', [invitation, 'accepter']);
    await l.joueur(0); await l.rpc('definir_un_code_de_secours', ['ABCDEFGHJKMNPQRSTUVW']);
    await l.joueur(2); await l.rpc('recuperer_par_code', ['ABCDEFGHJKMNPQRSTUVW']);
    assert.equal((await l.lire()).equipe!.id, id);
    await l.admin(); await l.db.exec(migrationEquipes()); await l.db.exec(migrationEquipes());
    await l.joueur(2); assert.equal((await l.lire()).equipe!.membres.length, 2);
    await l.rpc('supprimer_mon_profil');
    await l.joueur(1); assert.deepEqual((await l.lire()).equipe!.membres.map(({ id, pseudo, capitaine }) => ({ id, pseudo, capitaine })), [{id:l.profils[1],pseudo:'lecteur1',capitaine:true}]);
    await l.rpc('supprimer_mon_profil');
    await l.admin(); assert.equal((await l.db.query('select * from public.equipes')).rows.length, 0);
  } finally { await l.db.close(); }
});

it('équipes : dissolution par le capitaine libère les deux joueurs sans toucher à leurs collections', async () => {
  const l = await laboratoire();
  try {
    await l.lier(); const id = await l.creer(); const invitation = await l.inviter(id);
    await l.joueur(1); await l.rpc('repondre_invitation_equipe', [invitation, 'accepter']);
    await assert.rejects(l.rpc('dissoudre_equipe', [id]), /capitaine/);
    await l.joueur(0); await l.rpc('dissoudre_equipe', [id]);
    assert.equal((await l.lire()).equipe, null);
    await l.joueur(1); assert.equal((await l.lire()).equipe, null);
    await l.creer(1);
    await l.admin(); assert.equal((await l.db.query('select * from public.profils')).rows.length, 3);
  } finally { await l.db.close(); }
});
