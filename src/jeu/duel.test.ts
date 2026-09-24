// Tests du duel : règles du combat, deck de l'ordinateur, épreuve de maîtrise, maîtrise des mots et récompenses.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { EQUILIBRAGE, attaqueEnJeu, defenseEnJeu } from '../config/equilibrage.ts';
import { nomDuLot } from '../partage/lots.ts';
import type { CarteDetails, CarteIndex, Definition, IndexEdition, Nature, Rarete } from '../partage/types.ts';
import { contientLeMot, masquerLeMot, trahitLeMot } from '../partage/famille.ts';
import { NIVEAUX, chancesDeLOrdinateur, choisirPourLOrdinateur, commencerLeDuel, deckDeLOrdinateur, forceDeLaCarte, jouerLaManche, meilleurDeck, prevoirLAttaque, taillesDesFactions } from './duel.ts';
import type { Duel } from './duel.ts';
import { composerLEpreuve } from './epreuve.ts';
import { hasardReproductible } from './hasard.ts';
import { cartesDuDeck, enregistrerLeDeck, jourDe, noterUneReponse, terminerUnDuel } from './progression.ts';
import { VERSION_DE_SAUVEGARDE, nouvelleSauvegarde, relireSauvegarde } from './sauvegarde.ts';
import type { Sauvegarde } from './sauvegarde.ts';

const REGLES = EQUILIBRAGE.duel;
const T0 = new Date(2026, 8, 21, 12, 0, 0).getTime();
const JOUR = 24 * 3600_000;

const carte = (mot: string, champs: Partial<CarteIndex> = {}): CarteIndex => ({ id: `${mot}-nom`, mot, type: 'Nom', rarete: 'Commune', attaque: 5, defense: 4, faction: 'Latin', registre: [], definition: '', ...champs });

// Une petite édition variée : 300 cartes de toutes natures, raretés, forces et factions.
const NATURES: Nature[] = ['Nom', 'Adjectif', 'Verbe', 'Adverbe'];
const RARETES_DE_TEST: Rarete[] = ['Commune', 'Peu commune', 'Rare', 'Épique', 'Légendaire'];
const EDITION: CarteIndex[] = Array.from({ length: 300 }, (_, i) => carte(`mot${i}`, {
  // Dans chaque rareté, toutes les forces existent : l'attaque et la défense tournent à des rythmes différents.
  id: `mot${i}`, type: NATURES[i % 4], rarete: RARETES_DE_TEST[i % 5], attaque: 1 + (Math.floor(i / 5) % 10), defense: 1 + ((Math.floor(i / 5) * 3) % 10), faction: i % 6 === 0 ? 'Arabe' : 'Latin',
}));
const TAILLES = taillesDesFactions(EDITION);
const DECK = EDITION.slice(0, 10);
const AUTRE_DECK = EDITION.slice(10, 20);

// Un duel dont on choisit les mains, pour vérifier les calculs un par un.
function situation(mainDuJoueur: CarteIndex[], mainAdverse: CarteIndex[], precedentes: { joueur?: CarteIndex; adversaire?: CarteIndex } = {}): Duel {
  const camp = (cote: string) => ({ pv: REGLES.pointsDeVie, pioche: [carte(`pioche-1-${cote}`), carte(`pioche-2-${cote}`)], defausse: [] });
  return { manche: 1, vainqueur: null, manches: [], camps: { joueur: { ...camp('joueur'), main: mainDuJoueur, derniere: precedentes.joueur ?? null }, adversaire: { ...camp('adverse'), main: mainAdverse, derniere: precedentes.adversaire ?? null } } };
}
const TOUT_REUSSI = { joueurPare: false, adversairePare: false };

describe("chiffres d'équilibrage du duel", () => {
  it('un deck donne de quoi former une main, et les chances de l\'ordinateur sont des probabilités', () => {
    assert.ok(REGLES.tailleDuDeck > REGLES.cartesEnMain + 1);
    assert.ok(REGLES.partDeLaDefense >= 0 && REGLES.partDeLaDefense <= 1);
    assert.ok(REGLES.partDesDegatsApresParade >= 0 && REGLES.partDesDegatsApresParade <= 1);
    for (const niveau of NIVEAUX) for (const rarete of [...RARETES_DE_TEST, 'Hors-série' as const]) {
      const chances = chancesDeLOrdinateur(niveau, carte('mot', { rarete }), REGLES);
      for (const chance of [chances.reussir, chances.parer]) assert.ok(chance >= 0 && chance <= 1, `${niveau}, ${rarete} : ${chance}`);
    }
  });
  it('un mot rare est puissant : plus la rareté monte, plus le bonus d\'attaque monte, et moins l\'ordinateur pare', () => {
    const raretes = [...RARETES_DE_TEST, 'Hors-série' as const];
    for (let i = 1; i < raretes.length; i++) {
      assert.ok(attaqueEnJeu(5, raretes[i]) >= attaqueEnJeu(5, raretes[i - 1]));
      if (raretes[i] !== 'Hors-série') assert.ok(chancesDeLOrdinateur('Difficile', carte('a', { rarete: raretes[i] }), REGLES).parer <= chancesDeLOrdinateur('Difficile', carte('a', { rarete: raretes[i - 1] }), REGLES).parer);
    }
    assert.ok(attaqueEnJeu(5, 'Légendaire') > attaqueEnJeu(5, 'Commune'));
    assert.ok(attaqueEnJeu(10, 'Légendaire') > EQUILIBRAGE.statMaximale, "le bonus d'attaque n'est pas plafonné");
  });
});

