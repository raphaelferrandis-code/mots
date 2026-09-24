import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { baseDeTest } from './test-base.ts';
import { cartes } from './collections.ts';
import { executerCombat, gestionnaireCombat, lireRequeteCombat } from './api-combat.ts';
import type { OutilsCombat, LigneCombat } from './api-combat.ts';
import { avancerCombat, creerCombat, vueCombat } from './moteur-combat.ts';
import { migrationCombats } from './fabriquer-le-script.ts';
import type { CarteIndex, Definition, IndexEdition } from '../src/partage/types.ts';
import type { ActionCombat, RequeteCombat, ReponseServeurCombat } from '../src/jeu/combat.ts';
import { EQUILIBRAGE } from '../src/config/equilibrage.ts';
import { XP } from '../src/jeu/personnalisation.ts';

const brut = JSON.parse(readFileSync(new URL('../supabase/functions/_shared/catalogue-combat.json',import.meta.url),'utf8')) as { cartes: CarteIndex[]; definitions: [string, Definition[]][] };
const catalogue = { cartes: brut.cartes, definitions: new Map(brut.definitions) };
const deck = brut.cartes.filter(c => c.registre.length === 0 && c.rarete === 'Commune').slice(0,10).map(c => c.id);
const choix = { mode:'entrainement' as const,niveau:'Normal' as const,masques:[],temps:'normal' as const };

it('un défi amical exige une amitié et ne modifie aucune cote, même après abandon', async () => {
  const l = await laboratoire();
  try {
    await l.admin();
    await l.db.query('update public.profils set deck=$1 where utilisateur in ($2,$3)', [JSON.stringify(deck), l.ids[0], l.ids[1]]);
    const profils = (await l.db.query<{ id: string }>('select id from public.profils order by pseudo')).rows.map(p => p.id);
    const amical = { mode: 'amical' as const, adversaire: profils[1], masques: [], temps: 'illimite' as const };
    const lancer = () => l.appel(lireRequeteCombat({ type: 'commencer', requete: crypto.randomUUID(), choix: amical }));
    await assert.rejects(lancer(), /amis/);
    await l.joueur(0); await l.db.query("select public.demander_ami('lecteur1')");
    await assert.rejects(lancer(), /amis/, 'une demande en attente ne suffit pas');
    await l.joueur(1); await l.db.query("select public.repondre_ami($1,'accepter')", [profils[0]]);
    await l.admin();
    const avant = (await l.db.query('select id,cote,jouees,gagnees from public.profils order by id')).rows;
    let r = await lancer();
    assert.equal(r.combat!.vue.adversaire.type === 'joute' && r.combat!.vue.adversaire.amical, true);
    while (!r.combat!.vue.termine) {
      const prive = await l.lirePrive(r.combat!.id);
      const e = prive.etat.etape;
      if (e.nom === 'parade') r = await l.agir(r, { type: 'repondre', choisie: e.epreuve.bonne });
      else if (e.nom === 'choix') r = await l.agir(r, { type: 'choisir', carte: prive.etat.duel.camps.joueur.main[0].id });
      else r = await l.agir(r, { type: 'continuer' });
    }
    assert.equal(r.combat!.recompense!.cote, null);
    await l.agir(r, { type: 'quitter' });
    r = await lancer(); r = await l.agir(r, { type: 'abandonner' });
    assert.equal(r.combat!.recompense!.cote, null);
    await l.admin();
    assert.deepEqual((await l.db.query('select id,cote,jouees,gagnees from public.profils order by id')).rows, avant);
    await l.joueur(0); await l.db.query("select public.repondre_ami($1,'retirer')", [profils[1]]);
    await assert.rejects(lancer(), /amis/);
  } finally { await l.db.close(); }
});

