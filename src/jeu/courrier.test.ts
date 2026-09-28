// Le courrier : ce qui attend une réponse, les nouvelles depuis la dernière lecture, et le relevé qui s'en souvient.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { completerLeReleve, composerLeCourrier, nouvellesParEndroit, phraseDeLaLettre, premierReleve, releveApresLecture } from './courrier.ts';
import type { SourcesDuCourrier } from './courrier.ts';

const enchere = (id: number, carte: string, etat: string, champs: { enTete?: boolean; remportee?: boolean; prixFinal?: number | null } = {}) =>
  ({ id, carte, etat, enTete: false, remportee: false, prixFinal: null, ...champs });

const VIDE: SourcesDuCourrier = { amis: { relations: [], echanges: [] }, equipe: { invitations: [] }, encheres: { ventes: [], mises: [] }, duel: null };
const AVEC = (s: Partial<SourcesDuCourrier>): SourcesDuCourrier => ({ ...VIDE, ...s });
const cles = (s: SourcesDuCourrier, r: Record<string, string>) => composerLeCourrier(s, r).map((l) => `${l.cle}:${l.genre === 'duel' ? l.cas : l.cas}${l.nouvelle ? '*' : ''}`);

describe('le courrier', () => {
  it('annonce ce qui attend une réponse, comme nouveau tant qu’il n’a pas été lu', () => {
    const s = AVEC({
      amis: { relations: [{ id: 'lea', pseudo: 'Léa', etat: 'recue' }, { id: 'tom', pseudo: 'Tom', etat: 'envoyee' }],
        echanges: [{ id: 'e1', envoye: false, pseudo: 'Léa', offerte: 'hapax', demandee: 'zeugma', etat: 'attente' }] },
      equipe: { invitations: [{ id: 'i1', nom: 'Les Plumes', capitaine: 'Noé' }] },
      encheres: { ventes: [], mises: [enchere(7, 'rodomontade', 'ouverte'), enchere(8, 'aporie', 'ouverte', { enTete: true })] },
      duel: { id: 'c1' },
    });
    assert.deepEqual(cles(s, {}), ['duel:c1:en-cours*', 'echange:e1:propose*', 'ami:lea:demande*', 'equipe:i1:invitation*', 'mise:7:depassee*']);
    // Lu : il reste là tant qu'il attend, mais ne compte plus comme nouveau.
    const lu = releveApresLecture(s, {}, ['ami', 'echange', 'equipe', 'enchere', 'vente', 'duel']);
    assert.deepEqual(cles(s, lu), ['duel:c1:en-cours', 'echange:e1:propose', 'ami:lea:demande', 'equipe:i1:invitation', 'mise:7:depassee']);
    assert.deepEqual(nouvellesParEndroit(composerLeCourrier(s, lu)), { joueur: 0, marche: 0, duel: 0 });
    assert.deepEqual(nouvellesParEndroit(composerLeCourrier(s, {})), { joueur: 3, marche: 1, duel: 1 });
  });

  it('annonce une seule fois ce qui s’est passé depuis la dernière lecture', () => {
    const avant = AVEC({
      amis: { relations: [{ id: 'tom', pseudo: 'Tom', etat: 'envoyee' }], echanges: [{ id: 'e2', envoye: true, pseudo: 'Tom', offerte: 'ire', demandee: 'hapax', etat: 'attente' }] },
      encheres: { ventes: [enchere(3, 'zeugma', 'ouverte'), enchere(4, 'aporie', 'ouverte')], mises: [enchere(9, 'hapax', 'ouverte', { enTete: true })] },
    });
    const releve = releveApresLecture(avant, {}, ['ami', 'echange', 'enchere', 'vente']);
    const apres = AVEC({
      amis: { relations: [{ id: 'tom', pseudo: 'Tom', etat: 'ami' }], echanges: [{ id: 'e2', envoye: true, pseudo: 'Tom', offerte: 'ire', demandee: 'hapax', etat: 'accepte' }] },
      encheres: { ventes: [enchere(3, 'zeugma', 'vendue', { prixFinal: 120 }), enchere(4, 'aporie', 'invendue')], mises: [enchere(9, 'hapax', 'vendue', { remportee: true, prixFinal: 80 })] },
    });
    assert.deepEqual(cles(apres, releve), ['echange:e2:accepte*', 'ami:tom:acceptee*', 'mise:9:remportee*', 'vente:3:vendue*', 'vente:4:invendue*']);
    assert.deepEqual(cles(apres, releveApresLecture(apres, releve, ['ami', 'echange', 'enchere', 'vente'])), [], 'une fois lues, elles disparaissent');
  });

  it('ne ressort pas les vieilles nouvelles la première fois, mais annonce ce qui attend', () => {
    const s = AVEC({
      amis: { relations: [{ id: 'lea', pseudo: 'Léa', etat: 'ami' }, { id: 'noe', pseudo: 'Noé', etat: 'recue' }],
        echanges: [{ id: 'e3', envoye: true, pseudo: 'Léa', offerte: 'a', demandee: 'b', etat: 'refuse' }] },
      encheres: { ventes: [enchere(5, 'zeugma', 'vendue', { prixFinal: 50 })], mises: [enchere(6, 'hapax', 'vendue', { remportee: true })] },
    });
    assert.deepEqual(cles(s, premierReleve(s)), ['ami:noe:demande*']);
  });

  it('chaque lecture part de son état présent la première fois qu’elle arrive', () => {
    const amisSeuls = AVEC({ amis: { relations: [{ id: 'noe', pseudo: 'Noé', etat: 'recue' }], echanges: [] }, encheres: null, equipe: null });
    const releve = completerLeReleve(amisSeuls, {});
    assert.deepEqual(cles(amisSeuls, releve), ['ami:noe:demande*']);
    // Les enchères arrivent ensuite : la vente d'avant-hier n'est pas une nouvelle ; l'enchère dépassée, si.
    const tout = AVEC({ amis: amisSeuls.amis, equipe: null, encheres: { ventes: [enchere(5, 'zeugma', 'vendue', { prixFinal: 50 })], mises: [enchere(6, 'hapax', 'ouverte')] } });
    const complete = completerLeReleve(tout, releve);
    assert.deepEqual(cles(tout, complete), ['ami:noe:demande*', 'mise:6:depassee*']);
    assert.equal(completerLeReleve(tout, complete), complete, 'rien à compléter la fois suivante');
    // Les marques survivent à une lecture.
    assert.equal(releveApresLecture(tout, complete, ['ami', 'echange', 'enchere', 'vente'])['#encheres'], 'lu');
  });

  it('une lecture manquée n’efface pas le relevé de son genre', () => {
    const s = AVEC({ encheres: { ventes: [enchere(3, 'zeugma', 'ouverte')], mises: [] } });
    const releve = releveApresLecture(s, {}, ['vente']);
    const sansMarche = { ...s, encheres: null };
    assert.deepEqual(releveApresLecture(sansMarche, releve, ['vente']), releve);
    assert.deepEqual(composerLeCourrier(sansMarche, releve), []);
  });

  it('écrit des phrases simples, avec les mots en italique et une action', () => {
    const mot = (id: string) => id.replace(/-.*/, '');
    const texte = (morceaux: ReturnType<typeof phraseDeLaLettre>['morceaux']) => morceaux.map((m) => (typeof m === 'string' ? m : `*${m.mot}*`)).join('');
    const [depassee, vendue] = composerLeCourrier(AVEC({ encheres: { ventes: [enchere(1, 'zeugma-nom', 'vendue', { prixFinal: 1200 })], mises: [enchere(2, 'hapax-nom', 'ouverte')] } }), { 'vente:1': 'ouverte' });
    const p1 = phraseDeLaLettre(vendue, mot);
    assert.equal(texte(p1.morceaux).replace(/\s/g, ' '), 'Ton *zeugma* s’est vendu 1 200 Encre');
    const p2 = phraseDeLaLettre(depassee, mot);
    assert.equal(texte(p2.morceaux), 'Ton enchère sur *hapax* a été dépassée');
    assert.equal(p2.action, 'Surenchérir');
    assert.deepEqual(p2.destination, { ecran: 'marche' });
    const [propose] = composerLeCourrier(AVEC({ amis: { relations: [], echanges: [{ id: 'e', envoye: false, pseudo: 'Léa', offerte: 'ire-nom', demandee: 'aporie-nom', etat: 'attente' }] } }), {});
    assert.equal(texte(phraseDeLaLettre(propose, mot).morceaux), 'Léa te propose son *ire* contre ton *aporie*');
  });
});
