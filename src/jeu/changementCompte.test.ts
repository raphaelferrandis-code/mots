import { it } from 'node:test';
import assert from 'node:assert/strict';
import { sauvegardeDuCompte } from './changementCompte.ts';
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
it('la déconnexion et une ancienne écriture provenant d’un autre onglet ne réimportent rien', () => {
  const ancienne = nouvelleSauvegarde(0, 3); ancienne.identiteLocale = 'compte-a'; ancienne.encre = 100;
  assert.equal(sauvegardeDuCompte(ancienne, 'invite-b', 100, 3).encre, 0);
});
