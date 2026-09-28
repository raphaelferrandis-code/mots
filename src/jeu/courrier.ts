// Le courrier du joueur (étape 5 des finitions, chantier 7 ; audit du 26/09/2026, S06 et M06) : ce qui l'attend hors de
// la page concernée, et ce qui s'est passé depuis sa dernière lecture.
//
// · « À traiter », tant que c'est en suspens : une demande d'ami, un échange proposé, une invitation d'équipe, une
//   enchère dépassée (on peut encore surenchérir), un duel laissé en cours.
// · Les nouvelles, une seule fois : une demande acceptée, un échange conclu ou refusé, une enchère remportée, une vente
//   conclue ou revenue sans preneur.
//
// Pas de nouvelle fonction au serveur : ses lectures (mes_amis, mes_encheres, mon_equipe) suffisent. Ce qui est nouveau
// se décide par comparaison avec le « relevé », l'état de chaque chose la dernière fois que le joueur a lu son courrier
// (gardé sur l'appareil, services/courrier.ts). La première fois, le relevé part de l'état présent : seul ce qui attend
// une réponse s'annonce, pas les nouvelles d'avant.

export type Genre = 'ami' | 'echange' | 'equipe' | 'enchere' | 'vente' | 'duel';
export type Lettre = { cle: string; aTraiter: boolean; nouvelle: boolean } & (
  | { genre: 'ami'; cas: 'demande' | 'acceptee'; pseudo: string }
  | { genre: 'echange'; cas: 'propose' | 'accepte' | 'refuse'; pseudo: string; offerte: string; demandee: string }
  | { genre: 'equipe'; cas: 'invitation'; capitaine: string; nom: string }
  | { genre: 'enchere'; cas: 'depassee' | 'remportee'; carte: string }
  | { genre: 'vente'; cas: 'vendue' | 'invendue'; carte: string; prix: number | null }
  | { genre: 'duel'; cas: 'en-cours' });

// Ce que le serveur dit (formes des lectures existantes : services/amis.ts, equipes.ts, marche.ts), et le duel laissé en
// cours, retenu par l'appareil (le lire demanderait un appel au serveur des combats).
type EnchereLue = { id: number; carte: string; etat: string; enTete: boolean; remportee: boolean; prixFinal: number | null };
export type SourcesDuCourrier = {
  amis: { relations: { id: string; pseudo: string; etat: string }[];
    echanges: { id: string; envoye: boolean; pseudo: string; offerte: string; demandee: string; etat: string }[] } | null;
  equipe: { invitations: { id: string; nom: string; capitaine: string }[] } | null;
  encheres: { ventes: EnchereLue[]; mises: EnchereLue[] } | null;
  duel: { id: string } | null;
};
// L'état de chaque chose, par clé (« ami:… », « echange:… », « equipe:… », « mise:… », « vente:… », « duel:… »).
export type Releve = Record<string, string>;

const PREFIXES: Record<Genre, string> = { ami: 'ami:', echange: 'echange:', equipe: 'equipe:', enchere: 'mise:', vente: 'vente:', duel: 'duel:' };
const ORDRE: Genre[] = ['duel', 'echange', 'ami', 'equipe', 'enchere', 'vente'];
const statutDUneMise = (m: EnchereLue): string => (m.etat === 'ouverte' ? (m.enTete ? 'entete' : 'depassee') : m.remportee ? 'remportee' : 'perdue');

// L'état présent de tout ce que les lectures ont rendu. Une lecture manquée (null) ne dit rien de son genre.
export function etatsPresents(s: SourcesDuCourrier): Releve {
  const etats: Releve = {};
  for (const r of s.amis?.relations ?? []) etats[`ami:${r.id}`] = r.etat;
  for (const e of s.amis?.echanges ?? []) etats[`echange:${e.id}`] = e.etat;
  for (const i of s.equipe?.invitations ?? []) etats[`equipe:${i.id}`] = 'invitation';
  for (const m of s.encheres?.mises ?? []) etats[`mise:${m.id}`] = statutDUneMise(m);
  for (const v of s.encheres?.ventes ?? []) etats[`vente:${v.id}`] = v.etat;
  if (s.duel) etats[`duel:${s.duel.id}`] = 'en-cours';
  return etats;
}

