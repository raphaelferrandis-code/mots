import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { baseDeTest } from './test-base.ts';
import { direct } from './direct.ts';
import { cartes } from './collections.ts';
import { avancerDirect, creerDirect, voiesDisponibles, vueDirect } from './moteur-direct.ts';
import { executerDirect, gestionnaireDirect, lireRequeteDirect } from './api-direct.ts';
import type { EtatDirect } from './moteur-direct.ts';
import { ID_FACE_CACHEE } from '../src/jeu/duel.ts';
import type { OutilsCombat } from './api-combat.ts';
import type { CarteIndex, Definition, IndexEdition } from '../src/partage/types.ts';
import type { ActionDirect, ModeDirect, ReponseDirect } from '../src/jeu/direct.ts';

const brut = JSON.parse(readFileSync(new URL('../supabase/functions/_shared/catalogue-combat.json',import.meta.url),'utf8')) as {cartes:CarteIndex[];definitions:[string,Definition[]][]};
const catalogue = {cartes:brut.cartes,definitions:new Map(brut.definitions)};
const deck = brut.cartes.filter(c => c.registre.length===0 && c.rarete==='Commune').slice(0,10).map(c=>c.id);
const hasard = () => 0.72;
const debut = (mode:ModeDirect='duo_solo') => creerDirect(mode,Array.from({length:mode==='solo'?2:4},(_,i)=>({utilisateur:`u${i}`,pseudo:`J${i}`,equipe:Math.floor(i/(mode==='solo'?1:2)),deck,masques:[]})),['A','B'],catalogue,hasard,1000);
const agir = (e:EtatDirect,joueur:number,action:ActionDirect, temps=1001) => avancerDirect(e,catalogue,hasard,temps,{joueur,manche:e.manche,phase:e.phase,action});
function poserToutes(e:EtatDirect,voieB=0) {
  while(e.phase==='pose') { const j=e.ordre[e.poses.length];const voie=e.poses.length===1 ? voieB : voiesDisponibles(e,j)[0];e=agir(e,j,{type:'poser',carte:e.joueurs[j].main[0].id,voie}); }
  return e;
}
it('direct : B1 choisit son opposition, B2 comble, A2 finit ; ordre et arbitres alternent',()=>{
  for(const voieB of [0,1]) {
    let e=debut();assert.deepEqual(e.ordre,[0,2,3,1]);assert.deepEqual(e.arbitres,[1,3]);
    e=poserToutes(e,voieB);
    assert.equal(e.poses.find(p=>p.joueur===2)!.voie,voieB);
    assert.equal(e.poses.find(p=>p.joueur===3)!.voie,1-voieB);
    assert.equal(e.poses.find(p=>p.joueur===1)!.voie,1);
    e=avancerDirect(e,catalogue,hasard,e.echeance);assert.equal(e.phase,'bilan');
    e=avancerDirect(e,catalogue,hasard,e.echeance);assert.deepEqual(e.ordre,[3,1,0,2]);assert.deepEqual(e.arbitres,[0,2]);
  }
});
it('direct : propositions partagées, seul le dernier poseur arbitre entre les choix avancés',()=>{
  let e=poserToutes(debut());const q=e.questions.find(q=>q.cible===2)!;
  e=agir(e,0,{type:'proposer',cible:2,choix:0});e=agir(e,1,{type:'proposer',cible:2,choix:1});
  assert.deepEqual(vueDirect(e,'u1').questions.find(q=>q.cible===2)!.reponses,{'0':0,'1':1});
  assert.equal(vueDirect(e,'u2').questions.some(q=>q.cible===2),false);
  e=avancerDirect(e,catalogue,hasard,e.echeance);assert.equal(e.phase,'arbitrage');
  const t=e.echeance-1;
  assert.throws(()=>agir(e,0,{type:'trancher',cible:2,choix:0},t),/trancher/);
  assert.throws(()=>agir(e,1,{type:'trancher',cible:2,choix:2},t),/trancher/);
  const tranche=agir(e,1,{type:'trancher',cible:2,choix:0},t);
  assert.equal(tranche.bilan.find(b=>b.joueur===2)!.choisie,q.epreuve.propositions[0]);
  const expire=avancerDirect(e,catalogue,hasard,e.echeance);
  assert.equal(expire.bilan.find(b=>b.joueur===2)!.choisie,q.epreuve.propositions[1]);
});
it('direct : une seule réponse compte, les attaques sont simultanées et les PV partagés',()=>{
  let e=poserToutes(debut());
  for(const q of e.questions) e=agir(e,e.joueurs[q.cible].equipe===0?2:0,{type:'proposer',cible:q.cible,choix:q.epreuve.bonne});
  e.pv=[1,1];e=avancerDirect(e,catalogue,hasard,e.echeance);
  assert.equal(e.bilan.length,4);assert.ok(e.bilan.every(b=>b.paree));assert.deepEqual(e.pv,[0,0]);assert.equal(e.vainqueur,'nul');
});
it('direct : pas de mains adverses, pioche, solution ou identité privée dans la vue',()=>{
  const e=poserToutes(debut());const vue=vueDirect(e,'u0');
  assert.ok(vue.joueurs.slice(2).every(j=>j.main.length===0));assert.ok(vue.joueurs[1].main.length>0);
  assert.equal('bonne' in vue.questions[0],false);assert.equal(JSON.stringify(vue).includes('utilisateur'),false);
  assert.ok(vue.poses.every(p=>p.carte.definition===''));assert.throws(()=>vueDirect(e,'intrus'));
});
it('direct : pendant la pose, les mots de l’autre équipe restent face cachée ; tous se retournent aux réponses',()=>{
  let e=debut();
  const premier=e.joueurs[0].main[0];
  e=agir(e,0,{type:'poser',carte:premier.id,voie:0});
  const adverse=vueDirect(e,'u2').poses[0].carte;
  assert.equal(adverse.id,ID_FACE_CACHEE);assert.equal(adverse.mot,'');assert.equal(adverse.faction,'');assert.equal(adverse.type,premier.type);
  // (Les decks de ce test sont identiques : le mot figure aussi dans la main de celui qui regarde.)
  assert.equal(JSON.stringify(vueDirect(e,'u2').poses).includes(premier.mot),false);
  assert.equal(vueDirect(e,'u1').poses[0].carte.mot,premier.mot,'le partenaire voit le mot posé');
  e=poserToutes(e);assert.equal(e.phase,'reponses');
  assert.ok(vueDirect(e,'u2').poses.every(p=>p.carte.mot!=='' && p.carte.definition===''));
});
it('direct : échéances serveur, reprise, double absence et commandes tardives',()=>{
  const e=debut('solo');const tardif=avancerDirect(e,catalogue,hasard,e.echeance,{joueur:0,manche:1,phase:'pose',action:{type:'poser',carte:e.joueurs[0].main[0].id,voie:0}});
  assert.equal(tardif.poses.length,1);
  const fin=avancerDirect(e,catalogue,hasard,1_000_000);assert.equal(fin.phase,'fin');assert.match(fin.raison!,/deux tours/);
  const q=poserToutes(debut('solo'));
  const reponse=avancerDirect(q,catalogue,hasard,q.echeance,{joueur:0,manche:1,phase:'reponses',action:{type:'proposer',cible:1,choix:0}});
  assert.equal(reponse.bilan.find(b=>b.joueur===1)!.choisie,null);
});

