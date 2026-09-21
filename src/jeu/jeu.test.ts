// Tests des règles du jeu : tirage des paquets, recharge, Encre, sauvegarde.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { RARETES, RARETES_ORDINAIRES } from '../partage/types.ts';
import type { CarteIndex, Rarete } from '../partage/types.ts';
import { hasardReproductible } from './hasard.ts';
import { encreMaximaleMoyenneParPaquet, ouvrirPaquet, preparerReserve, tirerFinition, tirerRarete } from './paquets.ts';
import { acheterUnPaquet, mettreAJour, ouvrirUnPaquetGratuit } from './partie.ts';
import { attenteAvantLeProchain, rechargerLesPaquets, retirerUnPaquet } from './recharge.ts';
import { VERSION_DE_SAUVEGARDE, meilleureFinition, nouvelleSauvegarde, relireSauvegarde } from './sauvegarde.ts';

const MINUTE = 60_000;
const T0 = Date.UTC(2026, 8, 21, 12, 0, 0);

const NOMBRE_PAR_RARETE: Record<Rarete, number> = { 'Commune': 500, 'Peu commune': 250, 'Rare': 150, 'Épique': 70, 'Légendaire': 30, 'Hors-série': 0 };
const EDITION: CarteIndex[] = RARETES_ORDINAIRES.flatMap((rarete) => Array.from({ length: NOMBRE_PAR_RARETE[rarete] }, (_, i): CarteIndex => ({
  id: `${rarete}-${i}`, mot: `${rarete}${i}`, type: 'Nom', rarete, attaque: 5, defense: 5, faction: 'Latin',
  registre: i % 10 === 0 ? ['Familier'] : i % 25 === 1 ? ['Injurieux'] : [], definition: '',
})));
const RESERVE = preparerReserve(EDITION);
const REGLAGES = EQUILIBRAGE.paquets;
const FINITIONS = EQUILIBRAGE.finitions;
const SANS_FINITION = { ...FINITIONS, chances: {} };
const HORS_SERIE: CarteIndex[] = ['ressasser', 'amour'].map((mot) => ({ id: `${mot}-hs`, mot, type: 'Nom', rarete: 'Hors-série', attaque: 5, defense: 5, faction: 'Latin', registre: [], definition: '', record: 'Un record' }));

describe('chiffres d\'équilibrage', () => {
  it('chaque emplacement de paquet totalise 100 %', () => {
    for (const chances of REGLAGES.emplacements) assert.equal(Object.values(chances).reduce((a, b) => a + b, 0), 100);
  });
  it('un paquet ne peut pas rapporter autant d\'Encre qu\'il en coûte (sinon les paquets seraient infinis)', () => {
    const maximum = encreMaximaleMoyenneParPaquet(REGLAGES, FINITIONS, EQUILIBRAGE.encreParDoublon);
    assert.ok(maximum < REGLAGES.prixEnEncre * 0.8, `un paquet tout en doublons rapporte ${maximum.toFixed(1)} Encre pour un prix de ${REGLAGES.prixEnEncre}`);
  });
});

