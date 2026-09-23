import { it } from 'node:test';
import assert from 'node:assert/strict';
import { nouvelleSauvegarde } from '../jeu/sauvegarde.ts';
import { appliquerIdentite, pseudoDuJoueur, verifierIdentite } from './identite.ts';

it('propose le pseudo du profil à la première inscription sans publier avant de rejoindre', async () => {
  const s = nouvelleSauvegarde(1000, 0);
  let appels = 0;
  const identite = await verifierIdentite(s, ' Raph TEST STRIP ', false, async () => { appels++; return { accepte: true, cote: 1200 }; });
  const profil = appliquerIdentite(s, identite);
  assert.equal(pseudoDuJoueur(profil), 'Raph TEST STRIP');
  assert.equal(profil.joutes.pseudo, '');
  assert.equal(appels, 0);
  const inscription = await verifierIdentite(profil, pseudoDuJoueur(profil), true, async p => {
    appels++; assert.equal(p.pseudo, 'Raph TEST STRIP'); return { accepte: true, cote: 1200 };
  });
  const inscrit = appliquerIdentite(profil, inscription);
  assert.equal(inscrit.profil.pseudo, inscrit.joutes.pseudo);
  assert.equal(inscrit.joutes.cote, 1200);
  assert.equal(appels, 1);
});

it('un renommage du profil inscrit met à jour le pseudo public et conserve les statistiques', async () => {
  const s = nouvelleSauvegarde(1000, 0);
  s.profil.pseudo = s.joutes.pseudo = 'Ancien';
  s.joutes.jouees = 15; s.joutes.gagnees = 8; s.joutes.recents = ['adversaire'];
  const nom = await verifierIdentite(s, 'Nouveau', false, async p => {
    assert.equal(p.pseudo, 'Nouveau'); return { accepte: true, cote: 1320 };
  });
  // Une autre action survenue pendant la requête doit être conservée.
  const actuel = { ...s, encre: 250 };
  const resultat = appliquerIdentite(actuel, nom);
  assert.equal(resultat.profil.pseudo, 'Nouveau');
  assert.deepEqual(resultat.joutes, { ...s.joutes, pseudo: 'Nouveau', cote: 1320 });
  assert.equal(resultat.encre, 250);
});

it('un renommage depuis les joutes met aussi le profil à jour', async () => {
  const s = nouvelleSauvegarde(1000, 0);
  s.profil.pseudo = 'Profil'; s.joutes.pseudo = 'Ancienne joute';
  const nom = await verifierIdentite(s, 'Commun', true, async () => ({ accepte: true, cote: null }));
  const resultat = appliquerIdentite(s, nom);
  assert.equal(resultat.profil.pseudo, 'Commun');
  assert.equal(resultat.joutes.pseudo, 'Commun');
});

it('un nom déjà pris ou une panne conserve les deux anciens noms', async () => {
  const s = nouvelleSauvegarde(1000, 0);
  s.profil.pseudo = s.joutes.pseudo = 'Ancien';
  const avant = structuredClone(s);
  await assert.rejects(verifierIdentite(s, 'Nouveau', false, async () => ({ accepte: false, raison: 'Ce pseudonyme est déjà pris.' })), /déjà pris/);
  assert.deepEqual(s, avant);
  await assert.rejects(verifierIdentite(s, 'Nouveau', false, async () => { throw new Error('Hors ligne'); }), /Hors ligne/);
  assert.deepEqual(s, avant);
});

it('réconcilie les anciens noms différents avec le pseudo choisi sur le profil', async () => {
  const s = nouvelleSauvegarde(1000, 0);
  s.profil.pseudo = 'Raph TEST STRIP'; s.joutes.pseudo = 'Oiseau 54';
  const nom = await verifierIdentite(s, pseudoDuJoueur(s), true, async p => {
    assert.equal(p.pseudo, 'Raph TEST STRIP'); return { accepte: true, cote: 1250 };
  });
  assert.equal(appliquerIdentite(s, nom).joutes.pseudo, 'Raph TEST STRIP');
  s.profil.pseudo = '';
  assert.equal(pseudoDuJoueur(s), 'Oiseau 54', 'compatibilité des comptes sans pseudo personnel');
});

it('applique les mêmes règles de nom avant tout appel réseau', async () => {
  const s = nouvelleSauvegarde(1000, 0);
  let appels = 0;
  await assert.rejects(verifierIdentite(s, 'ab', true, async () => { appels++; return { accepte: true, cote: null }; }));
  assert.equal(appels, 0);
});