describe('Hors-série : puissance et parade', () => {
  it('garantit des statistiques élevées à toutes les Hors-série de l’édition, même aux mots courts', () => {
    const edition: IndexEdition = JSON.parse(readFileSync(path.join(import.meta.dirname, '../../public/data/edition-1.index.json'), 'utf8'));
    const horsSerie = edition.cartes.filter(c => c.rarete === 'Hors-série');
    assert.ok(horsSerie.length > 0);
    const mur = carte('mur', { defense: 10, type: 'Adverbe' });
    for (const c of horsSerie) {
      assert.ok(attaqueEnJeu(c.attaque, c.rarete) >= EQUILIBRAGE.minimumHorsSerie.attaque, c.mot);
      assert.ok(defenseEnJeu(c.defense, c.rarete) >= EQUILIBRAGE.minimumHorsSerie.defense, c.mot);
      assert.ok(defenseEnJeu(c.defense, c.rarete) <= EQUILIBRAGE.statMaximale);
      const prevision = prevoirLAttaque(situation([c], [mur]), 'joueur', c, mur, TAILLES, REGLES);
      assert.ok(prevision.degatsSiParee >= 3, c.mot + ' reste menaçant face à une défense maximale et une parade');
      assert.ok(prevision.degatsSiParee < prevision.degats, 'la parade reste utile');
    }
    assert.equal(attaqueEnJeu(5, 'Commune'), 5);
    assert.equal(defenseEnJeu(4, 'Commune'), 4);
  });
  it('les fait parer comme des communes, sans empêcher une parade réussie du joueur', () => {
    const hs = carte('amour', { rarete: 'Hors-série', attaque: 1 });
    const commune = carte('mur');
    for (const niveau of NIVEAUX) {
      assert.equal(chancesDeLOrdinateur(niveau, hs, REGLES).parer, chancesDeLOrdinateur(niveau, commune, REGLES).parer);
      assert.ok(chancesDeLOrdinateur(niveau, hs, REGLES).parer > chancesDeLOrdinateur(niveau, carte('rare', { rarete: 'Légendaire' }), REGLES).parer);
    }
    const fin = jouerLaManche(situation([commune], [hs]), commune.id, hs.id, { ...TOUT_REUSSI, joueurPare: true }, hasardReproductible(1), TAILLES, REGLES);
    assert.equal(fin.manches[0].adversaire.paree, true);
    assert.equal(fin.manches[0].adversaire.infliges, fin.manches[0].adversaire.degatsSiParee);
  });
});