export async function laboratoireDirect() {
  const b=await baseDeTest(true);await b.db.exec(direct());
  const id4='44444444-4444-4444-8444-444444444444';b.ids.push(id4);
  await b.db.query('insert into auth.users values($1)',[id4]);await b.db.query('insert into public.comptes(utilisateur) values($1)',[id4]);
  await b.db.query("insert into public.profils(utilisateur,pseudo,pseudo_cle) values($1,'lecteur3','lecteur3')",[id4]);
  await b.db.exec(cartes({cartes:brut.cartes,meta:{edition:1,version:'test'}} as IndexEdition));
  for(const uid of b.ids) {
    for(const id of deck) await b.db.query(`insert into public.possessions(utilisateur,carte,finitions) values($1,$2,'{"Normale":1}')`,[uid,id]);
    await b.db.query('update public.comptes set deck=$2 where utilisateur=$1',[uid,JSON.stringify(deck)]);
  }
  let file:Promise<unknown>=Promise.resolve();
  let heure=Date.now();
  const rpc:OutilsCombat['rpc']=async <T>(nom:string,args:Record<string,unknown>):Promise<T>=>{
    const t=file.then(async()=>{
      await b.db.exec('set role service_role');
      const r=(await b.db.query<{r:T}>(`select public.${nom}(${Object.keys(args).map((k,i)=>`${k}=>$${i+1}`).join(',')}) r`,Object.values(args).map(v=>v!==null&&typeof v==='object'?JSON.stringify(v):v))).rows[0].r;
      if(nom==='direct_contexte') (r as {maintenant:number}).maintenant=heure;
      return r;
    });file=t.catch(()=>{});return t;
  };
  const outils:OutilsCombat={rpc,catalogue,hasard,maintenant:Date.now,identifiant:()=>crypto.randomUUID()};
  const appel=(i:number,req:unknown)=>executerDirect(b.ids[i],lireRequeteDirect(req),outils);
  const chercher=(i:number,mode:ModeDirect)=>appel(i,{type:'chercher',mode,masques:[]});
  const commande=(r:ReponseDirect,action:import('../src/jeu/direct.ts').ActionDirect)=>({type:'agir',partie:r.partie!.id,requete:crypto.randomUUID(),manche:r.partie!.vue.manche,phase:r.partie!.vue.phase,action});
  return {...b,outils,appel,chercher,commande,avancer:(ms:number)=>{heure+=ms;}};
}
it('direct SQL : migration répétable, files séparées, authentification et permissions',async()=>{
  const l=await laboratoireDirect();try {
    await l.db.exec(direct());
    const avant=(await l.db.query('select sum(encre)::int n from public.comptes')).rows;
    assert.ok((await l.chercher(0,'solo')).attente);
    assert.ok((await l.chercher(1,'duo_solo')).attente);
    const r=await l.chercher(2,'solo');assert.ok(r.partie);assert.equal(r.partie!.vue.joueurs.length,2);
    await l.joueur(0);
    for(const table of ['direct_parties','direct_places','direct_file','direct_cotes']) await assert.rejects(l.db.query(`select * from public.${table}`),/permission denied/);
    await assert.rejects(l.db.query('select public.direct_contexte($1)',[l.ids[1]]),/permission denied/);
    assert.ok((await l.db.query('select * from public.direct_signaux')).rows.every((r:any)=>r.utilisateur===l.ids[0]));
    const h=gestionnaireDirect({...l.outils,authentifier:async()=>null});
    assert.equal((await h(new Request('http://local',{method:'POST',body:'{}'}))).status,401);
    await l.admin();assert.deepEqual((await l.db.query('select sum(encre)::int n from public.comptes')).rows,avant);
  } finally {await l.db.close();}
});
it('direct SQL : quatre joueurs, résultat exactement une fois et cote 2v2 solo isolée',async()=>{
  const l=await laboratoireDirect();try {
    for(let i=0;i<4;i++) await l.chercher(i,'duo_solo');
    const r=await l.appel(0,{type:'lire'});assert.equal(r.partie!.vue.joueurs.length,4);
    const c=l.commande(r,{type:'abandonner'});
    const fin=await l.appel(0,c);assert.equal(fin.partie!.vue.phase,'fin');assert.deepEqual(fin.partie!.cotes,{avant:1000,apres:984});
    assert.deepEqual((await l.appel(0,c)).partie!.cotes,fin.partie!.cotes);
    await l.admin();
    const cotes=(await l.db.query<{mode:string;jouees:number;cote:number}>('select * from public.direct_cotes')).rows;
    assert.equal(cotes.length,4);assert.ok(cotes.every(c=>c.mode==='duo_solo'&&c.jouees===1));assert.equal(cotes.reduce((s,c)=>s+c.cote,0),4000);
    await l.joueur(0);const classement=(await l.db.query<{r:any}>("select public.classement_direct('duo_solo') r")).rows[0].r;assert.equal(classement.total,4);
    assert.throws(()=>l.appel(1,{...c,requete:crypto.randomUUID(),utilisateur:l.ids[0]}),/inconnue/);
  } finally {await l.db.close();}
});
it('direct SQL : les équipes sont des entités, les deux membres doivent être prêts',async()=>{
  const l=await laboratoireDirect();try {
    await l.admin();const ids=(await l.db.query<{id:string}>('select id from public.profils order by pseudo')).rows.map(p=>p.id);
    const equipes:string[]=[crypto.randomUUID(),crypto.randomUUID()];
    for(let c=0;c<2;c++) {
      await l.db.query('insert into public.equipes(id,nom,nom_cle,embleme) values($1,$2,$2,\'plume\')',[equipes[c],`Equipe${c}`]);
      for(let j=0;j<2;j++) await l.db.query('insert into public.equipiers(profil,equipe,place) values($1,$2,$3)',[ids[c*2+j],equipes[c],j+1]);
    }
    for(let i=0;i<3;i++) assert.equal((await l.chercher(i,'duo_equipe')).partie,null);
    const r=await l.chercher(3,'duo_equipe');assert.ok(r.partie);assert.equal(new Set(r.partie!.vue.noms).size,2);
    await l.joueur(0);await assert.rejects(l.db.query('select public.quitter_equipe($1)',[equipes[0]]),/Termine/);
    await l.appel(3,l.commande(r,{type:'abandonner'}));
    await l.admin();const cotes=(await l.db.query<{mode:string;sujet:string;jouees:number}>('select * from public.direct_cotes')).rows;
    assert.equal(cotes.length,2);assert.ok(cotes.every(c=>c.mode==='duo_equipe'&&equipes.includes(c.sujet)&&c.jouees===1));
  } finally {await l.db.close();}
});

