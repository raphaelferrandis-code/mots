// Tests du duel : règles du combat, deck de l'ordinateur, épreuve de maîtrise, maîtrise des mots et récompenses.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { nomDuLot } from '../partage/lots.ts';
import type { CarteDetails, CarteIndex, Definition, IndexEdition, Nature, Rarete } from '../partage/types.ts';
import { contientLeMot, masquerLeMot, trahitLeMot } from '../partage/famille.ts';
import { NIVEAUX, choisirPourLOrdinateur, commencerLeDuel, deckDeLOrdinateur, evaluerLAttaque, forceDeLaCarte, jouer, meilleurDeck, taillesDesFactions } from './duel.ts';
import type { Duel } from './duel.ts';
import { composerLEpreuve } from './epreuve.ts';
import { hasardReproductible } from './hasard.ts';
import { cartesDuDeck, enregistrerLeDeck, jourDe, noterUneReponse, terminerUnDuel } from './progression.ts';
import { nouvelleSauvegarde, relireSauvegarde } from './sauvegarde.ts';
import type { Sauvegarde } from './sauvegarde.ts';

const REGLES = EQUILIBRAGE.duel;
const T0 = new Date(2026, 8, 21, 12, 0, 0).getTime();
const JOUR = 24 * 3600_000;

const carte = (mot: string, champs: Partial<CarteIndex> = {}): CarteIndex => ({ id: `${mot}-nom`, mot, type: 'Nom', rarete: 'Commune', attaque: 5, defense: 4, faction: 'Latin', registre: [], definition: '', ...champs });

// Une petite édition variée : 300 cartes de toutes natures, raretés, forces et factions.
const NATURES: Nature[] = ['Nom', 'Adjectif', 'Verbe', 'Adverbe'];
const RARETES_DE_TEST: Rarete[] = ['Commune', 'Peu commune', 'Rare', 'Épique', 'Légendaire'];
const EDITION: CarteIndex[] = Array.from({ length: 300 }, (_, i) => carte(`mot${i}`, {
  id: `mot${i}`, type: NATURES[i % 4], rarete: RARETES_DE_TEST[i % 5], attaque: 1 + (i % 10), defense: 1 + ((i * 7) % 10), faction: i % 6 === 0 ? 'Arabe' : 'Latin',
}));
const TAILLES = taillesDesFactions(EDITION);
const DECK = EDITION.slice(0, 10);
const AUTRE_DECK = EDITION.slice(10, 20);

// Un duel dont on choisit les cartes en jeu et la main, pour vérifier les calculs un par un.
function situation(main: CarteIndex[], enJeu: CarteIndex | null, adverse: CarteIndex | null): Duel {
  const camp = { pv: REGLES.pointsDeVie, pioche: [], defausse: [] };
  return { manche: 1, aLaMain: 'joueur', premier: 'joueur', vainqueur: null, coups: [], camps: { joueur: { ...camp, main, enJeu }, adversaire: { ...camp, main: [carte('riposte')], enJeu: adverse } } };
}

describe("chiffres d'équilibrage du duel", () => {
  it('un deck donne de quoi former une main, et les chances de l\'ordinateur sont des probabilités', () => {
    assert.ok(REGLES.tailleDuDeck > REGLES.cartesEnMain + 1);
    for (const niveau of NIVEAUX) assert.ok(REGLES.reussiteDeLOrdinateur[niveau] > 0 && REGLES.reussiteDeLOrdinateur[niveau] <= 1);
    assert.ok(REGLES.partDeLaDefense >= 0 && REGLES.partDeLaDefense <= 1);
  });
  it("l'Encre d'une journée de duels acharnée reste en dessous de quelques paquets", () => {
    let sauvegarde = nouvelleSauvegarde(T0, 0);
    for (let i = 0; i < 30; i++) sauvegarde = terminerUnDuel(sauvegarde, 'Difficile', 'victoire', T0 + i * 60_000, REGLES).sauvegarde;
    assert.ok(sauvegarde.encre < EQUILIBRAGE.paquets.prixEnEncre * 4, `30 victoires en un jour rapportent ${sauvegarde.encre} Encre`);
  });
});

