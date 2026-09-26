import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { nouvelleSauvegarde, relireSauvegarde } from './sauvegarde.ts';
import { aImporter, aQuelqueChoseAImporter, estPerime, fusionner, lireEtat, lireRecuperation } from './synchronisation.ts';
import { FORMULE_GRATUITE } from './formule.ts';
import type { EtatDuCompte } from './synchronisation.ts';

const T0 = 1_700_000_000_000;

function partieLocale() {
  const s = nouvelleSauvegarde(T0, 3);
  s.encre = 42;
  s.paquets = { stock: 1, reference: T0 + 5_000, ouverts: 4, sansLegendaire: 2 };
  s.cartes = {
    'zeugma-nom': { obtenueLe: T0, doublons: 1, finitions: { Normale: 2 }, posees: 6, reussites: 5, maitriseeLe: T0 + 100 },
    'velum-nom': { obtenueLe: T0 + 1, doublons: 0, finitions: { Brillante: 1 }, posees: 1, reussites: 0, maitriseeLe: null },
  };
  s.deck = ['zeugma-nom', 'velum-nom'];
  s.reglages.sonsPaquets = false;
  s.joutes.pseudo = 'Zeugma 12';
  return s;
}

const etatDuServeur: EtatDuCompte = {
  encre: 300,
  paquets: { stock: 7, reference: T0 + 9_000, ouverts: 10, sansLegendaire: 0 },
  deck: ['zeugma-nom', 'cabale-nom', 'inconnue-nom'],
  maintenant: T0 + 10_000,
  cartes: {
    'zeugma-nom': { obtenueLe: T0, doublons: 3, finitions: { Normale: 3, Holographique: 1 } },
    'cabale-nom': { obtenueLe: T0 + 2, doublons: 0, finitions: { Normale: 1 } },
  },
  codeDeSecoursLe: null,
  formule: FORMULE_GRATUITE,
};

