import { it } from 'node:test';
import assert from 'node:assert/strict';
import { codeDeLAdresse, lienDInvitation, lireParrainage, nouvellesDuParrainage } from './parrainage.ts';

it('fabrique le lien d’invitation et en relit le code', () => {
  const lien = lienDInvitation('https://philamots.fr/', 'ABCD2345');
  assert.equal(lien, 'https://philamots.fr/?parrain=ABCD2345');
  assert.equal(codeDeLAdresse(lien), 'ABCD2345');
  assert.equal(codeDeLAdresse('https://philamots.fr/?parrain=abcd-2345#/duel'), 'ABCD2345');
  assert.equal(codeDeLAdresse('https://philamots.fr/?paiement=retour#/formules'), null);
  assert.equal(codeDeLAdresse('https://philamots.fr/?parrain=%3Cscript%3E'), null);
  assert.equal(codeDeLAdresse('pas une adresse'), null);
});

it('relit prudemment la réponse du serveur', () => {
  assert.deepEqual(lireParrainage(null), { code: '', paquets: 0, invites: 0, valides: 0, nouveaux: [], enAttente: 0, parrain: null, etat: null });
  const lu = lireParrainage({ code: 'ABCD2345', paquets: 3, invites: 2, valides: 1, nouveaux: ['Zeugma', null], enAttente: 0,
    parrain: { pseudo: null, valide: true, verse: false, verseMaintenant: false }, etat: null });
  assert.deepEqual(lu.nouveaux, ['Zeugma', null]);
  assert.deepEqual(lu.parrain, { pseudo: null, valide: true, verse: false });
});

it('annonce les bonnes nouvelles, une fois', () => {
  const base = lireParrainage({ code: 'ABCD2345', paquets: 3 });
  assert.deepEqual(nouvellesDuParrainage(base, false), []);
  const [merci] = nouvellesDuParrainage({ ...base, nouveaux: ['Zeugma', null] }, false);
  assert.equal(merci.texte, 'Zeugma et un ami ont joué leur premier duel : 6 paquets ajoutés à ta réserve.');
  assert.equal(nouvellesDuParrainage({ ...base, nouveaux: [null] }, false)[0].texte, 'Un ami a joué son premier duel : 3 paquets ajoutés à ta réserve.');
  const invite = { ...base, parrain: { pseudo: 'Raphaël', valide: false, verse: false } };
  assert.deepEqual(nouvellesDuParrainage(invite, false).map(n => [n.cle, n.texte]), [['invite', 'Raphaël t’a invité. Termine ton premier duel : vous recevrez chacun 3 paquets.']]);
  const recompense = { ...base, parrain: { pseudo: 'Raphaël', valide: true, verse: true } };
  assert.equal(nouvellesDuParrainage(recompense, false)[0].cle, 'bienvenue');
  assert.deepEqual(nouvellesDuParrainage(recompense, true), [], 'fermée, l’annonce ne revient pas');
  assert.equal(nouvellesDuParrainage({ ...base, enAttente: 2 }, true)[0].texte, '6 paquets de parrainage arriveront dès que ta réserve aura de la place : ouvre quelques paquets.');
});