describe('déroulement du duel', () => {
  it('distribue trois cartes à chaque camp, sans mot en jeu ni premier joueur', () => {
    const duel = commencerLeDuel(DECK, AUTRE_DECK, hasardReproductible(1), REGLES);
    for (const camp of [duel.camps.joueur, duel.camps.adversaire]) {
      assert.equal(camp.pv, REGLES.pointsDeVie);
      assert.equal(camp.main.length, REGLES.cartesEnMain);
      assert.equal(camp.main.length + camp.pioche.length, REGLES.tailleDuDeck);
      assert.equal(camp.derniere, null);
    }
    assert.equal(duel.manche, 1);
  });

  it('calcule les dégâts : attaque en jeu, moins la part de la défense d\'en face, au moins le minimum', () => {
    const regles = { ...REGLES, partDeLaDefense: 1 };
    const fort = carte('fort', { attaque: 9, type: 'Adverbe' });
    const prevoir = (enFace: CarteIndex, r = regles) => prevoirLAttaque(situation([fort], [enFace]), 'joueur', fort, enFace, TAILLES, r);
    assert.equal(prevoir(carte('mur', { defense: 4 })).degats, 5);
    assert.equal(prevoir(carte('mur', { defense: 10 })).degats, regles.degatsMinimum);
    // La moitié de la défense seulement ; le bonus de défense des cartes rares compte, celui d'attaque aussi.
    const moitie = { ...REGLES, partDeLaDefense: 0.5 };
    assert.equal(prevoir(carte('mur', { defense: 4 }), moitie).degats, 7);
    assert.equal(prevoir(carte('mur', { defense: 4, rarete: 'Légendaire' }), moitie).bloques, (4 + EQUILIBRAGE.bonusDefenseParRarete['Légendaire']) / 2);
    const rare = carte('rare', { attaque: 9, type: 'Adverbe', rarete: 'Légendaire' });
    const duRare = prevoirLAttaque(situation([rare], [carte('mur')]), 'joueur', rare, carte('mur', { defense: 4 }), TAILLES, moitie);
    assert.equal(duRare.bonusDeRarete, EQUILIBRAGE.bonusAttaqueParRarete['Légendaire']);
    assert.equal(duRare.degats, 7 + EQUILIBRAGE.bonusAttaqueParRarete['Légendaire']);
  });

  it('une parade réduit les dégâts, arrondis en faveur de celui qui pare', () => {
    const regles = { ...REGLES, partDeLaDefense: 0, partDesDegatsApresParade: 0.5 };
    const degatsSiParee = (attaque: number): number => { const c = carte('a', { attaque, type: 'Adverbe' }); return prevoirLAttaque(situation([c], [carte('b')]), 'joueur', c, carte('b'), TAILLES, regles).degatsSiParee; };
    assert.deepEqual([1, 2, 5, 8].map(degatsSiParee), [0, 1, 2, 4]);
  });

  it('applique le triangle des types : Nom > Adjectif > Verbe > Nom, adverbes neutres', () => {
    const bonus = (attaquant: Nature, defenseur: Nature): number => {
      const c = carte('a', { type: attaquant });
      const d = carte('d', { type: defenseur });
      return prevoirLAttaque(situation([c], [d]), 'joueur', c, d, TAILLES, REGLES).bonusDeType;
    };
    assert.equal(bonus('Nom', 'Adjectif'), REGLES.bonusDeType);
    assert.equal(bonus('Adjectif', 'Verbe'), REGLES.bonusDeType);
    assert.equal(bonus('Verbe', 'Nom'), REGLES.bonusDeType);
    assert.equal(bonus('Adjectif', 'Nom'), 0);
    assert.equal(bonus('Nom', 'Nom'), 0);
    assert.equal(bonus('Adverbe', 'Nom'), 0);
    assert.equal(bonus('Nom', 'Adverbe'), 0);
  });

  it('récompense deux mots de la même faction à la suite, davantage pour une petite faction', () => {
    const tailles = new Map([['Latin', 900], ['Arabe', 84]]);
    const bonus = (faction: string, precedente: string | null): number => {
      const c = carte('a', { faction });
      return prevoirLAttaque(situation([c], [carte('d')], { joueur: precedente ? carte('p', { faction: precedente }) : undefined }), 'joueur', c, carte('d'), tailles, REGLES).bonusDeFaction;
    };
    assert.equal(bonus('Latin', 'Latin'), REGLES.bonusDeFaction);
    assert.equal(bonus('Arabe', 'Arabe'), REGLES.bonusDePetiteFaction);
    assert.equal(bonus('Arabe', 'Latin'), 0);
    assert.equal(bonus('Latin', null), 0);
  });

  it('règle les deux attaques de la manche : automatique ou parée', () => {
    const mien = carte('mien', { attaque: 8, defense: 2, type: 'Adverbe' });
    const sien = carte('sien', { attaque: 6, defense: 4, type: 'Adverbe' });
    const depart = situation([mien, carte('reste')], [sien, carte('autre')]);
    const prevueDuJoueur = prevoirLAttaque(depart, 'joueur', mien, sien, TAILLES, REGLES);
    const prevueAdverse = prevoirLAttaque(depart, 'adversaire', sien, mien, TAILLES, REGLES);
    const regler = (savoirs: Partial<typeof TOUT_REUSSI>): Duel => jouerLaManche(depart, mien.id, sien.id, { ...TOUT_REUSSI, ...savoirs }, hasardReproductible(1), TAILLES, REGLES);

    const plein = regler({});
    assert.equal(plein.camps.adversaire.pv, REGLES.pointsDeVie - prevueDuJoueur.degats);
    assert.equal(plein.camps.joueur.pv, REGLES.pointsDeVie - prevueAdverse.degats);
    assert.deepEqual([plein.manches[0].joueur.infliges, plein.manches[0].adversaire.infliges], [prevueDuJoueur.degats, prevueAdverse.degats]);

    const pare = regler({ joueurPare: true, adversairePare: true });
    assert.equal(pare.camps.joueur.pv, REGLES.pointsDeVie - prevueAdverse.degatsSiParee);
    assert.equal(pare.camps.adversaire.pv, REGLES.pointsDeVie - prevueDuJoueur.degatsSiParee);
    assert.ok(pare.manches[0].adversaire.paree && pare.manches[0].joueur.paree);
    for (const apres of [plein, pare]) {
      assert.equal(apres.manche, 2);
      assert.equal(apres.camps.joueur.derniere?.id, mien.id);
      assert.deepEqual(apres.camps.joueur.defausse.map((c) => c.id), [mien.id]);
      assert.ok(!apres.camps.joueur.main.some((c) => c.id === mien.id));
    }
    assert.throws(() => jouerLaManche(depart, 'carte-inconnue', sien.id, TOUT_REUSSI, hasardReproductible(1), TAILLES, REGLES));
    assert.throws(() => jouerLaManche(depart, mien.id, 'carte-inconnue', TOUT_REUSSI, hasardReproductible(1), TAILLES, REGLES));
  });

  it('ne rejoue aucune carte et termine quand les mains sont épuisées', () => {
    const regles = { ...REGLES, pointsDeVie: 100_000, manchesMaximum: 40 };
    let duel = commencerLeDuel(DECK, AUTRE_DECK, hasardReproductible(8), regles);
    const hasard = hasardReproductible(9);
    for (let i = 0; i < 38 && duel.vainqueur === null; i++) {
      duel = jouerLaManche(duel, duel.camps.joueur.main[0].id, duel.camps.adversaire.main[0].id, TOUT_REUSSI, hasard, TAILLES, regles);
      for (const [camp, deck] of [[duel.camps.joueur, DECK], [duel.camps.adversaire, AUTRE_DECK]] as const) {
        const toutes = [...camp.main, ...camp.pioche, ...camp.defausse].map((c) => c.id).sort();
        assert.deepEqual(toutes, deck.map((c) => c.id).sort());
        assert.equal(camp.main.length, Math.min(REGLES.cartesEnMain, deck.length - i - 1));
        assert.equal(camp.defausse.length, i + 1);
        assert.equal(new Set(camp.defausse.map((c) => c.id)).size, i + 1);
      }
    }
    assert.equal(duel.manche, DECK.length);
    assert.notEqual(duel.vainqueur, null);
    assert.equal(duel.camps.joueur.main.length, 0);
    assert.equal(duel.camps.adversaire.main.length, 0);
  });

  it('épuise aussi les cartes après une parade manquée et interdit de rejouer une carte', () => {
    const hasard = hasardReproductible(12);
    const depart = commencerLeDuel(DECK, AUTRE_DECK, hasard, REGLES);
    const mien = depart.camps.joueur.main[0].id;
    const sien = depart.camps.adversaire.main[0].id;
    const apres = jouerLaManche(depart, mien, sien, TOUT_REUSSI, hasard, TAILLES, REGLES);
    assert.equal(apres.camps.joueur.defausse[0].id, mien);
    assert.equal(apres.camps.adversaire.defausse[0].id, sien);
    assert.throws(() => jouerLaManche(apres, mien, apres.camps.adversaire.main[0].id, TOUT_REUSSI, hasard, TAILLES, REGLES), /pas dans la main/);
    assert.equal(depart.camps.joueur.defausse.length, 0, 'la résolution ne modifie pas le duel de départ');
  });

  it('départage aux PV quand un seul camp épuise ses cartes, avec égalité possible', () => {
    const rien = { joueurPare: true, adversairePare: true };
    for (const cote of ['joueur', 'adversaire'] as const) {
      for (const avance of [-1, 0, 1]) {
        const depart = commencerLeDuel(DECK, AUTRE_DECK, hasardReproductible(1), REGLES);
        depart.camps[cote].main = [depart.camps[cote].main[0]];
        depart.camps[cote].pioche = [];
        for (const camp of Object.values(depart.camps)) camp.main = camp.main.map(c => ({...c, type:'Adverbe', attaque:1, defense:10, rarete:'Commune'}));
        depart.camps.joueur.pv += avance;
        const fin = jouerLaManche(depart, depart.camps.joueur.main[0].id, depart.camps.adversaire.main[0].id, rien, hasardReproductible(2), TAILLES, REGLES);
        assert.equal(fin.vainqueur, avance === 0 ? 'nul' : avance > 0 ? 'joueur' : 'adversaire');
        assert.equal(fin.manche, 1);
        assert.throws(() => jouerLaManche(fin, '', '', rien, hasardReproductible(2), TAILLES, REGLES), /terminé/);
      }
    }
  });

  it("l'attaque du joueur part la première : s'il terrasse l'ordinateur, l'attaque adverse ne porte pas", () => {
    const regles = { ...REGLES, pointsDeVie: 1 };
    const duel = commencerLeDuel(DECK, AUTRE_DECK, hasardReproductible(5), regles);
    const fin = jouerLaManche(duel, duel.camps.joueur.main[0].id, duel.camps.adversaire.main[0].id, TOUT_REUSSI, hasardReproductible(6), TAILLES, regles);
    assert.equal(fin.vainqueur, 'joueur');
    assert.equal(fin.camps.joueur.pv, 1);
    assert.equal(fin.manches[0].adversaire.infliges, 0);
    assert.equal(fin.manche, 1);
    assert.throws(() => jouerLaManche(fin, fin.camps.joueur.main[0].id, fin.camps.adversaire.main[0].id, TOUT_REUSSI, hasardReproductible(6), TAILLES, regles));
    // Une attaque entièrement parée laisse l'adversaire riposter et gagner.
    const faible = situation([carte('a', { attaque: 1 })], [carte('b', { defense: 10 })]);
    faible.camps.joueur.pv = 1;
    const perdu = jouerLaManche(faible, faible.camps.joueur.main[0].id, faible.camps.adversaire.main[0].id, { joueurPare: false, adversairePare: true }, hasardReproductible(6), TAILLES, REGLES);
    assert.equal(perdu.vainqueur, 'adversaire');
    assert.equal(perdu.manches[0].joueur.reussie, true);
    assert.equal(perdu.manches[0].joueur.infliges, 0);
  });

  it('à la limite de manches, le mieux portant l\'emporte ; à égalité, match nul', () => {
    const regles = { ...REGLES, manchesMaximum: 3 };
    const jouerTout = (savoirs: (manche: number) => typeof TOUT_REUSSI): Duel => {
      const uniformes = (deck: CarteIndex[]) => deck.map(c => ({...c, type:'Adverbe' as const, rarete:'Commune' as const, faction:'Latin', attaque: 4, defense: 4}));
      let duel = commencerLeDuel(uniformes(DECK), uniformes(AUTRE_DECK), hasardReproductible(5), regles);
      while (duel.vainqueur === null) duel = jouerLaManche(duel, duel.camps.joueur.main[0].id, duel.camps.adversaire.main[0].id, savoirs(duel.manche), hasardReproductible(7), TAILLES, regles);
      return duel;
    };
    const rien = { joueurPare: true, adversairePare: true };
    const nul = jouerTout(() => rien);
    assert.equal(nul.vainqueur, 'nul');
    assert.equal(nul.manches.length, 3);
    assert.equal(nul.manche, 3);
    assert.equal(jouerTout((manche) => ({ joueurPare: true, adversairePare: manche !== 2 })).vainqueur, 'joueur');
    assert.equal(jouerTout((manche) => ({ joueurPare: manche !== 1, adversairePare: true })).vainqueur, 'adversaire');
  });
});

