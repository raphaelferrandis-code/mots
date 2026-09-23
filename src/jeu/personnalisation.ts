import { FAMILLES_SUCCES, SUCCES, titreDuSucces } from './catalogueSucces.ts';
import type { MesureSucces } from './catalogueSucces.ts';
import type { Formule } from './formule.ts';
import { cosmetiquesPremium } from './formule.ts';
export type Categorie = 'avatar' | 'cadre' | 'titre' | 'dos' | 'couleur';
export type Ornement = { id: string; categorie: Categorie; nom: string; niveau: number; prix: number; valeur: string; teinte: string; famille: string; premium: boolean; anime: boolean; succes?: string };
export const ORNEMENTS: readonly Ornement[] = [
  {"id":"plume","categorie":"avatar","nom":"La plume","niveau":1,"prix":0,"valeur":"plume","teinte":"#eccba0","famille":"Atelier","premium":false,"anime":false},
  {"id":"boussole","categorie":"avatar","nom":"La boussole","niveau":3,"prix":120,"valeur":"boussole","teinte":"#93c8e7","famille":"Explorateurs","premium":false,"anime":false},
  {"id":"lune","categorie":"avatar","nom":"La lune","niveau":7,"prix":280,"valeur":"lune","teinte":"#ccbcf5","famille":"Firmament","premium":false,"anime":false},
  {"id":"renard","categorie":"avatar","nom":"Renard des bois","niveau":4,"prix":160,"valeur":"renard","teinte":"#eeb880","famille":"Sylvestre","premium":false,"anime":false},
  {"id":"papillon","categorie":"avatar","nom":"Papillon de verre","niveau":6,"prix":240,"valeur":"papillon","teinte":"#81decf","famille":"Cristallin","premium":false,"anime":false},
  {"id":"dragon","categorie":"avatar","nom":"Dragon de jade","niveau":12,"prix":480,"valeur":"dragon","teinte":"#8de0b8","famille":"Jade","premium":false,"anime":false},
  {"id":"phenix","categorie":"avatar","nom":"Phénix de braise","niveau":1,"prix":0,"valeur":"phenix","teinte":"#ff9b9e","famille":"Incandescent","premium":true,"anime":false},
  {"id":"oracle","categorie":"avatar","nom":"Œil de l’oracle","niveau":1,"prix":0,"valeur":"oracle","teinte":"#c3b5ff","famille":"Astral","premium":true,"anime":false},
  {"id":"simple","categorie":"cadre","nom":"Filet d’atelier","niveau":1,"prix":0,"valeur":"simple","teinte":"#bacbde","famille":"Atelier","premium":false,"anime":false},
  {"id":"postal","categorie":"cadre","nom":"Cachet postal","niveau":4,"prix":160,"valeur":"postal","teinte":"#e4bc8d","famille":"Atelier","premium":false,"anime":false},
  {"id":"laurier","categorie":"cadre","nom":"Couronne de laurier","niveau":10,"prix":400,"valeur":"laurier","teinte":"#e3d297","famille":"Héritage","premium":false,"anime":false},
  {"id":"ronces","categorie":"cadre","nom":"Étreinte des ronces","niveau":3,"prix":120,"valeur":"ronces","teinte":"#9bcfae","famille":"Sylvestre","premium":false,"anime":false},
  {"id":"vitrail","categorie":"cadre","nom":"Vitrail azuré","niveau":5,"prix":200,"valeur":"vitrail","teinte":"#83cef1","famille":"Cristallin","premium":false,"anime":false},
  {"id":"maree","categorie":"cadre","nom":"Écume d’argent","niveau":8,"prix":320,"valeur":"maree","teinte":"#a2dee1","famille":"Océan","premium":false,"anime":false},
  {"id":"eclipse","categorie":"cadre","nom":"Sceau de l’éclipse","niveau":12,"prix":480,"valeur":"eclipse","teinte":"#d9b9ed","famille":"Firmament","premium":false,"anime":false},
  {"id":"astral","categorie":"cadre","nom":"Orbite astrale","niveau":1,"prix":0,"valeur":"astral","teinte":"#b8a1ff","famille":"Astral","premium":true,"anime":true},
  {"id":"floraison","categorie":"cadre","nom":"Floraison éternelle","niveau":1,"prix":0,"valeur":"floraison","teinte":"#f2a9cd","famille":"Sylvestre","premium":true,"anime":true},
  {"id":"cristal","categorie":"cadre","nom":"Couronne de cristal","niveau":1,"prix":0,"valeur":"cristal","teinte":"#85e9ef","famille":"Cristallin","premium":true,"anime":true},
  {"id":"brasier","categorie":"cadre","nom":"Ailes du phénix","niveau":1,"prix":0,"valeur":"brasier","teinte":"#ffb07f","famille":"Incandescent","premium":true,"anime":true},
  {"id":"aurore","categorie":"cadre","nom":"Aurore boréale","niveau":1,"prix":0,"valeur":"aurore","teinte":"#8fe8c7","famille":"Firmament","premium":true,"anime":true},
  {"id":"gomme","categorie":"dos","nom":"Gomme originale","niveau":1,"prix":0,"valeur":"plume","teinte":"#e2cca6","famille":"Atelier","premium":false,"anime":false},
  {"id":"entrelacs","categorie":"dos","nom":"Entrelacs","niveau":3,"prix":120,"valeur":"boussole","teinte":"#b1ddce","famille":"Jade","premium":false,"anime":false},
  {"id":"constellation","categorie":"dos","nom":"Constellation","niveau":8,"prix":320,"valeur":"lune","teinte":"#c7baf1","famille":"Firmament","premium":false,"anime":false},
  {"id":"herbier-dos","categorie":"dos","nom":"Herbier secret","niveau":4,"prix":160,"valeur":"feuilles","teinte":"#b0d7a2","famille":"Sylvestre","premium":false,"anime":false},
  {"id":"vitrail-dos","categorie":"dos","nom":"Verre et lumière","niveau":6,"prix":240,"valeur":"cristal","teinte":"#9bddeb","famille":"Cristallin","premium":false,"anime":false},
  {"id":"maree-dos","categorie":"dos","nom":"Les grandes marées","niveau":10,"prix":400,"valeur":"vagues","teinte":"#a2dee1","famille":"Océan","premium":false,"anime":false},
  {"id":"dragon-dos","categorie":"dos","nom":"Serment du dragon","niveau":1,"prix":0,"valeur":"dragon","teinte":"#a9e6c0","famille":"Jade","premium":true,"anime":true},
  {"id":"oracle-dos","categorie":"dos","nom":"Archives astrales","niveau":1,"prix":0,"valeur":"oracle","teinte":"#d3b8ff","famille":"Astral","premium":true,"anime":true},
  {"id":"cuivre","categorie":"couleur","nom":"Cuivre","niveau":1,"prix":0,"valeur":"#f1b987","teinte":"#f1b987","famille":"Atelier","premium":false,"anime":false},
  {"id":"jade","categorie":"couleur","nom":"Jade","niveau":2,"prix":80,"valeur":"#8dd5b4","teinte":"#8dd5b4","famille":"Jade","premium":false,"anime":false},
  {"id":"amethyste","categorie":"couleur","nom":"Améthyste","niveau":6,"prix":240,"valeur":"#c7aff5","teinte":"#c7aff5","famille":"Astral","premium":false,"anime":false},
  {"id":"glacier","categorie":"couleur","nom":"Glacier","niveau":3,"prix":120,"valeur":"#93dff0","teinte":"#93dff0","famille":"Cristallin","premium":false,"anime":false},
  {"id":"rose","categorie":"couleur","nom":"Rose ancienne","niveau":4,"prix":160,"valeur":"#edabc5","teinte":"#edabc5","famille":"Sylvestre","premium":false,"anime":false},
  {"id":"or","categorie":"couleur","nom":"Or pâle","niveau":8,"prix":320,"valeur":"#e9d18d","teinte":"#e9d18d","famille":"Héritage","premium":false,"anime":false},
  {"id":"perle","categorie":"couleur","nom":"Perle","niveau":5,"prix":200,"valeur":"#d9e4f2","teinte":"#d9e4f2","famille":"Océan","premium":false,"anime":false},
  {"id":"corail","categorie":"couleur","nom":"Corail","niveau":7,"prix":280,"valeur":"#ffa99c","teinte":"#ffa99c","famille":"Incandescent","premium":false,"anime":false},
  ...SUCCES.map(s => ({ id: titreDuSucces(s.id), categorie: 'titre' as const, nom: s.titre, niveau: 1, prix: 0, valeur: s.titre, teinte: FAMILLES_SUCCES[s.famille].teinte, famille: FAMILLES_SUCCES[s.famille].nom, premium: false, anime: false, succes: s.id })),
];
export const PAQUETS = [
  {"id":"original","nom":"Édition originale","clair":"#37688c","fond":"#153b5b","ombre":"#0c243b","motif":"rosace","metal":"#edb680"},
  {"id":"herbier","nom":"L’Herbier","clair":"#587864","fond":"#243f35","ombre":"#142a24","motif":"feuilles","metal":"#b9d5a7"},
  {"id":"celeste","nom":"Courrier céleste","clair":"#655487","fond":"#302647","ombre":"#1c1732","motif":"etoiles","metal":"#c9b2ec"},
  {"id":"voyage","nom":"Poste lointaine","clair":"#98734e","fond":"#65422c","ombre":"#352a23","motif":"boussole","metal":"#eacda4"},
  {"id":"jardin","nom":"Jardin de minuit","clair":"#796179","fond":"#392b43","ombre":"#201a2e","motif":"papillon","metal":"#ebb6d4"},
  {"id":"glaces","nom":"Éclats de givre","clair":"#528b9a","fond":"#1f465e","ombre":"#122b43","motif":"cristal","metal":"#abedf0"},
  {"id":"ocean","nom":"Lettres océanes","clair":"#3c8385","fond":"#16484e","ombre":"#102d35","motif":"vagues","metal":"#a3e1d4"},
  {"id":"draconique","nom":"Légendes de jade","clair":"#617864","fond":"#293b36","ombre":"#172622","motif":"dragon","metal":"#d6d8a0"},
] as const;
export type ProfilPersonnel = { succes: string[]; progressionSucces: Partial<Record<MesureSucces, number>>; pseudo: string; xp: number; achats: string[]; avatar: string; cadre: string; titre: string; dos: string; couleur: string; paquet: string };
export const nouveauProfil = (): ProfilPersonnel => ({ succes: [], progressionSucces: {}, pseudo: '', xp: 0, achats: [], avatar: 'plume', cadre: 'simple', titre: '', dos: 'gomme', couleur: 'cuivre', paquet: 'original' });
export const XP = { paquet: 20, decouverte: 15, reponse: 5, duel: 30, victoire: 20 };
export function progressionDuNiveau(xp: number) {
  const total = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  // 100 XP, puis 50 de plus à chaque palier. Pas de plafond de niveau.
  const niveau = Math.floor((Math.sqrt(9 + total / 6.25) - 3) / 2) + 1;
  const seuil = 25 * (niveau - 1) * (niveau + 2);
  return { niveau, acquis: total - seuil, requis: 100 + (niveau - 1) * 50 };
}
export const ornement = (id: string): Ornement | undefined => ORNEMENTS.find((o) => o.id === id);
export const estDisponible = (profil: ProfilPersonnel, o: Ornement, premium = false): boolean => o.categorie === 'titre' ? !!o.succes && profil.succes.includes(o.succes) : o.premium ? premium : progressionDuNiveau(profil.xp).niveau >= o.niveau || profil.achats.includes(o.id);

