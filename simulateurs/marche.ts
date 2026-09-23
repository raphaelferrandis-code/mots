// Simulateur de marché : l'économie tient-elle quand les joueurs se vendent des timbres ?
// Des joueurs fictifs ouvrent leurs paquets, jouent leurs duels, puis vendent et achètent aux enchères, avec les
// vraies cartes et les vraies règles (src/config/equilibrage.ts). Sert à régler la commission, les prix planchers
// et les plafonds des joueurs gratuits, AVANT que de vrais joueurs s'en servent.
//
// Usage : npm run simulation:marche   → tableaux à l'écran et dans data/simulation-marche.md
//
// ⚠️ Ce que ce simulateur sait faire, et ce qu'il ne sait pas faire.
// Il connaît exactement les entrées et les sorties d'Encre (doublons, duels, commission) : ces
// chiffres-là ne dépendent que des vraies règles. En revanche, il ne sait pas ce qu'un vrai joueur est prêt à payer
// pour un timbre : c'est une hypothèse, réglée ici par le « désir ». Tous les tableaux sont donc donnés pour
// plusieurs désirs : ce qui compte est ce qui reste vrai dans les trois colonnes.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { EQUILIBRAGE } from '../src/config/equilibrage.ts';
import { hasardReproductible } from '../src/jeu/hasard.ts';
import type { Hasard } from '../src/jeu/hasard.ts';
import { contientUneLegendaire, ouvrirPaquet, preparerReserve } from '../src/jeu/paquets.ts';
import { RARETES } from '../src/partage/types.ts';
import type { Finition, IndexEdition, Rarete } from '../src/partage/types.ts';

const RACINE = path.join(import.meta.dirname, '..');
const edition: IndexEdition = JSON.parse(readFileSync(path.join(RACINE, 'public', 'data', 'edition-1.index.json'), 'utf8'));
const RESERVE = preparerReserve(edition.cartes);
const RARETE_DE = new Map(edition.cartes.map((c) => [c.id, c.rarete]));

const JOURS = 120;
const P = EQUILIBRAGE.paquets;
const D = EQUILIBRAGE.duel;
const M = EQUILIBRAGE.marche;

// ── Les joueurs fictifs ──────────────────────────────────────────────────────
// Les mêmes profils que le simulateur de collection, avec le nombre de duels qu'ils jouent par jour.
type Profil = { nom: string; paquetsParJour: number; duelsParJour: number; combien: number };
const PROFILS: Profil[] = [
  { nom: 'Occasionnel', paquetsParJour: 10, duelsParJour: 2, combien: 30 },
  { nom: 'Régulier', paquetsParJour: 30, duelsParJour: 5, combien: 20 },
  { nom: 'Acharné', paquetsParJour: 100, duelsParJour: 12, combien: 10 },
];
const CHANCE_DE_VICTOIRE = 0.7; // un joueur moyen en Normal (mesuré : 88 % pour un bon lecteur, 57 % pour un hésitant)

// Scénarios gratuits uniquement : l'ancienne rente de 300 Encre/jour et le
// marché payant illimité n'existent plus. Les offres exigent un modèle de visites et de recharge.

type Reglages = {
  nom: string;
  desir: number; // un timbre qui manque vaut « désir » fois son Encre de doublon
  commission: number;
  planchers: Record<Rarete, number>;
  // Les plafonds d'un joueur gratuit : ventes en cours et achats par jour. « null » = aucun plafond pour personne.
  plafonds: { ventes: number; achats: number } | null;
};

const PLAFONDS_ACTUELS = { ventes: M.ventesEnCoursAuPlus, achats: M.achatsParJourAuPlus };
const REGLAGES_ACTUELS = { commission: M.commission, planchers: M.planchers, plafonds: PLAFONDS_ACTUELS };

// ── Un joueur ────────────────────────────────────────────────────────────────
type Timbre = { carte: string; finition: Finition };

type Joueur = {
  profil: Profil;
  encre: number;
  // Les tirages convertissent les doublons ; les retours d'enchère conservent leurs exemplaires.
  possedees: Map<string, Map<Finition, number>>;
  sansLegendaire: number;
  ouverts: number;
  ventesEnCours: number;
  achatsDuJour: number;
  butoirDeVentes: number; // fois où il a voulu vendre mais était au plafond
  butoirDAchats: number;
};

