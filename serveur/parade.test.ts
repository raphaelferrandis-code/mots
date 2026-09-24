import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { avancerCombat, creerCombat, vueCombat, VERSION_MOTEUR } from './moteur-combat.ts';
import type { CarteIndex, Definition } from '../src/partage/types.ts';
import { hasardReproductible } from '../src/jeu/hasard.ts';
const brut = JSON.parse(readFileSync(new URL('../supabase/functions/_shared/catalogue-combat.json', import.meta.url), 'utf8')) as { cartes: CarteIndex[]; definitions: [string, Definition[]][] };
const catalogue = { cartes: brut.cartes, definitions: new Map(brut.definitions) };
function depart() {
  const cartes = brut.cartes.filter(c => c.rarete === 'Commune' && c.registre.length === 0);
  return creerCombat({mode:'entrainement',niveau:'Normal',masques:[],temps:'normal'}, {
    deck:cartes.slice(0,10).map(c=>c.id),possedees:brut.cartes.map(c=>c.id),apprentissages:{},
  }, null, catalogue, hasardReproductible(123), 0);
}
it('jouer une carte ouvre seulement la parade et ne crédite aucune connaissance de son propre mot', () => {
  const avant = depart();
  const carte = avant.duel.camps.joueur.main[0];
  const transition = avancerCombat(avant,{type:'choisir',carte:carte.id},catalogue,hasardReproductible(4),1000);
  const e = transition.etat.etape;
  assert.equal(e.nom,'parade');
  if(e.nom !== 'parade') throw Error('parade attendue');
  assert.equal(e.epreuve.idCarte,e.adverse.id);
  assert.notEqual(e.epreuve.idCarte,carte.id);
  assert.equal(transition.reponse,undefined);
  assert.deepEqual(transition.etat.apprentissages,{});
  const suite = avancerCombat(transition.etat,{type:'repondre',choisie:e.epreuve.bonne},catalogue,()=>.999,2000);
  assert.equal(suite.etat.etape.nom,'bilan');
  assert.equal(suite.reponse?.carte,e.adverse.id);
  assert.equal(suite.reponse?.parade,true);
  assert.equal(suite.etat.apprentissages[carte.id],undefined);
  assert.equal(suite.etat.apprentissages[e.adverse.id].reussites,1);
  assert.equal(suite.etat.bilan.parades,1);
});
it('une parade fausse ou expirée ne fait rater aucune attaque et ne crédite aucune bonne réponse', () => {
  for(const expire of [false,true]) {
    const avant=depart();
    const question=avancerCombat(avant,{type:'choisir',carte:avant.duel.camps.joueur.main[0].id},catalogue,hasardReproductible(4),1000).etat;
    const e=question.etape;
    if(e.nom!=='parade') throw Error('parade attendue');
    const suite=avancerCombat(question,{type:'repondre',choisie:expire?e.epreuve.bonne:(e.epreuve.bonne+1)%4},catalogue,()=>.999,expire?60000:2000);
    const bilan=suite.etat.etape;
    if(bilan.nom!=='bilan') throw Error('bilan attendu');
    const manche=bilan.apres.manches[0];
    assert.equal(manche.joueur.reussie,true);
    assert.equal(manche.adversaire.reussie,true,'même un tirage .999 ne fait plus rater le double');
    assert.equal(manche.adversaire.infliges,manche.adversaire.degats);
    assert.equal(suite.reponse?.reussie,false);
    assert.equal(suite.etat.apprentissages[e.adverse.id].reussites,0);
  }
});
it('reprend une ancienne question d’attaque sans la poser ni inventer une récompense', () => {
  const avant=depart();
  const question=avancerCombat(avant,{type:'choisir',carte:avant.duel.camps.joueur.main[0].id},catalogue,hasardReproductible(4),1000).etat;
  const e=question.etape;
  if(e.nom!=='parade') throw Error('parade attendue');
  for(const ancienne of ['attaque','echappe'] as const) {
    const etat = structuredClone(question);
    etat.versionMoteur=1;
    etat.etape=ancienne==='attaque' ? {...e,nom:'attaque'} : {nom:'echappe',carte:e.carte,adverse:e.adverse,attaque:{epreuve:e.epreuve,choisie:null,juste:false,maitrise:false}};
    assert.deepEqual(vueCombat(etat).etape,{nom:'reprise'});
    const suite=avancerCombat(etat,{type:'continuer'},catalogue,hasardReproductible(9),20000);
    assert.equal(suite.etat.versionMoteur,VERSION_MOTEUR);
    assert.equal(suite.etat.etape.nom,'parade');
    if(suite.etat.etape.nom!=='parade') throw Error('parade attendue');
    assert.equal(suite.etat.etape.debut,20000);
    assert.equal(suite.etat.etape.epreuve.idCarte,e.adverse.id);
    assert.equal(suite.reponse,undefined);
    assert.deepEqual(suite.etat.apprentissages,{});
    assert.deepEqual(suite.etat.duel,question.duel);
    assert.equal(suite.etat.bilan.parades,0);
  }
});
