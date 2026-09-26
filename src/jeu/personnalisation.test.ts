import { it } from 'node:test';
import assert from 'node:assert/strict';
import { ARTICLES_DE_LA_BOUTIQUE, apparenceAApprendre, paquetDisponible, prixEnBoutique, refusDAchat, appliquerLApparence, lireApparence, nouveauProfil, progressionDuNiveau, relireProfil, estDisponible, ornement, PAQUETS, ORNEMENTS, profilVisible } from './personnalisation.ts';
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
  assert.equal(refusDAchat(profil, 1_000_000, 'astral'), 'Cette pièce ne se vend pas à la boutique.');
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

it('propose 149 objets identifiables, dont 38 cadres, 30 avatars, dix emballages, et 15 pièces de boutique', () => {
  assert.equal(ORNEMENTS.length + PAQUETS.length, 149);
  assert.equal(new Set([...ORNEMENTS, ...PAQUETS].map(o => o.id)).size, ORNEMENTS.length + PAQUETS.length);
  assert.equal(ORNEMENTS.filter(o => o.categorie === 'cadre').length, 38);
  assert.equal(ORNEMENTS.filter(o => o.categorie === 'avatar').length, 30);
  assert.equal(ORNEMENTS.filter(o => o.categorie === 'couleur').length, 11);
  assert.equal(ORNEMENTS.filter(o => o.categorie === 'dos').length, 10);
  assert.equal(ORNEMENTS.filter(o => o.categorie === 'titre').length, 50);
  assert.equal(PAQUETS.length, 10);
  assert.equal(ARTICLES_DE_LA_BOUTIQUE.length, 15);
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
it('ne vend en Encre que les pièces de la boutique, qui n’appartiennent qu’à qui les a achetées', () => {
  const profil = nouveauProfil();
  for (const id of ['boussole', 'astral', 'original', 'inconnu']) assert.equal(refusDAchat(profil, 1_000_000, id), 'Cette pièce ne se vend pas à la boutique.');
  assert.equal(estDisponible({ ...profil, achats: ['boussole'] }, ornement('boussole')!), true, 'les anciens achats sont conservés');
  for (const article of ARTICLES_DE_LA_BOUTIQUE) {
    assert.ok(article.prix > 0 && Number.isSafeInteger(article.prix), article.id);
    assert.equal(prixEnBoutique(article.id), article.prix);
    const o = ornement(article.id);
    assert.equal(o?.premium ?? false, false, `${article.id} : une pièce de boutique n’est pas premium`);
    const achetee = { ...profil, xp: 0, achats: [article.id] };
    const dispo = (pr: typeof profil) => (o ? estDisponible(pr, o, true) : paquetDisponible(pr, article.id));
    assert.equal(dispo({ ...profil, xp: 1_000_000 }), false, `${article.id} ne se gagne pas au niveau`);
    assert.equal(dispo(achetee), true, article.id);
    assert.equal(refusDAchat(achetee, 1_000_000, article.id), 'Déjà dans ta collection.');
    assert.equal(refusDAchat(profil, article.prix - 1, article.id), 'Il te manque 1 Encre.');
    assert.equal(refusDAchat(profil, article.prix, article.id), null);
  }
});
it('migre les sauvegardes et répare les équipements inconnus ou verrouillés', () => {
  assert.deepEqual(relireSauvegarde({ version: 4, cartes: {} }, 0).profil, nouveauProfil());
  assert.equal(relireProfil({ xp: -2, dos: 'constellation' }).dos, 'gomme');
  assert.equal(relireProfil({ xp: Infinity }).xp, 0);
  assert.equal(relireProfil({ achats: ['constellation'], dos: 'constellation' }).dos, 'constellation');
  for (const p of PAQUETS.filter((p) => p.boutique === undefined)) assert.equal(relireProfil({ paquet: p.id }).paquet, p.id);
  assert.equal(relireProfil({ paquet: 'vermeil' }).paquet, 'original', 'un emballage de boutique non acheté');
  assert.equal(relireProfil({ paquet: 'vermeil', achats: ['vermeil'] }).paquet, 'vermeil');
  assert.equal(relireProfil({ cadre: 'guilloche' }).cadre, 'simple');
  assert.equal(relireProfil({ cadre: 'guilloche', achats: ['guilloche'] }).cadre, 'guilloche');
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

it('relit l’apparence gardée par le serveur sans rien supposer de sa forme', () => {
  assert.equal(lireApparence(null), null);
  assert.equal(lireApparence('renard'), null);
  assert.equal(lireApparence(['renard']), null);
  assert.deepEqual(lireApparence({}), {});
  assert.deepEqual(lireApparence({ avatar: 'renard', cadre: 3, titre: '', inconnu: 'x' }), { avatar: 'renard', titre: '' });
});
it('applique l’apparence du serveur choix par choix, sans identifiant inconnu ni d’une autre catégorie', () => {
  const profil = { ...nouveauProfil(), avatar: 'colombe', cadre: 'dentelure', titre: 'titre-premier-mot', couleur: 'jade' };
  const suivi = appliquerLApparence(profil, { avatar: 'renard', cadre: 'renard', titre: '', dos: 'constellation', paquet: 'celeste' });
  assert.deepEqual([suivi.avatar, suivi.cadre, suivi.titre, suivi.dos, suivi.couleur, suivi.paquet], ['renard', 'dentelure', '', 'constellation', 'jade', 'celeste'],
    'un cadre qui est un avatar est écarté ; un dos pas encore débloqué ici est pris (vérifié au moment du choix) ; ce que le serveur n’a pas reste');
  assert.equal(appliquerLApparence(profil, { avatar: 'licorne-de-demain', paquet: 'inconnu' }).avatar, 'colombe');
  assert.equal(appliquerLApparence(profil, { paquet: 'inconnu' }).paquet, 'original');
  assert.equal(profil.avatar, 'colombe', 'le profil de départ n’est pas modifié');
});
it('n’apprend au serveur que ses propres choix qu’il n’a pas encore, et rien à un serveur d’avant le script 22', () => {
  const profil = { ...nouveauProfil(), avatar: 'renard', titre: 'titre-premier-mot', couleur: 'cuivre' };
  assert.deepEqual(apparenceAApprendre(profil, null), { avatar: 'renard', titre: 'titre-premier-mot' }, 'l’apparence de départ ne s’envoie pas');
  assert.deepEqual(apparenceAApprendre(profil, { avatar: 'colombe' }), { titre: 'titre-premier-mot' }, 'ce que le serveur a déjà l’emporte');
  assert.deepEqual(apparenceAApprendre(profil, undefined), {});
  assert.deepEqual(apparenceAApprendre(nouveauProfil(), null), {});
});