describe('tirage d\'un paquet', () => {
  it('respecte les chances de chaque rareté', () => {
    const hasard = hasardReproductible(1);
    const compte = new Map<Rarete, number>();
    for (let i = 0; i < 20000; i++) { const r = tirerRarete({ 'Rare': 74, 'Épique': 22, 'Légendaire': 4 }, hasard); compte.set(r, (compte.get(r) ?? 0) + 1); }
    assert.ok(Math.abs(compte.get('Rare')! / 20000 - 0.74) < 0.015);
    assert.ok(Math.abs(compte.get('Épique')! / 20000 - 0.22) < 0.015);
    assert.ok(Math.abs(compte.get('Légendaire')! / 20000 - 0.04) < 0.006);
    assert.equal(compte.get('Commune'), undefined);
  });
  it('donne cinq cartes différentes, avec au moins une Peu commune et une Rare ou mieux', () => {
    const hasard = hasardReproductible(2);
    for (let i = 0; i < 500; i++) {
      const paquet = ouvrirPaquet(RESERVE, { hasard, paquetsSansLegendaire: 0 }, REGLAGES, FINITIONS);
      assert.equal(paquet.length, 5);
      assert.equal(new Set(paquet.map((t) => t.carte.id)).size, 5);
      assert.ok(RARETES.indexOf(paquet[3].carte.rarete) >= 1);
      assert.ok(RARETES.indexOf(paquet[4].carte.rarete) >= 2);
    }
  });
  it('garantit une Légendaire au 40e paquet sans Légendaire, pas avant', () => {
    const jamais = (): number => 0; // ce « hasard » donne toujours la rareté la plus basse
    assert.equal(ouvrirPaquet(RESERVE, { hasard: jamais, paquetsSansLegendaire: 38 }, REGLAGES, FINITIONS)[4].carte.rarete, 'Rare');
    assert.equal(ouvrirPaquet(RESERVE, { hasard: jamais, paquetsSansLegendaire: 39 }, REGLAGES, FINITIONS)[4].carte.rarete, 'Légendaire');
  });
  it('ne tire jamais une carte masquée par le joueur', () => {
    const reserve = preparerReserve(EDITION, ['Familier', 'Injurieux']);
    const hasard = hasardReproductible(3);
    for (let i = 0; i < 300; i++) for (const { carte } of ouvrirPaquet(reserve, { hasard, paquetsSansLegendaire: 0 }, REGLAGES, FINITIONS)) assert.deepEqual(carte.registre, []);
  });
  it('évite les cartes exclues, et se rabat sur une autre rareté quand une rareté est épuisée', () => {
    const hasard = hasardReproductible(4);
    const toutesLesRares = new Set(EDITION.filter((c) => c.rarete === 'Rare').map((c) => c.id));
    const paquet = ouvrirPaquet(RESERVE, { hasard, paquetsSansLegendaire: 0, exclure: toutesLesRares }, REGLAGES, FINITIONS);
    assert.equal(paquet.length, 5);
    assert.ok(paquet.every((t) => t.carte.rarete !== 'Rare'));
  });
  it('donne toujours le même paquet avec le même hasard', () => {
    const a = ouvrirPaquet(RESERVE, { hasard: hasardReproductible(9), paquetsSansLegendaire: 0 }, REGLAGES, FINITIONS);
    const b = ouvrirPaquet(RESERVE, { hasard: hasardReproductible(9), paquetsSansLegendaire: 0 }, REGLAGES, FINITIONS);
    assert.deepEqual(a, b);
  });
});

describe('finitions et cartes Hors-série', () => {
  it('tire la finition à part, selon ses chances', () => {
    const hasard = hasardReproductible(11);
    const compte = { Normale: 0, Brillante: 0, Holographique: 0 };
    for (let i = 0; i < 60000; i++) compte[tirerFinition(FINITIONS.chances, hasard)]++;
    assert.ok(Math.abs(compte.Brillante / 60000 - 1 / 12) < 0.006);
    assert.ok(Math.abs(compte.Holographique / 60000 - 1 / 80) < 0.003);
    assert.equal(tirerFinition({}, hasard), 'Normale');
  });
  it("peut donner une finition à n'importe quelle rareté", () => {
    const hasard = hasardReproductible(12);
    const vues = new Set<string>();
    for (let i = 0; i < 4000; i++) for (const t of ouvrirPaquet(RESERVE, { hasard, paquetsSansLegendaire: 0 }, REGLAGES, FINITIONS)) if (t.finition !== 'Normale') vues.add(t.carte.rarete);
    assert.deepEqual([...vues].sort(), [...RARETES_ORDINAIRES].sort());
  });
  it('donne une carte Hors-série à la fréquence prévue, toujours en dernière position et sans finition', () => {
    const reserve = preparerReserve([...EDITION, ...HORS_SERIE]);
    const hasard = hasardReproductible(13);
    let obtenues = 0;
    const paquets = 60000;
    for (let i = 0; i < paquets; i++) {
      const paquet = ouvrirPaquet(reserve, { hasard, paquetsSansLegendaire: 0 }, REGLAGES, FINITIONS);
      assert.ok(paquet.slice(0, 4).every((t) => t.carte.rarete !== 'Hors-série'));
      if (paquet[4].carte.rarete === 'Hors-série') { obtenues++; assert.equal(paquet[4].finition, 'Normale'); }
    }
    assert.ok(Math.abs(obtenues / paquets - REGLAGES.chanceHorsSerie) < REGLAGES.chanceHorsSerie * 0.5, `${obtenues} cartes Hors-série en ${paquets} paquets`);
  });
  it('ne remplace jamais une carte ordinaire épuisée par une carte Hors-série, et la garantie de Légendaire passe avant', () => {
    const reserve = preparerReserve([...EDITION.filter((c) => c.rarete !== 'Légendaire'), ...HORS_SERIE]);
    const toujoursLeMinimum = (): number => 0; // ce hasard accorderait la carte Hors-série à tous les coups
    const garanti = ouvrirPaquet(reserve, { hasard: toujoursLeMinimum, paquetsSansLegendaire: 39 }, REGLAGES, SANS_FINITION);
    assert.notEqual(garanti[4].carte.rarete, 'Hors-série');
    assert.equal(ouvrirPaquet(reserve, { hasard: toujoursLeMinimum, paquetsSansLegendaire: 0 }, REGLAGES, SANS_FINITION)[4].carte.rarete, 'Hors-série');
  });
});