type Enchere = { vendeur: Joueur; timbre: Timbre; rarete: Rarete; mise: number; achatImmediat: number };

type Bilan = {
  encreCreee: number; // doublons + duels + Encre achetée en argent réel
  encreDetruite: number; // paquets achetés + commission
  encreDesDoublons: number;
  encreDesDuels: number;
  encreDesAchats: number;
  encreDesPaquets: number;
  encreDeLaCommission: number;
  encreFinale: number[]; // par joueur
  ventesParRarete: Record<Rarete, number[]>; // les prix obtenus
  invendusParRarete: Record<Rarete, number>;
  misesEnVenteParRarete: Record<Rarete, number>;
  butoirsDeVentes: number;
  butoirsDAchats: number;
  joueursAuButoir: number;
  joueursAuButoirDAchats: number;
};

const parRarete = <T,>(valeur: () => T): Record<Rarete, T> => Object.fromEntries(RARETES.map((r) => [r, valeur()])) as Record<Rarete, T>;

// Ce qu'un timbre rapporterait s'il était un doublon : sa valeur de ferraille, connue du jeu.
const valeurDeFerraille = (rarete: Rarete, finition: Finition): number => EQUILIBRAGE.encreParDoublon[rarete] * EQUILIBRAGE.finitions.encre[finition];

// Ce qu'un joueur est prêt à payer pour un timbre qui lui manque : sa ferraille multipliée par le désir, avec du bruit
// (tout le monde ne veut pas le même mot au même moment). C'est L'HYPOTHÈSE du simulateur.
const valeurDAchat = (rarete: Rarete, finition: Finition, desir: number, hasard: Hasard): number =>
  Math.round(valeurDeFerraille(rarete, finition) * desir * (0.6 + 1.2 * hasard()));

function nouveauJoueur(profil: Profil): Joueur {
  return { profil, encre: 0, possedees: new Map(), sansLegendaire: 0, ouverts: 0, ventesEnCours: 0, achatsDuJour: 0, butoirDeVentes: 0, butoirDAchats: 0 };
}

const possede = (j: Joueur, t: Timbre): boolean => j.possedees.get(t.carte)?.has(t.finition) === true;

function retirer(j: Joueur, t: Timbre): void {
  const finitions = j.possedees.get(t.carte);
  if (!finitions) return;
  const restant = (finitions.get(t.finition) ?? 0) - 1;
  if (restant > 0) finitions.set(t.finition, restant); else finitions.delete(t.finition);
  if (finitions.size === 0) j.possedees.delete(t.carte);
}

function ajouter(j: Joueur, t: Timbre, rarete: Rarete, tirage = false): void {
  const finitions = j.possedees.get(t.carte);
  if (!finitions) { j.possedees.set(t.carte, new Map([[t.finition, 1]])); return; }
  if (tirage && finitions.has(t.finition)) j.encre += valeurDeFerraille(rarete, t.finition);
  else finitions.set(t.finition, (finitions.get(t.finition) ?? 0) + 1); // transfert ou retour de vente : conserver l'exemplaire
}