async function laboratoire() {
  const b = await baseDeTest(true);
  await b.db.exec(cartes({ cartes:brut.cartes, meta:{edition:1,version:'test'} } as IndexEdition));
  for (const uid of b.ids.slice(0,2)) {
    for (const id of deck) await b.db.query("insert into public.possessions(utilisateur,carte,finitions) values($1,$2,'{\"Normale\":1}')",[uid,id]);
    await b.db.query('update public.comptes set deck=$2 where utilisateur=$1',[uid,JSON.stringify(deck)]);
  }
  let heure = Date.now();
  const outils: OutilsCombat = {
    catalogue, hasard:()=>0.999, maintenant:()=>heure,identifiant:()=>crypto.randomUUID(),
    async rpc<T>(nom:string,args:Record<string,unknown>):Promise<T> {
      assert.ok(['combat_contexte','combat_creer','combat_appliquer'].includes(nom));
      await b.db.exec('set role service_role');
      const cles = Object.keys(args);
      const parametres = Object.values(args).map(v => v !== null && typeof v === 'object' ? JSON.stringify(v) : v);
      return (await b.db.query<{r:T}>(`select public.${nom}(${cles.map((k,i)=>`${k} => $${i+1}`).join(',')}) r`,parametres)).rows[0].r;
    },
  };
  const lirePrive = async(id:string):Promise<LigneCombat> => { await b.admin(); return (await b.db.query<LigneCombat>('select * from public.combats where id=$1',[id])).rows[0]; };
  const appel = (requete:RequeteCombat,uid=b.ids[0])=>executerCombat(uid,requete,outils);
  const commencer = ()=>appel({type:'commencer',requete:crypto.randomUUID(),choix});
  const agir = (r:ReponseServeurCombat,action:ActionCombat,requete=crypto.randomUUID())=>appel({type:'agir',requete,combat:r.combat!.id,revision:r.combat!.revision,action});
  return { ...b,outils,lirePrive,appel,commencer,agir,avancerHeure:(ms:number)=>{heure+=ms;} };
}

it('le serveur utilise le moteur du jeu, cache les réponses, refuse les résultats et compte chaque événement une seule fois',async()=>{
  const l=await laboratoire();
  try {
    let r=await l.commencer();
    const id=r.combat!.id;
    await l.joueur(0);
    await assert.rejects(l.db.query("select public.terminer_un_duel(1,'victoire')"),/permission denied/);
    await assert.rejects(l.db.query("select public.terminer_une_joute(1,'victoire')"),/permission denied/);
    await assert.rejects(l.db.query('select etat from public.combats'),/permission denied/);
    await assert.rejects(l.db.query('select public.combat_contexte($1,null,null)',[l.ids[0]]),/permission denied/);
    await assert.rejects(l.db.query('select public.gagner_xp($1,100000,false)',[l.ids[0]]),/permission denied/);
    await assert.rejects(l.db.query('select public.supprimer_mon_profil()'),/Termine ou abandonne/);
    await assert.rejects(l.appel({type:'agir',requete:crypto.randomUUID(),combat:id,revision:0,action:{type:'abandonner'}},l.ids[1]),/introuvable/);
    assert.throws(()=>lireRequeteCombat({type:'agir',requete:crypto.randomUUID(),combat:id,revision:0,action:{type:'terminer',resultat:'victoire'}}),/invalide/);
    const reponsePerdue={type:'agir' as const,requete:crypto.randomUUID(),combat:id,revision:0,action:{type:'choisir' as const,carte:r.combat!.vue.duel.camps.joueur.main[0].id}};
    r=await l.appel(reponsePerdue);
    assert.equal(r.combat!.vue.etape.nom,'parade');
    if(r.combat!.vue.etape.nom==='parade') assert.equal(r.combat!.vue.etape.epreuve.bonne,-1);
    const repetee=await l.appel(reponsePerdue);
    assert.equal(repetee.combat!.revision,r.combat!.revision);
    assert.ok(r.combat!.vue.duel.camps.adversaire.main.every(c=>c.id==='cachee'));
    await assert.rejects(l.appel({...reponsePerdue,requete:crypto.randomUUID()}),/avancé/);
    let bonnes=0;
    while(!r.combat!.vue.termine) {
      const prive=await l.lirePrive(id);
      const e=prive.etat.etape;
      if(e.nom==='parade') {
        const commande={type:'agir' as const,requete:crypto.randomUUID(),combat:id,revision:r.combat!.revision,action:{type:'repondre' as const,choisie:e.epreuve.bonne}};
        r=await l.appel(commande); bonnes++;
        assert.deepEqual({...((await l.appel(commande)).etat),maintenant:0},{...r.etat,maintenant:0});
      } else if(e.nom==='choix') r=await l.agir(r,{type:'choisir',carte:prive.etat.duel.camps.joueur.main[0].id});
      else r=await l.agir(r,{type:'continuer'});
    }
    assert.equal(r.combat!.vue.etape.nom,'bilan','la victoire est payée dès la dernière manche, avant le bouton de fin');
    assert.equal(r.combat!.xp,bonnes*XP.reponse+XP.duel+XP.victoire);
    assert.equal(r.combat!.recompense!.encre,EQUILIBRAGE.duel.encreParVictoire.Normal);
    const finale=await l.agir(r,{type:'continuer'});
    assert.equal(finale.combat!.xp,r.combat!.xp);
    assert.equal(finale.etat.encre,r.etat.encre);
    assert.equal((await l.appel({type:'lire'})).combat!.id,id,'un nouvel appareil peut reprendre le résultat');
    await l.agir(finale,{type:'quitter'});
    assert.equal((await l.appel({type:'lire'})).combat,null);
  } finally { await l.db.close(); }
});