describe('recharge des paquets', () => {
  it('donne un paquet toutes les 10 minutes et garde le temps déjà écoulé', () => {
    const etat = rechargerLesPaquets({ stock: 0, reference: T0 }, T0 + 25 * MINUTE, REGLAGES);
    assert.deepEqual(etat, { stock: 2, reference: T0 + 20 * MINUTE });
    assert.equal(attenteAvantLeProchain(etat, T0 + 25 * MINUTE, REGLAGES), 5 * MINUTE);
  });
  it('ne dépasse jamais 10 paquets, même après des jours d\'absence', () => {
    const etat = rechargerLesPaquets({ stock: 4, reference: T0 }, T0 + 3 * 24 * 60 * MINUTE, REGLAGES);
    assert.equal(etat.stock, 10);
    assert.equal(attenteAvantLeProchain(etat, T0 + 3 * 24 * 60 * MINUTE, REGLAGES), null);
  });
  it('relance le compte à rebours quand on ouvre un paquet alors que le stock était plein', () => {
    const plein = rechargerLesPaquets({ stock: 10, reference: T0 }, T0 + 500 * MINUTE, REGLAGES);
    const apres = retirerUnPaquet(plein, T0 + 500 * MINUTE, REGLAGES);
    assert.deepEqual(apres, { stock: 9, reference: T0 + 500 * MINUTE });
    assert.equal(attenteAvantLeProchain(apres, T0 + 503 * MINUTE, REGLAGES), 7 * MINUTE);
  });
  it('ne donne rien si l\'horloge de l\'appareil a été reculée', () => {
    assert.deepEqual(rechargerLesPaquets({ stock: 1, reference: T0 }, T0 - 60 * MINUTE, REGLAGES), { stock: 1, reference: T0 - 60 * MINUTE });
  });
  it('refuse d\'ouvrir un paquet qu\'on n\'a pas', () => {
    assert.throws(() => retirerUnPaquet({ stock: 0, reference: T0 }, T0 + MINUTE, REGLAGES), /Aucun paquet/);
  });
});

