// Deux vrais clients du jeu face à PostgreSQL embarqué. Aucun appel au serveur de production.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'vite';
import { baseDeTest } from './test-base.ts';
import { cartes } from './collections.ts';
import { gestionnaireCombat, ErreurCombat } from './api-combat.ts';
import { nouvelleSauvegarde } from '../src/jeu/sauvegarde.ts';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const edition = JSON.parse(readFileSync(new URL('../public/data/edition-1.index.json', import.meta.url), 'utf8'));
const brut = JSON.parse(readFileSync(new URL('../supabase/functions/_shared/catalogue-combat.json', import.meta.url), 'utf8'));
const b = await baseDeTest(true);
await b.db.exec(cartes(edition));
const selection = edition.cartes.filter(c => c.registre.length === 0 && c.rarete === 'Commune').slice(0, 12);
const deck = selection.slice(0, 10).map(c => c.id);
for (const i of [0, 1]) {
  for (const carte of [...deck, selection[10 + i].id]) await b.db.query(`insert into public.possessions(utilisateur,carte,finitions) values($1,$2,'{"Normale":1}')`, [b.ids[i], carte]);
  await b.db.query('update public.comptes set deck=$1 where utilisateur=$2', [JSON.stringify(deck), b.ids[i]]);
  await b.db.query('update public.profils set deck=$1 where utilisateur=$2', [JSON.stringify(deck), b.ids[i]]);
}
const erreurs = [];
let file = Promise.resolve();
const serialiser = f => { const r = file.then(f); file = r.catch(() => {}); return r; };
const outils = {
  catalogue: { cartes: brut.cartes, definitions: new Map(brut.definitions) }, hasard: () => 0.999,
  maintenant: Date.now, identifiant: () => crypto.randomUUID(), authentifier: async jeton => b.ids[Number(jeton)],
  rpc: async (nom, args) => {
    assert.ok(['combat_contexte', 'combat_creer', 'combat_appliquer'].includes(nom));
    await b.db.exec('set role service_role');
    try { return (await b.db.query(`select public.${nom}(${Object.keys(args).map((k, i) => `${k}=>$${i + 1}`).join(',')}) r`, Object.values(args).map(v => v !== null && typeof v === 'object' ? JSON.stringify(v) : v))).rows[0].r; }
    catch (e) { if (e.code === 'P0001') throw new ErreurCombat(e.message); throw e; }
  },
};
const handler = gestionnaireCombat(outils);
const vite = await createServer({ server: { host: '127.0.0.1', port: 5188, strictPort: true } });
let navigateur;
try {
  await vite.listen();
  navigateur = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true });
  const pages = [];
  for (const joueur of [0, 1]) {
    const contexte = await navigateur.newContext({ viewport: { width: 1366, height: 1000 } });
    await contexte.route('**/*', async route => {
      const req = route.request(), u = new URL(req.url());
      if (u.hostname === '127.0.0.1') return route.continue();
      if (!u.hostname.endsWith('.supabase.co')) { erreurs.push(`Réseau inattendu : ${u.hostname}`); return route.abort(); }
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      try {
        const corps = req.postDataJSON();
        if (u.pathname === '/functions/v1/combats') {
          const r = await serialiser(() => handler(new Request('http://local/combats', { method: 'POST', headers: { Authorization: `Bearer ${joueur}` }, body: JSON.stringify(corps) })));
          return route.fulfill({ status: r.status, headers, body: await r.text() });
        }
        const nom = u.pathname.split('/').at(-1);
        assert.ok(['mon_compte', 'mon_equipe', 'mes_amis', 'demander_ami', 'repondre_ami', 'album_ami', 'proposer_echange', 'repondre_echange'].includes(nom), `RPC inattendue : ${nom}`);
        const r = await serialiser(async () => {
          await b.joueur(joueur);
          return (await b.db.query(`select public.${nom}(${Object.keys(corps).map((k, i) => { assert.match(k, /^p_[a-z_]+$/); return `${k}=>$${i + 1}`; }).join(',')}) r`, Object.values(corps))).rows[0].r;
        });
        return route.fulfill({ status: 200, headers, body: JSON.stringify(r) });
      } catch (e) { erreurs.push(e.message); return route.fulfill({ status: 400, headers, body: JSON.stringify({ code: 'P0001', message: e.message }) }); }
    });
    const sauvegarde = nouvelleSauvegarde(Date.now(), 3);
    sauvegarde.profil.pseudo = `lecteur${joueur}`; sauvegarde.joutes.pseudo = `lecteur${joueur}`;
    await contexte.addInitScript(({ sauvegarde }) => {
      localStorage.setItem('mots.vrai-serveur', 'oui');
      localStorage.setItem('mots.session', JSON.stringify({ acces: 'test-local', renouvellement: 'test-local', expireLe: Date.now() + 3600000 }));
      if (!localStorage.getItem('mots.sauvegarde')) localStorage.setItem('mots.sauvegarde', JSON.stringify(sauvegarde));
    }, { sauvegarde });
    const page = await contexte.newPage();
    page.on('pageerror', e => erreurs.push(e.message));
    await page.goto('http://127.0.0.1:5188/#/amis');
    await page.getByRole('heading', { name: 'Ajouter un ami', exact: true }).waitFor();
    pages.push(page);
  }
  const [a, c] = pages;
  await a.getByLabel('Pseudonyme de ton ami').fill('lecteur1');
  await a.getByRole('button', { name: 'Envoyer une demande', exact: true }).click();
  await a.getByText('Demande envoyée', { exact: true }).waitFor();
  await c.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await c.getByRole('button', { name: 'Accepter', exact: true }).click();
  await c.getByRole('button', { name: 'Échanger', exact: true }).waitFor();
  await a.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await a.getByRole('button', { name: 'Échanger', exact: true }).click();
  await a.getByLabel('Tu donnes', { exact: true }).selectOption(JSON.stringify({ carte: selection[10].id, finition: 'Normale' }));
  await a.getByLabel('Tu reçois', { exact: true }).selectOption(JSON.stringify({ carte: selection[11].id, finition: 'Normale' }));
  mkdirSync('output/verification-amis', { recursive: true });
  await a.evaluate(() => window.scrollTo(0, 0));
  await a.screenshot({ path: 'output/verification-amis/proposition-ordinateur.png', fullPage: true });
  await a.getByRole('button', { name: 'Envoyer la proposition', exact: true }).click();
  await a.getByText('Proposition envoyée.', { exact: false }).waitFor();
  await c.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await c.getByRole('button', { name: 'Examiner et accepter', exact: true }).click();
  await c.getByRole('button', { name: 'Confirmer l’échange', exact: true }).click();
  await c.getByText('Échange effectué', { exact: true }).waitFor();
  await a.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await a.getByText('Échange effectué', { exact: true }).waitFor();
  await serialiser(async () => {
    await b.admin();
    assert.equal((await b.db.query('select carte from public.possessions where utilisateur=$1 and carte=$2', [b.ids[0], selection[11].id])).rows.length, 1);
    assert.equal((await b.db.query('select carte from public.possessions where utilisateur=$1 and carte=$2', [b.ids[1], selection[10].id])).rows.length, 1);
  });
  await a.setViewportSize({ width: 390, height: 844 });
  await a.screenshot({ path: 'output/verification-amis/amis-mobile.png', fullPage: true });
  assert.ok(await a.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'aucun débordement mobile');
  for (const width of [320, 768, 1366]) {
    await a.setViewportSize({ width, height: 900 });
    assert.ok(await a.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `aucun débordement à ${width} px`);
  }
  await a.setViewportSize({ width: 390, height: 844 });
  await a.getByRole('button', { name: 'Défier son double', exact: true }).click();
  await a.locator('main[data-phase="choix"]').waitFor();
  await a.getByText('Défi amical · sans classement', { exact: true }).waitFor();
  await a.screenshot({ path: 'output/verification-amis/defi-mobile.png', fullPage: true });
  await a.reload();
  await a.locator('main[data-phase="choix"]').waitFor();
  await a.getByText('Défi amical · sans classement', { exact: true }).waitFor();
  assert.deepEqual(erreurs, []);
  console.log('Deux joueurs : invitation, acceptation, proposition, échange atomique, défi amical et reprise vérifiés. Mobile 390 px sans débordement.');
} finally {
  await navigateur?.close(); await vite.close(); await b.db.close();
}
