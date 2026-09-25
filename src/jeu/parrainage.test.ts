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
  assert.deepEqual(lireParrainage(null), { code: '', paquets: 0, confirmation: false, invites: 0, valides: 0, recompenses: 0, aConfirmer: 0, nouveaux: [], enAttente: 0, parrain: null, etat: null });
  const lu = lireParrainage({ code: 'ABCD2345', paquets: 3, invites: 2, valides: 1, nouveaux: ['Zeugma', null], enAttente: 0,
    parrain: { pseudo: null, valide: true, verse: false, verseMaintenant: false }, etat: null });
  assert.deepEqual(lu.nouveaux, ['Zeugma', null]);
  assert.deepEqual(lu.parrain, { pseudo: null, valide: true, verse: false, confirme: false, manqueCompte: false, manqueJour: false, echu: false });
  assert.equal(lu.recompenses, 1, 'un serveur d’avant la confirmation : les filleuls validés sont les filleuls récompensés');
  assert.equal(lireParrainage({ confirmation: true, valides: 4, recompenses: 2 }).recompenses, 2);
});

it('annonce les bonnes nouvelles, une fois', () => {
  const base = lireParrainage({ code: 'ABCD2345', paquets: 3 });
  assert.deepEqual(nouvellesDuParrainage(base, false), []);
  const [merci] = nouvellesDuParrainage({ ...base, nouveaux: ['Zeugma', null] }, false);
  assert.equal(merci.texte, 'Zeugma et un ami ont joué leur premier duel : 6 paquets ajoutés à ta réserve.');
  assert.equal(nouvellesDuParrainage({ ...base, nouveaux: [null] }, false)[0].texte, 'Un ami a joué son premier duel : 3 paquets ajoutés à ta réserve.');
  const aucun = { confirme: false, manqueCompte: false, manqueJour: false, echu: false };
  const invite = { ...base, parrain: { pseudo: 'Raphaël', valide: false, verse: false, ...aucun } };
  assert.deepEqual(nouvellesDuParrainage(invite, false).map(n => [n.cle, n.texte]), [['invite', 'Raphaël t’a invité. Termine ton premier duel : vous recevrez chacun 3 paquets.']]);
  const recompense = { ...base, parrain: { pseudo: 'Raphaël', valide: true, verse: true, ...aucun } };
  assert.equal(nouvellesDuParrainage(recompense, false)[0].cle, 'bienvenue');
  assert.deepEqual(nouvellesDuParrainage(recompense, true), [], 'fermée, l’annonce ne revient pas');
  assert.equal(nouvellesDuParrainage({ ...base, enAttente: 2 }, true)[0].texte, '6 paquets de parrainage arriveront dès que ta réserve aura de la place : ouvre quelques paquets.');
});

it('avec la confirmation : le filleul sait ce qu’il reste à faire pour son parrain', () => {
  const base = lireParrainage({ code: 'ABCD2345', paquets: 3, confirmation: true });
  assert.equal(nouvellesDuParrainage({ ...base, nouveaux: ['Zeugma'] }, false)[0].texte, 'Zeugma a confirmé son inscription : 3 paquets ajoutés à ta réserve.');
  const parrain = { pseudo: 'Raphaël', valide: false, verse: false, confirme: false, manqueCompte: true, manqueJour: true, echu: false };
  assert.equal(nouvellesDuParrainage({ ...base, parrain }, false)[0].texte, 'Raphaël t’a invité. Termine ton premier duel : tu recevras 3 paquets.');
  const joue = { ...base, parrain: { ...parrain, valide: true, verse: true } };
  assert.deepEqual(nouvellesDuParrainage(joue, false).map(n => n.cle), ['bienvenue'], 'le cadeau d’abord');
  const [aider] = nouvellesDuParrainage(joue, true);
  assert.deepEqual([aider.cle, aider.titre, aider.lien], ['aider', 'Remercie Raphaël', 'compte']);
  assert.equal(aider.texte, 'Relie un compte Google ou une adresse e-mail, et reviens jouer un duel un autre jour : Raphaël recevra à son tour 3 paquets.');
  const [jour] = nouvellesDuParrainage({ ...joue, parrain: { ...joue.parrain, manqueCompte: false } }, true);
  assert.deepEqual([jour.lien, jour.texte], ['duel', 'Reviens jouer un duel un autre jour : Raphaël recevra à son tour 3 paquets.']);
  assert.equal(nouvellesDuParrainage({ ...joue, parrain: { ...joue.parrain, manqueJour: false } }, true)[0].texte, 'Relie un compte Google ou une adresse e-mail : Raphaël recevra à son tour 3 paquets.');
  assert.deepEqual(nouvellesDuParrainage(joue, true, true), [], 'fermée, elle ne revient pas');
  assert.deepEqual(nouvellesDuParrainage({ ...joue, parrain: { ...joue.parrain, confirme: true } }, true), []);
  assert.deepEqual(nouvellesDuParrainage({ ...joue, parrain: { ...joue.parrain, echu: true } }, true), [], 'trop tard : inutile d’insister');
});
