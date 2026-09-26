// Le calendrier du mot du jour (data/mot-du-jour.txt) : sa lecture, son écriture, et la pose des mots à date fixe.

// Quelques dates ont leur mot. Ils sont reposés à leur date chaque fois que l'on fixe le premier jour.
export const MOTS_A_DATE_FIXE: Record<string, string> = {
  '10-09': 'pignouf-nom',
  '10-31': 'fantasmagorie-nom',
  '11-20': 'conchier-verbe',
  '12-25': 'cadeau-nom',
  '02-14': 'amour-nom',
};

export type Calendrier = { debut: string | null; ids: string[] };

const PREMIER_JOUR = /^# Premier jour : (\d{4}-\d{2}-\d{2})/m;

export function lireCalendrier(texte: string): Calendrier {
  return {
    debut: PREMIER_JOUR.exec(texte)?.[1] ?? null,
    ids: texte.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')),
  };
}

export function ecrireCalendrier({ debut, ids }: Calendrier): string {
  return [
    '# Le mot du jour : un mot par ligne (son identifiant de carte), dans l\'ordre des jours.',
    debut
      ? `# Premier jour : ${debut}. Retirer une ligne décale les suivants d'un jour ; en ajouter une, c'est l'inverse.`
      : '# Premier jour : à fixer au lancement, avec « npm run motdujour:dater -- AAAA-MM-JJ ».',
    '# Les mots à date fixe (Halloween, Noël…) sont dans pipeline/etapes/motDuJour.ts.',
    ...ids,
    '',
  ].join('\n');
}

const jourDe = (debut: string, i: number): string => new Date(Date.parse(`${debut}T12:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10);

// Retire les mots à date fixe, puis les repose à leur date à partir du premier jour ; les autres gardent leur ordre.
// Un mot à date fixe dont la date ne tombe pas dans l'année du calendrier part à la fin.
export function dater(ids: string[], debut: string, dates: Record<string, string> = MOTS_A_DATE_FIXE): string[] {
  const fixes = new Set(Object.values(dates));
  const reste = ids.filter((id) => !fixes.has(id));
  const presents = Object.entries(dates).filter(([, id]) => ids.includes(id));
  const resultat: string[] = [];
  const places = new Set<string>();
  for (let i = 0; resultat.length < ids.length; i++) {
    const date = jourDe(debut, i).slice(5);
    const fixe = presents.find(([d, id]) => d === date && !places.has(id));
    if (fixe) { resultat.push(fixe[1]); places.add(fixe[1]); continue; }
    const suivant = reste.shift();
    if (suivant) { resultat.push(suivant); continue; }
    for (const [, id] of presents) if (!places.has(id)) { resultat.push(id); places.add(id); }
  }
  return resultat;
}