// ── Une simulation complète ──────────────────────────────────────────────────
function simuler(reglages: Reglages, graine: number): Bilan {
  const hasard = hasardReproductible(graine);
  const joueurs: Joueur[] = [];
  for (const profil of PROFILS) {
    for (let i = 0; i < profil.combien; i++) joueurs.push(nouveauJoueur(profil));
  }

  const bilan: Bilan = {
    encreCreee: 0, encreDetruite: 0, encreDesDoublons: 0, encreDesDuels: 0, encreDesAchats: 0, encreDesPaquets: 0, encreDeLaCommission: 0,
    encreFinale: [], ventesParRarete: parRarete<number[]>(() => []), invendusParRarete: parRarete(() => 0), misesEnVenteParRarete: parRarete(() => 0),
    butoirsDeVentes: 0, butoirsDAchats: 0, joueursAuButoir: 0, joueursAuButoirDAchats: 0,
  };

  // Un paquet ouvert : les cartes entrent dans l'album, les vrais doublons deviennent de l'Encre.
  const ouvrirUnPaquet = (j: Joueur): void => {
    const avant = j.encre;
    const tirees = ouvrirPaquet(RESERVE, { hasard, paquetsSansLegendaire: j.sansLegendaire, exclure: j.ouverts < P.paquetsDeDepart ? new Set(j.possedees.keys()) : undefined }, P, EQUILIBRAGE.finitions);
    j.ouverts++;
    j.sansLegendaire = contientUneLegendaire(tirees) ? 0 : j.sansLegendaire + 1;
    for (const { carte, finition } of tirees) ajouter(j, { carte: carte.id, finition }, carte.rarete, true);
    const gagnee = j.encre - avant;
    bilan.encreCreee += gagnee;
    bilan.encreDesDoublons += gagnee;
  };

  let encheres: Enchere[] = [];

  for (let jour = 1; jour <= JOURS; jour++) {
    // ── Les enchères de la veille se dénouent ──
    const aDenouer = encheres;
    encheres = [];
    for (const e of aDenouer) {
      // Qui veut ce timbre : celui qui ne l'a pas, qui peut payer, et qui n'a pas atteint son plafond d'achats.
      const candidats = joueurs
        .filter((j) => j !== e.vendeur && !possede(j, e.timbre) && (reglages.plafonds === null || j.achatsDuJour < reglages.plafonds.achats))
        .map((j) => ({ j, valeur: Math.min(valeurDAchat(e.rarete, e.timbre.finition, reglages.desir, hasard), j.encre) }))
        .filter((c) => c.valeur >= e.mise)
        .sort((a, b) => b.valeur - a.valeur);

      e.vendeur.ventesEnCours--;
      if (candidats.length === 0) {
        // Invendu : le timbre revient au vendeur, sans rien coûter à personne.
        ajouter(e.vendeur, e.timbre, e.rarete);
        bilan.invendusParRarete[e.rarete]++;
        continue;
      }
      // Enchère montante : le gagnant paie juste au-dessus du second, jamais plus que l'achat immédiat.
      const second = candidats[1]?.valeur ?? 0;
      const gagnant = candidats[0];
      const prix = Math.min(gagnant.valeur, e.achatImmediat, Math.max(e.mise, second + Math.max(1, Math.ceil(second * M.surencherMinimale))));

      gagnant.j.encre -= prix;
      gagnant.j.achatsDuJour++;
      ajouter(gagnant.j, e.timbre, e.rarete);
      const commission = Math.ceil(prix * reglages.commission);
      e.vendeur.encre += prix - commission;
      bilan.encreDetruite += commission;
      bilan.encreDeLaCommission += commission;
      bilan.ventesParRarete[e.rarete].push(prix);
    }

    // Qui a épuisé son droit d'acheter pour la journée ?
    if (reglages.plafonds) {
      for (const j of joueurs) if (j.achatsDuJour >= reglages.plafonds.achats) j.butoirDAchats++;
    }

    // ── La journée de chaque joueur ──
    for (const j of joueurs) {
      j.achatsDuJour = 0;

      // 1. Les paquets gratuits.
      for (let i = 0; i < j.profil.paquetsParJour; i++) ouvrirUnPaquet(j);

      // 2. Les duels : Encre pleine pour les trois premières victoires du jour, réduite ensuite.
      let victoires = 0;
      for (let i = 0; i < j.profil.duelsParJour; i++) {
        const gagne = hasard() < CHANCE_DE_VICTOIRE;
        const gain = !gagne ? D.encreParDefaite
          : victoires >= D.victoiresPleinesParJour ? Math.max(1, Math.round(D.encreParVictoire.Normal * D.partDeLEncreEnsuite))
          : D.encreParVictoire.Normal;
        if (gagne) victoires++;
        j.encre += gain;
        bilan.encreCreee += gain;
        bilan.encreDesDuels += gain;
      }

      // 4. Les ventes : on vend d'abord ce dont on a un autre exemplaire dans une autre finition (la collection
      //    reste entière) ; le prix demandé est le plancher de la rareté, un peu au-dessus si le timbre est beau.
      const aVendre: Timbre[] = [];
      for (const [carte, finitions] of j.possedees) {
        if ([...finitions.values()].reduce((n, v) => n + v, 0) < 2) continue;
        const rarete = RARETE_DE.get(carte);
        if (!rarete) continue;
        // Il garde la meilleure finition et propose l'autre.
        const rangees = [...finitions.keys()].sort((a, b) => EQUILIBRAGE.finitions.encre[a] - EQUILIBRAGE.finitions.encre[b]);
        aVendre.push({ carte, finition: rangees[0] });
        if (aVendre.length >= 12) break;
      }
      for (const timbre of aVendre) {
        const plafond = reglages.plafonds ? reglages.plafonds.ventes : Number.POSITIVE_INFINITY;
        if (j.ventesEnCours >= plafond) { j.butoirDeVentes++; break; }
        const rarete = RARETE_DE.get(timbre.carte)!;
        const plancher = reglages.planchers[rarete];
        // Il demande le plancher, ou un peu plus s'il espère mieux ; jamais moins.
        const mise = Math.max(plancher, Math.round(valeurDeFerraille(rarete, timbre.finition) * 1.5));
        retirer(j, timbre);
        j.ventesEnCours++;
        bilan.misesEnVenteParRarete[rarete]++;
        encheres.push({ vendeur: j, timbre, rarete, mise, achatImmediat: mise * 4 });
      }

    }
  }

  // Les enchères encore ouvertes à la fin reviennent à leur vendeur : elles ne comptent pas comme invendues.
  for (const e of encheres) { ajouter(e.vendeur, e.timbre, e.rarete); bilan.misesEnVenteParRarete[e.rarete]--; }

  bilan.encreFinale = joueurs.map((j) => j.encre);
  if (bilan.encreFinale.reduce((n, v) => n + v, 0) !== bilan.encreCreee - bilan.encreDetruite) throw new Error('Le bilan du marché ne conserve pas l’Encre.');
  bilan.butoirsDeVentes = joueurs.reduce((s, j) => s + j.butoirDeVentes, 0);
  bilan.butoirsDAchats = joueurs.reduce((s, j) => s + j.butoirDAchats, 0);
  bilan.joueursAuButoir = joueurs.filter((j) => j.butoirDeVentes > 0).length;
  bilan.joueursAuButoirDAchats = joueurs.filter((j) => j.butoirDAchats > 0).length;
  return bilan;
}

