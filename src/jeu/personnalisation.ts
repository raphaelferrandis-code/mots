import { FAMILLES_SUCCES, SUCCES, titreDuSucces } from './catalogueSucces.ts';
import type { MesureSucces } from './catalogueSucces.ts';
import type { Formule } from './formule.ts';
import { cosmetiquesPremium } from './formule.ts';
export type Categorie = 'avatar' | 'cadre' | 'titre' | 'dos' | 'couleur';
export type Ornement = { id: string; categorie: Categorie; nom: string; niveau: number; prix: number; valeur: string; teinte: string; famille: string; premium: boolean; anime: boolean; succes?: string; prestige?: number; description?: string };
export const ORNEMENTS: readonly Ornement[] = [
  // Avatars et cadres : refonte de septembre 2026. Une récompense par niveau jusqu’au 50 ;
  // trois pièces premium sont offertes aux joueurs fidèles (« prestige »).
  {"id":"plume","categorie":"avatar","nom":"La plume","niveau":1,"prix":0,"valeur":"plume","teinte":"#eccba0","famille":"Atelier","premium":false,"anime":false,"description":"La plume de l’atelier, gravée d’un trait fin."},
  {"id":"timbre","categorie":"avatar","nom":"Le petit timbre","niveau":1,"prix":0,"valeur":"timbre","teinte":"#e8d9bc","famille":"Poste","premium":false,"anime":false,"description":"Un timbre miniature, dentelé, avec sa valeur faciale."},
  {"id":"encrier","categorie":"avatar","nom":"L’encrier","niveau":1,"prix":0,"valeur":"encrier","teinte":"#d7c7ae","famille":"Encre","premium":false,"anime":false,"description":"Encrier et plume, pour ceux qui écrivent."},
  {"id":"colombe","categorie":"avatar","nom":"Colombe voyageuse","niveau":3,"prix":120,"valeur":"colombe","teinte":"#e6eef8","famille":"Poste","premium":false,"anime":false,"description":"La colombe messagère en plein vol, ailes levées, une lettre cachetée au bec."},
  {"id":"renard","categorie":"avatar","nom":"Renard des bois","niveau":6,"prix":240,"valeur":"renard","teinte":"#eeb880","famille":"Sylvestre","premium":false,"anime":false,"description":"Le renard facetté, pelage cuivré et yeux d’ambre."},
  {"id":"boussole","categorie":"avatar","nom":"La boussole","niveau":9,"prix":360,"valeur":"boussole","teinte":"#93c8e7","famille":"Explorateurs","premium":false,"anime":false,"description":"Rose des vents en laiton bleui, aiguille rouge."},
  {"id":"loupe","categorie":"avatar","nom":"Loupe du collectionneur","niveau":12,"prix":480,"valeur":"loupe","teinte":"#e4c48f","famille":"Poste","premium":false,"anime":false,"description":"La loupe posée sur un timbre rare, verre bombé et reflet."},
  {"id":"abeille","categorie":"avatar","nom":"L’abeille butineuse","niveau":15,"prix":600,"valeur":"abeille","teinte":"#f2c75c","famille":"Sylvestre","premium":false,"anime":false,"description":"Elle butine les mots comme des fleurs : ailes de verre, rayures d’ambre."},
  {"id":"papillon","categorie":"avatar","nom":"Papillon de verre","niveau":17,"prix":680,"valeur":"papillon","teinte":"#81decf","famille":"Cristallin","premium":false,"anime":false,"description":"Ailes de verre teinté, nervures d’argent."},
  {"id":"chouette","categorie":"avatar","nom":"Chouette savante","niveau":20,"prix":800,"valeur":"chouette","teinte":"#d9bf8c","famille":"Héritage","premium":false,"anime":false,"description":"La gardienne du dictionnaire, grands yeux d’ambre."},
  {"id":"chat","categorie":"avatar","nom":"Le chat de l’imprimeur","niveau":23,"prix":920,"valeur":"chat","teinte":"#c3cedd","famille":"Atelier","premium":false,"anime":false,"description":"Le gardien de l’atelier, assis bien droit, un timbre en médaille au collier."},
  {"id":"lune","categorie":"avatar","nom":"La lune","niveau":26,"prix":1040,"valeur":"lune","teinte":"#ccbcf5","famille":"Firmament","premium":false,"anime":false,"description":"Croissant nacré et étoile polaire."},
  {"id":"cerf-volant","categorie":"avatar","nom":"Le cerf-volant","niveau":28,"prix":1120,"valeur":"cerf-volant","teinte":"#9fd0f0","famille":"Explorateurs","premium":false,"anime":false,"description":"Un cerf-volant de papier à quatre pans, avec sa queue à nœuds qui danse dans le vent."},
  {"id":"cerf","categorie":"avatar","nom":"Cerf des brumes","niveau":32,"prix":1280,"valeur":"cerf","teinte":"#b9d8c2","famille":"Sylvestre","premium":false,"anime":false,"description":"Grands bois ramifiés, museau dans la brume du matin."},
  {"id":"livre","categorie":"avatar","nom":"Le dictionnaire","niveau":35,"prix":1400,"valeur":"livre","teinte":"#eadcbf","famille":"Encre","premium":false,"anime":false,"description":"Le grand livre ouvert, pages pleines de définitions, signet de soie rouge."},
  {"id":"baleine","categorie":"avatar","nom":"Baleine des nuages","niveau":37,"prix":1480,"valeur":"baleine","teinte":"#9fd0f0","famille":"Océan","premium":false,"anime":false,"description":"Une baleine qui nage dans le ciel, au-dessus des nuages."},
  {"id":"sablier","categorie":"avatar","nom":"Le sablier","niveau":41,"prix":1640,"valeur":"sablier","teinte":"#e3c07e","famille":"Horlogerie","premium":false,"anime":false,"description":"Le temps de réfléchir : verre soufflé, sable d’or, montants de laiton."},
  {"id":"montgolfiere","categorie":"avatar","nom":"Montgolfière","niveau":43,"prix":1720,"valeur":"montgolfiere","teinte":"#f0b48a","famille":"Explorateurs","premium":false,"anime":false,"description":"Le grand voyage : enveloppe à fuseaux, nacelle en osier."},
  {"id":"clef","categorie":"avatar","nom":"Clef des archives","niveau":45,"prix":1800,"valeur":"clef","teinte":"#e3cf8f","famille":"Héritage","premium":false,"anime":false,"description":"La clef ouvragée des réserves : anneau quadrilobé serti d’un rubis, panneton finement denté."},
  {"id":"dragon","categorie":"avatar","nom":"Dragon de jade","niveau":47,"prix":1880,"valeur":"dragon","teinte":"#8de0b8","famille":"Jade","premium":false,"anime":false,"description":"Dragon de jade lové en S dans le médaillon : gueule ouverte, bois dorés, crinière en volutes, pattes griffues."},
  {"id":"oracle","categorie":"avatar","nom":"Œil de l’oracle","niveau":1,"prix":0,"valeur":"oracle","teinte":"#c3b5ff","famille":"Astral","premium":true,"anime":true,"prestige":30,"description":"L’œil cligne de temps en temps, l’iris tourne, des runes gravitent autour."},
  {"id":"kitsune","categorie":"avatar","nom":"Kitsune aux neuf queues","niveau":1,"prix":0,"valeur":"kitsune","teinte":"#ffd2a6","famille":"Sylvestre","premium":true,"anime":true,"description":"Masque de renard blanc aux marques rouges ; neuf queues de flamme qui ondulent, feux follets bleus en orbite."},
  {"id":"meduse","categorie":"avatar","nom":"Méduse d’opale","niveau":1,"prix":0,"valeur":"meduse","teinte":"#9ff5ff","famille":"Abysses","premium":true,"anime":true,"description":"Cloche opaline qui change de couleur, pulsation lente et tentacules qui ondulent."},
  {"id":"ouroboros","categorie":"avatar","nom":"Ouroboros","niveau":1,"prix":0,"valeur":"ouroboros","teinte":"#f0cf7a","famille":"Astral","premium":true,"anime":true,"description":"Le serpent tourne sans fin, gueule grande ouverte sur sa propre queue ; reflets holographiques sur les écailles."},
  {"id":"comete","categorie":"avatar","nom":"La comète","niveau":1,"prix":0,"valeur":"comete","teinte":"#a6d8ff","famille":"Firmament","premium":true,"anime":true,"description":"La comète traverse le portrait, sa queue scintille, une étoile filante passe."},
  {"id":"loup-etoiles","categorie":"avatar","nom":"Loup des étoiles","niveau":1,"prix":0,"valeur":"loup-etoiles","teinte":"#b9d4ff","famille":"Firmament","premium":true,"anime":true,"description":"Sur un ciel étoilé, une constellation se trace et dessine un loup qui hurle."},
  {"id":"simple","categorie":"cadre","nom":"Filet d’atelier","niveau":1,"prix":0,"valeur":"simple","teinte":"#c9d6e6","famille":"Atelier","premium":false,"anime":false,"description":"Trait gravé, graduations comme une règle d’atelier. Lisible à toutes les tailles."},
  {"id":"dentelure","categorie":"cadre","nom":"Dentelure","niveau":1,"prix":0,"valeur":"dentelure","teinte":"#e8d9bc","famille":"Poste","premium":false,"anime":false,"description":"Le bord dentelé d’un timbre rond, avec sa légende imprimée. Le cadre le plus « PhilaMots »."},
  {"id":"herbier-presse","categorie":"cadre","nom":"Herbier pressé","niveau":4,"prix":160,"valeur":"herbier-presse","teinte":"#a9cf9a","famille":"Sylvestre","premium":false,"anime":false,"description":"Fougères séchées et fleurs des champs, tenues par deux bandes de papier gommé."},
  {"id":"postal","categorie":"cadre","nom":"Cachet postal","niveau":7,"prix":280,"valeur":"postal","teinte":"#e4b384","famille":"Poste","premium":false,"anime":false,"description":"Tampon d’oblitération en cuivre : légende circulaire et ondes qui débordent du cadre."},
  {"id":"ronces","categorie":"cadre","nom":"Étreinte des ronces","niveau":10,"prix":400,"valeur":"ronces","teinte":"#8fc4a2","famille":"Sylvestre","premium":false,"anime":false,"description":"Deux tiges entrelacées, épines et mûres sauvages serties."},
  {"id":"arabesque","categorie":"cadre","nom":"Arabesque d’encre","niveau":13,"prix":520,"valeur":"arabesque","teinte":"#d9c6a4","famille":"Encre","premium":false,"anime":false,"description":"Quatre paraphes de calligraphe, pleins et déliés, ponctués de gouttes d’or."},
  {"id":"sceau-cire","categorie":"cadre","nom":"Sceau de cire","niveau":16,"prix":640,"valeur":"sceau-cire","teinte":"#c9434b","famille":"Poste","premium":false,"anime":false,"description":"Cire rouge coulée, empreinte du sceau et deux rubans de soie qui dépassent."},
  {"id":"ecailles","categorie":"cadre","nom":"Écailles de jade","niveau":18,"prix":720,"valeur":"ecailles","teinte":"#7fd3a8","famille":"Jade","premium":false,"anime":false,"description":"Deux rangées d’écailles polies comme du jade, avec un reflet sur chaque pièce."},
  {"id":"vitrail","categorie":"cadre","nom":"Vitrail azuré","niveau":21,"prix":840,"valeur":"vitrail","teinte":"#7cc4ec","famille":"Cristallin","premium":false,"anime":false,"description":"Verre coloré serti au plomb, avec la lumière qui tombe du haut à gauche."},
  {"id":"rose-des-vents","categorie":"cadre","nom":"Rose des vents","niveau":24,"prix":960,"valeur":"rose-des-vents","teinte":"#9ccbe8","famille":"Explorateurs","premium":false,"anime":false,"description":"Cadran de navigateur : graduations, points cardinaux et aiguille du Nord."},
  {"id":"givre","categorie":"cadre","nom":"Couronne de givre","niveau":27,"prix":1080,"valeur":"givre","teinte":"#bfe6f7","famille":"Cristallin","premium":false,"anime":false,"description":"Douze branches de cristaux de neige qui poussent autour du portrait."},
  {"id":"maree","categorie":"cadre","nom":"Écume d’argent","niveau":29,"prix":1160,"valeur":"maree","teinte":"#9fdbe0","famille":"Océan","premium":false,"anime":false,"description":"Huit vagues qui s’enroulent en couronne, crêtes argentées et gouttes d’écume."},
  {"id":"recif","categorie":"cadre","nom":"Récif de corail","niveau":33,"prix":1320,"valeur":"recif","teinte":"#ff9f86","famille":"Abysses","premium":false,"anime":false,"description":"Deux coraux qui montent du fond et encadrent le portrait, bulles qui s’échappent."},
  {"id":"marqueterie","categorie":"cadre","nom":"Marqueterie","niveau":36,"prix":1440,"valeur":"marqueterie","teinte":"#d7a978","famille":"Atelier","premium":false,"anime":false,"description":"Bois précieux clairs et sombres assemblés à la main, losanges d’érable et filets de laiton."},
  {"id":"rosee","categorie":"cadre","nom":"Toile de rosée","niveau":38,"prix":1520,"valeur":"rosee","teinte":"#cfe6f2","famille":"Sylvestre","premium":false,"anime":false,"description":"Une toile d’araignée tendue autour du portrait, perlée de gouttes de rosée au petit matin."},
  {"id":"rouage","categorie":"cadre","nom":"Rouage d’horloger","niveau":42,"prix":1680,"valeur":"rouage","teinte":"#d8b36a","famille":"Horlogerie","premium":false,"anime":false,"description":"Couronne dentée en laiton, chiffres romains gravés et un petit engrenage satellite."},
  {"id":"enluminure","categorie":"cadre","nom":"Enluminure","niveau":44,"prix":1760,"valeur":"enluminure","teinte":"#e9c46a","famille":"Encre","premium":false,"anime":false,"description":"Page de manuscrit : feuille d’or, médaillons bleu lapis et rinceaux rouges et bleus."},
  {"id":"laurier","categorie":"cadre","nom":"Couronne de laurier","niveau":46,"prix":1840,"valeur":"laurier","teinte":"#e3cf8f","famille":"Héritage","premium":false,"anime":false,"description":"Feuilles d’or une à une, nœud de ruban et pierre centrale. La récompense des fidèles."},
  {"id":"filigrane","categorie":"cadre","nom":"Filigrane d’or","niveau":48,"prix":1920,"valeur":"filigrane","teinte":"#ecd593","famille":"Héritage","premium":false,"anime":false,"description":"Dentelle d’orfèvre : boucles, volutes et perles, d’une finesse de bijou."},
  {"id":"eclipse","categorie":"cadre","nom":"Sceau de l’éclipse","niveau":49,"prix":1960,"valeur":"eclipse","teinte":"#d6b8ee","famille":"Firmament","premium":false,"anime":false,"description":"Couronne solaire rayonnante, croissant d’ombre et trois étoiles."},
  {"id":"astral","categorie":"cadre","nom":"Orbite astrale","niveau":1,"prix":0,"valeur":"astral","teinte":"#b8a1ff","famille":"Astral","premium":true,"anime":true,"description":"Deux orbites inclinées où gravitent des planètes ; étoiles qui scintillent."},
  {"id":"floraison","categorie":"cadre","nom":"Floraison éternelle","niveau":1,"prix":0,"valeur":"floraison","teinte":"#f2a9cd","famille":"Sylvestre","premium":true,"anime":true,"description":"Huit fleurs qui tournent doucement, des pétales se détachent et tombent en continu."},
  {"id":"cristal","categorie":"cadre","nom":"Couronne de cristal","niveau":1,"prix":0,"valeur":"cristal","teinte":"#85e9ef","famille":"Cristallin","premium":true,"anime":true,"description":"Éclats de quartz traversés par un reflet prismatique qui tourne sans fin."},
  {"id":"brasier","categorie":"cadre","nom":"Ailes du phénix","niveau":1,"prix":0,"valeur":"brasier","teinte":"#ffb07f","famille":"Incandescent","premium":true,"anime":true,"description":"Ailes de flammes qui dépassent du cadre, crête qui ondule, braises qui s’envolent."},
  {"id":"aurore","categorie":"cadre","nom":"Aurore boréale","niveau":1,"prix":0,"valeur":"aurore","teinte":"#8fe8c7","famille":"Firmament","premium":true,"anime":true,"description":"Voiles de lumière verte et violette qui coulent autour du portrait."},
  {"id":"hologramme","categorie":"cadre","nom":"Timbre holographique","niveau":1,"prix":0,"valeur":"hologramme","teinte":"#d8e6ff","famille":"Poste","premium":true,"anime":true,"description":"Le timbre dentelé en feuille holographique : l’arc-en-ciel glisse sur le métal."},
  {"id":"abysses","categorie":"cadre","nom":"Gardien des abysses","niveau":1,"prix":0,"valeur":"abysses","teinte":"#7ff0ff","famille":"Abysses","premium":true,"anime":true,"description":"Méduses lumineuses qui flottent, tentacules qui ondulent, bulles qui remontent."},
  {"id":"tempete","categorie":"cadre","nom":"Œil de la tempête","niveau":1,"prix":0,"valeur":"tempete","teinte":"#a9c7ff","famille":"Firmament","premium":true,"anime":true,"description":"Une couronne de longs nuages d’orage qui tourne lentement en tourbillon ; les éclairs claquent entre les nuages."},
  {"id":"mecanique","categorie":"cadre","nom":"Mécanique céleste","niveau":1,"prix":0,"valeur":"mecanique","teinte":"#e8c27a","famille":"Horlogerie","premium":true,"anime":true,"description":"Deux couronnes dentées en laiton qui tournent en sens contraire, comme un mouvement d’horlogerie à nu."},
  {"id":"etreinte-dragon","categorie":"cadre","nom":"Étreinte du dragon","niveau":1,"prix":0,"valeur":"etreinte-dragon","teinte":"#7fe0b0","famille":"Jade","premium":true,"anime":true,"description":"Un long dragon de jade fait le tour du portrait en ondulant : crinière au vent, bois dorés, pattes griffues agrippées au cadre, paillettes d’or."},
  {"id":"nebuleuse","categorie":"cadre","nom":"Nébuleuse","niveau":1,"prix":0,"valeur":"nebuleuse","teinte":"#d0a6ff","famille":"Astral","premium":true,"anime":true,"prestige":40,"description":"Une galaxie spirale tourne lentement derrière le portrait, poussière d’étoiles."},
  {"id":"encre-vivante","categorie":"cadre","nom":"Encre vivante","niveau":1,"prix":0,"valeur":"encre-vivante","teinte":"#e8d4a8","famille":"Encre","premium":true,"anime":true,"description":"Les paraphes se tracent tout seuls à la plume, des gouttes d’or tombent et éclaboussent."},
  {"id":"feux-follets","categorie":"cadre","nom":"Feux follets","niveau":1,"prix":0,"valeur":"feux-follets","teinte":"#8ad8ff","famille":"Incandescent","premium":true,"anime":true,"description":"Cinq flammes bleues qui tournent autour du portrait en laissant une traîne."},
  {"id":"grand-philateliste","categorie":"cadre","nom":"Couronne du Grand Philatéliste","niveau":1,"prix":0,"valeur":"grand-philateliste","teinte":"#f0cf7a","famille":"Héritage","premium":true,"anime":true,"prestige":50,"description":"La pièce ultime : couronne d’or sertie, rayons qui tournent, bord dentelé doré et éclats de lumière."},
  {"id":"gomme","categorie":"dos","nom":"Gomme originale","niveau":1,"prix":0,"valeur":"plume","teinte":"#e2cca6","famille":"Atelier","premium":false,"anime":false},
  {"id":"entrelacs","categorie":"dos","nom":"Entrelacs","niveau":5,"prix":200,"valeur":"boussole","teinte":"#b1ddce","famille":"Jade","premium":false,"anime":false},
  {"id":"constellation","categorie":"dos","nom":"Constellation","niveau":31,"prix":1240,"valeur":"lune","teinte":"#c7baf1","famille":"Firmament","premium":false,"anime":false},
  {"id":"herbier-dos","categorie":"dos","nom":"Herbier secret","niveau":11,"prix":440,"valeur":"feuilles","teinte":"#b0d7a2","famille":"Sylvestre","premium":false,"anime":false},
  {"id":"vitrail-dos","categorie":"dos","nom":"Verre et lumière","niveau":22,"prix":880,"valeur":"cristal","teinte":"#9bddeb","famille":"Cristallin","premium":false,"anime":false},
  {"id":"maree-dos","categorie":"dos","nom":"Les grandes marées","niveau":39,"prix":1560,"valeur":"vagues","teinte":"#a2dee1","famille":"Océan","premium":false,"anime":false},
  {"id":"dragon-dos","categorie":"dos","nom":"Serment du dragon","niveau":1,"prix":0,"valeur":"dragon","teinte":"#a9e6c0","famille":"Jade","premium":true,"anime":true},
  {"id":"oracle-dos","categorie":"dos","nom":"Archives astrales","niveau":1,"prix":0,"valeur":"oracle","teinte":"#d3b8ff","famille":"Astral","premium":true,"anime":true},
  {"id":"cuivre","categorie":"couleur","nom":"Cuivre","niveau":1,"prix":0,"valeur":"#f1b987","teinte":"#f1b987","famille":"Atelier","premium":false,"anime":false},
  {"id":"jade","categorie":"couleur","nom":"Jade","niveau":2,"prix":80,"valeur":"#8dd5b4","teinte":"#8dd5b4","famille":"Jade","premium":false,"anime":false},
  {"id":"amethyste","categorie":"couleur","nom":"Améthyste","niveau":25,"prix":1000,"valeur":"#c7aff5","teinte":"#c7aff5","famille":"Astral","premium":false,"anime":false},
  {"id":"glacier","categorie":"couleur","nom":"Glacier","niveau":8,"prix":320,"valeur":"#93dff0","teinte":"#93dff0","famille":"Cristallin","premium":false,"anime":false},
  {"id":"rose","categorie":"couleur","nom":"Rose ancienne","niveau":14,"prix":560,"valeur":"#edabc5","teinte":"#edabc5","famille":"Sylvestre","premium":false,"anime":false},
  {"id":"or","categorie":"couleur","nom":"Or pâle","niveau":42,"prix":1680,"valeur":"#e9d18d","teinte":"#e9d18d","famille":"Héritage","premium":false,"anime":false},
  {"id":"perle","categorie":"couleur","nom":"Perle","niveau":19,"prix":760,"valeur":"#d9e4f2","teinte":"#d9e4f2","famille":"Océan","premium":false,"anime":false},
  {"id":"corail","categorie":"couleur","nom":"Corail","niveau":34,"prix":1360,"valeur":"#ffa99c","teinte":"#ffa99c","famille":"Incandescent","premium":false,"anime":false},
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
export type ProfilPersonnel = { bonusXpReste?: number; succes: string[]; progressionSucces: Partial<Record<MesureSucces, number>>; pseudo: string; xp: number; achats: string[]; avatar: string; cadre: string; titre: string; dos: string; couleur: string; paquet: string };
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
// Une pièce de prestige est premium, mais aussi offerte à tous les joueurs qui atteignent son niveau.
export const offertParPrestige = (profil: ProfilPersonnel, o: Ornement): boolean => !!o.prestige && progressionDuNiveau(profil.xp).niveau >= o.prestige;
export const estDisponible = (profil: ProfilPersonnel, o: Ornement, premium = false): boolean => o.categorie === 'titre' ? !!o.succes && profil.succes.includes(o.succes) : o.premium ? premium || offertParPrestige(profil, o) : progressionDuNiveau(profil.xp).niveau >= o.niveau || profil.achats.includes(o.id);

// Un équipement premium reste mémorisé ; il redevient visible si la formule est renouvelée.
export function profilVisible(profil: ProfilPersonnel, formule: Formule | null, maintenant = Date.now()): ProfilPersonnel {
  if (formule && cosmetiquesPremium(formule, maintenant)) return profil;
  const visible = { ...profil };
  const defaut = nouveauProfil();
  for (const c of ['avatar', 'cadre', 'titre', 'dos', 'couleur'] as const) { const o = ornement(profil[c]); if (o?.premium && !offertParPrestige(profil, o)) visible[c] = defaut[c]; }
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
  if (Number.isInteger(lu.bonusXpReste) && (lu.bonusXpReste as number) >= 0 && (lu.bonusXpReste as number) < 100) p.bonusXpReste = lu.bonusXpReste as number;
  p.paquet = PAQUETS.find((o) => o.id === lu.paquet)?.id ?? p.paquet;
  return p;
}
export function acheterOrnement(_profil: ProfilPersonnel, _encre: number, id: string): { profil: ProfilPersonnel; encre: number } {
  const o = ornement(id);
  if (!o) throw new Error('Personnalisation inconnue.');
  if (o.categorie === 'titre') throw new Error('Ce titre se gagne en accomplissant son succès.');
  throw new Error('L’Encre est réservée aux enchères.');
}
