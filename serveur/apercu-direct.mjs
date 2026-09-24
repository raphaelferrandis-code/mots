// Banc local à quatre origines : vrais écrans, moteur et PostgreSQL, aucun compte distant.
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { baseDeTest } from './test-base.ts';
import { direct } from './direct.ts';
import { cartes } from './collections.ts';
import { gestionnaireDirect } from './api-direct.ts';
import { nouvelleSauvegarde } from '../src/jeu/sauvegarde.ts';
const brut=JSON.parse(readFileSync(new URL('../supabase/functions/_shared/catalogue-combat.json',import.meta.url),'utf8'));
const catalogue={cartes:brut.cartes,definitions:new Map(brut.definitions)};
const deck=brut.cartes.filter(c=>c.registre.length===0&&c.rarete==='Commune').slice(0,10).map(c=>c.id);
const b=await baseDeTest(true);await b.db.exec(direct());
b.ids.push('44444444-4444-4444-8444-444444444444');
await b.db.query('insert into auth.users values($1)',[b.ids[3]]);
await b.db.query('insert into public.comptes(utilisateur) values($1)',[b.ids[3]]);
await b.db.query("insert into public.profils(utilisateur,pseudo,pseudo_cle) values($1,'lecteur3','lecteur3')",[b.ids[3]]);
await b.db.exec(cartes({cartes:brut.cartes,meta:{edition:1,version:'test'}}));
for(const uid of b.ids) {
  for(const id of deck) await b.db.query(`insert into public.possessions(utilisateur,carte,finitions) values($1,$2,'{"Normale":1}')`,[uid,id]);
  await b.db.query('update public.comptes set deck=$2 where utilisateur=$1',[uid,JSON.stringify(deck)]);
}
const profils=(await b.db.query('select id from public.profils order by pseudo')).rows;
for(let c=0;c<2;c++) {
  const id=crypto.randomUUID();await b.db.query('insert into public.equipes(id,nom,nom_cle,embleme) values($1,$2,$2,\'plume\')',[id,`Les Encriers ${c+1}`]);
  for(let j=0;j<2;j++) await b.db.query('insert into public.equipiers(profil,equipe,place) values($1,$2,$3)',[profils[c*2+j].id,id,j+1]);
}
let file=Promise.resolve();let avance=0;const horloge=Date.now();
const serialiser=f=>{const r=file.then(f);file=r.catch(()=>{});return r;};
const rpc=(nom,args)=>serialiser(async()=>{
  await b.db.exec('set role service_role');
  const r=(await b.db.query(`select public.${nom}(${Object.keys(args).map((k,i)=>`${k}=>$${i+1}`).join(',')}) r`,Object.values(args).map(v=>v!==null&&typeof v==='object'?JSON.stringify(v):v))).rows[0].r;
  if(nom==='direct_contexte') r.maintenant=horloge+avance;
  return r;
});
for(let i=0;i<4;i++) {
  const port=5190+i;
  const sauvegarde=nouvelleSauvegarde(Date.now(),3);sauvegarde.joutes.pseudo=`lecteur${i}`;
  const handler=gestionnaireDirect({rpc,catalogue,hasard:()=>0.72,maintenant:()=>Date.now()+avance,identifiant:()=>crypto.randomUUID(),authentifier:async token=>token===`test${i}`?b.ids[i]:null});
  const vite=await createServer({server:{host:'127.0.0.1',port,strictPort:true},plugins:[{
    name:'banc-direct',enforce:'pre',
    transform(source,id) { if(id.replaceAll('\\','/').endsWith('/src/config/serveur.ts')) return source.replace(/adresse: '[^']*'/,`adresse: 'http://127.0.0.1:${port}/api'`); },
    transformIndexHtml() { return [{tag:'script',injectTo:'head-prepend',children:`localStorage.setItem('mots.vrai-serveur','oui');localStorage.setItem('mots.session',JSON.stringify({acces:'test${i}',renouvellement:'test${i}',expireLe:Date.now()+86400000}));if(!localStorage.getItem('mots.sauvegarde'))localStorage.setItem('mots.sauvegarde',${JSON.stringify(JSON.stringify(sauvegarde))});`}]; },
    configureServer(server) {
      server.middlewares.use(async(req,res,next)=>{
        if(req.url==='/__test/advance'&&req.method==='POST') { avance+=31_000;res.end('Horloge avancée de 31 secondes');return; }
        if(req.url==='/__test/state') {res.setHeader('Content-Type','application/json');res.end(JSON.stringify(await rpc('direct_contexte',{p_utilisateur:b.ids[i]})));return;}
        if(!req.url?.startsWith('/api/')) return next();
        try {
          let text='';for await(const chunk of req) text+=chunk;
          if(req.url==='/api/functions/v1/joutes-direct') {
            const rep=await handler(new Request('http://local/joutes',{method:'POST',headers:{Authorization:req.headers.authorization??''},body:text}));
            res.statusCode=rep.status;res.setHeader('Content-Type','application/json');res.end(await rep.text());return;
          }
          const nom=req.url.split('/').at(-1);const args=text?JSON.parse(text):{};
          if(!['mon_compte','mon_equipe','classement_direct','publier_mon_profil','changer_mon_deck'].includes(nom)) throw new Error(`RPC inattendue ${nom}`);
          const r=await serialiser(async()=>{
            await b.joueur(i);
            return (await b.db.query(`select public.${nom}(${Object.keys(args).map((k,i)=>{if(!/^p_[a-z_]+$/.test(k))throw new Error('Paramètre inconnu');return `${k}=>$${i+1}`;}).join(',')}) r`,Object.values(args).map(v=>v!==null&&typeof v==='object'?JSON.stringify(v):v))).rows[0].r;
          });res.setHeader('Content-Type','application/json');res.end(JSON.stringify(r));
        } catch(e) { console.error(e.message);res.statusCode=500;res.end(JSON.stringify({erreur:e.message})); }
      });
    },
  }]});await vite.listen();
  console.log(`Joueur ${i+1}: http://127.0.0.1:${port}/#/joutes`);
}
