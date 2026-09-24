import { readFileSync, writeFileSync } from 'node:fs';
import { EQUILIBRAGE, attaqueEnJeu, defenseEnJeu } from '../src/config/equilibrage.ts';
import { commencerLeDuel, choisirPourLOrdinateur, forceDeLaCarte, jouerLaManche, prevoirLAttaque, taillesDesFactions } from '../src/jeu/duel.ts';
import { hasardReproductible } from '../src/jeu/hasard.ts';

// Attaques automatiques : seule la probabilité de parade varie entre les scénarios.
// Elles représentent des profils hypothétiques, pas des observations de joueurs.
// Le joueur répond à un double qui pose sa meilleure carte selon la politique réelle des joutes.
const edition = JSON.parse(readFileSync(new URL('../public/data/edition-1.index.json', import.meta.url), 'utf8')).cartes;
const tailles = taillesDesFactions(edition);
const regles = EQUILIBRAGE.duel;
const N = 2000;
const communes = edition.filter(c => c.rarete === 'Commune').sort((a,b) => forceDeLaCarte(a)-forceDeLaCarte(b) || a.id.localeCompare(b.id));
const faible = communes.slice(0, Math.floor(communes.length / 4));
const forte = communes.slice(Math.floor(communes.length * 3 / 4));
const legendaires = edition.filter(c => c.rarete === 'Légendaire');
function prendre(pool, n, rng, exclus = new Set()) {
  const selection = new Map();
  while(selection.size < n) {
    const c = pool[Math.floor(rng()*pool.length)];
    if (!exclus.has(c.id)) selection.set(c.id,c);
  }
  return [...selection.values()];
}
const trier = cartes => [...cartes].sort((a,b) => forceDeLaCarte(b)-forceDeLaCarte(a) || a.id.localeCompare(b.id));
function construire(collection, methode) {
  if(methode === 'aleatoire') return collection.slice(0,10);
  if(methode === 'force') return trier(collection).slice(0,10);
  if(methode === 'types') {
    const triees = trier(collection), deck = [];
    for(let i=0;i<10;i++) {
      const type = ['Nom','Adjectif','Verbe'][i%3];
      deck.push(triees.find(c => c.type === type && !deck.includes(c)) ?? triees.find(c => !deck.includes(c)));
    }
    return deck;
  }
  const factions = [...new Set(collection.map(c=>c.faction))];
  const candidates = factions.map(faction=>trier(collection.filter(c=>c.faction===faction)).slice(0,10)).filter(d=>d.length===10);
  return candidates.sort((a,b)=>b.reduce((n,c)=>n+forceDeLaCarte(c),0)-a.reduce((n,c)=>n+forceDeLaCarte(c),0))[0] ?? trier(collection).slice(0,10);
}
function mesurer(nom, { pool = communes, adverse = communes, parade = .75, paradeAdverse = .75, choix = 'calcul', construction, constructionAdverse, bonus = true }) {
  let victoires=0,nuls=0,manches=0,att=0,def=0,attAdv=0,defAdv=0;
  const r = bonus ? regles : {...regles,bonusDeType:0,bonusDeFaction:0,bonusDePetiteFaction:0};
  for(let i=0;i<N;i++) {
    const tirage = hasardReproductible(70000+i);
    const source = prendre(pool, construction ? 60 : 10,tirage);
    const deck = construction ? construire(source, construction) : source;
    const sourceAdverse = prendre(adverse,constructionAdverse ? 60 : 10,tirage,new Set(source.map(c=>c.id)));
    const deckAdverse = constructionAdverse ? construire(sourceAdverse, constructionAdverse) : sourceAdverse;
    for(const c of deck) {att+=attaqueEnJeu(c.attaque,c.rarete); def+=defenseEnJeu(c.defense,c.rarete);}
    for(const c of deckAdverse) {attAdv+=attaqueEnJeu(c.attaque,c.rarete);defAdv+=defenseEnJeu(c.defense,c.rarete);}
    const melange = hasardReproductible(90000+i), savoir = hasardReproductible(110000+i), decisions=hasardReproductible(130000+i);
    let duel=commencerLeDuel(deck,deckAdverse,melange,r);
    while(duel.vainqueur === null) {
      const enFace=choisirPourLOrdinateur(duel,'Normal',decisions,tailles,r);
      const valeur = c => {
        const a=prevoirLAttaque(duel,'joueur',c,enFace,tailles,r), b=prevoirLAttaque(duel,'adversaire',enFace,c,tailles,r);
        return ((1-paradeAdverse)*a.degats+paradeAdverse*a.degatsSiParee)-((1-parade)*b.degats+parade*b.degatsSiParee);
      };
      const main=duel.camps.joueur.main;
      const carte=choix==='hasard' ? main[Math.floor(decisions()*main.length)] : main.reduce((a,b)=>valeur(b)>valeur(a)?b:a);
      duel=jouerLaManche(duel,carte.id,enFace.id,{joueurPare:savoir()<parade,adversairePare:savoir()<paradeAdverse},decisions,tailles,r);
    }
    victoires+=Number(duel.vainqueur==='joueur');nuls+=Number(duel.vainqueur==='nul');manches+=duel.manche;
  }
  return {nom, victoires: +(100*victoires/N).toFixed(1), nuls: +(100*nuls/N).toFixed(1), manches:+(manches/N).toFixed(1), stats:[att,def,attAdv,defAdv].map(x=>+(x/(N*10)).toFixed(1))};
}
const scenarios = [
 ['Communes variées, parade 65 %', {parade:.65}],
 ['Communes variées, parade 75 %', {}],
 ['Communes variées, parade 95 %', {parade:.95}],
 ['Communes variées, choix au hasard', {choix:'hasard'}],
 ['Communes faibles contre communes fortes, parade 75 %', {pool:faible,adverse:forte}],
 ['Communes faibles contre communes fortes, parade 95 %', {pool:faible,adverse:forte,parade:.95}],
 ['Communes faibles contre communes fortes, parade 100 %', {pool:faible,adverse:forte,parade:1}],
 ['Communes fortes contre légendaires, parade 75 %', {pool:forte,adverse:legendaires}],
 ['Communes fortes contre légendaires, parade 95 %', {pool:forte,adverse:legendaires,parade:.95}],
 ['Communes faibles expertes contre fortes hésitantes', {pool:faible,adverse:forte,parade:.95,paradeAdverse:.65}],
 ...['aleatoire','force','types','faction'].map(construction=>[`Collection identique de 60 communes : ${construction}`,{construction}]),
 ...['aleatoire','force','types','faction'].map(construction=>[`Face à un deck fort : ${construction}`,{construction,constructionAdverse:'force'}]),
 ['Face à un deck fort : force, sans bonus', {construction:'force',constructionAdverse:'force',bonus:false}],
 ['Communes fortes contre légendaires : savoirs par défaut des joutes', {pool:forte,adverse:legendaires,parade:.3,paradeAdverse:.85}],
 ['Collection de 60 communes : force, sans bonus', {construction:'force',bonus:false}],
];
const resultats=scenarios.map(([nom,options])=>mesurer(nom,options));
const rapport = [
 '# Analyse du poids des cartes et du savoir', '',
 `Simulation reproductible : ${N} combats par scénario, règles actuelles (${regles.pointsDeVie} PV, ${regles.manchesMaximum} manches maximum). Exécuter : node --experimental-strip-types simulateurs/analyse-combat.mjs.`, '',
 'Cartes réelles de l’édition, decks sans doublons ni carte partagée entre camps. « Faibles » et « fortes » : quart inférieur/supérieur des communes selon attaque + défense en jeu. Légendaires : échantillon de toutes les légendaires. Nouveaux decks pour chaque graine.', '',
 'Attaques automatiques dans les deux camps. Parade du joueur à 75 % et du double à 75 %, sauf indication dans la ligne. Le scénario faible expert contre fort hésitant utilise des parades de 95 % contre 65 %. Le scénario de joute utilise les parades par défaut : 30 % contre les légendaires et 85 % contre les communes. Ces probabilités sont des hypothèses, pas des observations de joueurs.', '',
 'Le double utilise la politique réelle des joutes (meilleure carte brute avec enchaînement). Le joueur choisit le meilleur échange immédiat en espérance, sauf scénario au hasard : il dispose donc d’un calcul idéal, ne planifie pas plusieurs manches, et bénéficie de la réponse à une carte visible et de la première attaque. Les résultats ne représentent pas un duel humain symétrique.', '',
 'Construction : mêmes collections de 60 communes et mêmes adversaires entre les quatre méthodes. Force = dix meilleurs totaux attaque + défense ; types = rotation nom/adjectif/verbe en prenant la plus forte disponible ; faction = meilleure faction ayant dix cartes, sinon force. Ce sont des heuristiques, pas une recherche du deck optimal. Les lignes « Face à un deck fort » construisent aussi le deck adverse à partir des dix plus fortes cartes d’une autre collection de 60 communes, pour éviter un effet plafond face à un deck aléatoire.', '',
 'Échantillon de 2 000 combats par ligne : incertitude binomiale maximale d’environ ±2,2 points à 95 %, sans inclure l’incertitude du modèle. Zéro victoire observée ne prouve pas une impossibilité.', '',
 '| Scénario | Victoires % | Nuls % | Manches | Att./Déf. joueur | Att./Déf. adverse |',
 '|---|---:|---:|---:|---:|---:|',
 ...resultats.map(x=>`| ${x.nom} | ${x.victoires} | ${x.nuls} | ${x.manches} | ${x.stats[0]} / ${x.stats[1]} | ${x.stats[2]} / ${x.stats[3]} |`), '',
 'Le scénario sans bonus retire les bonus des deux camps : il mesure leur effet net sur ce duel, pas uniquement le bénéfice personnel du joueur.', '',
].join('\n');
writeFileSync(new URL('../data/analyse-combat.md',import.meta.url),rapport);
console.log(rapport);
