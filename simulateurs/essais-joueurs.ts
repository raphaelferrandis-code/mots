// Analyse descriptive de relevés volontaires. Aucune collecte automatique.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export type EssaiJoueur = {
  participant: string; combat: string; session: 'J1' | 'J2' | 'J7'; lecture: 'occasionnelle' | 'reguliere' | 'intensive';
  deck: 'debutant' | 'developpe'; niveau: 'Facile' | 'Normal' | 'Difficile'; temps: 'normal' | 'double' | 'illimite';
  resultat: 'victoire' | 'defaite' | 'nul'; abandon: boolean; dureeSecondes: number; manches: number;
  attaques: number; attaquesReussies: number; parades: number; paradesReussies: number;
};
const objet = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export function lireEssais(brut: unknown): EssaiJoueur[] {
  if (!Array.isArray(brut)) throw Error('Le fichier doit contenir une liste de duels observés.');
  const cles = new Set<string>();
  const categories = {session:['J1','J2','J7'],lecture:['occasionnelle','reguliere','intensive'],deck:['debutant','developpe'],
    niveau:['Facile','Normal','Difficile'],temps:['normal','double','illimite'],resultat:['victoire','defaite','nul']};
  for (const [i,e] of brut.entries()) {
    if (!objet(e) || typeof e.participant!=='string' || !/^P\d{2,4}$/.test(e.participant) || typeof e.combat!=='string' || !e.combat.trim()
      || typeof e.abandon!=='boolean') throw Error(`Ligne ${i+1} : identification ou abandon invalide.`);
    for (const [cle,choix] of Object.entries(categories)) if (!choix.includes(String(e[cle]))) throw Error(`Ligne ${i+1} : ${cle} invalide.`);
    for (const cle of ['dureeSecondes','manches','attaques','attaquesReussies','parades','paradesReussies'])
      if (typeof e[cle]!=='number' || !Number.isFinite(e[cle]) || e[cle]<0 || (cle!=='dureeSecondes'&&!Number.isInteger(e[cle]))) throw Error(`Ligne ${i+1} : ${cle} invalide.`);
    if (Number(e.attaquesReussies)>Number(e.attaques)||Number(e.paradesReussies)>Number(e.parades)||(e.abandon&&e.resultat!=='defaite')) throw Error(`Ligne ${i+1} : bilan incohérent.`);
    if (cles.has(e.combat)) throw Error(`Combat relevé deux fois : ${e.combat}.`);
    cles.add(e.combat);
  }
  return brut as EssaiJoueur[];
}
const moyenne = (ns: number[]) => ns.length ? ns.reduce((a,b)=>a+b,0)/ns.length : 0;
const pourcent = (n: number) => `${(n*100).toFixed(1)} %`;
export function rapportEssais(essais: EssaiJoueur[]): string {
  if (!essais.length) return '# Essais joueurs\n\nAucune observation humaine fournie. Aucun ajustement déduit.\n';
  const groupes = new Map<string,EssaiJoueur[]>();
  for (const e of essais) {
    const cle=[e.session,e.lecture,e.deck,e.niveau,e.temps].join(' / ');
    groupes.set(cle,[...(groupes.get(cle)??[]),e]);
  }
  const lignes=['# Essais joueurs','',`${new Set(essais.map(e=>e.participant)).size} volontaires, ${essais.length} duels relevés.`,
    '', 'Les pourcentages sont des moyennes des taux par volontaire : une personne qui joue davantage ne pèse pas davantage. La plage montre les taux de victoire individuels, pas un intervalle de confiance. Ces observations ne démontrent pas un effet causal.',
    '', '| Session / lecture / deck / difficulté / temps | Joueurs | Duels | Victoires | Plage individuelle | Abandons | Attaques justes | Parades justes | Durée moyenne | Lecture |',
    '|---|---:|---:|---:|---|---:|---:|---:|---:|---|'];
  for (const [cle,duels] of [...groupes].sort(([a],[b])=>a.localeCompare(b))) {
    const personnes=[...new Set(duels.map(e=>e.participant))].map(id=>duels.filter(e=>e.participant===id));
    const victoires=personnes.map(ds=>ds.filter(d=>d.resultat==='victoire').length/ds.length);
    const taux=(poses:'attaques'|'parades',justes:'attaquesReussies'|'paradesReussies')=>{
      const connus=personnes.map(ds=>({n:ds.reduce((a,d)=>a+d[poses],0),v:ds.reduce((a,d)=>a+d[justes],0)})).filter(p=>p.n>0);
      return connus.length?pourcent(moyenne(connus.map(p=>p.v/p.n))):'—';
    };
    lignes.push(`| ${cle} | ${personnes.length} | ${duels.length} | ${pourcent(moyenne(victoires))} | ${pourcent(Math.min(...victoires))}–${pourcent(Math.max(...victoires))} | ${pourcent(moyenne(personnes.map(ds=>ds.filter(d=>d.abandon).length/ds.length)))} | ${taux('attaques','attaquesReussies')} | ${taux('parades','paradesReussies')} | ${moyenne(personnes.map(ds=>moyenne(ds.map(d=>d.dureeSecondes)))).toFixed(0)} s | ${personnes.length<5?'Échantillon trop petit pour régler les gains':'À confronter aux retours et à une autre session'} |`);
  }
  lignes.push('','Vérifier les définitions contestées et les problèmes d’interface avant de modifier les statistiques. Comparer les mêmes volontaires entre les sessions. Aucun paramètre du jeu n’est modifié par cet outil.','');
  return lignes.join('\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)) {
  const [entree,sortie]=process.argv.slice(2);
  if(!entree||!sortie) throw Error('Usage : node simulateurs/essais-joueurs.ts observations.json rapport.md');
  if(path.resolve(entree)===path.resolve(sortie)) throw Error('La sortie doit être distincte des observations.');
  writeFileSync(sortie,rapportEssais(lireEssais(JSON.parse(readFileSync(entree,'utf8')))));
  console.log(`Rapport descriptif écrit : ${sortie}`);
}
