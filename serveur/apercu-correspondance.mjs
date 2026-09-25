// Banc local pour la refonte des amis et de l'équipe : vrais écrans, PostgreSQL embarqué avec la structure complète
// (portraits, présence, vitrines, cote 2v2). Aucun compte distant, rien n'est envoyé à Supabase.
//   node serveur/apercu-correspondance.mjs
// Carnet rempli (Faekia : amis, demandes, échanges, duo complet) : http://127.0.0.1:5192/#/amis   — et #/equipe
// Sans équipe, avec une invitation (Mirabelle)                   : http://127.0.0.1:5193/#/equipe
// Carnet vierge (Anouk)                                           : http://127.0.0.1:5194/#/amis
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { baseDeTest } from './test-base.ts';
import { direct } from './direct.ts';
import { parrainage } from './parrainage.ts';
import { cartes } from './collections.ts';
import { nouvelleSauvegarde } from '../src/jeu/sauvegarde.ts';

const brut = JSON.parse(readFileSync(new URL('../supabase/functions/_shared/catalogue-combat.json', import.meta.url), 'utf8'));
const b = await baseDeTest(true);
await b.db.exec(direct() + parrainage());
await b.db.exec(cartes({ cartes: brut.cartes, meta: { edition: 1, version: 'test' } }));
const propres = brut.cartes.filter(c => c.registre.length === 0);
const deRarete = (r, n, decalage = 0) => propres.filter(c => c.rarete === r).slice(decalage, decalage + n).map(c => c.id);
const deck = deRarete('Commune', 10);

// Les joueurs : trois de la base de test, puis quatre de plus.
const nouveaux = ['44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'];
for (const uid of nouveaux) {
  await b.db.query('insert into auth.users values($1)', [uid]);
  await b.db.query('insert into public.comptes(utilisateur) values($1)', [uid]);
  await b.db.query('insert into public.profils(utilisateur,pseudo,pseudo_cle) values ($1,$2,$2)', [uid, uid]);
}
const [FAEKIA, LYSANDRE, MIRABELLE] = b.ids;
const [OCTAVE, CELESTIN, ANOUK, ARMAND] = nouveaux;
const heure = 3_600_000;
const joueurs = [
  { uid: FAEKIA, pseudo: 'Faekia', avatar: 'loupe', cadre: 'simple', xp: 9_500, vu: 0 },
  { uid: LYSANDRE, pseudo: 'Lysandre', avatar: 'renard', cadre: 'grand-philateliste', xp: 26_000, vu: 60_000 },
  { uid: MIRABELLE, pseudo: 'Mirabelle', avatar: 'colombe', cadre: 'simple', xp: 5_600, vu: 2 * heure },
  { uid: OCTAVE, pseudo: 'Octave', avatar: 'boussole', cadre: 'simple', xp: 900, vu: 27 * heure },
  { uid: CELESTIN, pseudo: 'Célestin', avatar: 'abeille', cadre: 'simple', xp: 3_300, vu: 3 * heure },
  { uid: ANOUK, pseudo: 'Anouk', avatar: 'plume', cadre: 'simple', xp: 200, vu: 0 },
  { uid: ARMAND, pseudo: 'Armand', avatar: 'encrier', cadre: 'simple', xp: 1_200, vu: 5 * heure },
];
const profil = uid => b.db.query('select id from public.profils where utilisateur=$1', [uid]).then(r => r.rows[0].id);
for (const j of joueurs) {
  await b.db.query(`update public.profils set pseudo=$2, pseudo_cle=lower($2), avatar=$3, cadre=$4, vu_le=now()-make_interval(secs=>$5::double precision/1000), deck=$6 where utilisateur=$1`,
    [j.uid, j.pseudo, j.avatar, j.cadre, j.vu, j.uid === OCTAVE ? '[]' : JSON.stringify(deck)]);
  await b.db.query('update public.comptes set progression_active=true, xp=$2, deck=$3 where utilisateur=$1', [j.uid, j.xp, j.uid === OCTAVE ? '[]' : JSON.stringify(deck)]);
  const album = j.uid === OCTAVE ? deRarete('Commune', 3, 20) : j.uid === ANOUK ? [] : [...deck, ...deRarete('Rare', 3, joueurs.indexOf(j)), ...deRarete('Épique', 2, joueurs.indexOf(j)), ...(j.uid === LYSANDRE ? deRarete('Légendaire', 1) : [])];
  for (const [n, id] of album.entries())
    await b.db.query('insert into public.possessions(utilisateur,carte,finitions) values($1,$2,$3) on conflict do nothing', [j.uid, id, JSON.stringify(n % 7 === 3 ? { Holographique: 1 } : n % 4 === 1 ? { Brillante: 1 } : { Normale: 1 })]);
}
const P = Object.fromEntries(await Promise.all(joueurs.map(async j => [j.pseudo, await profil(j.uid)])));
const amitie = (a, c, acceptee = true) => b.db.query('insert into public.amities(demandeur,destinataire,acceptee) values($1,$2,$3)', [P[a], P[c], acceptee]);
await amitie('Faekia', 'Lysandre'); await amitie('Mirabelle', 'Faekia'); await amitie('Faekia', 'Octave');
await amitie('Célestin', 'Faekia', false); await amitie('Faekia', 'Armand', false); await amitie('Octave', 'Mirabelle');
// Deux échanges en cours et un conclu.
const [monCommun] = deck; const rareLysandre = deRarete('Rare', 1, 1)[0]; const epiqueMirabelle = deRarete('Épique', 1, 2)[0];
await b.db.query(`insert into public.echanges(id,expediteur,destinataire,offerte,finition_offerte,demandee,finition_demandee,cree_le,expire_le) values
  (gen_random_uuid(),$1,$2,$3,'Holographique',$4,'Normale',now()-interval '2 hours',now()+interval '6 days'),
  (gen_random_uuid(),$2,$5,$4,'Normale',$6,'Normale',now()-interval '1 day',now()+interval '5 days')`, [P.Lysandre, P.Faekia, rareLysandre, monCommun, P.Mirabelle, epiqueMirabelle]);
