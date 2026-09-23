// Vérification de l'interface contre PostgreSQL embarqué, sans requête au vrai serveur.
// Node >=22.18 ; Playwright installé ou PLAYWRIGHT_MODULE pointant vers son répertoire.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import { baseDeTest } from './test-base.ts';
import { cartes } from './collections.ts';
import { gestionnaireCombat, ErreurCombat } from './api-combat.ts';
import { nouvelleSauvegarde } from '../src/jeu/sauvegarde.ts';

const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const edition=JSON.parse(readFileSync(new URL('../public/data/edition-1.index.json',import.meta.url),'utf8'));
const brut=JSON.parse(readFileSync(new URL('../supabase/functions/_shared/catalogue-combat.json',import.meta.url),'utf8'));
const b=await baseDeTest(true);
console.log('Base locale prête.');
const deck=edition.cartes.filter(c=>c.registre.length===0&&c.rarete==='Commune').slice(0,10).map(c=>c.id);
await b.db.exec(cartes(edition));
for(const id of deck) await b.db.query(`insert into public.possessions(utilisateur,carte,finitions) values($1,$2,'{"Normale":1}')`,[b.ids[0],id]);
await b.db.query('update public.comptes set deck=$2 where utilisateur=$1',[b.ids[0],JSON.stringify(deck)]);
const outils={catalogue:{cartes:brut.cartes,definitions:new Map(brut.definitions)},hasard:()=>0.999,maintenant:Date.now,identifiant:()=>crypto.randomUUID(),
  authentifier:async jeton=>jeton==='test-local'?b.ids[0]:null,
  rpc:async(nom,args)=>{
    assert.ok(['combat_contexte','combat_creer','combat_appliquer'].includes(nom));
    await b.db.exec('set role service_role');
    try { return (await b.db.query(`select public.${nom}(${Object.keys(args).map((k,i)=>`${k}=>$${i+1}`).join(',')}) r`,Object.values(args).map(v=>v!==null&&typeof v==='object'?JSON.stringify(v):v))).rows[0].r; }
    catch(e) { if(e.code==='P0001') throw new ErreurCombat(e.message,/avancé/.test(e.message)?409:400); throw e; }
  }};