it('le temps serveur décide des réponses, le temps illimité reste jouable et la partie expire en défaite sans gain',async()=>{
  const l=await laboratoire();
  try {
    let r=await l.commencer();
    r=await l.agir(r,{type:'choisir',carte:r.combat!.vue.duel.camps.joueur.main[0].id});
    const e=(await l.lirePrive(r.combat!.id)).etat.etape;
    assert.equal(e.nom,'parade');
    if(e.nom!=='parade') return;
    l.avancerHeure(60_000);
    r=await l.agir(r,{type:'repondre',choisie:e.epreuve.bonne});
    assert.equal(r.combat!.vue.etape.nom,'bilan');
    if (r.combat!.vue.etape.nom === 'bilan') {
      assert.equal(r.combat!.vue.etape.parade.juste,false);
      assert.equal(r.combat!.vue.etape.apres.manches.at(-1)!.joueur.reussie,true);
      assert.equal(r.combat!.vue.etape.apres.manches.at(-1)!.adversaire.reussie,true);
    }
    assert.equal(r.combat!.xp,0);
    l.avancerHeure(25*3_600_000);
    r=await l.appel({type:'lire'});
    assert.deepEqual(r.combat!.vue.etape,{nom:'fin',resultat:'defaite',abandonne:true,expire:true});
    assert.equal(r.combat!.recompense!.encre,0);
    assert.equal(r.combat!.xp,0);
    const s=creerCombat({...choix,temps:'illimite'},{deck,possedees:deck,apprentissages:{}},null,catalogue,()=>0.999,0);
    const question=avancerCombat(s,{type:'choisir',carte:s.duel.camps.joueur.main[0].id},catalogue,()=>0.999,1).etat;
    if(question.etape.nom!=='parade') throw Error('attaque attendue');
    const suite=avancerCombat(question,{type:'repondre',choisie:question.etape.epreuve.bonne},catalogue,()=>0.999,3_600_000);
    assert.equal(suite.etat.etape.nom,'bilan');
    assert.equal(vueCombat(suite.etat).etape.nom,'bilan');
  } finally {await l.db.close();}
});