await b.db.query(`insert into public.echanges(id,expediteur,destinataire,offerte,finition_offerte,demandee,finition_demandee,etat,cree_le,expire_le) values
  (gen_random_uuid(),$1,$2,$3,'Normale',$4,'Normale','accepte',now()-interval '4 days',now()+interval '3 days')`, [P.Faekia, P.Octave, deck[1], deRarete('Commune', 1, 21)[0]]);
// Le duo de Faekia et Lysandre, sa cote 2v2 ; l'équipe d'Octave invite Mirabelle.
const encriers = crypto.randomUUID(); const veilleurs = crypto.randomUUID();
await b.db.query(`insert into public.equipes(id,nom,nom_cle,embleme) values ($1,'Les Encriers','lesencriers','plume'), ($2,'Les Veilleurs','lesveilleurs','lune')`, [encriers, veilleurs]);
await b.db.query('insert into public.equipiers(profil,equipe,place) values ($1,$3,1), ($2,$3,2), ($4,$5,1)', [P.Faekia, P.Lysandre, encriers, P.Octave, veilleurs]);
await b.db.query('insert into public.invitations_equipe(id,equipe,destinataire) values (gen_random_uuid(),$1,$2)', [veilleurs, P.Mirabelle]);
await b.db.query("insert into public.direct_cotes(mode,sujet,cote,jouees,gagnees) values ('duo_equipe',$1,1042,6,4)", [encriers]);

let file = Promise.resolve();
const serialiser = f => { const r = file.then(f); file = r.catch(() => {}); return r; };
const valeurs = args => Object.values(args).map(v => v !== null && typeof v === 'object' && !Array.isArray(v) ? JSON.stringify(v) : v);
const appel = (nom, args) => `select public.${nom}(${Object.keys(args).map((k, i) => { if (!/^p_[a-z_]+$/.test(k)) throw new Error('Paramètre inconnu'); return `${k}=>$${i + 1}`; }).join(',')}) r`;
const RPC_PERMISES = ['mon_compte', 'ouvrir_mon_compte', 'mon_equipe', 'mes_amis', 'mon_parrainage', 'declarer_mon_parrain', 'signaler_presence', 'album_ami',
  'demander_ami', 'repondre_ami', 'proposer_echange', 'repondre_echange', 'creer_equipe', 'modifier_equipe', 'inviter_equipier', 'repondre_invitation_equipe',
  'quitter_equipe', 'dissoudre_equipe', 'publier_mon_profil', 'mettre_a_jour_mon_profil_public', 'fil_d_activite'];

for (const [i, j] of [joueurs[0], joueurs[2], joueurs[5]].entries()) {
  const port = 5192 + i;
  const sauvegarde = nouvelleSauvegarde(Date.now(), 3);
  sauvegarde.joutes.pseudo = j.pseudo;
  Object.assign(sauvegarde.profil, { pseudo: j.pseudo, avatar: j.avatar, cadre: j.cadre, xp: j.xp });
  const vite = await createServer({ cacheDir: `node_modules/.vite-banc-${port}`, server: { host: '127.0.0.1', port, strictPort: true }, plugins: [{
    name: 'banc-correspondance', enforce: 'pre',
    transform(source, id) { if (id.replaceAll('\\', '/').endsWith('/src/config/serveur.ts')) return source.replace(/adresse: '[^']*'/, `adresse: 'http://127.0.0.1:${port}/api'`).replace('secoursEtParrainage: false', 'secoursEtParrainage: true'); },
    transformIndexHtml() { return [{ tag: 'script', injectTo: 'head-prepend', children: `localStorage.setItem('mots.vrai-serveur','oui');localStorage.setItem('mots.session',JSON.stringify({acces:'test${i}',renouvellement:'test${i}',expireLe:Date.now()+86400000}));if(!localStorage.getItem('mots.sauvegarde'))localStorage.setItem('mots.sauvegarde',${JSON.stringify(JSON.stringify(sauvegarde))});` }]; },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        let texte = ''; for await (const morceau of req) texte += morceau;
        res.setHeader('Content-Type', 'application/json');
        const nom = req.url.split('/').at(-1).split('?')[0]; const args = texte ? JSON.parse(texte) : {};
        if (!RPC_PERMISES.includes(nom)) { console.error(`RPC non prévue par le banc : ${nom}`); res.statusCode = 404; res.end(JSON.stringify({ code: 'PGRST202', message: nom })); return; }
        try {
          const r = await serialiser(async () => { await b.joueur(0); await b.db.query("select set_config('request.jwt.claim.sub',$1,false)", [j.uid]); return (await b.db.query(appel(nom, args), valeurs(args))).rows[0].r; });
          if (r === null || r === undefined) { res.statusCode = 204; res.end(); } else res.end(JSON.stringify(r));
        } catch (e) { res.statusCode = 400; res.end(JSON.stringify({ code: 'P0001', message: e.message })); }
      });
    },
  }] });
  await vite.listen();
  console.log(`${j.pseudo} : http://127.0.0.1:${port}/`);
}