it('direct SQL : réponses concurrentes et partie solo complète, cote historique conservée',async()=>{
  const l=await laboratoireDirect();try {
    await l.admin();await l.db.query('update public.profils set cote=1200 where utilisateur=$1',[l.ids[0]]);
    await l.chercher(0,'solo');let r=await l.chercher(1,'solo');
    const vus=new Set<string>();
    for(let tour=0;tour<60 && r.partie!.vue.phase!=='fin';tour++) {
      const v=r.partie!.vue;
      if(v.phase==='pose') {
        const pseudo=v.joueurs[v.ordre[v.poses.length]].pseudo;const i=Number(pseudo.slice(-1));
        const joueur=await l.appel(i,{type:'lire'});const c=joueur.partie!.vue.joueurs[joueur.partie!.vue.moi].main[0];
        r=await l.appel(i,l.commande(joueur,{type:'poser',carte:c.id,voie:0}));
      } else if(v.phase==='reponses') {
        const joueurs=await Promise.all([l.appel(0,{type:'lire'}),l.appel(1,{type:'lire'})]);
        const cmds=joueurs.map(j=>l.commande(j,{type:'proposer',cible:j.partie!.vue.questions[0].cible,choix:0}));
        await Promise.all(cmds.map((c,i)=>l.appel(i,c)));
        const obtenu=await l.appel(0,{type:'lire'});assert.ok(['bilan','fin'].includes(obtenu.partie!.vue.phase));
        const revision=obtenu.partie!.revision;
        assert.equal((await l.appel(0,cmds[0])).partie!.revision,revision,'un accusé perdu ne rejoue pas la réponse');
        assert.ok(!vus.has(`${v.manche}`));vus.add(`${v.manche}`);r=obtenu;
      } else { l.avancer(4000);r=await l.appel(0,{type:'lire'}); }
    }
    const fin=await l.appel(0,{type:'lire'});assert.equal(fin.partie!.vue.phase,'fin');assert.equal(fin.partie!.cotes!.avant,1200);
    await l.admin();const cotes=(await l.db.query<{jouees:number;mode:string}>('select * from public.direct_cotes')).rows;
    assert.ok(cotes.every(c=>c.mode==='solo'&&c.jouees===1));
    await l.appel(0,{type:'quitter'});assert.equal((await l.appel(0,{type:'lire'})).partie,null);
  } finally {await l.db.close();}
});