// ── Mise en forme ────────────────────────────────────────────────────────────
const mediane = (valeurs: number[]): number => {
  if (valeurs.length === 0) return 0;
  const tries = [...valeurs].sort((a, b) => a - b);
  return tries[Math.floor(tries.length / 2)];
};
const nombre = (n: number): string => Math.round(n).toLocaleString('fr-FR');
const pourcent = (part: number): string => `${Math.round(part * 100)} %`;
const tableau = (titres: string[], lignes: string[][]): string[] => [`| ${titres.join(' | ')} |`, `|${titres.map(() => '---').join('|')}|`, ...lignes.map((l) => `| ${l.join(' | ')} |`), ''];

const TOTAL_DE_JOUEURS = PROFILS.reduce((s, p) => s + p.combien, 0);

// L'économie d'un jeu de réglages : ce qui entre, ce qui sort, ce qui reste.
function ligneDEconomie(nom: string, b: Bilan): string[] {
  const ventes = RARETES.reduce((s, r) => s + b.ventesParRarete[r].length, 0);
  const volume = RARETES.reduce((s, r) => s + b.ventesParRarete[r].reduce((t, p) => t + p, 0), 0);
  return [
    nom,
    nombre(b.encreCreee / TOTAL_DE_JOUEURS / JOURS),
    nombre(b.encreDetruite / TOTAL_DE_JOUEURS / JOURS),
    pourcent(b.encreDeLaCommission / Math.max(1, b.encreDetruite)),
    nombre(mediane(b.encreFinale)),
    nombre(ventes / JOURS),
    nombre(volume / Math.max(1, ventes)),
  ];
}