const handler=gestionnaireCombat(outils);
const vite=await createServer({server:{host:'127.0.0.1',port:5187,strictPort:true}});
console.log('Vite prêt.');
let navigateur;
try {
  await vite.listen();
  console.log('Aperçu local démarré.');
  navigateur=await chromium.launch({channel:process.env.BROWSER_CHANNEL ?? 'chrome',headless:true});
  console.log('Navigateur démarré.');
  const contexte=await navigateur.newContext({viewport:{width:1280,height:900}});
  const erreurs=[]; const commandes=[]; let couper=false; let file=Promise.resolve();
  const serialiser=f=>{const r=file.then(f);file=r.catch(()=>{});return r;};
  const prive=()=>serialiser(async()=>{await b.admin();return (await b.db.query('select * from public.combats where utilisateur=$1 and not archive',[b.ids[0]])).rows[0];});
  await contexte.route('**/*',async route=>{
    const req=route.request(),u=new URL(req.url());
    if(u.hostname==='127.0.0.1') return route.continue();
    if(!u.hostname.endsWith('.supabase.co')) {erreurs.push(`Réseau inattendu : ${u.hostname}`);return route.abort();}
    const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'};
    if(req.method()==='OPTIONS') return route.fulfill({status:204,headers});
    try {
      const corps=req.postDataJSON();
      if(u.pathname==='/functions/v1/combats') {
        commandes.push(corps);
        const rep=await serialiser(()=>handler(new Request('http://local/combats',{method:'POST',headers:{Authorization:'Bearer test-local'},body:JSON.stringify(corps)})));
        const body=await rep.text();
        if(couper&&corps.type==='agir'&&corps.action.type==='repondre') {couper=false;return route.abort('connectionfailed');}
        return route.fulfill({status:rep.status,headers,body});
      }
      const nom=u.pathname.split('/').at(-1);
      assert.ok(['mon_compte','publier_mon_profil','adversaires','classement','changer_mon_deck'].includes(nom),`RPC inattendue : ${nom}`);
      const r=await serialiser(async()=>{await b.joueur(0);return (await b.db.query(`select public.${nom}(${Object.keys(corps).map((k,i)=>{assert.match(k,/^p_[a-z_]+$/);return `${k}=>$${i+1}`;}).join(',')}) r`,Object.values(corps).map(v=>v!==null&&typeof v==='object'?JSON.stringify(v):v))).rows[0].r;});
      return route.fulfill({status:200,headers,body:JSON.stringify(r)});
    } catch(e) {erreurs.push(e.message);return route.fulfill({status:500,headers,body:JSON.stringify({erreur:e.message})});}
  });
  const ancienne=nouvelleSauvegarde(Date.now(),3);ancienne.profil.xp=750;
  await contexte.addInitScript(({ancienne})=>{
    localStorage.setItem('mots.vrai-serveur','oui');
    localStorage.setItem('mots.session',JSON.stringify({acces:'test-local',renouvellement:'test-local',expireLe:Date.now()+3600000}));
    if(!localStorage.getItem('mots.sauvegarde')) localStorage.setItem('mots.sauvegarde',JSON.stringify(ancienne));
  },{ancienne});
  const page=await contexte.newPage();page.on('pageerror',e=>erreurs.push(e.message));
  page.on('dialog',d=>d.accept());
  const phase=nom=>page.locator(`main[data-phase="${nom}"]`).waitFor();
  await page.goto('http://127.0.0.1:5187/#/duel');
  console.log('Page du duel chargée.');
  await page.getByRole('button',{name:'Lancer le duel'}).click(); await phase('choix');
  await page.locator('.duel__main button').first().click(); await page.getByRole('button',{name:'Jouer',exact:true}).click(); await phase('attaque');
  const avant=await prive();
  assert.equal(avant.vue.etape.epreuve.bonne,-1);
  // Perdre l'accusé de réception après validation serveur, puis rejouer le même identifiant.
  await page.waitForTimeout(550); couper=true;
  await page.locator('.epreuve__propositions button').nth(avant.etat.etape.epreuve.bonne).click();
  await page.getByRole('button',{name:'Réessayer',exact:true}).click(); await phase('parade');
  const reponses=commandes.filter(c=>c.type==='agir'&&c.action.type==='repondre');
  assert.equal(reponses.length,2);assert.equal(reponses[0].requete,reponses[1].requete);
  assert.equal((await prive()).xp,5);
  // Rechargement et deuxième écran : la même question revient, sans nouveau tirage.
  await page.reload();await phase('parade');
  const seconde=await contexte.newPage(); await seconde.goto('http://127.0.0.1:5187/#/duel');await seconde.locator('main[data-phase="parade"]').waitFor();
  await page.waitForTimeout(550);
  await page.locator('.epreuve__propositions button').nth((await prive()).etat.etape.epreuve.bonne).click();await phase('bilan');
  await seconde.locator('.epreuve__propositions button').first().click();
  await seconde.getByRole('button',{name:'Reprendre la partie enregistrée'}).click();await seconde.locator('main[data-phase="bilan"]').waitFor();await seconde.close();
  for(let garde=0;garde<50;garde++) {
    const p=await prive(); if(p.etat.etape.nom==='fin') break;
    if(p.etat.etape.nom==='bilan') await page.getByRole('button',{name:p.termine?'Voir le résultat':'Manche suivante'}).click();
    else if(p.etat.etape.nom==='choix') {await page.locator('.duel__main button').first().click();await page.getByRole('button',{name:'Jouer',exact:true}).click();}
    else {await page.waitForTimeout(550);await page.locator('.epreuve__propositions button').nth(p.etat.etape.epreuve.bonne).click();}
    await page.waitForFunction(()=>document.querySelector('main.duel')?.getAttribute('aria-busy')==='false');
  }
  await phase('fin'); assert.equal((await prive()).etat.resultat,'victoire');
  for(let garde=0;garde<30 && await page.locator('.recompenses__suite button').count();garde++) await page.locator('.recompenses__suite button').click();
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'pas de débordement horizontal mobile');
  await page.waitForTimeout(1500);
  await page.screenshot({path:'test-combat-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Changer de niveau'}).click();await page.getByRole('button',{name:'Lancer le duel'}).waitFor();
  await page.getByRole('button',{name:'Lancer le duel'}).click();await phase('choix');
  await page.locator('.duel__main button').first().click();await page.getByRole('button',{name:'Jouer',exact:true}).click();await phase('attaque');
  await page.waitForTimeout(550);
  await page.locator('.epreuve__propositions button').nth(((await prive()).etat.etape.epreuve.bonne+1)%4).click();await phase('echappe');
  await page.getByRole('button',{name:'Passer à la parade'}).click();await phase('parade');
  await page.getByRole('button',{name:'Abandonner',exact:true}).click();await phase('fin');
  assert.equal((await prive()).recompense.encre,0);
  await page.goto('http://127.0.0.1:5187/#/reglages');await page.getByText('Ton ancienne progression locale', {exact:false}).waitFor();
  assert.deepEqual(erreurs,[]);
  console.log('Interface validée : combat complet, réponse perdue, même commande, reprise, conflit entre écrans, réponse fausse, abandon, XP serveur, archive locale et mobile 390 px. Aucun appel au serveur distant.');
} finally {await navigateur?.close();await vite.close();await b.db.close();}