// Le premier relevé : l'état présent, sans ce qui attend une réponse (cela s'annonce donc comme nouveau).
export function premierReleve(s: SourcesDuCourrier): Releve {
  const attente = new Set(composerLeCourrier(s, {}).filter((l) => l.aTraiter).map((l) => l.cle));
  return Object.fromEntries(Object.entries(etatsPresents(s)).filter(([cle]) => !attente.has(cle)));
}

// Chaque lecture (amis et échanges, équipe, enchères) a son premier relevé, la première fois qu'elle arrive : une vieille
// vente ne s'annonce pas parce que le courrier a d'abord été lu sur la page Amis. (Une marque « # » s'en souvient.)
const LECTURES = [
  { marque: '#amis', prefixes: ['ami:', 'echange:'], lue: (s: SourcesDuCourrier) => s.amis !== null },
  { marque: '#equipe', prefixes: ['equipe:'], lue: (s: SourcesDuCourrier) => s.equipe !== null },
  { marque: '#encheres', prefixes: ['mise:', 'vente:'], lue: (s: SourcesDuCourrier) => s.encheres !== null },
];
export function completerLeReleve(s: SourcesDuCourrier, releve: Releve): Releve {
  const nouvelles = LECTURES.filter((l) => l.lue(s) && !(l.marque in releve));
  if (nouvelles.length === 0) return releve;
  const depart = Object.entries(premierReleve(s));
  const complete: Releve = { ...releve };
  for (const l of nouvelles) {
    for (const [cle, etat] of depart) if (l.prefixes.some((p) => cle.startsWith(p))) complete[cle] = etat;
    complete[l.marque] = 'lu';
  }
  return complete;
}

export function composerLeCourrier(s: SourcesDuCourrier, releve: Releve): Lettre[] {
  const lettres: Lettre[] = [];
  for (const r of s.amis?.relations ?? []) {
    const cle = `ami:${r.id}`;
    if (r.etat === 'recue') lettres.push({ cle, genre: 'ami', cas: 'demande', pseudo: r.pseudo, aTraiter: true, nouvelle: releve[cle] !== 'recue' });
    // (Une amitié déjà conclue sans avoir été vue en attente : on ne sait plus qui l'avait demandée, rien ne s'annonce.)
    else if (r.etat === 'ami' && releve[cle] === 'envoyee') lettres.push({ cle, genre: 'ami', cas: 'acceptee', pseudo: r.pseudo, aTraiter: false, nouvelle: true });
  }
  for (const e of s.amis?.echanges ?? []) {
    const cle = `echange:${e.id}`;
    const base = { cle, genre: 'echange' as const, pseudo: e.pseudo, offerte: e.offerte, demandee: e.demandee };
    if (!e.envoye && e.etat === 'attente') lettres.push({ ...base, cas: 'propose', aTraiter: true, nouvelle: releve[cle] !== 'attente' });
    else if (e.envoye && (e.etat === 'accepte' || e.etat === 'refuse') && releve[cle] !== e.etat) lettres.push({ ...base, cas: e.etat, aTraiter: false, nouvelle: true });
  }
  for (const i of s.equipe?.invitations ?? []) {
    const cle = `equipe:${i.id}`;
    lettres.push({ cle, genre: 'equipe', cas: 'invitation', capitaine: i.capitaine, nom: i.nom, aTraiter: true, nouvelle: releve[cle] === undefined });
  }
  for (const m of s.encheres?.mises ?? []) {
    const cle = `mise:${m.id}`;
    const statut = statutDUneMise(m);
    if (statut === 'depassee') lettres.push({ cle, genre: 'enchere', cas: 'depassee', carte: m.carte, aTraiter: true, nouvelle: releve[cle] !== 'depassee' });
    else if (statut === 'remportee' && releve[cle] !== 'remportee') lettres.push({ cle, genre: 'enchere', cas: 'remportee', carte: m.carte, aTraiter: false, nouvelle: true });
  }
  for (const v of s.encheres?.ventes ?? []) {
    const cle = `vente:${v.id}`;
    if ((v.etat === 'vendue' || v.etat === 'invendue') && releve[cle] !== v.etat) {
      lettres.push({ cle, genre: 'vente', cas: v.etat, carte: v.carte, prix: v.prixFinal, aTraiter: false, nouvelle: true });
    }
  }
  if (s.duel) {
    const cle = `duel:${s.duel.id}`;
    lettres.push({ cle, genre: 'duel', cas: 'en-cours', aTraiter: true, nouvelle: releve[cle] === undefined });
  }
  // Les nouvelles d'abord, puis ce qui attend encore ; à égalité, dans l'ordre des genres.
  return lettres.sort((a, b) => Number(b.nouvelle) - Number(a.nouvelle) || ORDRE.indexOf(a.genre) - ORDRE.indexOf(b.genre));
}

