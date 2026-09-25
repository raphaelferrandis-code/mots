// Le tirage des paquets tel que le vivent les joueurs : la version SQL du serveur (serveur/collections.ts), éprouvée
// sur une vraie base PostgreSQL (PGlite) avec toute l'édition. Les tests de src/jeu/ ne couvrent que la copie du
// navigateur (src/jeu/paquets.ts) : ceux-ci vérifient que le serveur applique les mêmes réglages (EQUILIBRAGE) —
// paquets de départ, garantie de Légendaire, Encre des doublons, finitions, raretés par emplacement, Hors-série et
// plafond quotidien d'Encre. Le hasard est fixé (setseed) : les résultats sont les mêmes à chaque passage.

import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { baseDeTest } from './test-base.ts';
import { cartes } from './collections.ts';
import { EQUILIBRAGE } from '../src/config/equilibrage.ts';
import type { Finition, IndexEdition, Rarete } from '../src/partage/types.ts';

const P = EQUILIBRAGE.paquets;
const F = EQUILIBRAGE.finitions;
const D = EQUILIBRAGE.duel;
const edition = JSON.parse(readFileSync(new URL('../public/data/edition-1.index.json', import.meta.url), 'utf8')) as IndexEdition;
const rareteDe = new Map(edition.cartes.map((c) => [c.id, c.rarete]));
const registreDe = new Map(edition.cartes.map((c) => [c.id, c.registre]));
type Tiree = { id: string; finition: Finition; nouvelle: boolean; nouvelleFinition: boolean; encre: number };
type Ouverture = { cartes: Tiree[]; etat: { encre: number; paquets: { sansLegendaire: number; ouverts: number } } };

async function laboratoire() {
  const b = await baseDeTest();
  await b.db.exec(cartes(edition));
  await b.db.exec("delete from public.cartes where id = 'mot-nom'"); // la carte d'essai de baseDeTest n'est pas de l'édition
  const uid = b.ids[0];
  // Un paquet ouvert comme le fait le jeu : la fonction appelée par le navigateur (réserve, verrou, tirage, compte).
  const ouvrir = async (masques: string[] = []): Promise<Ouverture> => {
    await b.joueur(0);
    const r = (await b.db.query<{ r: Ouverture }>('select public.ouvrir_un_paquet($1) r', [masques])).rows[0].r;
    await b.admin();
    return r;
  };
  const compte = async () => (await b.db.query<{ encre: number; sans_legendaire: number; ouverts: number }>(
    'select encre, sans_legendaire, ouverts from public.comptes where utilisateur=$1', [uid])).rows[0];
  const regler = (colonnes: string, valeurs: unknown[] = []) => b.db.query(`update public.comptes set ${colonnes} where utilisateur=$1`, [uid, ...valeurs]);
  // Toute l'édition dans la collection, sauf « sauf ».
  const posseder = (finitions: Partial<Record<Finition, number>>, sauf: string[] = []) => b.db.query(
    `insert into public.possessions(utilisateur,carte,finitions) select $1, id, $2 from public.cartes where id <> all($3)
     on conflict (utilisateur,carte) do update set finitions = excluded.finitions, doublons = 0`, [uid, JSON.stringify(finitions), sauf]);
  await b.admin();
  await regler('stock=100000, reference=now()');
  await b.db.exec('select setseed(0.42)');
  return { ...b, uid, ouvrir, compte, regler, posseder };
}

it('tirage (serveur) : les paquets de départ ne donnent que des cartes nouvelles, même quand la collection est presque complète', async () => {
  const l = await laboratoire();
  try {
    // Trente cartes manquent à la collection, de toutes les raretés ordinaires ; tout le reste est déjà là.
    const manquantes = ([['Commune', 10], ['Peu commune', 8], ['Rare', 6], ['Épique', 4], ['Légendaire', 2]] as [Rarete, number][])
      .flatMap(([rarete, n]) => edition.cartes.filter((c) => c.rarete === rarete).slice(0, n).map((c) => c.id));
    await l.posseder({ Normale: 1 }, manquantes);
    const vues = new Set<string>();
    for (let i = 0; i < P.paquetsDeDepart; i++) {
      const r = await l.ouvrir();
      assert.equal(r.cartes.length, P.emplacements.length);
      for (const c of r.cartes) {
        assert.ok(c.nouvelle && manquantes.includes(c.id), `paquet de départ ${i + 1} : ${c.id} est nouvelle`);
        assert.ok(!vues.has(c.id)); vues.add(c.id);
      }
    }
    assert.equal((await l.compte()).ouverts, P.paquetsDeDepart);
    // Le paquet suivant est ordinaire : les doublons reviennent, et rapportent de l'Encre.
    const suivant = await l.ouvrir();
    assert.ok(suivant.cartes.some((c) => !c.nouvelle && c.encre > 0));
  } finally { await l.db.close(); }
});

