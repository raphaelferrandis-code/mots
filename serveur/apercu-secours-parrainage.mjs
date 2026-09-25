// Banc local pour l'adversaire de secours et le parrainage : vrais écrans, vrais moteurs (combats vérifiés, joutes en
// direct) et PostgreSQL embarqué avec le script 13. Aucun compte distant, rien n'est envoyé à Supabase.
//   node serveur/apercu-secours-parrainage.mjs
// Parrain (lecteur0, deck prêt) : http://127.0.0.1:5190/#/amis   — et #/joutes pour l'adversaire de secours
// Nouveau venu (sans pseudonyme)  : http://127.0.0.1:5191/?parrain=<code du parrain>
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { baseDeTest } from './test-base.ts';
import { direct } from './direct.ts';
import { secours } from './secours.ts';
import { parrainage } from './parrainage.ts';
import { cartes } from './collections.ts';
import { gestionnaireDirect } from './api-direct.ts';
import { ErreurCombat, gestionnaireCombat } from './api-combat.ts';
import { nouvelleSauvegarde } from '../src/jeu/sauvegarde.ts';

const brut = JSON.parse(readFileSync(new URL('../supabase/functions/_shared/catalogue-combat.json', import.meta.url), 'utf8'));
const catalogue = { cartes: brut.cartes, definitions: new Map(brut.definitions) };
const deck = brut.cartes.filter(c => c.registre.length === 0 && c.rarete === 'Commune').slice(0, 10).map(c => c.id);
const b = await baseDeTest(true);
await b.db.exec(direct() + secours() + parrainage());
await b.db.exec(cartes({ cartes: brut.cartes, meta: { edition: 1, version: 'test' } }));
const NOUVEAU = '44444444-4444-4444-8444-444444444444';
await b.db.query('insert into auth.users(id,is_anonymous) values($1,true)', [NOUVEAU]); // un invité, comme tout visiteur
await b.db.query('insert into public.comptes(utilisateur) values($1)', [NOUVEAU]);
const joueurs = [b.ids[0], NOUVEAU];
for (const uid of joueurs) {
  for (const id of deck) await b.db.query(`insert into public.possessions(utilisateur,carte,finitions) values($1,$2,'{"Normale":1}')`, [uid, id]);
  await b.db.query('update public.comptes set deck=$2 where utilisateur=$1', [uid, JSON.stringify(deck)]);
}
for (const [pseudo, cote] of [['Calame', 980], ['Enluminure', 1020], ['Palimpseste', 1100]])
  await b.db.query('insert into public.profils(maison,pseudo,pseudo_cle,cote,deck) values(true,$1,$1,$2,$3)', [pseudo, cote, JSON.stringify(deck)]);

let file = Promise.resolve();
const serialiser = f => { const r = file.then(f); file = r.catch(() => {}); return r; };
const valeurs = args => Object.values(args).map(v => v !== null && typeof v === 'object' && !Array.isArray(v) ? JSON.stringify(v) : v);
const appel = (nom, args) => `select public.${nom}(${Object.keys(args).map((k, i) => { if (!/^p_[a-z_]+$/.test(k)) throw new Error('Paramètre inconnu'); return `${k}=>$${i + 1}`; }).join(',')}) r`;
// Comme la fonction Edge : les refus SQL deviennent des refus lisibles.
const rpc = (nom, args) => serialiser(async () => {
  await b.db.exec('set role service_role');
  try { return (await b.db.query(`select public.${nom}(${Object.keys(args).map((k, i) => `${k}=>$${i + 1}`).join(',')}) r`, Object.values(args).map(v => v !== null && typeof v === 'object' ? JSON.stringify(v) : v))).rows[0].r; }
  catch (e) { throw new ErreurCombat(e.message, 400); }
});
const RPC_PERMISES = ['mon_compte', 'ouvrir_mon_compte', 'mon_equipe', 'classement_direct', 'publier_mon_profil', 'changer_de_deck', 'mes_amis',
  'ouvrir_un_paquet', 'mon_parrainage', 'declarer_mon_parrain', 'adversaires_de_secours', 'mettre_a_jour_mon_profil_public'];

for (const [i, uid] of joueurs.entries()) {
  const port = 5190 + i;
  const outils = { rpc, catalogue, hasard: Math.random, maintenant: Date.now, identifiant: () => crypto.randomUUID(), authentifier: async token => token === `test${i}` ? uid : null };
  const joutes = gestionnaireDirect(outils);
  const combats = gestionnaireCombat(outils);
  const sauvegarde = nouvelleSauvegarde(Date.now(), 3);
  sauvegarde.joutes.pseudo = i === 0 ? 'lecteur0' : '';
  const vite = await createServer({ server: { host: '127.0.0.1', port, strictPort: true }, plugins: [{
    name: 'banc-secours', enforce: 'pre',
    transform(source, id) { if (id.replaceAll('\\', '/').endsWith('/src/config/serveur.ts')) return source.replace(/adresse: '[^']*'/, `adresse: 'http://127.0.0.1:${port}/api'`).replace('secoursEtParrainage: false', 'secoursEtParrainage: true'); },
    transformIndexHtml() { return [{ tag: 'script', injectTo: 'head-prepend', children: `localStorage.setItem('mots.vrai-serveur','oui');localStorage.setItem('mots.session',JSON.stringify({acces:'test${i}',renouvellement:'test${i}',expireLe:Date.now()+86400000}));if(!localStorage.getItem('mots.sauvegarde'))localStorage.setItem('mots.sauvegarde',${JSON.stringify(JSON.stringify(sauvegarde))});` }]; },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        let texte = ''; for await (const morceau of req) texte += morceau;
        res.setHeader('Content-Type', 'application/json');
        const fonction = { '/api/functions/v1/joutes-direct': joutes, '/api/functions/v1/combats': combats }[req.url];
        if (fonction) {
          const r = await fonction(new Request('http://local/', { method: 'POST', headers: { Authorization: req.headers.authorization ?? '' }, body: texte }));
          res.statusCode = r.status; res.end(await r.text()); return;
        }
        const nom = req.url.split('/').at(-1); const args = texte ? JSON.parse(texte) : {};
        if (!RPC_PERMISES.includes(nom)) { console.error(`RPC non prévue par le banc : ${nom}`); res.statusCode = 404; res.end(JSON.stringify({ code: 'PGRST202', message: nom })); return; }
        try {
          const r = await serialiser(async () => { await b.joueur(0); await b.db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]); return (await b.db.query(appel(nom, args), valeurs(args))).rows[0].r; });
          res.end(JSON.stringify(r));
        } catch (e) { res.statusCode = 400; res.end(JSON.stringify({ code: 'P0001', message: e.message })); }
      });
    },
  }] });
  await vite.listen();
  console.log(`${i === 0 ? 'Parrain (lecteur0)' : 'Nouveau venu'} : http://127.0.0.1:${port}/`);
}
