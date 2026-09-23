import { SUCCES } from './catalogueSucces.ts';
import type { MesureSucces } from './catalogueSucces.ts';
import type { Sauvegarde } from './sauvegarde.ts';
import { FINITIONS } from '../partage/types.ts';
import type { CarteIndex } from '../partage/types.ts';

export function mesurerLesSucces(s: Sauvegarde, edition?: ReadonlyMap<string, CarteIndex>): Partial<Record<MesureSucces, number>> {
  const cartes = Object.values(s.cartes);
  const mesures: Partial<Record<MesureSucces, number>> = {
    collection: cartes.length, paquets: s.paquets.ouverts,
    duels: s.duels.joues, victoires: s.duels.gagnes,
    joutes: s.joutes.jouees, victoiresJoutes: s.joutes.gagnees,
    definitions: cartes.reduce((n, c) => n + c.reussites, 0),
    parades: Object.values(s.parades).reduce((n, p) => n + p.reussies, 0),
    maitrises: cartes.filter(c => c.maitriseeLe !== null).length,
    brillantes: cartes.filter(c => (c.finitions.Brillante ?? 0) > 0).length,
    holographiques: cartes.filter(c => (c.finitions.Holographique ?? 0) > 0).length,
    triptyques: cartes.filter(c => FINITIONS.every(f => (c.finitions[f] ?? 0) > 0)).length,
  };
  if (edition) {
    const connues = Object.keys(s.cartes).flatMap(id => edition.get(id) ?? []);
    Object.assign(mesures, {
      rares: connues.filter(c => c.rarete === 'Rare').length,
      epiques: connues.filter(c => c.rarete === 'Épique').length,
      legendaires: connues.filter(c => c.rarete === 'Légendaire').length,
      horsSerie: connues.filter(c => c.rarete === 'Hors-série').length,
      origines: new Set(connues.map(c => c.faction)).size,
      natures: new Set(connues.map(c => c.type)).size,
      raretes: new Set(connues.map(c => c.rarete)).size,
      longs: connues.filter(c => [...c.mot.matchAll(/\p{L}/gu)].length >= 12).length,
      courts: connues.filter(c => [...c.mot.matchAll(/\p{L}/gu)].length <= 4).length,
    });
  }
  return mesures;
}

// Les records et les titres restent acquis après une vente ou un changement de saison.
// L'édition peut arriver plus tard : les objectifs dépendant des cartes attendent son chargement.
export function actualiserLesSucces(s: Sauvegarde, edition?: ReadonlyMap<string, CarteIndex>): Sauvegarde {
  const mesures = mesurerLesSucces(s, edition);
  const progressionSucces = { ...s.profil.progressionSucces };
  const acquis = new Set(s.profil.succes);
  for (const succes of SUCCES) {
    progressionSucces[succes.mesure] = Math.max(progressionSucces[succes.mesure] ?? 0, mesures[succes.mesure] ?? 0, acquis.has(succes.id) ? succes.objectif : 0);
    if (progressionSucces[succes.mesure]! >= succes.objectif) acquis.add(succes.id);
  }
  return { ...s, profil: { ...s.profil, progressionSucces, succes: SUCCES.filter(s => acquis.has(s.id)).map(s => s.id) } };
}