describe('déroulement du duel', () => {
  it('distribue la main, retourne un premier mot en jeu et tire au sort celui qui commence', () => {
    const duel = commencerLeDuel(DECK, AUTRE_DECK, hasardReproductible(1), REGLES);
    for (const camp of [duel.camps.joueur, duel.camps.adversaire]) {
      assert.equal(camp.pv, REGLES.pointsDeVie);
      assert.equal(camp.main.length, REGLES.cartesEnMain);
      assert.ok(camp.enJeu !== null);
      assert.equal(camp.main.length + camp.pioche.length + 1, REGLES.tailleDuDeck);
    }
    const premiers = new Set(Array.from({ length: 40 }, (_, i) => commencerLeDuel(DECK, AUTRE_DECK, hasardReproductible(i), REGLES).premier));
    assert.deepEqual([...premiers].sort(), ['adversaire', 'joueur']);
    const sansMotDeDepart = commencerLeDuel(DECK, AUTRE_DECK, hasardReproductible(1), { ...REGLES, motEnJeuAuDepart: false });
    assert.equal(sansMotDeDepart.camps.joueur.enJeu, null);
  });

  it('calcule les dégâts : attaque, moins la part de la défense adverse, au moins le minimum', () => {
    const regles = { ...REGLES, partDeLaDefense: 1 };
    const fort = carte('fort', { attaque: 9, type: 'Adverbe' });
    assert.equal(evaluerLAttaque(situation([fort], null, carte('mur', { defense: 4 })), 'joueur', fort, TAILLES, regles).degats, 5);
    assert.equal(evaluerLAttaque(situation([fort], null, carte('mur', { defense: 10 })), 'joueur', fort, TAILLES, regles).degats, regles.degatsMinimum);
    assert.equal(evaluerLAttaque(situation([fort], null, null), 'joueur', fort, TAILLES, regles).degats, 9, 'sans mot en jeu adverse, aucune défense');
    // La moitié de la défense seulement, et le bonus de défense des cartes rares compte.
    const moitie = { ...REGLES, partDeLaDefense: 0.5 };
    assert.equal(evaluerLAttaque(situation([fort], null, carte('mur', { defense: 4 })), 'joueur', fort, TAILLES, moitie).degats, 7);
    assert.equal(evaluerLAttaque(situation([fort], null, carte('mur', { defense: 4, rarete: 'Légendaire' })), 'joueur', fort, TAILLES, moitie).defenseAdverse, (4 + EQUILIBRAGE.bonusDefenseParRarete['Légendaire']) / 2);
  });

  it('applique le triangle des types : Nom > Adjectif > Verbe > Nom, adverbes neutres', () => {
    const bonus = (attaquant: Nature, defenseur: Nature): number => {
      const c = carte('a', { type: attaquant });
      return evaluerLAttaque(situation([c], null, carte('d', { type: defenseur })), 'joueur', c, TAILLES, REGLES).bonusDeType;
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
      return evaluerLAttaque(situation([c], precedente ? carte('p', { faction: precedente }) : null, null), 'joueur', c, tailles, REGLES).bonusDeFaction;
    };
    assert.equal(bonus('Latin', 'Latin'), REGLES.bonusDeFaction);
    assert.equal(bonus('Arabe', 'Arabe'), REGLES.bonusDePetiteFaction);
    assert.equal(bonus('Arabe', 'Latin'), 0);
    assert.equal(bonus('Latin', null), 0);
  });

  it('une attaque réussie blesse, un mot qui échappe ne fait rien ; dans les deux cas la carte devient le mot en jeu', () => {
    const depart = commencerLeDuel(DECK, AUTRE_DECK, hasardReproductible(3), REGLES);
    const cote = depart.aLaMain;
    const autre = cote === 'joueur' ? 'adversaire' : 'joueur';
    const jouee = depart.camps[cote].main[0];

    const reussi = jouer(depart, jouee.id, true, hasardReproductible(4), TAILLES, REGLES);
    const attendu = evaluerLAttaque(depart, cote, jouee, TAILLES, REGLES).degats;
    assert.equal(reussi.camps[autre].pv, REGLES.pointsDeVie - attendu);
    assert.equal(reussi.coups[0].degats, attendu);

    const rate = jouer(depart, jouee.id, false, hasardReproductible(4), TAILLES, REGLES);
    assert.equal(rate.camps[autre].pv, REGLES.pointsDeVie);
    assert.equal(rate.coups[0].degats, 0);

    for (const apres of [reussi, rate]) {
      assert.equal(apres.camps[cote].enJeu?.id, jouee.id);
      assert.equal(apres.camps[cote].main.length, REGLES.cartesEnMain, 'le camp a pioché');
      assert.ok(!apres.camps[cote].main.some((c) => c.id === jouee.id));
      assert.deepEqual(apres.camps[cote].defausse.map((c) => c.id), [depart.camps[cote].enJeu!.id], "l'ancien mot en jeu part à la défausse");
      assert.equal(apres.aLaMain, autre);
    }
    assert.throws(() => jouer(depart, 'carte-inconnue', true, hasardReproductible(4), TAILLES, REGLES));
  });

  it('ne perd aucune carte en route, même quand la défausse reforme la pioche', () => {
    let duel = commencerLeDuel(DECK, AUTRE_DECK, hasardReproductible(8), { ...REGLES, pointsDeVie: 100_000 });
    const hasard = hasardReproductible(9);
    for (let i = 0; i < 38 && duel.vainqueur === null; i++) {
      duel = jouer(duel, duel.camps[duel.aLaMain].main[0].id, true, hasard, TAILLES, { ...REGLES, pointsDeVie: 100_000 });
      for (const [camp, deck] of [[duel.camps.joueur, DECK], [duel.camps.adversaire, AUTRE_DECK]] as const) {
        const toutes = [...camp.main, ...camp.pioche, ...camp.defausse, ...(camp.enJeu ? [camp.enJeu] : [])].map((c) => c.id).sort();
        assert.deepEqual(toutes, deck.map((c) => c.id).sort());
        assert.equal(camp.main.length, REGLES.cartesEnMain);
      }
    }
  });

  it('se termine quand un camp tombe à zéro, ou à la limite de manches au profit du mieux portant', () => {
    let duel = commencerLeDuel(DECK, AUTRE_DECK, hasardReproductible(5), { ...REGLES, pointsDeVie: 1 });
    const premier = duel.aLaMain;
    duel = jouer(duel, duel.camps[premier].main[0].id, true, hasardReproductible(6), TAILLES, REGLES);
    assert.equal(duel.vainqueur, premier);
    assert.throws(() => jouer(duel, duel.camps[duel.aLaMain].main[0].id, true, hasardReproductible(6), TAILLES, REGLES));

    // Personne ne réussit jamais, sauf le joueur une seule fois : à la limite, il gagne aux points.
    const regles = { ...REGLES, manchesMaximum: 3 };
    let long = commencerLeDuel(DECK, AUTRE_DECK, hasardReproductible(5), regles);
    let coups = 0;
    while (long.vainqueur === null) { long = jouer(long, long.camps[long.aLaMain].main[0].id, long.aLaMain === 'joueur' && coups < 2, hasardReproductible(7), TAILLES, regles); coups++; }
    assert.equal(coups, 6, 'trois manches de deux coups');
    assert.equal(long.manche, 3);
    assert.equal(long.vainqueur, 'joueur');

    let nul = commencerLeDuel(DECK, AUTRE_DECK, hasardReproductible(5), regles);
    while (nul.vainqueur === null) nul = jouer(nul, nul.camps[nul.aLaMain].main[0].id, false, hasardReproductible(7), TAILLES, regles);
    assert.equal(nul.vainqueur, 'nul');
  });
});

