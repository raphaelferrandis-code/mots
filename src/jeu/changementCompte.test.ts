import { it } from 'node:test';
import assert from 'node:assert/strict';
import { sauvegardeDuCompte, sauvegardeVoisine } from './changementCompte.ts';
import { nouvelleSauvegarde, relireSauvegarde } from './sauvegarde.ts';
import { aQuelqueChoseAImporter } from './synchronisation.ts';

it('ne réimporte jamais la collection, l’Encre, le profil ou la progression du compte précédent', () => {
  const ancienne = nouvelleSauvegarde(0, 3);
  ancienne.encre = 100; ancienne.profil.xp = 1000; ancienne.profil.pseudo = 'Ancien';
  ancienne.joutes.pseudo = 'Ancien'; ancienne.paquets.ouverts = 2;
  ancienne.reglages.reduireAnimations = true;
  const nouvelle = sauvegardeDuCompte(ancienne, 'nouvelle-identite', 100, 3);
  assert.equal(aQuelqueChoseAImporter(nouvelle), false);
  assert.equal(nouvelle.profil.xp, 0); assert.equal(nouvelle.profil.pseudo, ''); assert.equal(nouvelle.joutes.pseudo, '');
  assert.equal(nouvelle.reglages.reduireAnimations, true);
  assert.equal(nouvelle.identiteLocale, 'nouvelle-identite');
  const relue = relireSauvegarde(JSON.parse(JSON.stringify(nouvelle)), 101);
  assert.equal(sauvegardeDuCompte(relue, 'nouvelle-identite', 101, 3), relue);
});
it('préserve une partie invitée existante et les personnalisations lors de son rattachement', () => {
  const invite = nouvelleSauvegarde(0, 3); invite.encre = 100;
  assert.equal(sauvegardeDuCompte(invite, undefined, 100, 3), invite);
});
it('adopte ce qu’un autre onglet vient d’enregistrer pour le même compte, et seulement cela', () => {
  const voisine = nouvelleSauvegarde(0, 3); voisine.identiteLocale = 'compte-a'; voisine.profil.avatar = 'plume';
  const recue = structuredClone(voisine);
  assert.equal(sauvegardeVoisine(recue, 'compte-a', 100)?.profil.avatar, 'plume');
  assert.equal(sauvegardeVoisine(recue, 'compte-b', 100), null, 'un autre compte');
  assert.equal(sauvegardeVoisine(recue, undefined, 100), null, 'un invité');
  assert.equal(sauvegardeVoisine({ ...recue, version: 999 }, 'compte-a', 100), null, 'une version plus récente du jeu');
  assert.equal(sauvegardeVoisine('rien', 'compte-a', 100), null);
});
it('la déconnexion et une ancienne écriture provenant d’un autre onglet ne réimportent rien', () => {
  const ancienne = nouvelleSauvegarde(0, 3); ancienne.identiteLocale = 'compte-a'; ancienne.encre = 100;
  assert.equal(sauvegardeDuCompte(ancienne, 'invite-b', 100, 3).encre, 0);
});