describe("l'ordinateur", () => {
  it('reçoit un deck sans carte du joueur ni doublon, de la rareté voulue par le niveau', () => {
    const deckDuJoueur = meilleurDeck(EDITION.filter((_, i) => i % 3 === 0), REGLES);
    const rang = (c: CarteIndex): number => RARETES_DE_TEST.indexOf(c.rarete);
    for (const niveau of NIVEAUX) {
      for (let graine = 0; graine < 20; graine++) {
        const deck = deckDeLOrdinateur(deckDuJoueur, EDITION, niveau, hasardReproductible(graine), REGLES);
        assert.equal(new Set([...deck, ...deckDuJoueur].map((c) => c.id)).size, 2 * REGLES.tailleDuDeck);
        const crans = REGLES.cransDeRareteDeLOrdinateur[niveau];
        deck.forEach((c, i) => {
          const attendu = Math.min(RARETES_DE_TEST.length - 1, rang(deckDuJoueur[i]) + crans);
          assert.ok(rang(c) >= Math.floor(attendu) && rang(c) <= Math.ceil(attendu), `${niveau} : ${deckDuJoueur[i].rarete} → ${c.rarete}`);
        });
      }
    }
    // Une carte Hors-série trouve une carte Hors-série en face, quel que soit le niveau.
    const horsSerie = ['a', 'b', 'c'].map((mot) => carte(mot, { id: `hs-${mot}`, rarete: 'Hors-série' }));
    assert.equal(deckDeLOrdinateur([horsSerie[0]], [...EDITION, ...horsSerie], 'Difficile', hasardReproductible(1), REGLES)[0].rarete, 'Hors-série');
  });

  it('à rareté égale, vise des cartes de la force de celles du joueur', () => {
    const regles = { ...REGLES, cransDeRareteDeLOrdinateur: { 'Facile': 0, 'Normal': 0, 'Difficile': 0 }, ecartDeForceDeLOrdinateur: { 'Facile': -2, 'Normal': 0, 'Difficile': 2 } };
    const forceMoyenne = (deck: CarteIndex[]): number => deck.reduce((s, c) => s + forceDeLaCarte(c), 0) / deck.length;
    const moyen = EDITION.filter((c) => forceDeLaCarte(c) >= 8 && forceDeLaCarte(c) <= 14).slice(0, 10);
    for (const niveau of NIVEAUX) {
      const deck = deckDeLOrdinateur(moyen, EDITION, niveau, hasardReproductible(2), regles);
      assert.ok(Math.abs(forceMoyenne(deck) - forceMoyenne(moyen) - regles.ecartDeForceDeLOrdinateur[niveau]) <= 1, niveau);
    }
  });

  it('pose son mot au hasard en Facile, et sa carte la plus solide aux autres niveaux', () => {
    const main = [carte('faible', { attaque: 2, defense: 2 }), carte('fort', { attaque: 9, defense: 8 }), carte('moyen', { attaque: 5, defense: 5 })];
    const duel = situation([carte('x')], main);
    assert.equal(choisirPourLOrdinateur(duel, 'Normal', hasardReproductible(1), TAILLES, REGLES).mot, 'fort');
    assert.equal(choisirPourLOrdinateur(duel, 'Difficile', hasardReproductible(1), TAILLES, REGLES).mot, 'fort');
    const choix = new Set(Array.from({ length: 60 }, (_, i) => choisirPourLOrdinateur(duel, 'Facile', hasardReproductible(i), TAILLES, REGLES).mot));
    assert.equal(choix.size, 3);
  });

  it('« Composer pour moi » retient les cartes les plus fortes', () => {
    const deck = meilleurDeck(EDITION, REGLES);
    assert.equal(deck.length, REGLES.tailleDuDeck);
    const plusFaibleDuDeck = Math.min(...deck.map(forceDeLaCarte));
    assert.ok(EDITION.filter((c) => !deck.includes(c)).every((c) => forceDeLaCarte(c) <= plusFaibleDuDeck));
  });
});