// Les prix obtenus et les invendus, rareté par rareté.
function lignesParRarete(b: Bilan, planchers: Record<Rarete, number>): string[][] {
  return RARETES.map((r) => {
    const prix = b.ventesParRarete[r];
    const proposes = b.misesEnVenteParRarete[r];
    return [
      r,
      nombre(valeurDeFerraille(r, 'Normale')),
      nombre(planchers[r]),
      nombre(proposes),
      nombre(prix.length),
      prix.length === 0 ? '—' : nombre(mediane(prix)),
      proposes === 0 ? '—' : pourcent(b.invendusParRarete[r] / proposes),
    ];
  });
}

// ── Les variantes ────────────────────────────────────────────────────────────
const DESIRS = [2, 5, 10];
const sansPlanchers = parRarete(() => 1);

const economie: string[][] = [];
for (const desir of DESIRS) {
  economie.push(ligneDEconomie(`Désir ×${desir} — réglages actuels`, simuler({ nom: '', desir, ...REGLAGES_ACTUELS }, 7 + desir)));
}
for (const commission of [0, 0.2]) {
  economie.push(ligneDEconomie(`Désir ×5 — commission ${pourcent(commission)}`, simuler({ nom: '', desir: 5, ...REGLAGES_ACTUELS, commission }, 55)));
}
economie.push(ligneDEconomie('Désir ×5 — sans plafond pour personne', simuler({ nom: '', desir: 5, ...REGLAGES_ACTUELS, plafonds: null }, 57)));

const parDesir = DESIRS.map((desir) => ({ desir, bilan: simuler({ nom: '', desir, ...REGLAGES_ACTUELS }, 100 + desir) }));
// Et si les planchers valaient simplement le double de l'Encre d'un doublon ?
const PLANCHERS_DOUBLES = parRarete(() => 0);
for (const r of RARETES) PLANCHERS_DOUBLES[r] = valeurDeFerraille(r, 'Normale') * 2;
const parDesirDoubles = DESIRS.map((desir) => ({ desir, bilan: simuler({ nom: '', desir, ...REGLAGES_ACTUELS, planchers: PLANCHERS_DOUBLES }, 400 + desir) }));
const sansPlancher = simuler({ nom: '', desir: 2, ...REGLAGES_ACTUELS, planchers: sansPlanchers }, 200);
const avecPlancherDesir2 = parDesir.find((p) => p.desir === 2)!.bilan;
const plafonds = simuler({ nom: '', desir: 5, ...REGLAGES_ACTUELS }, 300);
const sansPlafond = simuler({ nom: '', desir: 5, ...REGLAGES_ACTUELS, plafonds: null }, 301);

// Les couples de plafonds : ce qui compte est l'équilibre entre ce qu'on peut vendre et ce qu'on peut acheter.
const COUPLES: ({ ventes: number; achats: number } | null)[] = [
  { ventes: 3, achats: 3 }, { ventes: 10, achats: 3 }, { ventes: 3, achats: 10 }, { ventes: 10, achats: 10 }, { ventes: 20, achats: 20 }, null,
];
const parCouple = COUPLES.map((plafonds) => ({ plafonds, bilan: simuler({ nom: '', desir: 5, ...REGLAGES_ACTUELS, plafonds }, 500) }));

const invendusGlobal = (b: Bilan): number => {
  const proposes = RARETES.reduce((s, r) => s + b.misesEnVenteParRarete[r], 0);
  const invendus = RARETES.reduce((s, r) => s + b.invendusParRarete[r], 0);
  return proposes === 0 ? 0 : invendus / proposes;
};

