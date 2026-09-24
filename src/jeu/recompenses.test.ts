import { it } from 'node:test';
import assert from 'node:assert/strict';
import { nouvellesRecompenses, resumerLesRecompenses } from './recompenses.ts';

it('annonce ensemble le niveau et les titres réellement nouveaux', () => {
  const gains = nouvellesRecompenses({ xp: 95, succes: ['premier-mot'] }, { xp: 120, succes: ['premier-mot', 'dix-mots'] });
  assert.deepEqual(gains[0], { type: 'niveau', avant: 1, niveau: 2 });
  assert.equal(gains.length, 2);
  assert.equal(gains[1].type === 'titre' && gains[1].succes.titre, 'Cueilleur de mots');
});
it('ne rejoue pas les récompenses lors d’une sauvegarde inchangée ou corrigée à la baisse', () => {
  const profil = { xp: 200, succes: ['premier-mot'] };
  assert.deepEqual(nouvellesRecompenses(profil, profil), []);
  assert.deepEqual(nouvellesRecompenses(profil, { xp: 90, succes: [] }), []);
});
it('regroupe plusieurs niveaux et ignore les identifiants de succès inconnus ou dupliqués', () => {
  const gains = nouvellesRecompenses({ xp: 0, succes: [] }, { xp: 450, succes: ['dix-mots', 'dix-mots', 'inconnu'] });
  assert.deepEqual(gains[0], { type: 'niveau', avant: 1, niveau: 4 });
  assert.equal(gains.length, 2);
});

it('résume une rafale de succès et de niveaux en une seule annonce', () => {
  const gains = nouvellesRecompenses({ xp: 0, succes: [] }, { xp: 450, succes: ['premier-mot', 'dix-mots', 'premier-paquet'] });
  gains.push({ type: 'niveau', avant: 4, niveau: 5 });
  assert.deepEqual(resumerLesRecompenses(gains), { titre: '3 succès accomplis', detail: 'Niveau 5 · Titres disponibles dans Profil · Succès' });
});

it('garde le nom et le titre pour un succès isolé, et accepte un gain de niveau seul', () => {
  assert.equal(resumerLesRecompenses([]), null);
  assert.deepEqual(resumerLesRecompenses(nouvellesRecompenses({ xp: 0, succes: [] }, { xp: 0, succes: ['dix-mots'] })), { titre: 'Le début d’une histoire', detail: 'Titre : Cueilleur de mots' });
  assert.deepEqual(resumerLesRecompenses([{ type: 'niveau', avant: 1, niveau: 2 }]), { titre: 'Niveau 2 atteint', detail: 'Personnalisations disponibles dans le profil' });
});