describe('épreuve de maîtrise', () => {
  // Des définitions qui n'ont aucun mot en commun : trois mots inventés, propres à chacune.
  const SYLLABES = ['ba', 'co', 'du', 'fi', 'ga', 'lo', 'mu', 'ne', 'pi', 'ra'];
  const invente = (n: number): string => [...String(n).padStart(3, '0')].map((chiffre) => SYLLABES[Number(chiffre)]).join('');
  const texte = (i: number): string => `Le ${invente(i)} du ${invente(i + 300)} au ${invente(i + 600)}.`;
  const DEFINITIONS = new Map<string, Definition[]>(EDITION.map((c, i) => [c.id, [{ texte: texte(i), quiz: true }]]));

  it('ne réintroduit pas un sens masqué lorsque tous les sens utilisables en quiz le sont', () => {
    const definitions = new Map(DEFINITIONS);
    definitions.set(EDITION[0].id, [
      { texte: 'Un sens familier interdit dans cette partie.', quiz: true, registre: ['Familier'] },
      { texte: 'Un sens neutre suffisamment explicite.', quiz: false },
    ]);
    const e = composerLEpreuve(EDITION[0], definitions, EDITION, ['Familier'], hasardReproductible(3));
    assert.equal(e.propositions[e.bonne], 'Un sens neutre suffisamment explicite.');
  });

  it('propose quatre définitions différentes, dont la bonne, avec des leurres de même nature et de rareté voisine', () => {
    for (let graine = 0; graine < 40; graine++) {
      const demandee = EDITION[graine * 7];
      const epreuve = composerLEpreuve(demandee, DEFINITIONS, EDITION, [], hasardReproductible(graine));
      assert.equal(epreuve.propositions.length, 4);
      assert.equal(new Set(epreuve.propositions).size, 4);
      assert.equal(epreuve.propositions[epreuve.bonne], DEFINITIONS.get(demandee.id)![0].texte);
      for (const proposition of epreuve.propositions) {
        const source = EDITION.find((c) => DEFINITIONS.get(c.id)![0].texte === proposition)!;
        assert.equal(source.type, demandee.type);
        assert.ok(Math.abs(RARETES_DE_TEST.indexOf(source.rarete) - RARETES_DE_TEST.indexOf(demandee.rarete)) <= 1);
      }
    }
    const places = new Set(Array.from({ length: 40 }, (_, i) => composerLEpreuve(EDITION[0], DEFINITIONS, EDITION, [], hasardReproductible(i)).bonne));
    assert.equal(places.size, 4, 'la bonne réponse change de place');
  });

  it("n'emploie que les définitions utilisables en duel, et change de définition d'une fois sur l'autre", () => {
    const definitions = new Map(DEFINITIONS);
    definitions.set(EDITION[0].id, [{ texte: 'Court.', quiz: false }, { texte: 'Première définition longue et utilisable en duel.', quiz: true }, { texte: 'Seconde définition longue et utilisable en duel.', quiz: true }]);
    const posees = new Set(Array.from({ length: 30 }, (_, i) => { const e = composerLEpreuve(EDITION[0], definitions, EDITION, [], hasardReproductible(i)); return e.propositions[e.bonne]; }));
    assert.deepEqual([...posees].sort(), ['Première définition longue et utilisable en duel.', 'Seconde définition longue et utilisable en duel.']);
  });

  it('écarte les leurres qui nomment le mot, que la bonne définition nomme, ou qui lui ressemblent trop', () => {
    const demandee = carte('chandelle', { id: 'chandelle', type: 'Nom' });
    const pieges: [CarteIndex, string][] = [
      [carte('chandelier', { id: 'p1' }), 'Support sur lequel on pose une chandelle pour éclairer une pièce.'],
      [carte('mèche', { id: 'p2' }), 'Cordon que l\'on allume au sommet d\'une bougie, selon les usages.'],
      [carte('bougie', { id: 'p3' }), 'Petit cylindre de suif muni d\'une mèche, que l\'on allume pour éclairer.'],
    ];
    const sains = EDITION.filter((c) => c.type === 'Nom').slice(0, 12);
    const definitions = new Map<string, Definition[]>([
      [demandee.id, [{ texte: 'Petit cylindre de suif ou de cire muni d\'une mèche, que l\'on allume pour éclairer.', quiz: true }]],
      ...pieges.map(([c, t]): [string, Definition[]] => [c.id, [{ texte: t, quiz: true }]]),
      ...sains.map((c): [string, Definition[]] => [c.id, DEFINITIONS.get(c.id)!]),
    ]);
    for (let graine = 0; graine < 25; graine++) {
      const epreuve = composerLEpreuve(demandee, definitions, [...pieges.map(([c]) => c), ...sains], [], hasardReproductible(graine));
      assert.equal(epreuve.propositions.length, 4);
      for (const [, piege] of pieges) assert.ok(!epreuve.propositions.includes(piege), piege);
    }
  });

  it('évite les définitions qui ne sont qu\'un renvoi (« Synonyme de… »), tant que le mot en a une autre', () => {
    const definitions = new Map(DEFINITIONS);
    definitions.set(EDITION[0].id, [{ texte: 'Synonyme de sériole couronnée, un poisson.', quiz: true }, { texte: 'Poisson des mers chaudes, au corps fuselé.', quiz: true }]);
    for (let graine = 0; graine < 12; graine++) {
      const epreuve = composerLEpreuve(EDITION[0], definitions, EDITION, [], hasardReproductible(graine));
      assert.equal(epreuve.propositions[epreuve.bonne], 'Poisson des mers chaudes, au corps fuselé.');
    }
    definitions.set(EDITION[0].id, [{ texte: 'Synonyme de sériole couronnée, un poisson.', quiz: true }]);
    const seule = composerLEpreuve(EDITION[0], definitions, EDITION, [], hasardReproductible(1));
    assert.equal(seule.propositions[seule.bonne], 'Synonyme de sériole couronnée, un poisson.');
  });

  it('retire le renvoi « → voir … » qui termine certaines définitions', () => {
    const definitions = new Map(DEFINITIONS);
    definitions.set(EDITION[0].id, [{ texte: 'Mot ou forme incorrecte, ou dont le sens est altéré. → voir impropriété et solécisme', quiz: true }]);
    const epreuve = composerLEpreuve(EDITION[0], definitions, EDITION, [], hasardReproductible(3));
    assert.equal(epreuve.propositions[epreuve.bonne], 'Mot ou forme incorrecte, ou dont le sens est altéré.');
  });

  it('respecte les mots masqués par le joueur, et pose quand même les cartes sans définition utilisable', () => {
    const edition = EDITION.map((c, i) => (i % 2 === 1 ? { ...c, registre: ['Injurieux' as const] } : c));
    for (let graine = 0; graine < 20; graine++) {
      const epreuve = composerLEpreuve(edition[0], DEFINITIONS, edition, ['Injurieux'], hasardReproductible(graine));
      for (const proposition of epreuve.propositions) assert.ok(edition.find((c) => DEFINITIONS.get(c.id)![0].texte === proposition)!.registre.length === 0);
    }
    const definitions = new Map(DEFINITIONS);
    const datable = carte('datable', { id: 'datable', type: EDITION[0].type, rarete: EDITION[0].rarete });
    definitions.set('datable', [{ texte: 'Que l\'on peut dater.', quiz: false }]);
    const epreuve = composerLEpreuve(datable, definitions, EDITION, [], hasardReproductible(1));
    assert.equal(epreuve.propositions[epreuve.bonne], 'Que l\'on peut ⋯.');
  });

  it('reconnaît et masque un mot et sa famille dans un texte', () => {
    assert.ok(contientLeMot('Que l\'on peut dater.', 'datable'));
    assert.ok(!contientLeMot('Encore plus précieux que l\'argent.', 'or'));
    assert.equal(masquerLeMot('Métal jaune ; l\'or est précieux, encore.', 'or'), 'Métal jaune ; l\'⋯ est précieux, encore.');
    assert.equal(masquerLeMot('Petit sac où l\'on porte sa monnaie.', 'porte-monnaie'), 'Petit sac où l\'on ⋯ sa ⋯.');
    assert.equal(masquerLeMot('Action de procrastiner, de remettre au lendemain.', 'procrastination'), 'Action de ⋯, de remettre au lendemain.');
  });

  it('préfère, quand le mot a plusieurs définitions, celle qui ne nomme pas un proche parent du mot', () => {
    assert.ok(trahitLeMot('Qui a rapport à la cabale des juifs.', 'cabalistique'));
    assert.ok(trahitLeMot('Relatif au carnaval.', 'carnavalesque'));
    assert.ok(!trahitLeMot("Changer la forme d'une chose, la transformer.", 'transporter'), 'un préfixe commun ne fait pas une famille');
    assert.ok(!trahitLeMot('Accord entre deux personnes.', 'contre'));
    const cabalistique = carte('cabalistique', { id: 'cabalistique', type: EDITION[0].type, rarete: EDITION[0].rarete });
    const definitions = new Map(DEFINITIONS);
    definitions.set('cabalistique', [{ texte: 'Qui a rapport à la cabale des juifs.', quiz: true }, { texte: 'Mystérieux, réservé à quelques initiés.', quiz: true }]);
    for (let graine = 0; graine < 20; graine++) {
      const epreuve = composerLEpreuve(cabalistique, definitions, EDITION, [], hasardReproductible(graine));
      assert.equal(epreuve.propositions[epreuve.bonne], 'Mystérieux, réservé à quelques initiés.');
    }
    // Si toutes ses définitions nomment un parent, on les pose quand même telles quelles.
    definitions.set('cabalistique', [{ texte: 'Qui a rapport à la cabale des juifs.', quiz: true }]);
    const epreuve = composerLEpreuve(cabalistique, definitions, EDITION, [], hasardReproductible(1));
    assert.equal(epreuve.propositions[epreuve.bonne], 'Qui a rapport à la cabale des juifs.');
  });
});