describe('la collection tenue par le serveur', () => {
  it('synchronise XP, maîtrise et bilans sans additionner les copies locales et garde une archive exportable', () => {
    const locale = partieLocale(); locale.profil.xp=900;
    const progression = {version:1 as const,id:'compte-a',xp:50,bonusXpReste:25,heritageImporte:false,
      duels:{joues:3,gagnes:1},parades:{Commune:{posees:2,reussies:1}},
      apprentissages:{'zeugma-nom':{posees:2,reussites:1,maitriseeLe:null},'vendu-nom':{posees:5,reussites:5,maitriseeLe:T0}}};
    const etat = lireEtat({...etatDuServeur,progression});
    const premier = fusionner(locale,etat);
    assert.equal(premier.profil.xp,50); assert.equal(premier.profil.bonusXpReste,25);
    assert.equal(premier.cartes['zeugma-nom'].maitriseeLe,null);
    assert.equal(premier.cartes['zeugma-nom'].posees,2);
    assert.deepEqual(premier.parades,progression.parades);
    assert.equal(premier.duels.joues,3);
    assert.equal(premier.ancienneProgression!.xp,900);
    assert.equal(premier.ancienneProgression!.apprentissages['zeugma-nom'].reussites,5);
    const relue = relireSauvegarde(JSON.parse(JSON.stringify(premier)),T0);
    assert.deepEqual(fusionner(relue,etat).ancienneProgression,premier.ancienneProgression);
    assert.deepEqual(fusionner(relue,etat).apprentissages,progression.apprentissages);
    const autre = fusionner(relue,{...etat,progression:{...progression,id:'compte-b',xp:0,apprentissages:{}}});
    assert.equal(autre.profil.xp,0); assert.equal(autre.cartes['zeugma-nom'].reussites,0);
    assert.equal(autre.progressionServeur!.id,'compte-b');
    assert.equal(autre.joutes.pseudo,''); assert.equal(autre.joutes.cote,null);
    assert.throws(()=>lireEtat({...etatDuServeur,progression:{version:2}}),/illisible/);
  });
  it('conserve une maîtrise après vente, export puis rachat et synchronise les compteurs confirmés', () => {
    const locale = partieLocale();
    const vendue = fusionner(locale, { ...etatDuServeur, cartes: {} });
    assert.equal(vendue.cartes['zeugma-nom'], undefined);
    const rechargee = relireSauvegarde(JSON.parse(JSON.stringify(vendue)), T0);
    const rachetee = fusionner(rechargee, { ...etatDuServeur, plafondDuJour: { jour: '2026-09-23', victoires: 7 }, classementPersonnel: { pseudo: 'Lecteur', cote: 1234, jouees: 30, gagnees: 18 } });
    assert.equal(rachetee.cartes['zeugma-nom'].maitriseeLe, T0 + 100);
    assert.equal(rachetee.cartes['zeugma-nom'].reussites, 5);
    assert.equal(rachetee.duels.victoiresDuJour, 7);
    assert.equal(rachetee.joutes.cote, 1234);
  });
  it('fusionne : le serveur donne l’Encre, les paquets, le deck et les timbres ; l’appareil garde ses réglages et sa maîtrise', () => {
    const locale = partieLocale();
    const avant = structuredClone(locale);
    const fusion = fusionner(locale, etatDuServeur);
    assert.deepEqual(locale, avant, 'la sauvegarde locale n’est pas modifiée en place');
    assert.equal(fusion.encre, 300);
    assert.deepEqual(fusion.paquets, etatDuServeur.paquets);
    assert.deepEqual(Object.keys(fusion.cartes).sort(), ['cabale-nom', 'zeugma-nom'], 'velum, absent du serveur, disparaît');
    assert.deepEqual(fusion.cartes['zeugma-nom'], { obtenueLe: T0, doublons: 3, finitions: { Normale: 3, Holographique: 1 }, posees: 6, reussites: 5, maitriseeLe: T0 + 100 });
    assert.deepEqual(fusion.cartes['cabale-nom'], { obtenueLe: T0 + 2, doublons: 0, finitions: { Normale: 1 }, posees: 0, reussites: 0, maitriseeLe: null });
    assert.deepEqual(fusion.deck, ['zeugma-nom', 'cabale-nom'], 'le deck ne garde que des cartes possédées');
    assert.equal(fusion.reglages.sonsPaquets, false);
    assert.equal(fusion.joutes.pseudo, 'Zeugma 12');
  });

  it('l’apparence suit le compte : celle du serveur remplace celle de l’appareil, choix par choix', () => {
    assert.equal('apparence' in lireEtat(etatDuServeur), false, 'un serveur d’avant le script 22 ne dit rien');
    assert.equal(lireEtat({ ...etatDuServeur, apparence: null }).apparence, null);
    assert.deepEqual(lireEtat({ ...etatDuServeur, apparence: { avatar: 'renard', cadre: 4 } }).apparence, { avatar: 'renard' });
    const locale = partieLocale();
    Object.assign(locale.profil, { avatar: 'colombe', cadre: 'dentelure' });
    const suivie = fusionner(locale, lireEtat({ ...etatDuServeur, apparence: { avatar: 'renard', titre: '' } }));
    assert.deepEqual([suivie.profil.avatar, suivie.profil.cadre, suivie.profil.titre], ['renard', 'dentelure', '']);
    assert.equal(fusionner(locale, lireEtat({ ...etatDuServeur, apparence: null })).profil.avatar, 'colombe', 'rien de gardé : l’appareil garde ses choix');
    assert.equal(fusionner(locale, etatDuServeur).profil.avatar, 'colombe');
  });

  it('écarte un état plus ancien que le dernier appliqué (une lecture doublée par un achat)', () => {
    assert.equal(estPerime({ maintenant: 1000 }, 2000), true);
    assert.equal(estPerime({ maintenant: 2000 }, 2000), false, 'le même instant est pris');
    assert.equal(estPerime({ maintenant: 3000 }, 2000), false);
    assert.equal(estPerime({ maintenant: 0 }, 2000), false, 'une heure inconnue ne bloque rien');
  });

  it('relit un état du serveur sans rien supposer de sa forme', () => {
    const lu = lireEtat({ encre: 5, paquets: { stock: 'x', ouverts: 2 }, deck: ['a', 3], maintenant: 1, cartes: { 'a-nom': { obtenueLe: 1, finitions: { Normale: 0, Fausse: 2 } }, 'b-nom': 'abîmée' } });
    assert.deepEqual(lu, { encre: 5, paquets: { stock: 0, reference: 0, ouverts: 2, sansLegendaire: 0 }, deck: ['a'], maintenant: 1, cartes: { 'a-nom': { obtenueLe: 1, doublons: 0, finitions: { Normale: 1 } } }, codeDeSecoursLe: null, formule: FORMULE_GRATUITE });
    assert.throws(() => lireEtat(null), /illisible/);
    assert.equal(lireEtat({ ...etatDuServeur, codeDeSecoursLe: 42 }).codeDeSecoursLe, 42);
    assert.equal(lireEtat({ ...etatDuServeur, formule: { niveau: 3, abonnement: 'expert', encreAchetee: 300 } }).formule.niveau, 3, 'la formule vient du serveur');
    assert.deepEqual(lireEtat(etatDuServeur).formule, FORMULE_GRATUITE, 'sans formule lisible, le joueur est gratuit');
    const recuperation = lireRecuperation({ ...etatDuServeur, profil: { pseudo: 'Zeugma 12', cote: 1016, jouees: 3, gagnees: 2 } });
    assert.deepEqual(recuperation.profil, { pseudo: 'Zeugma 12', cote: 1016, jouees: 3, gagnees: 2 });
    assert.equal(lireRecuperation({ ...etatDuServeur, profil: null }).profil, null);
  });

  it('sait quand une partie mérite d’être importée, et n’envoie que ce qui a de la valeur', () => {
    assert.equal(aQuelqueChoseAImporter(nouvelleSauvegarde(T0, 3)), false, 'un nouveau joueur n’a rien à importer');
    assert.equal(aQuelqueChoseAImporter(partieLocale()), true);
    const envoi = aImporter(partieLocale());
    assert.deepEqual(Object.keys(envoi).sort(), ['cartes', 'creeLe', 'deck', 'encre', 'paquets']);
    assert.deepEqual(envoi.cartes['zeugma-nom'], { obtenueLe: T0, doublons: 1, finitions: { Normale: 2 } }, 'ni la maîtrise ni les résultats en duel');
    assert.equal(envoi.paquets.ouverts, 4);
  });
});