it(`tirage (serveur) : au ${P.paquetsAvantLegendaireGarantie}e paquet sans Légendaire, la dernière carte en est une ; le compteur suit chaque paquet`, async () => {
  const l = await laboratoire();
  try {
    await l.regler('ouverts=$2', [P.paquetsDeDepart]);
    // La garantie tombe à chaque fois, filtres de contenu compris.
    for (let i = 0; i < 20; i++) {
      await l.regler('sans_legendaire=$2', [P.paquetsAvantLegendaireGarantie - 1]);
      const r = await l.ouvrir(i % 2 ? ['Familier', 'Injurieux'] : []);
      assert.equal(rareteDe.get(r.cartes.at(-1)!.id), 'Légendaire', `garantie n° ${i + 1}`);
      if (i % 2) assert.ok(r.cartes.every((c) => !registreDe.get(c.id)!.some((reg) => reg === 'Familier' || reg === 'Injurieux')));
      assert.equal(r.etat.paquets.sansLegendaire, 0);
    }
    // Le compteur : un de plus par paquet sans Légendaire, zéro après une Légendaire, jamais au-delà de la garantie.
    await l.regler('sans_legendaire=0');
    let attendu = 0;
    let garanties = 0;
    for (let i = 0; i < 250; i++) {
      const r = await l.ouvrir();
      const legendaire = r.cartes.some((c) => rareteDe.get(c.id) === 'Légendaire');
      if (attendu + 1 >= P.paquetsAvantLegendaireGarantie) { assert.ok(legendaire, 'la garantie'); garanties++; }
      attendu = legendaire ? 0 : attendu + 1;
      assert.equal(r.etat.paquets.sansLegendaire, attendu, `paquet ${i + 1}`);
    }
    assert.ok(garanties >= 1, 'la garantie est tombée naturellement au moins une fois');
  } finally { await l.db.close(); }
});

it('tirage (serveur) : un vrai doublon rapporte l’Encre de sa rareté et de sa finition ; une nouvelle finition, rien', async () => {
  const l = await laboratoire();
  try {
    await l.regler('ouverts=$2', [P.paquetsDeDepart]);
    // Toute l'édition, dans les trois finitions : chaque carte tirée est un vrai doublon.
    await l.posseder({ Normale: 1, Brillante: 1, Holographique: 1 });
    const avant = (await l.compte()).encre;
    let total = 0;
    const vues = new Set<string>();
    for (let i = 0; i < 80; i++) {
      for (const c of (await l.ouvrir()).cartes) {
        const rarete = rareteDe.get(c.id)!;
        const attendu = EQUILIBRAGE.encreParDoublon[rarete] * F.encre[c.finition];
        assert.deepEqual([c.nouvelle, c.nouvelleFinition, c.encre], [false, false, attendu], `${rarete} ${c.finition}`);
        total += attendu;
        vues.add(`${rarete}/${c.finition}`);
      }
    }
    assert.equal((await l.compte()).encre, avant + total);
    assert.equal((await l.db.query<{ n: number }>('select sum(doublons)::int n from public.possessions where utilisateur=$1', [l.uid])).rows[0].n, 80 * P.emplacements.length);
    assert.ok(vues.has('Rare/Brillante') && vues.has('Commune/Holographique'), `plusieurs finitions éprouvées : ${[...vues].join(', ')}`);
    // Toute l'édition en Normale seulement : une Brillante ou une Holographique est une nouvelle finition, sans Encre.
    await l.posseder({ Normale: 1 });
    let nouvelles = 0;
    for (let i = 0; i < 40; i++) {
      for (const c of (await l.ouvrir()).cartes) {
        if (c.finition === 'Normale') continue;
        assert.deepEqual([c.nouvelle, c.nouvelleFinition, c.encre], [false, true, 0]);
        const finitions = (await l.db.query<{ f: Record<string, number> }>('select finitions f from public.possessions where utilisateur=$1 and carte=$2', [l.uid, c.id])).rows[0].f;
        assert.equal(finitions[c.finition], 1);
        nouvelles++;
      }
    }
    assert.ok(nouvelles > 0);
  } finally { await l.db.close(); }
});

