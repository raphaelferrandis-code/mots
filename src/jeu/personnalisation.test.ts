import { it } from 'node:test';
import assert from 'node:assert/strict';
import { acheterOrnement, nouveauProfil, progressionDuNiveau, relireProfil, estDisponible, ornement, PAQUETS, ORNEMENTS, profilVisible } from './personnalisation.ts';
import { nouvelleSauvegarde, relireSauvegarde } from './sauvegarde.ts';
import { fusionner } from './synchronisation.ts';
import { FORMULE_GRATUITE, cosmetiquesPremium } from './formule.ts';

it('réserve les objets premium aux formules, quels que soient le niveau, les achats ou le solde', () => {
  const profil = { ...nouveauProfil(), xp: 1_000_000, achats: ['astral'] };
  const cadre = ornement('astral')!;
  assert.equal(estDisponible(profil, cadre), false);
  assert.equal(estDisponible(profil, cadre, true), true);
  assert.throws(() => acheterOrnement(profil, 1_000_000, 'astral'), /formules payantes/);
});

it('retire le rendu premium à expiration, tout en conservant le choix pour un renouvellement', () => {
  const profil = { ...nouveauProfil(), cadre: 'astral', avatar: 'oracle', dos: 'oracle-dos', titre: 'immortel' };
  const abonnement = { ...FORMULE_GRATUITE, niveau: 2, abonnement: 'collectionneur' as const, jusquAu: 2000 };
  assert.equal(cosmetiquesPremium(abonnement, 1999), true);
  assert.equal(cosmetiquesPremium(abonnement, 2000), false);
  assert.equal(profilVisible(profil, abonnement, 1999).cadre, 'astral');
  assert.equal(profilVisible(profil, abonnement, 2000).cadre, 'simple');
  assert.equal(profilVisible(profil, null, 1000).avatar, 'plume');
  assert.equal(profil.cadre, 'astral');
  assert.equal(relireProfil(profil).cadre, 'astral');
  assert.equal(cosmetiquesPremium({ ...FORMULE_GRATUITE, achatUnique: true }, 9999), true);
});

it('propose 94 objets identifiables, dont 12 cadres et huit emballages libres', () => {
  assert.equal(ORNEMENTS.length + PAQUETS.length, 94);
  assert.equal(new Set(ORNEMENTS.map(o => o.id)).size, ORNEMENTS.length);
  assert.equal(ORNEMENTS.filter(o => o.categorie === 'cadre').length, 12);
  for (const categorie of ['avatar', 'couleur', 'dos']) assert.equal(ORNEMENTS.filter(o => o.categorie === categorie).length, 8);
  assert.equal(ORNEMENTS.filter(o => o.categorie === 'titre').length, 50);
  assert.equal(PAQUETS.length, 8);
  assert.ok(ORNEMENTS.filter(o => o.categorie === 'cadre' && o.anime).every(o => o.premium));
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
it('débite une seule fois, conserve les achats et refuse un solde insuffisant', () => {
  const p = nouveauProfil();
  assert.throws(() => acheterOrnement(p, 119, 'boussole'), /assez/);
  const achat = acheterOrnement(p, 200, 'boussole');
  assert.equal(achat.encre, 80);
  assert.ok(estDisponible(achat.profil, ornement('boussole')!));
  assert.equal(acheterOrnement(achat.profil, 80, 'boussole').encre, 80);
  assert.deepEqual(p.achats, []);
  assert.equal(acheterOrnement({ ...p, xp: 250 }, 200, 'boussole').encre, 200);
});
it('migre les sauvegardes et répare les équipements inconnus ou verrouillés', () => {
  assert.deepEqual(relireSauvegarde({ version: 4, cartes: {} }, 0).profil, nouveauProfil());
  assert.equal(relireProfil({ xp: -2, dos: 'constellation' }).dos, 'gomme');
  assert.equal(relireProfil({ xp: Infinity }).xp, 0);
  assert.equal(relireProfil({ achats: ['constellation'], dos: 'constellation' }).dos, 'constellation');
  for (const p of PAQUETS) assert.equal(relireProfil({ paquet: p.id }).paquet, p.id);
  const sauvegarde = nouvelleSauvegarde(0, 3);
  sauvegarde.profil = { ...nouveauProfil(), xp: 350, avatar: 'boussole', paquet: 'herbier' };
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