it('la progression et le combat suivent la récupération du compte, avec migration ancienne administrative distincte du classement',async()=>{
  const l=await laboratoire();
  try {
    await l.admin();
    await l.db.query("insert into public.possessions(utilisateur,carte,finitions) select $1,id,'{\"Normale\":1}' from public.cartes on conflict do nothing",[l.ids[0]]);
    let r=await l.commencer();
    r=await l.agir(r,{type:'choisir',carte:r.combat!.vue.duel.camps.joueur.main[0].id});
    const e=(await l.lirePrive(r.combat!.id)).etat.etape;
    if(e.nom!=='parade') throw Error('attaque attendue');
    r=await l.agir(r,{type:'repondre',choisie:e.epreuve.bonne});
    await l.joueur(0);await l.db.query("select public.definir_un_code_de_secours('ABCDEFGHIJKLMNOPQRST')");
    await l.joueur(2);await l.db.query("select public.recuperer_par_code('ABCDEFGHIJKLMNOPQRST')");
    const retrouve=await l.appel({type:'lire'},l.ids[2]);
    assert.equal(retrouve.combat!.id,r.combat!.id);
    assert.deepEqual(retrouve.etat.cartes,r.etat.cartes);
    await l.admin();
    const xp=(await l.db.query<{xp:number}>('select xp::integer xp from public.comptes where utilisateur=$1',[l.ids[2]])).rows[0].xp;
    assert.equal(xp,XP.reponse);
    await l.db.query('delete from public.possessions where utilisateur=$1 and carte=$2',[l.ids[2],e.adverse.id]);
    assert.equal((await l.db.query<{reussites:number}>('select reussites from public.apprentissages where utilisateur=$1 and carte=$2',[l.ids[2],e.adverse.id])).rows[0].reussites,1);
    await l.db.query('insert into public.progressions_validees values($1,$2)',[l.ids[2],JSON.stringify({xp:120,apprentissages:{[e.adverse.id]:{posees:5,reussites:5,maitriseeLe:1000}}})]);
    await l.joueur(2); await assert.rejects(l.db.query('select public.importer_progression_validee($1)',[l.ids[2]]),/permission denied/);
    await l.admin(); await l.db.query('select public.importer_progression_validee($1)',[l.ids[2]]);
    const p=(await l.db.query<{r:{xp:number;apprentissages:Record<string,{reussites:number}>}}>('select public.progression_du_compte($1) r',[l.ids[2]])).rows[0].r;
    assert.equal(p.xp,125); assert.equal(p.apprentissages[e.adverse.id].reussites,6);
    const verifie=(await l.db.query<{r:Record<string,{reussies:number}>}>('select public.savoirs_verifies($1,$2) r',[l.ids[2],JSON.stringify([e.adverse.id])])).rows[0].r;
    assert.equal(verifie[e.adverse.id].reussies,1,'le double n’hérite pas des statistiques déclarées de l’ancien client');
    await assert.rejects(l.db.query('select public.importer_progression_validee($1)',[l.ids[2]]),/déjà importée/);
    await l.db.exec(migrationCombats());
    assert.equal((await l.db.query<{r:{xp:number}}>('select public.progression_du_compte($1) r',[l.ids[2]])).rows[0].r.xp,125);
  } finally {await l.db.close();}
});

it('la frontière HTTP authentifie le compte et refuse les champs de résultat ou d’identité du client',async()=>{
  let appels=0;
  const handler=gestionnaireCombat({catalogue,hasard:()=>0.5,maintenant:()=>0,identifiant:()=>crypto.randomUUID(),authentifier:async jeton=>jeton==='valide'?'11111111-1111-4111-8111-111111111111':null,rpc:async<T>()=>{appels++;return {} as T;}});
  const envoyer=(body:unknown,jeton='valide')=>handler(new Request('https://jeu.invalid/combats',{method:'POST',headers:{Authorization:`Bearer ${jeton}`},body:JSON.stringify(body)}));
  assert.equal((await envoyer({type:'lire'},'faux')).status,401);
  assert.equal((await envoyer({type:'lire',utilisateur:'autre'})).status,400);
  assert.equal((await envoyer({type:'agir',requete:crypto.randomUUID(),combat:crypto.randomUUID(),revision:0,action:{type:'repondre',choisie:0,resultat:'victoire'}})).status,400);
  assert.equal(appels,0);
});

