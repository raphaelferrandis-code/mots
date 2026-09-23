import { it } from 'node:test';
import assert from 'node:assert/strict';
import { lireEssais, rapportEssais } from '../simulateurs/essais-joueurs.ts';
const exemple = {participant:'P01',combat:'essai-factice',session:'J1',lecture:'reguliere',deck:'debutant',niveau:'Normal',temps:'normal',
  resultat:'victoire',abandon:false,dureeSecondes:60,manches:5,attaques:5,attaquesReussies:4,parades:5,paradesReussies:3};
it('le rapport ne fabrique pas de résultats et refuse les doublons ou compteurs incohérents',()=>{
  assert.match(rapportEssais(lireEssais([])),/Aucune observation/);
  assert.throws(()=>lireEssais([exemple,exemple]),/deux fois/);
  assert.throws(()=>lireEssais([{...exemple,attaquesReussies:6}]),/incohérent/);
  const rapport=rapportEssais(lireEssais([exemple,{...exemple,participant:'P02',combat:'autre-factice',resultat:'defaite'}]));
  assert.match(rapport,/2 volontaires, 2 duels/);assert.match(rapport,/50.0 %/);assert.match(rapport,/Échantillon trop petit/);
});