describe('deck, maîtrise et récompenses', () => {
  const avecDesCartes = (ids: string[]): Sauvegarde => ({ ...nouvelleSauvegarde(T0, 3), cartes: Object.fromEntries(ids.map((id) => [id, { obtenueLe: T0, doublons: 0, finitions: { Normale: 1 }, posees: 0, reussites: 0, maitriseeLe: null }])) });

  it('enregistre un deck de cartes possédées, sans doublon, jamais plus grand que prévu', () => {
    const sauvegarde = avecDesCartes(EDITION.slice(0, 15).map((c) => c.id));
    const deck = enregistrerLeDeck(sauvegarde, ['mot1', 'mot1', 'mot2', 'pas-a-moi', ...EDITION.slice(3, 15).map((c) => c.id)], REGLES).deck;
    assert.equal(deck.length, REGLES.tailleDuDeck);
    assert.deepEqual(deck.slice(0, 3), ['mot1', 'mot2', 'mot3']);
    // Une carte masquée par les réglages, ou disparue de l'édition, ne se joue pas mais reste dans le deck enregistré.
    const jouables = new Map(EDITION.filter((c) => c.id !== 'mot2').map((c) => [c.id, c]));
    assert.deepEqual(cartesDuDeck({ ...sauvegarde, deck: ['mot1', 'mot2', 'mot3'] }, jouables).map((c) => c.id), ['mot1', 'mot3']);
  });

  it('compte les bonnes réponses, et date la maîtrise du mot une fois pour toutes', () => {
    let sauvegarde = avecDesCartes(['mot1']);
    for (let i = 1; i <= REGLES.reussitesPourLaMaitrise + 2; i++) {
      const rate = noterUneReponse(sauvegarde, 'mot1', false, T0 + i, REGLES);
      assert.equal(rate.sauvegarde.cartes.mot1.reussites, i - 1, 'une mauvaise réponse ne compte pas et ne retire rien');
      const reponse = noterUneReponse(sauvegarde, 'mot1', true, T0 + i, REGLES);
      assert.equal(reponse.vientDEtreMaitrisee, i === REGLES.reussitesPourLaMaitrise);
      sauvegarde = reponse.sauvegarde;
    }
    assert.equal(sauvegarde.cartes.mot1.reussites, REGLES.reussitesPourLaMaitrise + 2);
    assert.equal(sauvegarde.cartes.mot1.maitriseeLe, T0 + REGLES.reussitesPourLaMaitrise);
    assert.equal(noterUneReponse(sauvegarde, 'carte-inconnue', true, T0, REGLES).sauvegarde, sauvegarde);
  });

  it('récompense pleinement les premières victoires du jour, moins les suivantes, et repart le lendemain', () => {
    let sauvegarde = nouvelleSauvegarde(T0, 0);
    const gains: number[] = [];
    for (let i = 0; i < REGLES.victoiresPleinesParJour + 2; i++) {
      const fin = terminerUnDuel(sauvegarde, 'Normal', 'victoire', T0 + i * 1000, REGLES);
      assert.equal(fin.reduite, i >= REGLES.victoiresPleinesParJour);
      gains.push(fin.encre);
      sauvegarde = fin.sauvegarde;
    }
    const pleine = REGLES.encreParVictoire.Normal;
    assert.deepEqual(gains.slice(0, REGLES.victoiresPleinesParJour), Array(REGLES.victoiresPleinesParJour).fill(pleine));
    assert.ok(gains.at(-1)! < pleine && gains.at(-1)! >= 1);
    assert.equal(sauvegarde.encre, gains.reduce((a, b) => a + b, 0));

    const defaite = terminerUnDuel(sauvegarde, 'Normal', 'defaite', T0 + 10_000, REGLES);
    assert.equal(defaite.encre, REGLES.encreParDefaite);
    assert.equal(terminerUnDuel(sauvegarde, 'Normal', 'nul', T0 + 10_000, REGLES).encre, REGLES.encreParDefaite);
    assert.deepEqual([defaite.sauvegarde.duels.joues, defaite.sauvegarde.duels.gagnes], [REGLES.victoiresPleinesParJour + 3, REGLES.victoiresPleinesParJour + 2]);

    const lendemain = terminerUnDuel(sauvegarde, 'Difficile', 'victoire', T0 + JOUR, REGLES);
    assert.equal(lendemain.encre, REGLES.encreParVictoire.Difficile);
    assert.equal(lendemain.sauvegarde.duels.victoiresDuJour, 1);
    assert.notEqual(jourDe(T0), jourDe(T0 + JOUR));
  });

  it('convertit une sauvegarde de la version 2 : pas encore de deck, de maîtrise ni de duels', () => {
    const v2 = { version: 2, creeLe: T0, encre: 40, paquets: { stock: 2, reference: T0, ouverts: 9, sansLegendaire: 9 }, cartes: { mot1: { obtenueLe: T0, doublons: 1, finitions: { Normale: 2, Brillante: 1 } } }, reglages: { masquerFamiliers: true }, dernierExport: null };
    const convertie = relireSauvegarde(v2, T0);
    assert.equal(convertie.version, VERSION_DE_SAUVEGARDE);
    assert.deepEqual(convertie.cartes.mot1, { obtenueLe: T0, doublons: 1, finitions: { Normale: 2, Brillante: 1 }, posees: 0, reussites: 0, maitriseeLe: null });
    assert.deepEqual(convertie.deck, []);
    assert.deepEqual(convertie.duels, { joues: 0, gagnes: 0, jour: '', victoiresDuJour: 0 });
    assert.equal(convertie.reglages.tempsDeReponse, 'normal');
    assert.equal(convertie.reglages.masquerFamiliers, true);
  });

  it('relit un deck abîmé sans planter : seules restent les cartes possédées, une fois chacune', () => {
    const abimee = { ...avecDesCartes(['mot1', 'mot2']), deck: ['mot1', 'mot1', 42, 'inconnue', 'mot2'], duels: 'n\'importe quoi', reglages: { tempsDeReponse: 'éternel' } };
    const relue = relireSauvegarde(JSON.parse(JSON.stringify(abimee)), T0);
    assert.deepEqual(relue.deck, ['mot1', 'mot2']);
    assert.equal(relue.duels.joues, 0);
    assert.equal(relue.reglages.tempsDeReponse, 'normal');
  });
});

