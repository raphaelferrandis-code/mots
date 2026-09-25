import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CarteObtenue } from '../../jeu/partie.ts';
import type { CarteIndex, Finition } from '../../partage/types.ts';
import { bilanDuPaquet, eclatDe, gainsDuPaquet, phraseDeLaGarantie, titreDuComptoir, titreDuResume } from './eclats.ts';

const obtenue = (rarete: CarteIndex['rarete'], finition: Finition = 'Normale', changements: Partial<CarteObtenue> = {}): CarteObtenue => ({
  carte: { id: `${rarete}-${finition}`, mot: 'mot', type: 'Nom', rarete, faction: 'Latin', attaque: 5, defense: 5, registre: [], definition: '' },
  finition, nouvelle: false, nouvelleFinition: false, encre: 0, ...changements,
});

describe('les effets de la cérémonie', () => {
  it('donne la grande révélation aux Légendaires et Hors-série, quelle que soit la finition', () => {
    assert.equal(eclatDe(obtenue('Légendaire')), 'grand');
    assert.equal(eclatDe(obtenue('Hors-série')), 'grand');
    assert.equal(eclatDe(obtenue('Légendaire', 'Holographique')), 'grand');
  });
  it('suit la finition, et dore les Épiques', () => {
    assert.equal(eclatDe(obtenue('Commune')), 'courant');
    assert.equal(eclatDe(obtenue('Rare', 'Brillante')), 'dore');
    assert.equal(eclatDe(obtenue('Commune', 'Holographique')), 'holo');
    assert.equal(eclatDe(obtenue('Épique')), 'dore');
  });
});

describe('les phrases de la cérémonie', () => {
  it('compte les paquets en toutes lettres', () => {
    assert.equal(titreDuComptoir(10), 'Dix paquets t’attendent.');
    assert.equal(titreDuComptoir(1), 'Un dernier paquet t’attend.');
    assert.equal(titreDuComptoir(0), 'Plus de paquet pour l’instant.');
    assert.equal(titreDuComptoir(15), 'Quinze paquets t’attendent.');
  });
  it('résume un paquet', () => {
    const paquet = [obtenue('Commune'), obtenue('Commune'), obtenue('Rare', 'Brillante'), obtenue('Épique', 'Holographique'), obtenue('Légendaire')];
    assert.equal(titreDuResume(paquet), 'Cinq timbres de plus.');
    assert.equal(bilanDuPaquet(paquet), '3 courants, 1 doré à chaud et 1 holographique, dont 1 Épique et 1 Légendaire');
    assert.equal(titreDuResume([obtenue('Hors-série')]), 'Ta Hors-série.');
  });
  it('compte les paquets jusqu’à la Légendaire garantie', () => {
    assert.equal(phraseDeLaGarantie(0, 40), 'Une Légendaire garantie d’ici 40 paquets.');
    assert.equal(phraseDeLaGarantie(37, 40), 'Une Légendaire garantie d’ici 3 paquets.');
    assert.equal(phraseDeLaGarantie(39, 40), 'Ton prochain paquet contient une Légendaire, c’est garanti.');
    assert.equal(phraseDeLaGarantie(45, 40), 'Ton prochain paquet contient une Légendaire, c’est garanti.');
  });
  it('annonce les nouveautés et l’Encre des doublons', () => {
    assert.equal(gainsDuPaquet([obtenue('Commune', 'Normale', { nouvelle: true }), obtenue('Commune', 'Normale', { encre: 4 })]), '1 nouveau · +4 Encre');
    assert.equal(gainsDuPaquet([obtenue('Commune')]), 'aucun nouveau');
  });
});