it('tirage (serveur) : sur 3 000 paquets, raretés par emplacement, finitions et Hors-série conformes aux réglages', async () => {
  const l = await laboratoire();
  const paquets = 3000;
  try {
    await l.regler('ouverts=$2', [P.paquetsDeDepart]);
    // La garantie est remise à zéro avant chaque paquet : on mesure les chances de chaque emplacement, sans elle.
    await l.db.exec('create temp table tirages(paquet int, place int, carte text, finition text)');
    await l.db.exec(`do $$ declare i int; t jsonb; begin
      for i in 1..${paquets} loop
        update public.comptes set sans_legendaire = 0 where utilisateur = '${l.uid}';
        t := public.tirer_les_cartes('${l.uid}', '{}', 'normal');
        insert into tirages select i, o, x->>'id', x->>'finition' from jsonb_array_elements(t) with ordinality as a(x, o);
      end loop; end $$;`);
    const lignes = (await l.db.query<{ place: number; rarete: Rarete; n: number }>(
      'select t.place, k.rarete, count(*)::int n from tirages t join public.cartes k on k.id = t.carte group by 1, 2')).rows;
    const nombre = (place: number, rarete: Rarete) => lignes.find((x) => x.place === place && x.rarete === rarete)?.n ?? 0;
    // Un écart plus grand que 4,5 fois l'écart type n'arrive pas par hasard (moins d'une chance sur 100 000).
    const proche = (observe: number, p: number, n: number) => Math.abs(observe - p) <= 4.5 * Math.sqrt(p * (1 - p) / n) + 0.002;
    P.emplacements.forEach((chances, i) => {
      const place = i + 1;
      const somme = Object.values(chances).reduce((s, v) => s + (v ?? 0), 0);
      for (const rarete of Object.keys(rareteDesChances(chances)) as Rarete[]) {
        const p = (chances[rarete] ?? 0) / somme;
        assert.ok(proche(nombre(place, rarete) / paquets, p, paquets), `emplacement ${place}, ${rarete} : ${nombre(place, rarete)} sur ${paquets} (attendu ${(p * 100).toFixed(1)} %)`);
      }
      const ailleurs = lignes.filter((x) => x.place === place && !(x.rarete in chances) && x.rarete !== 'Hors-série');
      assert.deepEqual(ailleurs, [], `emplacement ${place} : aucune autre rareté`);
    });
    // Hors-série : seulement à la dernière place, rarissime (réglage : 1 paquet sur ${1 / P.chanceHorsSerie}). Sur ${paquets} paquets,
    // on en attend ${paquets * P.chanceHorsSerie} ; au-delà de 12, le réglage ne serait pas respecté.
    const horsSerie = lignes.filter((x) => x.rarete === 'Hors-série');
    assert.ok(horsSerie.every((x) => x.place === P.emplacements.length));
    assert.ok(horsSerie.reduce((s, x) => s + x.n, 0) <= 12, `Hors-série : ${horsSerie.reduce((s, x) => s + x.n, 0)}`);
    // Les finitions (les Hors-série n'en ont pas).
    const finitions = (await l.db.query<{ finition: Finition; n: number }>(
      "select t.finition, count(*)::int n from tirages t join public.cartes k on k.id = t.carte where k.rarete <> 'Hors-série' group by 1")).rows;
    const cartesTirees = finitions.reduce((s, x) => s + x.n, 0);
    for (const finition of ['Brillante', 'Holographique'] as const) {
      const n = finitions.find((x) => x.finition === finition)?.n ?? 0;
      assert.ok(proche(n / cartesTirees, F.chances[finition]!, cartesTirees), `${finition} : ${n} sur ${cartesTirees}`);
    }
    // Jamais deux fois la même carte dans un paquet.
    assert.equal((await l.db.query<{ n: number }>('select count(*)::int n from (select paquet from tirages group by paquet having count(distinct carte) < count(*)) x')).rows[0].n, 0);
  } finally { await l.db.close(); }
});

it('tirage (serveur) : trois victoires pleines par jour (UTC), puis le quart ; une défaite rapporte peu', async () => {
  const l = await laboratoire();
  try {
    const recompenser = async (resultat: string, pleine = 30) =>
      (await l.db.query<{ r: { encre: number; reduite: boolean } }>('select public.recompenser($1,$2,$3) r', [l.uid, pleine, resultat])).rows[0].r;
    const avant = (await l.compte()).encre;
    for (let i = 0; i < D.victoiresPleinesParJour; i++) assert.deepEqual(await recompenser('victoire'), { encre: 30, reduite: false });
    const reduite = Math.max(1, Math.round(30 * D.partDeLEncreEnsuite));
    assert.deepEqual(await recompenser('victoire'), { encre: reduite, reduite: true });
    assert.deepEqual(await recompenser('victoire', 45), { encre: Math.max(1, Math.round(45 * D.partDeLEncreEnsuite)), reduite: true });
    assert.deepEqual(await recompenser('defaite'), { encre: D.encreParDefaite, reduite: false });
    assert.deepEqual(await recompenser('nul'), { encre: D.encreParDefaite, reduite: false });
    assert.equal((await l.compte()).encre, avant + 30 * D.victoiresPleinesParJour + reduite + Math.max(1, Math.round(45 * D.partDeLEncreEnsuite)) + 2 * D.encreParDefaite);
    // Le lendemain (jour UTC), les victoires pleines reviennent.
    await l.regler("jour = (now() at time zone 'utc')::date - 1");
    assert.deepEqual(await recompenser('victoire'), { encre: 30, reduite: false });
    // Aucune offre ne multiplie l'Encre gagnée (réglage de la version payante).
    await l.regler("abonnement = 'collectionneur', abonnement_jusqu_au = now() + interval '30 days'");
    assert.deepEqual(await recompenser('victoire'), { encre: 30 * EQUILIBRAGE.payant.multiplicateurDEncre, reduite: false });
  } finally { await l.db.close(); }
});

// Les raretés d'un emplacement, telles que les réglages les donnent (sans les chances nulles).
function rareteDesChances(chances: Partial<Record<Rarete, number>>): Partial<Record<Rarete, number>> {
  return Object.fromEntries(Object.entries(chances).filter(([, v]) => (v ?? 0) > 0));
}