describe("l'épreuve sur la vraie édition", () => {
  const dossier = path.join(import.meta.dirname, '..', '..', 'public', 'data');
  const edition: IndexEdition = JSON.parse(readFileSync(path.join(dossier, 'edition-1.index.json'), 'utf8'));
  const definitions = new Map<string, Definition[]>();
  for (let lot = 0; lot < edition.meta.lots; lot++) {
    const details: Record<string, CarteDetails> = JSON.parse(readFileSync(path.join(dossier, 'details', nomDuLot(lot)), 'utf8'));
    for (const [id, carte] of Object.entries(details)) definitions.set(id, carte.definitions);
  }

  it('chaque carte donne une question à quatre définitions, dont aucune ne trahit le mot', () => {
    const hasard = hasardReproductible(2026);
    let masquees = 0, trahies = 0;
    for (const demandee of edition.cartes) {
      const epreuve = composerLEpreuve(demandee, definitions, edition.cartes, [], hasard);
      assert.equal(new Set(epreuve.propositions).size, 4, demandee.id);
      const bonne = epreuve.propositions[epreuve.bonne];
      if (bonne.includes('⋯')) masquees++;
      for (const proposition of epreuve.propositions) assert.ok(!contientLeMot(proposition, demandee.mot), `${demandee.id} : « ${proposition} »`);
      if (trahitLeMot(bonne, demandee.mot)) trahies++;
    }
    assert.ok(masquees <= edition.cartes.length * 0.01, `${masquees} cartes posées avec le mot masqué`);
    // Les cartes dont toutes les définitions nomment un parent du mot restent rares (questions trop faciles).
    assert.ok(trahies <= edition.cartes.length * 0.03, `${trahies} cartes dont la définition posée nomme un parent du mot`);
  });

  it('reste possible quand le joueur masque les mots familiers et injurieux', () => {
    const hasard = hasardReproductible(7);
    const visibles = edition.cartes.filter((c) => !c.registre.some((r) => r === 'Familier' || r === 'Injurieux'));
    const interdites = new Set([...definitions.values()].flat().filter(d => d.registre?.some(r => r === 'Familier' || r === 'Injurieux')).map(d => d.texte));
    // Certains textes identiques appartiennent aussi à un sens non masqué.
    for (const d of [...definitions.values()].flat()) if (!d.registre?.some(r => r === 'Familier' || r === 'Injurieux')) interdites.delete(d.texte);
    for (const demandee of visibles) {
      const epreuve = composerLEpreuve(demandee, definitions, edition.cartes, ['Familier', 'Injurieux'], hasard);
      assert.equal(new Set(epreuve.propositions).size, 4, demandee.id);
      for (const proposition of epreuve.propositions) assert.ok(!interdites.has(proposition), `${demandee.id} expose un sens masqué : ${proposition}`);
    }
  });
});
