import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { baseDeTest } from './test-base.ts';
import { direct } from './direct.ts';
import { migrationClassement, migrationTenueDuServeur } from './fabriquer-le-script.ts';
import { EQUILIBRAGE } from '../src/config/equilibrage.ts';
import { cartes } from './collections.ts';
import { avancerDirect, creerDirect, voiesDisponibles, vueDirect } from './moteur-direct.ts';
import { executerDirect, gestionnaireDirect, lireRequeteDirect } from './api-direct.ts';
import type { EtatDirect } from './moteur-direct.ts';
import { ID_FACE_CACHEE, bonusDEnchainement, faceCachee, taillesDesFactions } from '../src/jeu/duel.ts';
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
  const e=debut('solo');const marge=EQUILIBRAGE.duel.margeDuReseauEnMillisecondes;
  const choisie=e.joueurs[0].main[1].id;
  const poser=(temps:number)=>avancerDirect(e,catalogue,hasard,temps,{joueur:0,manche:1,phase:'pose',action:{type:'poser',carte:choisie,voie:0}});
  // Partie avant la fin du compte à rebours, arrivée juste après (le temps du réseau) : la carte choisie est posée.
  const juste=poser(e.echeance+marge-1);
  assert.deepEqual(juste.poses.map(p=>p.carte.id),[choisie]);assert.equal(juste.joueurs[0].absences,0);
  // Au-delà de la marge : le serveur a déjà joué la première carte à sa place, et compte une absence.
  const tardif=poser(e.echeance+marge);
  assert.deepEqual(tardif.poses.map(p=>p.carte.id),[e.joueurs[0].main[0].id]);assert.equal(tardif.joueurs[0].absences,1);
  // Un abandon, lui, s'applique à l'heure où il arrive : la pose automatique d'abord.
  const abandon=avancerDirect(e,catalogue,hasard,e.echeance+1,{joueur:1,manche:1,phase:'pose',action:{type:'abandonner'}});
  assert.equal(abandon.phase,'fin');assert.equal(abandon.poses.length,1);
  const fin=avancerDirect(e,catalogue,hasard,1_000_000);assert.equal(fin.phase,'fin');assert.match(fin.raison!,/deux tours/);
  const q=poserToutes(debut('solo'));
  const repondre=(temps:number)=>avancerDirect(q,catalogue,hasard,temps,{joueur:0,manche:1,phase:'reponses',action:{type:'proposer',cible:1,choix:0}}).bilan.find(b=>b.joueur===1)!.choisie;
  assert.equal(repondre(q.echeance+marge-1),q.questions.find(x=>x.cible===1)!.epreuve.propositions[0]);
  assert.equal(repondre(q.echeance+marge),null);
  // Une commande d'une autre étape ne profite pas de la marge.
  const autre=avancerDirect(q,catalogue,hasard,q.echeance+1,{joueur:0,manche:1,phase:'pose',action:{type:'poser',carte:q.joueurs[0].main[0].id,voie:0}});
  assert.equal(autre.bilan.find(b=>b.joueur===1)!.choisie,null);
});
it('direct : l’attaque d’un mot face cachée annonce son bonus d’enchaînement, comme le duel',()=>{
  const e=debut('solo');const tailles=taillesDesFactions(catalogue.cartes);
  const premier=e.joueurs[0].main[0];
  const soeur=catalogue.cartes.find(c=>c.faction===premier.faction && c.id!==premier.id)!;
  e.joueurs[0].derniere=soeur;
  const pose=agir(e,0,{type:'poser',carte:premier.id,voie:0});
  const bonus=bonusDEnchainement(soeur,premier,tailles,EQUILIBRAGE.duel);
  assert.ok(bonus>0);
  const vue=vueDirect(pose,'u1',tailles).poses[0].carte;
  assert.equal(vue.id,ID_FACE_CACHEE);assert.equal(vue.faction,'');
  assert.equal(vue.attaque,faceCachee(premier,bonus).attaque);
  assert.equal(vue.attaque,vueDirect(pose,'u1').poses[0].carte.attaque+bonus);
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
  // Le match à accepter : chacun presse « J'y vais ! » ; le dernier reçoit la partie commencée.
  const accepterTous=async(indices:number[])=>{
    let r:ReponseDirect|undefined;
    for(const i of indices) {
      const lu=await appel(i,{type:'lire'});assert.ok(lu.proposition,`le joueur ${i} a une proposition`);
      r=await appel(i,{type:'accepter',partie:lu.proposition!.id});
    }
    assert.ok(r!.partie,'la partie commence quand tous ont accepté');
    return r!;
  };
  return {...b,outils,appel,chercher,commande,accepterTous,avancer:(ms:number)=>{heure+=ms;}};
}
it('direct SQL : migration répétable, files séparées, authentification et permissions',async()=>{
  const l=await laboratoireDirect();try {
    await l.db.exec(direct());
    const avant=(await l.db.query('select sum(encre)::int n from public.comptes')).rows;
    assert.ok((await l.chercher(0,'solo')).attente);
    assert.ok((await l.chercher(1,'duo_solo')).attente);
    const trouve=await l.chercher(2,'solo');assert.ok(trouve.proposition);assert.equal(trouve.partie,null);
    const r=await l.accepterTous([0,2]);assert.equal(r.partie!.vue.joueurs.length,2);
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
    const r=await l.accepterTous([0,1,2,3]);assert.equal(r.partie!.vue.joueurs.length,4);
    const c=l.commande(r,{type:'abandonner'});
    const fin=await l.appel(0,c);assert.equal(fin.partie!.vue.phase,'fin');assert.deepEqual(fin.partie!.cotes,{avant:1000,apres:984});
    assert.deepEqual((await l.appel(0,c)).partie!.cotes,fin.partie!.cotes);
    await l.admin();
    const cotes=(await l.db.query<{mode:string;jouees:number;cote:number}>('select * from public.direct_cotes')).rows;
    assert.equal(cotes.length,4);assert.ok(cotes.every(c=>c.mode==='duo_solo'&&c.jouees===1));assert.equal(cotes.reduce((s,c)=>s+c.cote,0),4000);
    await l.joueur(0);let classement=(await l.db.query<{r:any}>("select public.classement_direct('duo_solo') r")).rows[0].r;
    assert.deepEqual([classement.total,classement.minimum,classement.moi],[0,EQUILIBRAGE.joute.partiesPourEtreClasse,{cote:984,jouees:1}],'une partie ne suffit pas pour être classé');
    await l.admin();await l.db.query(`update public.direct_cotes set jouees=${EQUILIBRAGE.joute.partiesPourEtreClasse}`);
    await l.joueur(0);classement=(await l.db.query<{r:any}>("select public.classement_direct('duo_solo') r")).rows[0].r;assert.equal(classement.total,4);
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
    assert.ok((await l.chercher(3,'duo_equipe')).proposition);
    const r=await l.accepterTous([0,1,2,3]);assert.equal(new Set(r.partie!.vue.noms).size,2);
    await l.joueur(0);await assert.rejects(l.db.query('select public.quitter_equipe($1)',[equipes[0]]),/Termine/);
    await l.appel(3,l.commande(r,{type:'abandonner'}));
    await l.admin();const cotes=(await l.db.query<{mode:string;sujet:string;jouees:number}>('select * from public.direct_cotes')).rows;
    assert.equal(cotes.length,2);assert.ok(cotes.every(c=>c.mode==='duo_equipe'&&equipes.includes(c.sujet)&&c.jouees===1));
  } finally {await l.db.close();}
});

it('direct SQL : réponses concurrentes et partie solo complète, cote historique conservée',async()=>{
  const l=await laboratoireDirect();try {
    await l.admin();await l.db.query('update public.profils set cote=1200 where utilisateur=$1',[l.ids[0]]);
    await l.chercher(0,'solo');await l.chercher(1,'solo');let r=await l.accepterTous([0,1]);
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
    await l.admin();await l.db.query("update public.direct_file set present_le=now()-interval '2 minutes' where utilisateur=$1",[l.ids[0]]);
    assert.ok((await l.appel(0,{type:'lire'})).attente,'deux minutes sans nouvelles : encore dans la file (onglet caché)');
    await l.admin();await l.db.query("update public.direct_file set present_le=now()-interval '3 minutes' where utilisateur=$1",[l.ids[0]]);
    assert.ok((await l.chercher(1,'solo')).attente);assert.equal((await l.appel(0,{type:'lire'})).attente,null);
    await l.admin();await l.db.query("update public.comptes set deck='[]' where utilisateur=$1",[l.ids[2]]);
    await assert.rejects(l.chercher(2,'solo'),/dix cartes/);
    assert.ok((await l.chercher(0,'solo')).proposition);const r=await l.accepterTous([0,1]);
    assert.equal((await l.appel(3,{type:'lire'})).partie,null);
    await assert.rejects(l.appel(3,l.commande(r,{type:'abandonner'})),/plus active/);
    await l.admin();await assert.rejects(l.db.query('delete from public.profils where utilisateur=$1',[l.ids[0]]),/Termine/);
    await assert.rejects(l.db.query('update public.profils set utilisateur=$2 where utilisateur=$1',[l.ids[0],l.ids[2]]),/Termine/);
    const fin=await l.appel(0,l.commande(r,{type:'abandonner'}));assert.equal(fin.partie!.gains.encre,0);
    await l.admin();await l.db.query('delete from public.profils where utilisateur=$1',[l.ids[0]]);
    await l.admin();await l.db.query(`update public.direct_cotes set jouees=${EQUILIBRAGE.joute.partiesPourEtreClasse}`);
    await l.joueur(1);const classement=(await l.db.query<{r:{total:number}}>("select public.classement_direct('solo') r")).rows[0].r;
    assert.equal(classement.total,1,'un profil supprimé ne figure plus au classement');
  } finally {await l.db.close();}
});

it('direct SQL : le match à accepter — rien ne commence avant que tous acceptent, et ne pas accepter ne coûte rien',async()=>{
  const l=await laboratoireDirect();try {
    await l.chercher(0,'solo');
    const trouve=await l.chercher(1,'solo');
    // Une proposition, sans noms ni cotes : on ne choisit pas ses adversaires en refusant les plus forts.
    assert.deepEqual([trouve.partie,trouve.attente],[null,null]);
    const pr=trouve.proposition!;
    assert.deepEqual({...pr,id:'',accepterAvant:0},{id:'',mode:'solo',accepterAvant:0,acceptes:0,total:2,jAccepte:false});
    assert.ok(Math.abs(pr.accepterAvant-Date.now()-EQUILIBRAGE.direct.secondesPourAccepter*1000)<5000,'le délai pour accepter');
    // Personne ne peut jouer avant d'avoir accepté.
    await assert.rejects(l.appel(0,{type:'agir',partie:pr.id,requete:crypto.randomUUID(),manche:1,phase:'pose',action:{type:'abandonner'}}),/pas encore commencé/);
    // Le premier accepte et attend l'autre ; un second clic ne compte pas deux fois.
    const a0=await l.appel(0,{type:'accepter',partie:pr.id});
    assert.deepEqual([a0.proposition!.acceptes,a0.proposition!.jAccepte],[1,true]);
    assert.equal((await l.appel(0,{type:'accepter',partie:pr.id})).proposition!.acceptes,1);
    assert.equal((await l.appel(1,{type:'lire'})).proposition!.jAccepte,false);
    // Le délai passe : la proposition tombe. Celui qui avait accepté reprend sa place, l'absent sort de la file.
    await l.admin();await l.db.query("update public.direct_parties set accepter_avant=now()-interval '1 second'");
    const apres0=await l.appel(0,{type:'lire'});
    assert.deepEqual([apres0.proposition,apres0.partie,apres0.attente?.mode],[null,null,'solo']);
    assert.deepEqual(Object.values(await l.appel(1,{type:'lire'})).slice(2),[null,null,null],'ni file, ni partie, ni proposition');
    await assert.rejects(l.appel(1,{type:'accepter',partie:pr.id}),/expiré/,'accepter trop tard');
    await l.admin();
    assert.equal((await l.db.query<{n:number}>('select count(*)::int n from public.direct_parties')).rows[0].n,0);
    assert.equal((await l.db.query<{n:number}>('select count(*)::int n from public.direct_cotes where jouees>0')).rows[0].n,0,'aucune cote ne bouge');
    // Il garde son rang : face à deux nouveaux venus, c'est lui qui est choisi, et le dernier arrivé attend.
    assert.ok((await l.chercher(2,'solo')).proposition);
    assert.ok((await l.chercher(3,'solo')).attente);
    // Le joueur 2 refuse : le joueur 0 reprend sa place, sans défaite, et retrouve aussitôt le joueur 3.
    const lu2=await l.appel(2,{type:'lire'});
    assert.deepEqual(Object.values(await l.appel(2,{type:'refuser',partie:lu2.proposition!.id})).slice(2),[null,null,null]);
    assert.ok((await l.appel(0,{type:'lire'})).proposition,'une nouvelle proposition, avec le joueur 3');
    const r=await l.accepterTous([0,3]);assert.deepEqual(r.partie!.vue.noms.slice().sort(),['lecteur0','lecteur3']);
  } finally {await l.db.close();}
});

it('direct SQL : une proposition échue ne bloque ni l’entraînement, ni le retrait du profil',async()=>{
  const l=await laboratoireDirect();try {
    await l.chercher(0,'solo');assert.ok((await l.chercher(1,'solo')).proposition);
    await l.admin();
    const combat=(i:number)=>l.db.query("insert into public.combats(id,utilisateur,etat,vue) values($1,$2,'{}','{}')",[crypto.randomUUID(),l.ids[i]]);
    await assert.rejects(combat(0),/Quitte la recherche/,'une proposition en cours bloque l’entraînement');
    await l.db.query("update public.direct_parties set accepter_avant=now()-interval '1 second'");
    await combat(0);
    await l.db.query('delete from public.profils where utilisateur=$1',[l.ids[1]]);
    assert.equal((await l.db.query<{n:number}>('select count(*)::int n from public.direct_parties')).rows[0].n,0,'la proposition échue est défaite en passant');
  } finally {await l.db.close();}
});

it('direct SQL : regarder l’écran des joutes ne réserve rien',async()=>{
  const l=await laboratoireDirect();try {
    assert.deepEqual([(await l.appel(0,{type:'lire'})).attente,(await l.appel(0,{type:'lire'})).partie],[null,null]);
    await l.admin();await l.db.query('delete from public.profils where utilisateur=$1',[l.ids[0]]);
    await assert.rejects(l.appel(0,{type:'lire'}),/pseudonyme/);
  } finally {await l.db.close();}
});

it('le script 17 s’applique par-dessus le direct installé, deux fois de suite sans erreur',async()=>{
  const l=await laboratoireDirect();try {
    await l.chercher(0,'solo');
    await l.admin();await l.db.exec(migrationTenueDuServeur());await l.db.exec(migrationTenueDuServeur());
    assert.ok((await l.chercher(1,'solo')).proposition,'la file d’avant est gardée');
  } finally {await l.db.close();}
});

it('direct SQL : le classement — filtres normalisés, trois rencontres classées par jour, gagnant récompensé d’un abandon',async()=>{
  const l=await laboratoireDirect();try {
    // Deux comptes qui choisissent les mêmes filtres dans un ordre ou avec des doublons différents sont réunis avec
    // tout le monde : pas de file à part.
    assert.ok((await l.appel(0,{type:'chercher',mode:'solo',masques:['Vieilli','Familier','Vieilli']})).attente);
    assert.ok((await l.appel(1,{type:'chercher',mode:'solo',masques:['Familier','Vieilli']})).proposition);
    await l.admin();await l.db.query('delete from public.direct_parties');
    const K=EQUILIBRAGE.joute.rencontresClasseesParJour;
    const cotes:({avant:number;apres:number}|null)[]=[];
    for(let partie=0;partie<K+1;partie++) {
      await l.chercher(0,'solo');await l.chercher(1,'solo');
      const r=await l.accepterTous([0,1]);
      // Le joueur 1 abandonne aussitôt : le joueur 0 gagne.
      const fin1=await l.appel(1,l.commande(r,{type:'abandonner'}));
      assert.equal(fin1.partie!.gains.encre,0,'celui qui abandonne ne reçoit rien');
      const fin0=await l.appel(0,{type:'lire'});
      assert.equal(fin0.partie!.vue.vainqueur,fin0.partie!.vue.joueurs[fin0.partie!.vue.moi].equipe);
      if(partie===0) assert.ok(fin0.partie!.gains.encre>0 && fin0.partie!.gains.xp>0,'le gagnant d’un abandon est récompensé');
      cotes.push(fin0.partie!.cotes);
      await l.appel(0,{type:'quitter'});await l.appel(1,{type:'quitter'});
    }
    assert.ok(cotes.slice(0,K).every(c=>c && c.apres>c.avant),'les premières rencontres du jour font bouger la cote');
    assert.equal(cotes[K],null,'au-delà, la cote ne bouge plus');
    await l.admin();
    const lignes=(await l.db.query<{jouees:number}>("select jouees from public.direct_cotes where mode='solo'")).rows;
    assert.deepEqual(lignes.map(x=>x.jouees),[K,K],'seules les parties classées comptent pour entrer au classement');
    // Le même joueur face à un autre adversaire : la cote bouge de nouveau.
    await l.chercher(0,'solo');await l.chercher(2,'solo');
    const r=await l.accepterTous([0,2]);
    await l.appel(2,l.commande(r,{type:'abandonner'}));
    assert.ok((await l.appel(0,{type:'lire'})).partie!.cotes);
  } finally {await l.db.close();}
});

it('direct SQL : un profil supprimé puis recréé retrouve sa cote ; tout s’efface avec le compte',async()=>{
  const l=await laboratoireDirect();try {
    await l.chercher(0,'solo');await l.chercher(1,'solo');
    const r=await l.accepterTous([0,1]);await l.appel(1,l.commande(r,{type:'abandonner'}));
    await l.appel(0,{type:'quitter'});await l.appel(1,{type:'quitter'});
    await l.admin();
    const avant=(await l.db.query<{id:string;cote:number;jouees:number}>('select id,cote,jouees from public.profils where utilisateur=$1',[l.ids[1]])).rows[0];
    assert.ok(avant.cote<1000 && avant.jouees===1);
    // Le perdant retire son profil, puis le recrée : même identité, même cote, mêmes cotes en direct.
    await l.joueur(1);await l.db.query('select public.supprimer_mon_profil()');
    const pub=await l.db.query<{r:{accepte:boolean;cote:number}}>("select public.publier_mon_profil('revenant',$1,'{}','{}') r",[JSON.stringify(deck)]);
    assert.deepEqual(pub.rows[0].r,{accepte:true,cote:avant.cote});
    await l.admin();
    const apres=(await l.db.query<{id:string;cote:number;jouees:number;pseudo:string}>('select id,cote,jouees,pseudo from public.profils where utilisateur=$1',[l.ids[1]])).rows[0];
    assert.deepEqual(apres,{...avant,pseudo:'revenant'});
    await l.joueur(1);const vue=(await l.db.query<{r:any}>("select public.classement_direct('solo') r")).rows[0].r;
    assert.deepEqual(vue.moi,{cote:avant.cote,jouees:1},'ses parties en direct l’ont suivi');
    // Effacer tout son compte efface aussi ses cotes.
    await l.db.query('select public.supprimer_mon_compte()');
    await l.admin();
    assert.equal((await l.db.query<{n:number}>('select count(*)::int n from public.direct_cotes where sujet=$1',[avant.id])).rows[0].n,0);
    assert.equal((await l.db.query<{n:number}>('select count(*)::int n from public.direct_cotes')).rows[0].n,1,'celle de l’autre joueur reste');
  } finally {await l.db.close();}
});

it('le script 18 s’applique par-dessus le direct installé, deux fois de suite sans erreur',async()=>{
  const l=await laboratoireDirect();try {
    await l.chercher(0,'solo');
    await l.admin();await l.db.exec(migrationClassement());await l.db.exec(migrationClassement());
    assert.ok((await l.chercher(1,'solo')).proposition,'la file d’avant est gardée');
  } finally {await l.db.close();}
});