// Un équipement premium reste mémorisé ; il redevient visible si la formule est renouvelée.
export function profilVisible(profil: ProfilPersonnel, formule: Formule | null, maintenant = Date.now()): ProfilPersonnel {
  if (formule && cosmetiquesPremium(formule, maintenant)) return profil;
  const visible = { ...profil };
  const defaut = nouveauProfil();
  for (const c of ['avatar', 'cadre', 'titre', 'dos', 'couleur'] as const) if (ornement(profil[c])?.premium) visible[c] = defaut[c];
  return visible;
}
export function relireProfil(brut: unknown): ProfilPersonnel {
  const p = nouveauProfil();
  if (!brut || typeof brut !== 'object') return p;
  const lu = brut as Record<string, unknown>;
  p.succes = Array.isArray(lu.succes) ? SUCCES.filter(s => (lu.succes as unknown[]).includes(s.id)).map(s => s.id) : [];
  if (lu.progressionSucces && typeof lu.progressionSucces === 'object') {
    const mesures = lu.progressionSucces as Record<string, unknown>;
    for (const s of SUCCES) {
      const n = mesures[s.mesure];
      if (typeof n === 'number' && Number.isSafeInteger(n) && n >= 0) p.progressionSucces[s.mesure] = n;
    }
  }
  p.xp = typeof lu.xp === 'number' && Number.isSafeInteger(lu.xp) && lu.xp >= 0 ? lu.xp : 0;
  p.pseudo = typeof lu.pseudo === 'string' ? lu.pseudo.slice(0, 24) : '';
  p.achats = Array.isArray(lu.achats) ? [...new Set(lu.achats.filter((id): id is string => typeof id === 'string' && !!ornement(id) && ornement(id)?.categorie !== 'titre'))] : [];
  for (const categorie of ['avatar', 'cadre', 'titre', 'dos', 'couleur'] as const) {
    const o = ORNEMENTS.find((o) => o.id === lu[categorie] && o.categorie === categorie);
    if (o && (o.premium || estDisponible(p, o))) p[categorie] = o.id;
  }
  p.paquet = PAQUETS.find((o) => o.id === lu.paquet)?.id ?? p.paquet;
  return p;
}
export function acheterOrnement(profil: ProfilPersonnel, encre: number, id: string): { profil: ProfilPersonnel; encre: number } {
  const o = ornement(id);
  if (!o) throw new Error('Personnalisation inconnue.');
  if (o.categorie === 'titre') throw new Error('Ce titre se gagne en accomplissant son succès.');
  if (o.premium) throw new Error('Cette personnalisation est réservée aux formules payantes.');
  if (estDisponible(profil, o)) return { profil, encre };
  if (encre < o.prix) throw new Error('Pas assez d’Encre.');
  return { profil: { ...profil, achats: [...profil.achats, id] }, encre: encre - o.prix };
}