describe("l'ordinateur", () => {
  it('reçoit un deck des mêmes raretés, sans carte du joueur ni doublon, et de force comparable selon le niveau', () => {
    const deckDuJoueur = meilleurDeck(EDITION.filter((_, i) => i % 3 === 0), REGLES);
    const forceMoyenne = (deck: CarteIndex[]): number => deck.reduce((s, c) => s + forceDeLaCarte(c), 0) / deck.length;
    const moyennes = NIVEAUX.map((niveau) => {
      const forces: number[] = [];
      for (let graine = 0; graine < 30; graine++) {
        const deck = deckDeLOrdinateur(deckDuJoueur, EDITION, niveau, hasardReproductible(graine), REGLES);
        assert.deepEqual(deck.map((c) => c.rarete), deckDuJoueur.map((c) => c.rarete));
        assert.equal(new Set([...deck, ...deckDuJoueur].map((c) => c.id)).size, 2 * REGLES.tailleDuDeck);
        forces.push(forceMoyenne(deck));
      }
      return forces.reduce((a, b) => a + b, 0) / forces.length;
    });
    // Un deck faible (loin du plafond des forces) : l'ordinateur suit l'écart demandé, à un point près.
    const faible = EDITION.filter((c) => forceDeLaCarte(c) <= 9).slice(0, 10);
    for (const niveau of NIVEAUX) {
      const deck = deckDeLOrdinateur(faible, EDITION, niveau, hasardReproductible(2), REGLES);
      assert.ok(Math.abs(forceMoyenne(deck) - forceMoyenne(faible) - REGLES.ecartDeForceDeLOrdinateur[niveau]) <= 1, niveau);
    }
    assert.ok(moyennes[0] <= moyennes[2], 'le deck du niveau Difficile est au moins aussi fort que celui du niveau Facile');
  });

  it('joue au hasard en Facile, et sa meilleure attaque aux autres niveaux', () => {
    const main = [carte('faible', { attaque: 2 }), carte('fort', { attaque: 9 }), carte('moyen', { attaque: 5 })];
    const duel = situation(main, null, carte('mur', { defense: 2 }));
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
  const avecDesCartes = (ids: string[]): Sauvegarde => ({ ...nouvelleSauvegarde(T0, 3), cartes: Object.fromEntries(ids.map((id) => [id, { obtenueLe: T0, doublons: 0, finitions: { Normale: 1 }, reussites: 0, maitriseeLe: null }])) });

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
    assert.equal(convertie.version, 3);
    assert.deepEqual(convertie.cartes.mot1, { obtenueLe: T0, doublons: 1, finitions: { Normale: 2, Brillante: 1 }, reussites: 0, maitriseeLe: null });
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
    for (const demandee of visibles.filter((_, i) => i % 9 === 0)) {
      const epreuve = composerLEpreuve(demandee, definitions, edition.cartes, ['Familier', 'Injurieux'], hasard);
      assert.equal(new Set(epreuve.propositions).size, 4, demandee.id);
    }
  });
});
