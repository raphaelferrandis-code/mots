// Deux navigateurs et PostgreSQL embarqué ; aucun appel au serveur de production.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { createServer } from 'vite';
import { baseDeTest } from './test-base.ts';
import { nouvelleSauvegarde } from '../src/jeu/sauvegarde.ts';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const b = await baseDeTest(true);
await b.db.exec(`insert into public.amities(demandeur,destinataire,acceptee)
  select a.id,c.id,true from public.profils a,public.profils c where a.pseudo='lecteur0' and c.pseudo='lecteur1'`);
const erreurs = [];
let file = Promise.resolve();
const serialiser = f => { const r = file.then(f); file = r.catch(() => {}); return r; };
const vite = await createServer({ server: { host:'127.0.0.1', port:5189, strictPort:true } });
let navigateur;
try {
  await vite.listen();
  navigateur = await chromium.launch({ channel:process.env.BROWSER_CHANNEL ?? 'chrome', headless:true });
  const pages = [];
  for (const joueur of [0,1]) {
    const contexte = await navigateur.newContext({ viewport:{width:1366,height:1000} });
    await contexte.route('**/*', async route => {
      const req=route.request(), u=new URL(req.url());
      if (u.hostname === '127.0.0.1') return route.continue();
      if (!u.hostname.endsWith('.supabase.co')) { erreurs.push(`Réseau inattendu : ${u.hostname}`); return route.abort(); }
      const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'};
      if (req.method()==='OPTIONS') return route.fulfill({status:204,headers});
      try {
        const nom=u.pathname.split('/').at(-1), corps=req.postDataJSON();
        assert.ok(['mon_compte','mes_amis','mon_equipe','creer_equipe','modifier_equipe','inviter_equipier','repondre_invitation_equipe','quitter_equipe','dissoudre_equipe'].includes(nom),`RPC inattendue : ${nom}`);
        const r=await serialiser(async () => {
          await b.joueur(joueur);
          return (await b.db.query(`select public.${nom}(${Object.keys(corps).map((k,i)=>{assert.match(k,/^p_[a-z_]+$/);return `${k}=>$${i+1}`;}).join(',')}) r`,Object.values(corps))).rows[0].r;
        });
        return route.fulfill({status:200,headers,body:JSON.stringify(r)});
      } catch(e) { erreurs.push(e.message); return route.fulfill({status:400,headers,body:JSON.stringify({code:'P0001',message:e.message})}); }
    });
    const sauvegarde=nouvelleSauvegarde(Date.now(),3);
    sauvegarde.profil.pseudo=`lecteur${joueur}`; sauvegarde.joutes.pseudo=`lecteur${joueur}`;
    await contexte.addInitScript(({sauvegarde})=>{
      localStorage.setItem('mots.vrai-serveur','oui');
      localStorage.setItem('mots.session',JSON.stringify({acces:'test-local',renouvellement:'test-local',expireLe:Date.now()+3600000}));
      if(!localStorage.getItem('mots.sauvegarde')) localStorage.setItem('mots.sauvegarde',JSON.stringify(sauvegarde));
    },{sauvegarde});
    const page=await contexte.newPage();
    page.on('pageerror',e=>erreurs.push(e.message));
    await page.goto('http://127.0.0.1:5189/#/equipe');
    await page.getByRole('heading',{name:'Créer une équipe',exact:true}).waitFor();
    pages.push(page);
  }
  const [a,c]=pages;
  await a.getByLabel('Nom d’équipe',{exact:true}).fill('Les Encriers');
  await a.getByRole('radio',{name:'Étoile',exact:true}).check();
  await a.getByRole('button',{name:'Créer mon équipe',exact:true}).click();
  await a.getByRole('heading',{name:'Les Encriers',exact:true}).waitFor();
  await a.getByLabel('Ton ami',{exact:true}).selectOption({label:'lecteur1'});
  await a.getByRole('button',{name:'Inviter',exact:true}).click();
  await a.getByRole('button',{name:'Annuler l’invitation',exact:true}).waitFor();
  await c.goto('http://127.0.0.1:5189/#/amis');
  await c.getByRole('link',{name:'Mon équipe · 1 invitation',exact:true}).click();
  await c.getByRole('button',{name:'Rejoindre',exact:true}).click();
  await c.getByText('2 / 2 joueurs',{exact:true}).waitFor();
  assert.equal(await c.getByRole('button',{name:'Modifier l’équipe',exact:true}).count(),0);
  await a.getByRole('button',{name:'Actualiser',exact:true}).click();
  await a.getByText('2 / 2 joueurs',{exact:true}).waitFor();
  await a.getByRole('button',{name:'Modifier l’équipe',exact:true}).click();
  await a.getByLabel('Nom d’équipe',{exact:true}).fill('Les Plumes');
  await a.getByRole('radio',{name:'Lune',exact:true}).check();
  await a.getByRole('button',{name:'Enregistrer',exact:true}).click();
  await a.getByRole('heading',{name:'Les Plumes',exact:true}).waitFor();
  mkdirSync('output/verification-equipes',{recursive:true});
  await a.screenshot({path:'output/verification-equipes/equipe-ordinateur.png',fullPage:true});
  for (const width of [320,390,768,1366]) {
    await a.setViewportSize({width,height:900});
    assert.ok(await a.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`pas de débordement à ${width}px`);
    if(width===390) await a.screenshot({path:'output/verification-equipes/equipe-mobile.png',fullPage:true});
  }
  await c.reload();
  await c.getByRole('heading',{name:'Les Plumes',exact:true}).waitFor();
  await a.getByRole('button',{name:'Quitter l’équipe',exact:true}).click();
  await a.getByRole('button',{name:'Confirmer',exact:true}).click();
  await a.getByRole('heading',{name:'Créer une équipe',exact:true}).waitFor();
  await c.getByRole('button',{name:'Actualiser',exact:true}).click();
  await c.getByRole('button',{name:'Modifier l’équipe',exact:true}).waitFor();
  await c.getByRole('button',{name:'Dissoudre l’équipe',exact:true}).click();
  await c.getByRole('button',{name:'Confirmer',exact:true}).click();
  await c.getByRole('heading',{name:'Créer une équipe',exact:true}).waitFor();
  assert.deepEqual(erreurs,[]);
  console.log('Équipes : création, invitation via Amis, acceptation, nom et emblème, reprise, transfert de capitaine et dissolution vérifiés. Aucun débordement de 320 à 1366 px.');
} finally { await navigateur?.close(); await vite.close(); await b.db.close(); }
