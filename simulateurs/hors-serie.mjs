import { readFileSync, writeFileSync } from 'node:fs';
import { EQUILIBRAGE, attaqueEnJeu, defenseEnJeu } from '../src/config/equilibrage.ts';
import { commencerLeDuel, choisirPourLOrdinateur, forceDeLaCarte, jouerLaManche, prevoirLAttaque, taillesDesFactions } from '../src/jeu/duel.ts';
import { hasardReproductible } from '../src/jeu/hasard.ts';
const edition=JSON.parse(readFileSync(new URL('../public/data/edition-1.index.json',import.meta.url),'utf8')).cartes;
const tailles=taillesDesFactions(edition), r=EQUILIBRAGE.duel, n=2000;
const communes=edition.filter(c=>c.rarete==='Commune').sort((a,b)=>forceDeLaCarte(b)-forceDeLaCarte(a)||a.id.localeCompare(b.id));
const fortes=communes.slice(0,Math.floor(communes.length/4));
const hs=edition.filter(c=>c.rarete==='Hors-série'), legendaires=edition.filter(c=>c.rarete==='Légendaire');
function tirer(pool,n,rng){const prises=new Map();while(prises.size<n){const c=pool[Math.floor(rng()*pool.length)];prises.set(c.id,c);}return [...prises.values()];}
function mesurer(nom,remplacement,paradeHS){
 let victoires=0,nuls=0,manches=0,jouees=0;
 for(let i=0;i<n;i++){
  const rng=hasardReproductible(17000+i), vingt=tirer(fortes,20,rng), deck=vingt.slice(0,10), adverse=vingt.slice(10);
  const speciale=remplacement ? remplacement[Math.floor(rng()*remplacement.length)] : null;
  if(speciale) deck[0]=speciale;
  const melange=hasardReproductible(27000+i), savoir=hasardReproductible(37000+i);
  const parade=c=>c.rarete==='Hors-série'?paradeHS:EQUILIBRAGE.joute.paradeParDefaut[c.rarete];
  let duel=commencerLeDuel(deck,adverse,melange,r);
  while(duel.vainqueur===null){
   const enFace=choisirPourLOrdinateur(duel,'Normal',rng,tailles,r);
   const valeur=c=>{
    const a=prevoirLAttaque(duel,'joueur',c,enFace,tailles,r), b=prevoirLAttaque(duel,'adversaire',enFace,c,tailles,r);
    return ((1-parade(c))*a.degats+parade(c)*a.degatsSiParee)-(.15*b.degats+.85*b.degatsSiParee);
   };
   const c=duel.camps.joueur.main.reduce((a,b)=>valeur(b)>valeur(a)?b:a);
   jouees+=Number(c.id===speciale?.id);
   duel=jouerLaManche(duel,c.id,enFace.id,{joueurPare:savoir()<.85,adversairePare:savoir()<parade(c)},rng,tailles,r);
  }
  victoires+=Number(duel.vainqueur==='joueur');nuls+=Number(duel.vainqueur==='nul');manches+=duel.manche;
 }
 return `| ${nom} | ${(100*victoires/n).toFixed(1)} % | ${(100*nuls/n).toFixed(1)} % | ${(manches/n).toFixed(1)} | ${remplacement?(100*jouees/n).toFixed(1)+' %':'—'} |`;
}
const rapport=[
 '# Mots rares et Hors-série : équilibrage', '',
 'Raretés ordinaires : probabilités de parade conservées. Hors-série : attaque minimale 12, bonus d’attaque +6 ; défense minimale 8, bonus de défense +3 et plafond 10. Elles sont estimées aussi familières que les communes (70 % de parade en entraînement Normal ; 85 % par défaut en joute). Les observations du joueur remplacent progressivement les estimations des joutes.', '',
 '## Une carte exceptionnelle dans un deck', '',
 '2 000 combats par ligne. Deux decks de dix cartes tirées dans le quart supérieur des communes selon attaque + défense, sans doublon entre camps. Remplacement d’une carte du joueur par une légendaire ou une Hors-série tirée dans son ensemble. Les deux camps attaquent automatiquement. Le joueur pare les communes à 85 % ; le double pare selon les estimations des joutes, sauf la ligne où il reconnaît toutes les Hors-série. Il pose sa meilleure carte suivant les règles réelles ; le joueur répond par le meilleur échange immédiat calculé. Ces hypothèses ne mesurent pas des joueurs réels ni toutes les compositions possibles. Incertitude d’échantillonnage maximale : environ ±2,2 points à 95 %.', '',
 '| Deck du joueur | Victoires | Nuls | Manches | Carte spéciale jouée |', '|---|---:|---:|---:|---:|',
 mesurer('10 communes fortes',null,.85),
 mesurer('9 communes fortes + 1 légendaire',legendaires,.85),
 mesurer('9 communes fortes + 1 Hors-série',hs,.85),
 mesurer('9 communes fortes + 1 Hors-série, toujours reconnue',hs,1), '',
 '## Statistiques des seize Hors-série', '',
 'Dégâts hors bonus de type ou d’origine, contre une carte de défense en jeu 10. Une parade réussie divise par deux en arrondissant vers le bas.', '',
 '| Mot | Attaque | Défense | Dégâts | Après parade |', '|---|---:|---:|---:|---:|',
 ...hs.map(c=>{const a=attaqueEnJeu(c.attaque,c.rarete),d=Math.max(r.degatsMinimum,a-5);return `| ${c.mot} | ${a} | ${defenseEnJeu(c.defense,c.rarete)} | ${d} | ${Math.floor(d*r.partDesDegatsApresParade)} |`;}), '',
].join('\n');
writeFileSync(new URL('../data/equilibrage-hors-serie.md',import.meta.url),rapport);console.log(rapport);