const rapport = [
  '# Simulation de marché',
  '',
  `*Généré par \`npm run simulation:marche\`. ${TOTAL_DE_JOUEURS} joueurs fictifs (${PROFILS.map((p) => `${p.combien} ${p.nom.toLowerCase()}s`).join(', ')}) pendant ${JOURS} jours, avec les vraies cartes, les vraies règles des paquets et les vrais réglages du marché (\`src/config/equilibrage.ts\`). Chaque enchère dure une journée. Un joueur vend les timbres dont il possède un autre exemplaire dans une autre finition : sa collection reste entière.*`,
  '',
  '## Ce que ce simulateur prouve, et ce qu’il suppose',
  '',
  "Scénarios **gratuits uniquement** : l’ancienne rente payante de 300 Encre/jour et les plafonds supprimés pour les abonnés ont été retirés. Les nombres de paquets ouverts, de duels et le taux de victoire restent des hypothèses. Les règles de gain et de commission utilisent la configuration du jeu ; chaque scénario vérifie la conservation de l’Encre. Les retours d’enchères conservent leurs exemplaires, les doublons tirés dans les paquets sont convertis. Le « désir » représente une disposition à payer supposée : ces résultats ne remplacent pas des observations de joueurs.",
  '',
  "## 1. L'Encre du jeu : ce qui entre, ce qui sort",
  '',
  ...tableau(
    ['Réglages', 'Encre créée par joueur et par jour', 'Encre détruite', 'Part détruite par la commission', 'Encre gardée par le joueur du milieu', 'Ventes par jour', 'Prix moyen'],
    economie,
  ),
  '',
  '## 2. Les prix planchers, rareté par rareté',
  '',
  ...DESIRS.flatMap((desir) => {
    const b = parDesir.find((p) => p.desir === desir)!.bilan;
    return [
      `**Désir ×${desir}** — un timbre qui manque vaut ${desir} fois son Encre de doublon. Invendus : ${pourcent(invendusGlobal(b))} de ce qui est proposé.`,
      '',
      ...tableau(['Rareté', 'Encre si doublon', 'Plancher', 'Mis en vente', 'Vendus', 'Prix médian obtenu', 'Invendus'], lignesParRarete(b, M.planchers)),
    ];
  }),
  `**Sans aucun plancher, au désir ×2** : ${pourcent(invendusGlobal(sansPlancher))} d'invendus, contre ${pourcent(invendusGlobal(avecPlancherDesir2))} avec les planchers actuels. L'écart est ce que les planchers coûtent en ventes manquées ; ils empêchent en échange de brader un timbre rare.`,
  '',
  `**Les timbres Hors-série ne sont jamais proposés** dans cette simulation, et c’est normal : ils n’ont pas de finition (toujours « Normale »), donc un joueur n’en possède jamais deux exemplaires, et la règle de vente retenue ici ne vend que les timbres dont on garde un autre exemplaire. Leur plancher de ${M.planchers['Hors-série']} Encre n’est donc pas mis à l’épreuve ici.`,
  '',
  '### Et si le plancher valait simplement le double de l’Encre d’un doublon ?',
  '',
  `Planchers essayés : ${RARETES.map((r) => `${r.toLowerCase()} ${PLANCHERS_DOUBLES[r]}`).join(', ')}.`,
  '',
  ...tableau(
    ['Désir', 'Invendus avec les planchers actuels', 'Invendus avec des planchers doublés'],
    DESIRS.map((desir) => [
      `×${desir}`,
      pourcent(invendusGlobal(parDesir.find((p) => p.desir === desir)!.bilan)),
      pourcent(invendusGlobal(parDesirDoubles.find((p) => p.desir === desir)!.bilan)),
    ]),
  ),
  '## 3. Les plafonds des joueurs gratuits',
  '',
`Réglages actuels : **${M.ventesEnCoursAuPlus} ventes en cours** et **${M.achatsParJourAuPlus} achats par jour** pour un joueur gratuit. Au désir ×5 :`,
  '',
  ...tableau(['Plafond', 'Joueurs qui y butent', 'Fois par jour, tous joueurs confondus'], [
    [`${M.ventesEnCoursAuPlus} ventes en cours`, `${plafonds.joueursAuButoir} sur ${TOTAL_DE_JOUEURS}`, nombre(plafonds.butoirsDeVentes / JOURS)],
    [`${M.achatsParJourAuPlus} achats par jour`, `${plafonds.joueursAuButoirDAchats} sur ${TOTAL_DE_JOUEURS}`, nombre(plafonds.butoirsDAchats / JOURS)],
  ]),
  '',
  '### Quel couple de plafonds ?',
  '',
  "Ce qui compte n'est pas chaque plafond pris à part, mais l'équilibre entre ce qu'un joueur peut vendre et ce qu'il peut acheter. Si les vendeurs sont plus libres que les acheteurs, le marché se remplit d'invendus. Au désir ×5 :",
  '',
  ...tableau(
    ['Ventes en cours', 'Achats par jour', 'Ventes conclues par jour', 'Invendus', 'Encre gardée par le joueur du milieu'],
    parCouple.map(({ plafonds, bilan }) => [
      plafonds ? String(plafonds.ventes) : 'sans limite',
      plafonds ? String(plafonds.achats) : 'sans limite',
      nombre(RARETES.reduce((s, r) => s + bilan.ventesParRarete[r].length, 0) / JOURS),
      pourcent(invendusGlobal(bilan)),
      nombre(mediane(bilan.encreFinale)),
    ]),
  ),
  '',
  '## Ce que ces chiffres disent',
  '',
  "**1. L’Encre ne paie plus de paquets.** La commission des enchères est désormais la seule sortie d’Encre simulée. Il faut comparer les entrées et les sorties avant de fixer les bonus payants ou de vendre de l’Encre.",
  '',
  `**2. Le plancher des timbres communs bloque le marché si les joueurs ne sont pas très demandeurs.** Au désir ×2, ${nombre(avecPlancherDesir2.misesEnVenteParRarete['Commune'])} timbres communs sont proposés et ${nombre(avecPlancherDesir2.ventesParRarete['Commune'].length)} trouvent preneur : le plancher de ${M.planchers['Commune']} Encre est au-dessus de ce que vaut un timbre commun pour un joueur tiède. Des planchers au double de l'Encre d'un doublon ramènent les invendus de ${pourcent(invendusGlobal(avecPlancherDesir2))} à ${pourcent(invendusGlobal(parDesirDoubles.find((p) => p.desir === 2)!.bilan))}. À l'inverse, un plancher haut évite un marché noyé sous les timbres communs : c'est un choix, pas une erreur.`,
  '',
  `**3. Le plancher des Légendaires est le plus dur.** Même au désir ×5, ${pourcent(parDesir.find((p) => p.desir === 5)!.bilan.invendusParRarete['Légendaire'] / Math.max(1, parDesir.find((p) => p.desir === 5)!.bilan.misesEnVenteParRarete['Légendaire']))} des Légendaires proposées restent invendues à ${M.planchers['Légendaire']} Encre.`,
  '',
`**4. Des deux plafonds, c'est celui des achats qui pèse le plus.** ${plafonds.joueursAuButoir} joueurs sur ${TOTAL_DE_JOUEURS} butent sur les ${M.ventesEnCoursAuPlus} ventes en cours, ${plafonds.joueursAuButoirDAchats} sur ${TOTAL_DE_JOUEURS} sur les ${M.achatsParJourAuPlus} achats par jour. Sans aucun plafond, le marché voit ${nombre(RARETES.reduce((s, r) => s + sansPlafond.ventesParRarete[r].length, 0) / JOURS)} ventes par jour au lieu de ${nombre(RARETES.reduce((s, r) => s + plafonds.ventesParRarete[r].length, 0) / JOURS)}. Un joueur accumule des timbres en double finition bien plus vite qu'il ne peut en acheter : si les vendeurs sont plus libres que les acheteurs, les invendus montent.`,
  '',
  '## Comment lire ces chiffres',
  '',
  "- **Si l'Encre créée dépasse durablement l'Encre détruite**, elle s'accumule et les prix montent : c'est l'inflation. Les paquets ne détruisent plus d’Encre ; seule la commission le fait dans cette simulation. Les prix restent une hypothèse de comportement, pas une prévision.",
  "- **Un taux d'invendus élevé pour une rareté** veut dire que son plancher est au-dessus de ce que les joueurs peuvent payer.",
  '- **Beaucoup de joueurs au plafond** veut dire que la limite gêne le jeu ordinaire, et pas seulement les revendeurs.',
  '',
].join('\n');

writeFileSync(path.join(RACINE, 'data', 'simulation-marche.md'), rapport);
console.log(rapport);