describe('une partie', () => {
  const contexte = (maintenant: number, graine: number) => ({ reserve: RESERVE, maintenant, hasard: hasardReproductible(graine), equilibrage: EQUILIBRAGE });

  it('commence avec trois paquets, garantis sans doublon', () => {
    let sauvegarde = nouvelleSauvegarde(T0, REGLAGES.paquetsDeDepart);
    assert.equal(sauvegarde.paquets.stock, 3);
    // Réserve minuscule : sans la garantie, les doublons seraient quasi certains.
    const petite = preparerReserve(EDITION.filter((_, i) => i % 40 === 0));
    for (let i = 0; i < 3; i++) {
      const ouverture = ouvrirUnPaquetGratuit(sauvegarde, { ...contexte(T0, i), reserve: petite });
      assert.ok(ouverture.cartes.every((c) => c.nouvelle && c.nouvelleFinition && c.encre === 0));
      sauvegarde = ouverture.sauvegarde;
    }
    assert.equal(Object.keys(sauvegarde.cartes).length, 15);
    assert.equal(sauvegarde.paquets.stock, 0);
    assert.equal(sauvegarde.paquets.ouverts, 3);
    assert.throws(() => ouvrirUnPaquetGratuit(sauvegarde, contexte(T0, 5)), /Aucun paquet/);
  });
  it('change en Encre une carte déjà possédée dans cette finition, selon sa rareté et sa finition', () => {
    let sauvegarde = nouvelleSauvegarde(T0, 0);
    const toutesLesFinitions = { Normale: 1, Brillante: 1, Holographique: 1 };
    sauvegarde = { ...sauvegarde, paquets: { ...sauvegarde.paquets, stock: 10, ouverts: 50 }, cartes: Object.fromEntries(EDITION.map((c) => [c.id, { obtenueLe: T0, doublons: 0, finitions: toutesLesFinitions, reussites: 0, maitriseeLe: null }])) };
    let encreAttendue = 0;
    for (let i = 0; i < 10; i++) {
      const { cartes, sauvegarde: apres } = ouvrirUnPaquetGratuit(sauvegarde, contexte(T0, 600 + i));
      for (const c of cartes) {
        assert.ok(!c.nouvelle && !c.nouvelleFinition);
        assert.equal(c.encre, EQUILIBRAGE.encreParDoublon[c.carte.rarete] * FINITIONS.encre[c.finition]);
        encreAttendue += c.encre;
      }
      sauvegarde = apres;
    }
    assert.equal(sauvegarde.encre, encreAttendue);
  });
  it("garde une finition que le joueur n'avait pas encore, au lieu de la changer en Encre", () => {
    const possedeTout = { ...nouvelleSauvegarde(T0, 10), paquets: { stock: 10, reference: T0, ouverts: 50, sansLegendaire: 0 }, cartes: Object.fromEntries(EDITION.map((c) => [c.id, { obtenueLe: T0, doublons: 0, finitions: { Normale: 1 }, reussites: 0, maitriseeLe: null }])) };
    const toutBrillant = { ...EQUILIBRAGE, finitions: { ...FINITIONS, chances: { Brillante: 1, Holographique: 0 } } };
    const { cartes, sauvegarde } = ouvrirUnPaquetGratuit(possedeTout, { ...contexte(T0, 7), equilibrage: toutBrillant });
    assert.ok(cartes.every((c) => c.finition === 'Brillante' && !c.nouvelle && c.nouvelleFinition && c.encre === 0));
    assert.equal(sauvegarde.encre, 0);
    assert.deepEqual(sauvegarde.cartes[cartes[0].carte.id].finitions, { Normale: 1, Brillante: 1 });
    // Le même paquet une seconde fois : cette fois ce sont de vrais doublons.
    const encore = ouvrirUnPaquetGratuit(sauvegarde, { ...contexte(T0, 7), equilibrage: toutBrillant });
    assert.ok(encore.cartes.every((c) => !c.nouvelleFinition && c.encre > 0));
  });
  it('permet d\'acheter un paquet avec de l\'Encre, sans toucher au stock', () => {
    const riche = { ...nouvelleSauvegarde(T0, 2), encre: 200 };
    const { sauvegarde } = acheterUnPaquet(riche, contexte(T0, 7));
    assert.equal(sauvegarde.encre, 200 - REGLAGES.prixEnEncre);
    assert.equal(sauvegarde.paquets.stock, 2);
    assert.throws(() => acheterUnPaquet({ ...riche, encre: REGLAGES.prixEnEncre - 1 }, contexte(T0, 8)), /Pas assez/);
  });
  it('compte les paquets sans Légendaire, et repart de zéro quand il en tombe une', () => {
    let sauvegarde = { ...nouvelleSauvegarde(T0, 0), encre: 1000000 };
    let vues = 0;
    for (let i = 0; i < 200; i++) {
      const avant = sauvegarde.paquets.sansLegendaire;
      const ouverture = acheterUnPaquet(sauvegarde, contexte(T0, 100 + i));
      const legendaire = ouverture.cartes.some((c) => c.carte.rarete === 'Légendaire');
      assert.equal(ouverture.sauvegarde.paquets.sansLegendaire, legendaire ? 0 : avant + 1);
      assert.ok(ouverture.sauvegarde.paquets.sansLegendaire < REGLAGES.paquetsAvantLegendaireGarantie);
      if (legendaire) vues++;
      sauvegarde = ouverture.sauvegarde;
    }
    assert.ok(vues >= 5);
  });
  it('ajoute au retour du joueur les paquets gagnés pendant son absence', () => {
    const sauvegarde = { ...nouvelleSauvegarde(T0, 0) };
    assert.equal(mettreAJour(sauvegarde, T0 + 35 * MINUTE, EQUILIBRAGE).paquets.stock, 3);
  });
});