it('direct SQL : recherche expirée, deck invalide, changements de profil et accès aux autres parties refusés',async()=>{
  const l=await laboratoireDirect();try {
    await l.chercher(0,'solo');
    await l.admin();await l.db.query("update public.direct_file set present_le=now()-interval '1 minute' where utilisateur=$1",[l.ids[0]]);
    assert.ok((await l.chercher(1,'solo')).attente);assert.equal((await l.appel(0,{type:'lire'})).attente,null);
    await l.admin();await l.db.query("update public.comptes set deck='[]' where utilisateur=$1",[l.ids[2]]);
    await assert.rejects(l.chercher(2,'solo'),/dix cartes/);
    const r=await l.chercher(0,'solo');assert.ok(r.partie);
    assert.equal((await l.appel(3,{type:'lire'})).partie,null);
    await assert.rejects(l.appel(3,l.commande(r,{type:'abandonner'})),/plus active/);
    await l.admin();await assert.rejects(l.db.query('delete from public.profils where utilisateur=$1',[l.ids[0]]),/Termine/);
    await assert.rejects(l.db.query('update public.profils set utilisateur=$2 where utilisateur=$1',[l.ids[0],l.ids[2]]),/Termine/);
    const fin=await l.appel(0,l.commande(r,{type:'abandonner'}));assert.equal(fin.partie!.gains.encre,0);
    await l.admin();await l.db.query('delete from public.profils where utilisateur=$1',[l.ids[0]]);
    await l.joueur(1);const classement=(await l.db.query<{r:{total:number}}>("select public.classement_direct('solo') r")).rows[0].r;
    assert.equal(classement.total,1,'un profil supprimé ne figure plus au classement');
  } finally {await l.db.close();}
});