// Le relevé une fois le courrier lu, pour ces genres : leur état présent remplace l'ancien (et ce qui a disparu s'efface) ;
// les autres genres ne bougent pas. Une lecture manquée ne remet pas à zéro ce qu'elle aurait couvert.
export function releveApresLecture(s: SourcesDuCourrier, releve: Releve, genres: readonly Genre[]): Releve {
  const lus = genres.filter((g) => (g === 'ami' || g === 'echange' ? s.amis : g === 'equipe' ? s.equipe : g === 'duel' ? true : s.encheres) !== null);
  const prefixes = lus.map((g) => PREFIXES[g]);
  const garde = Object.entries(releve).filter(([cle]) => !prefixes.some((p) => cle.startsWith(p)));
  const presents = Object.entries(etatsPresents(s)).filter(([cle]) => prefixes.some((p) => cle.startsWith(p)));
  return Object.fromEntries([...garde, ...presents]);
}

// Les nouvelles, par endroit du jeu : l'espace du joueur (amis, échanges, équipe), le marché, le duel.
export function nouvellesParEndroit(lettres: readonly Lettre[]): { joueur: number; marche: number; duel: number } {
  const compte = (genres: Genre[]) => lettres.filter((l) => l.nouvelle && genres.includes(l.genre)).length;
  return { joueur: compte(['ami', 'echange', 'equipe']), marche: compte(['enchere', 'vente']), duel: compte(['duel']) };
}

// La phrase d'une lettre, en morceaux (un mot de l'édition s'écrit en italique), avec son action et sa destination.
export type Morceau = string | { mot: string };
export type Destination = { ecran: 'amis' | 'echanges' | 'equipe' | 'marche' | 'duel' } | { ecran: 'carte'; carte: string };
export function phraseDeLaLettre(l: Lettre, motDe: (carte: string) => string): { morceaux: Morceau[]; action: string; destination: Destination } {
  switch (l.genre) {
    case 'ami': return l.cas === 'demande'
      ? { morceaux: [`${l.pseudo} souhaite t’ajouter à ses amis`], action: 'Répondre', destination: { ecran: 'amis' } }
      : { morceaux: [`${l.pseudo} a accepté ta demande d’ami`], action: 'Voir', destination: { ecran: 'amis' } };
    case 'echange':
      if (l.cas === 'propose') return { morceaux: [`${l.pseudo} te propose son `, { mot: motDe(l.offerte) }, ' contre ton ', { mot: motDe(l.demandee) }], action: 'Répondre', destination: { ecran: 'echanges' } };
      if (l.cas === 'accepte') return { morceaux: [`${l.pseudo} a accepté ton échange : `, { mot: motDe(l.demandee) }, ' est dans ton album'], action: 'Voir', destination: { ecran: 'carte', carte: l.demandee } };
      return { morceaux: [`${l.pseudo} a refusé ton échange`], action: 'Voir', destination: { ecran: 'echanges' } };
    case 'equipe': return { morceaux: [`${l.capitaine} t’invite dans l’équipe « ${l.nom} »`], action: 'Répondre', destination: { ecran: 'equipe' } };
    case 'enchere': return l.cas === 'depassee'
      ? { morceaux: ['Ton enchère sur ', { mot: motDe(l.carte) }, ' a été dépassée'], action: 'Surenchérir', destination: { ecran: 'marche' } }
      : { morceaux: ['Tu as remporté ', { mot: motDe(l.carte) }], action: 'Voir', destination: { ecran: 'carte', carte: l.carte } };
    case 'vente': return l.cas === 'vendue'
      ? { morceaux: ['Ton ', { mot: motDe(l.carte) }, l.prix === null ? ' a trouvé preneur' : ` s’est vendu ${l.prix.toLocaleString('fr-FR')} Encre`], action: 'Voir', destination: { ecran: 'marche' } }
      : { morceaux: [{ mot: motDe(l.carte) }, ' n’a pas trouvé preneur : il est revenu dans ton album'], action: 'Voir', destination: { ecran: 'carte', carte: l.carte } };
    case 'duel': return { morceaux: ['Un duel t’attend'], action: 'Reprendre', destination: { ecran: 'duel' } };
  }
}