describe('sauvegarde', () => {
  it('se relit à l\'identique après un export', () => {
    const sauvegarde = { ...nouvelleSauvegarde(T0, 3), encre: 42, cartes: { 'callipyge-adj': { obtenueLe: T0, doublons: 2, finitions: { Normale: 3, Holographique: 1 }, reussites: 4, maitriseeLe: null } }, deck: ['callipyge-adj'] };
    assert.deepEqual(relireSauvegarde(JSON.parse(JSON.stringify(sauvegarde)), T0 + MINUTE), sauvegarde);
  });
  it('refuse ce qui n\'est pas une sauvegarde, ou qui vient d\'une version plus récente du jeu', () => {
    for (const brut of [null, 42, 'texte', [], {}, { version: 1 }, { version: 'un', cartes: {} }]) assert.throws(() => relireSauvegarde(brut, T0), /pas une sauvegarde/);
    assert.throws(() => relireSauvegarde({ version: 99, cartes: {} }, T0), /plus récente/);
  });
  it('répare ce qui est absent ou abîmé au lieu de planter', () => {
    const reparee = relireSauvegarde({ version: 2, cartes: { bon: { obtenueLe: 5, doublons: 1, finitions: { Brillante: 2, Inventee: 9, Normale: -1 } }, abime: 'x', bizarre: { doublons: -4, finitions: 'rien' } }, encre: -10, paquets: { stock: 'beaucoup', reference: T0 + 999 * MINUTE } }, T0);
    assert.equal(reparee.encre, 0);
    assert.deepEqual(reparee.cartes, { bon: { obtenueLe: 5, doublons: 1, finitions: { Brillante: 2 }, reussites: 0, maitriseeLe: null }, bizarre: { obtenueLe: T0, doublons: 0, finitions: { Normale: 1 }, reussites: 0, maitriseeLe: null } });
    assert.equal(reparee.paquets.stock, 0);
    assert.equal(reparee.paquets.reference, T0, 'une date future donnerait des paquets gratuits');
    assert.deepEqual(reparee.reglages, { masquerFamiliers: false, masquerInjurieux: false, reduireAnimations: false, tempsDeReponse: 'normal' });
  });
  it('convertit une sauvegarde de la version 1 : toutes les cartes étaient alors en finition normale', () => {
    const ancienne = { version: 1, creeLe: T0, encre: 12, paquets: { stock: 2, reference: T0, ouverts: 9, sansLegendaire: 4 }, cartes: { 'callipyge-adj': { obtenueLe: T0, doublons: 2 }, 'amour-nom': { obtenueLe: T0, doublons: 0 } }, reglages: { masquerFamiliers: true }, dernierExport: null };
    const convertie = relireSauvegarde(ancienne, T0);
    assert.equal(convertie.version, VERSION_DE_SAUVEGARDE);
    assert.deepEqual(convertie.cartes['callipyge-adj'], { obtenueLe: T0, doublons: 2, finitions: { Normale: 3 }, reussites: 0, maitriseeLe: null });
    assert.deepEqual(convertie.cartes['amour-nom'].finitions, { Normale: 1 });
    assert.equal(convertie.encre, 12);
    assert.equal(convertie.reglages.masquerFamiliers, true);
    assert.equal(meilleureFinition(convertie.cartes['callipyge-adj']), 'Normale');
    assert.equal(meilleureFinition({ obtenueLe: T0, doublons: 0, finitions: { Normale: 4, Holographique: 1, Brillante: 2 }, reussites: 0, maitriseeLe: null }), 'Holographique');
  });
  it('plafonne un stock de paquets trafiqué', () => {
    const trafiquee = relireSauvegarde({ version: 2, cartes: {}, paquets: { stock: 9999, reference: T0 } }, T0);
    assert.equal(mettreAJour(trafiquee, T0, EQUILIBRAGE).paquets.stock, REGLAGES.stockMaximum);
  });
  it('conserve une carte inconnue de l\'édition sans broncher', () => {
    const sauvegarde = relireSauvegarde({ version: 1, cartes: { 'mot-disparu-nom': { obtenueLe: T0, doublons: 0 } } }, T0);
    assert.ok('mot-disparu-nom' in sauvegarde.cartes);
  });
});
