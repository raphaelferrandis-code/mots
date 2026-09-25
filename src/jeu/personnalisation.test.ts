import { it } from 'node:test';
import assert from 'node:assert/strict';
import { acheterOrnement, nouveauProfil, progressionDuNiveau, relireProfil, estDisponible, ornement, PAQUETS, ORNEMENTS, profilVisible } from './personnalisation.ts';
import { nouvelleSauvegarde, relireSauvegarde } from './sauvegarde.ts';
import { fusionner } from './synchronisation.ts';
import { FORMULE_GRATUITE, cosmetiquesPremium } from './formule.ts';
import { DESSINS_AVATARS } from '../composants/cosmetiques/dessins/avatars.ts';
import { DESSINS_CADRES } from '../composants/cosmetiques/dessins/cadres.ts';

it('réserve les objets premium aux formules, quels que soient le niveau, les achats ou le solde', () => {
  const profil = { ...nouveauProfil(), xp: 1_000_000, achats: ['astral'] };
  const cadre = ornement('astral')!;
  assert.equal(estDisponible(profil, cadre), false);
  assert.equal(estDisponible(profil, cadre, true), true);
  assert.throws(() => acheterOrnement(profil, 1_000_000, 'astral'), /enchères/);
});

it('réserve le rendu premium à l’achat définitif et conserve les choix', () => {
  const profil = { ...nouveauProfil(), cadre: 'astral', avatar: 'oracle', dos: 'oracle-dos', titre: 'immortel' };
  const abonnement = { ...FORMULE_GRATUITE, niveau: 2, abonnement: 'collectionneur' as const, jusquAu: 2000 };
  assert.equal(cosmetiquesPremium(abonnement, 1999), false);
  assert.equal(cosmetiquesPremium(abonnement, 2000), false);
  assert.equal(profilVisible(profil, { ...abonnement, achatUnique: true }, 1999).cadre, 'astral');
  assert.equal(profilVisible(profil, abonnement, 2000).cadre, 'simple');
  assert.equal(profilVisible(profil, null, 1000).avatar, 'plume');
  assert.equal(profil.cadre, 'astral');
  assert.equal(relireProfil(profil).cadre, 'astral');
  assert.equal(cosmetiquesPremium({ ...FORMULE_GRATUITE, achatUnique: true }, 9999), true);
});

it('propose 134 objets identifiables, dont 34 cadres, 26 avatars et huit emballages libres', () => {
  assert.equal(ORNEMENTS.length + PAQUETS.length, 134);
  assert.equal(new Set([...ORNEMENTS, ...PAQUETS].map(o => o.id)).size, ORNEMENTS.length + PAQUETS.length);
  assert.equal(ORNEMENTS.filter(o => o.categorie === 'cadre').length, 34);
  assert.equal(ORNEMENTS.filter(o => o.categorie === 'avatar').length, 26);
  for (const categorie of ['couleur', 'dos']) assert.equal(ORNEMENTS.filter(o => o.categorie === categorie).length, 8);
  assert.equal(ORNEMENTS.filter(o => o.categorie === 'titre').length, 50);
  assert.equal(PAQUETS.length, 8);
  assert.ok(ORNEMENTS.filter(o => o.categorie === 'cadre' && o.anime).every(o => o.premium));
});

it('étale les récompenses jusqu’au niveau 50, une par niveau, et dessine chaque cadre et chaque avatar', () => {
  const paliers = ORNEMENTS.filter(o => o.categorie !== 'titre').map(o => o.premium ? o.prestige : o.niveau > 1 ? o.niveau : undefined).filter((n): n is number => n !== undefined);
  for (let n = 2; n <= 50; n++) assert.ok(paliers.includes(n), `rien à gagner au niveau ${n}`);
  assert.equal(Math.max(...paliers), 50);
  for (const o of ORNEMENTS.filter(o => o.categorie === 'cadre')) assert.ok(DESSINS_CADRES[o.id], `cadre sans dessin : ${o.id}`);
  for (const o of ORNEMENTS.filter(o => o.categorie === 'avatar')) assert.ok(DESSINS_AVATARS[o.id], `avatar sans dessin : ${o.id}`);
});

it('offre les pièces de prestige au niveau annoncé, même sans formule', () => {
  const couronne = ornement('grand-philateliste')!;
  assert.equal(couronne.premium, true);
  assert.equal(couronne.prestige, 50);
  const seuil = 25 * 49 * 52;
  assert.equal(estDisponible({ ...nouveauProfil(), xp: seuil - 1 }, couronne), false);
  assert.equal(estDisponible({ ...nouveauProfil(), xp: seuil }, couronne), true);
  const fidele = { ...nouveauProfil(), xp: seuil, cadre: 'grand-philateliste', avatar: 'kitsune' };
  assert.equal(profilVisible(fidele, null, 0).cadre, 'grand-philateliste');
  assert.equal(profilVisible(fidele, null, 0).avatar, 'plume');
});

it('franchit les niveaux exactement au palier, même après plusieurs niveaux gagnés', () => {
  assert.deepEqual(progressionDuNiveau(99), { niveau: 1, acquis: 99, requis: 100 });
  assert.deepEqual(progressionDuNiveau(100), { niveau: 2, acquis: 0, requis: 150 });
  assert.deepEqual(progressionDuNiveau(250), { niveau: 3, acquis: 0, requis: 200 });
  for (let n = 1; n < 100; n++) {
    const seuil = 25 * (n - 1) * (n + 2);
    assert.equal(progressionDuNiveau(seuil).niveau, n);
    if (n > 1) assert.equal(progressionDuNiveau(seuil - 1).niveau, n - 1);
  }
});
it('refuse tout achat cosmétique en Encre, même avec un solde suffisant', () => {
  const profil = nouveauProfil();
  for (const id of ['boussole', 'astral']) assert.throws(() => acheterOrnement(profil, 1000000, id), /enchères/);
  assert.deepEqual(profil.achats, []);
  assert.equal(estDisponible({ ...profil, achats: ['boussole'] }, ornement('boussole')!), true);
});
it('migre les sauvegardes et répare les équipements inconnus ou verrouillés', () => {
  assert.deepEqual(relireSauvegarde({ version: 4, cartes: {} }, 0).profil, nouveauProfil());
  assert.equal(relireProfil({ xp: -2, dos: 'constellation' }).dos, 'gomme');
  assert.equal(relireProfil({ xp: Infinity }).xp, 0);
  assert.equal(relireProfil({ achats: ['constellation'], dos: 'constellation' }).dos, 'constellation');
  for (const p of PAQUETS) assert.equal(relireProfil({ paquet: p.id }).paquet, p.id);
  const sauvegarde = nouvelleSauvegarde(0, 3);
  sauvegarde.profil = { ...nouveauProfil(), xp: 350, avatar: 'colombe', paquet: 'herbier' };
  assert.deepEqual(relireSauvegarde(JSON.parse(JSON.stringify(sauvegarde)), 0), sauvegarde);
});
it('conserve XP et équipement pendant une synchronisation, et récupère les achats du compte', () => {
  const locale = nouvelleSauvegarde(0, 3);
  locale.profil.xp = 250;
  locale.profil.paquet = 'celeste';
  const apres = fusionner(locale, { encre: 20, paquets: locale.paquets, deck: [], maintenant: 0, cartes: {}, codeDeSecoursLe: null, formule: FORMULE_GRATUITE, achatsPersonnalisation: ['lune'] });
  assert.equal(apres.profil.xp, 250);
  assert.equal(apres.profil.paquet, 'celeste');
  assert.deepEqual(apres.profil.achats, ['lune']);
});