it('la joute ignore les statistiques publiées, fige la cote adverse et enregistre une seule défaite à l’abandon',async()=>{
  const l=await laboratoire();
  try {
    await l.joueur(0);
    await l.db.query('select public.publier_mon_profil($1,$2,$3,$4)', ['lecteur0',JSON.stringify(deck),JSON.stringify({[deck[0]]:{posees:500,reussies:500}}),JSON.stringify({Commune:{posees:500,reussies:500}})]);
    await l.admin();
    const moi=(await l.db.query<{savoirs:unknown;parades:unknown}>('select savoirs,parades from public.profils where utilisateur=$1',[l.ids[0]])).rows[0];
    assert.deepEqual(moi,{savoirs:{},parades:{}});
    const adversaire=(await l.db.query<{id:string}>('select id from public.profils where utilisateur=$1',[l.ids[1]])).rows[0].id;
    const debut={type:'commencer' as const,requete:crypto.randomUUID(),choix:{mode:'joute' as const,adversaire,masques:[],temps:'normal' as const}};
    const r=await l.appel(debut);
    assert.equal((await l.appel(debut)).combat!.id,r.combat!.id);
    await l.admin(); await l.db.query('update public.profils set cote=2000 where id=$1',[adversaire]);
    const commande={type:'agir' as const,combat:r.combat!.id,revision:r.combat!.revision,requete:crypto.randomUUID(),action:{type:'abandonner' as const}};
    const fin=await l.appel(commande);
    const attendu=Math.max(EQUILIBRAGE.joute.coteMinimale,Math.round(1000-EQUILIBRAGE.joute.facteurK*0.5));
    assert.deepEqual(fin.combat!.recompense,{encre:0,reduite:false,cote:{avant:1000,apres:attendu}});
    assert.equal(fin.etat.progression!.duels.joues,1);
    const bis=await l.appel(commande);
    assert.equal(bis.etat.classementPersonnel!.jouees,1); assert.equal(bis.combat!.xp,0);
    await l.admin();
    for(let i=0;i<3;i++) await l.db.query('insert into public.profils(maison,pseudo,pseudo_cle,deck) values(true,$1,$1,$2)',[`invitation${i}`,JSON.stringify(deck)]);
    await l.joueur(0);
    const propositions=(await l.db.query<{r:{id:string}[]}>('select public.adversaires() r')).rows[0].r;
    assert.equal(propositions.length,3);
    assert.ok(propositions.every(p=>p.id!==adversaire),'les combats vérifiés alimentent aussi les adversaires récents');
  } finally {await l.db.close();}
});

it('les paquets et les réponses créditent l’expérience serveur et son bonus fractionnaire',async()=>{
  const l=await laboratoire();
  try {
    await l.joueur(0);
    const ouverture=(await l.db.query<{r:{cartes:{nouvelle:boolean}[];etat:ReponseServeurCombat['etat']}}>("select public.ouvrir_un_paquet('{}') r")).rows[0].r;
    const xpPaquet=XP.paquet+XP.decouverte*ouverture.cartes.filter(c=>c.nouvelle).length;
    assert.equal(ouverture.etat.progression!.xp,xpPaquet);
    await l.admin();
    await l.db.query("update public.comptes set abonnement='collectionneur',abonnement_jusqu_au=now()+interval '1 day' where utilisateur=$1",[l.ids[0]]);
    let r=await l.commencer();
    r=await l.agir(r,{type:'choisir',carte:r.combat!.vue.duel.camps.joueur.main[0].id});
    for(let i=1;i<=2;i++) {
      if (i > 1) {
        r=await l.agir(r,{type:'continuer'});
        r=await l.agir(r,{type:'choisir',carte:r.combat!.vue.duel.camps.joueur.main[0].id});
      }
      const e=(await l.lirePrive(r.combat!.id)).etat.etape;
      if(e.nom!=='parade') throw Error('question attendue');
      r=await l.agir(r,{type:'repondre',choisie:e.epreuve.bonne});
      const bonus=i*XP.reponse*EQUILIBRAGE.payant.bonusXpPourcent;
      assert.equal(r.combat!.xp,i*XP.reponse+Math.floor(bonus/100));
      assert.equal(r.etat.progression!.xp,xpPaquet+r.combat!.xp);
      assert.equal(r.etat.progression!.bonusXpReste,bonus%100);
    }
  } finally {await l.db.close();}
});
