// Publie la devinette du jour sur Bluesky : chaque matin, par la tâche GitHub .github/workflows/devinette.yml.
//   · le post du jour : la question du jour et la réponse d'hier en images, avec leur texte ;
//   · sous le post de la veille, la réponse en toutes lettres : ceux qui ont répondu en sont prévenus.
//
//   node scripts/publier-la-devinette.ts                      à blanc : fabrique textes et images, ne se connecte pas
//   node scripts/publier-la-devinette.ts --mode connexion     se connecte et lit le compte, sans rien publier
//   node scripts/publier-la-devinette.ts --mode publier       publie pour de vrai
//   --jour 5    la devinette du 6e jour (à blanc et connexion seulement : pour essayer avant le lancement)
//   --site URL  le site où photographier les images (par défaut https://philamots.fr/)
//
// Le mot de passe d'application vient de la variable BLUESKY_MOT_DE_PASSE (secret GitHub MDPAPPLICATION).
// Rien n'est publié tant que le calendrier n'a pas de premier jour (npm run motdujour:dater), ni deux fois le même jour.

import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { jourAParis, rangDuJour } from '../src/jeu/devinette.ts';
import type { Devinettes } from '../src/jeu/devinette.ts';
import { adressesDesPages } from '../src/partage/pagesDesMots.ts';
import { descriptionDeLaQuestion, descriptionDeLaReponse, facettes, texteDeLaReponse, texteDuPost } from '../src/partage/postsDeLaDevinette.ts';
import type { IndexEdition } from '../src/partage/types.ts';
import { derniersPosts, envoyerUneImage, publier, seConnecter } from './publication/bluesky.ts';
import type { Image, PostDuFil } from './publication/bluesky.ts';
import { photographier } from './publication/photographe.ts';

const IDENTIFIANT = 'philamots.fr';
const LIMITE_D_UNE_IMAGE = 950_000; // Bluesky refuse les images de plus d'un million d'octets

const RACINE = path.join(import.meta.dirname, '..');
const args = process.argv.slice(2);
const option = (nom: string): string | undefined => { const i = args.indexOf(nom); return i === -1 ? undefined : args[i + 1]; };
const mode = option('--mode') ?? 'a-blanc';
if (!['a-blanc', 'connexion', 'publier'].includes(mode)) throw new Error(`Mode inconnu : ${mode}`);
const site = option('--site') ?? 'https://philamots.fr/';
const jourForce = option('--jour');
if (jourForce !== undefined && mode === 'publier') throw new Error('--jour ne sert qu’à essayer : pas avec --mode publier.');

const lire = (...morceaux: string[]): string => readFileSync(path.join(RACINE, ...morceaux), 'utf8');
const { debut, jours } = JSON.parse(lire('public', 'data', 'devinettes.json')) as Devinettes;
const adresses = adressesDesPages((JSON.parse(lire('public', 'data', 'edition-1.index.json')) as IndexEdition).cartes);

const maintenant = Date.now();
const aujourdhui = jourAParis(maintenant);
const rang = jourForce !== undefined ? Number(jourForce) : rangDuJour(debut, aujourdhui, jours.length);
if (rang === null || !jours[rang]) {
  console.log(debut ? `Le calendrier ne couvre pas le ${aujourdhui} : rien à publier.` : 'La devinette n’a pas encore de premier jour (npm run motdujour:dater) : rien à publier.');
  process.exit(0);
}

const duJour = jours[rang];
const veille = rang > 0 ? jours[rang - 1] : null;
const adresse = (id: string): string => adresses.get(id)!;
const texte = texteDuPost(duJour, veille ? { devinette: veille, adresse: adresse(veille.id) } : null);
const reponse = veille ? texteDeLaReponse(veille, adresse(veille.id)) : null;

console.log(`Jour ${rang + 1} (${duJour.format === 'definition' ? 'quelle définition' : 'quel mot'}) : ${duJour.mot}${veille ? ` · réponse d'hier : ${veille.mot}` : ''}\n`);
console.log(`── Post du jour ──\n${texte}\n`);
if (reponse) console.log(`── Réponse sous le post d'hier ──\n${reponse}\n`);

const dossier = mkdtempSync(path.join(tmpdir(), 'devinette-'));
const photos = await photographier(site, [
  { adresse: adresse(duJour.id), genre: 'question' },
  ...(veille ? [{ adresse: adresse(veille.id), genre: 'reponse' as const }] : []),
], (a, g) => path.join(dossier, `${a}-${g}.jpg`));
for (const p of photos) {
  const taille = statSync(p.chemin).size;
  if (taille > LIMITE_D_UNE_IMAGE) throw new Error(`${p.chemin} pèse ${taille} octets : trop pour Bluesky.`);
  console.log(`Image : ${p.chemin} (${Math.round(taille / 1000)} Ko)`);
}

if (mode === 'a-blanc') {
  console.log('\nÀ blanc : rien n’a été envoyé.');
  process.exit(0);
}

const motDePasse = process.env.BLUESKY_MOT_DE_PASSE;
if (!motDePasse) throw new Error('BLUESKY_MOT_DE_PASSE est vide (secret GitHub MDPAPPLICATION).');
const session = await seConnecter(IDENTIFIANT, motDePasse);
const posts = await derniersPosts(session);
console.log(`\nConnecté : @${session.handle} (${posts.length} posts récents lus).`);
if (mode === 'connexion') {
  console.log('Connexion : rien n’a été publié.');
  process.exit(0);
}

// Un post de devinette (pas une réponse), publié tel jour à Paris.
const devinetteDu = (jour: string): PostDuFil | undefined => posts.find((p) => !p.reponseA && p.texte.startsWith('Devinette du jour') && jourAParis(Date.parse(p.creeLe)) === jour);
const lien = (uri: string): string => `https://bsky.app/profile/${IDENTIFIANT}/post/${uri.split('/').pop()}`;

if (devinetteDu(aujourdhui)) {
  console.log('La devinette du jour est déjà publiée : rien à refaire.');
} else {
  const images: Image[] = [];
  for (const p of photos) {
    const d = p.genre === 'question' ? duJour : veille!;
    images.push({ blob: await envoyerUneImage(session, readFileSync(p.chemin)), description: p.genre === 'question' ? descriptionDeLaQuestion(d) : descriptionDeLaReponse(d), largeur: 1080, hauteur: 1350 });
  }
  const post = await publier(session, texte, facettes(texte), images);
  console.log(`Publié : ${lien(post.uri)}`);
}

if (reponse) {
  const hier = jourAParis(maintenant - 86_400_000);
  const parent = devinetteDu(hier);
  if (!parent) console.log('Pas de devinette d’hier sur le compte : pas de réponse à publier dessous.');
  else if (posts.some((p) => p.reponseA === parent.uri && p.texte.startsWith('Réponse'))) console.log('La réponse d’hier est déjà publiée.');
  else {
    const ref = { uri: parent.uri, cid: parent.cid };
    const post = await publier(session, reponse, facettes(reponse), [], { racine: ref, parent: ref });
    console.log(`Réponse publiée : ${lien(post.uri)}`);
  }
}
