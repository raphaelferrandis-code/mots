// Télécharge les fichiers de données bruts dans data/brut/ et note d'où ils viennent
// (adresse, date, taille, empreinte) dans data/brut/sources.json, pour que la
// génération des cartes soit reproductible.
//
// Usage : npm run sources
// Un fichier déjà téléchargé en entier n'est pas retéléchargé.

import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { inflateRawSync } from 'node:zlib';
import path from 'node:path';

type Source = {
  id: string;
  description: string;
  url: string;
  fichier: string;
};

type EntreeManifeste = Source & {
  octets: number;
  sha256: string;
  derniereModificationServeur: string | null;
  telechargeLe: string;
};

const SOURCES: Source[] = [
  {
    id: 'lexique',
    description: 'Lexique 4.00 — fréquences et propriétés des mots français (lexique.org)',
    url: 'http://www.lexique.org/databases/Lexique400/Lexique400.zip',
    fichier: 'Lexique400.zip',
  },
  {
    id: 'wiktionnaire',
    description: "Extraction wiktextract de l'édition française du Wiktionnaire, toutes langues (kaikki.org)",
    url: 'https://kaikki.org/frwiktionary/raw-wiktextract-data.jsonl.gz',
    fichier: 'raw-wiktextract-data.jsonl.gz',
  },
];

const DOSSIER = path.join(import.meta.dirname, '..', 'data', 'brut');
const MANIFESTE = path.join(DOSSIER, 'sources.json');

function lireManifeste(): Record<string, EntreeManifeste> {
  if (!existsSync(MANIFESTE)) return {};
  return JSON.parse(readFileSync(MANIFESTE, 'utf8'));
}

function enMo(octets: number): string {
  return `${(octets / 1024 / 1024).toFixed(0)} Mo`;
}

async function empreinte(fichier: string): Promise<string> {
  const hachage = createHash('sha256');
  await pipeline(createReadStream(fichier), hachage);
  return hachage.digest('hex');
}

async function telecharger(source: Source): Promise<EntreeManifeste> {
  const cible = path.join(DOSSIER, source.fichier);
  const partiel = `${cible}.partiel`;

  const reponse = await fetch(source.url);
  if (!reponse.ok || !reponse.body) {
    throw new Error(`Téléchargement impossible (${reponse.status}) : ${source.url}`);
  }
  const total = Number(reponse.headers.get('content-length') ?? 0);

  let recus = 0;
  let prochainPalier = 10;
  const compteur = new Transform({
    transform(bloc, _encodage, suite) {
      recus += bloc.length;
      if (total > 0 && (recus / total) * 100 >= prochainPalier) {
        console.log(`  ${source.fichier} : ${prochainPalier} % (${enMo(recus)} sur ${enMo(total)})`);
        prochainPalier += 10;
      }
      suite(null, bloc);
    },
  });

  await pipeline(Readable.fromWeb(reponse.body as never), compteur, createWriteStream(partiel));

  if (total > 0 && recus !== total) {
    throw new Error(`Téléchargement incomplet pour ${source.fichier} : ${recus} octets reçus sur ${total}`);
  }
  renameSync(partiel, cible);

  return {
    ...source,
    octets: recus,
    sha256: await empreinte(cible),
    derniereModificationServeur: reponse.headers.get('last-modified'),
    telechargeLe: new Date().toISOString(),
  };
}

// Sort un fichier d'une archive zip (Node ne sait pas le faire tout seul, et l'archive de
// Lexique est assez simple pour éviter d'ajouter une dépendance).
function extraireDuZip(cheminZip: string, nomInterne: string, cible: string): void {
  const zip = readFileSync(cheminZip);

  let fin = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 22 - 65535); i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) { fin = i; break; }
  }
  if (fin < 0) throw new Error(`Archive zip illisible : ${cheminZip}`);

  const nombreFichiers = zip.readUInt16LE(fin + 10);
  let position = zip.readUInt32LE(fin + 16);
  for (let n = 0; n < nombreFichiers; n++) {
    if (zip.readUInt32LE(position) !== 0x02014b50) throw new Error(`Sommaire du zip inattendu : ${cheminZip}`);
    const methode = zip.readUInt16LE(position + 10);
    const tailleCompressee = zip.readUInt32LE(position + 20);
    const longueurNom = zip.readUInt16LE(position + 28);
    const longueurExtra = zip.readUInt16LE(position + 30);
    const longueurCommentaire = zip.readUInt16LE(position + 32);
    const debutEntete = zip.readUInt32LE(position + 42);
    const nom = zip.toString('utf8', position + 46, position + 46 + longueurNom);

    if (nom === nomInterne) {
      const debut = debutEntete + 30 + zip.readUInt16LE(debutEntete + 26) + zip.readUInt16LE(debutEntete + 28);
      const donnees = zip.subarray(debut, debut + tailleCompressee);
      if (methode !== 0 && methode !== 8) throw new Error(`Compression ${methode} non gérée pour ${nomInterne}`);
      mkdirSync(path.dirname(cible), { recursive: true });
      writeFileSync(cible, methode === 0 ? donnees : inflateRawSync(donnees));
      return;
    }
    position += 46 + longueurNom + longueurExtra + longueurCommentaire;
  }
  throw new Error(`${nomInterne} introuvable dans ${cheminZip}`);
}

mkdirSync(DOSSIER, { recursive: true });
const manifeste = lireManifeste();

for (const source of SOURCES) {
  const cible = path.join(DOSSIER, source.fichier);
  const connu = manifeste[source.id];
  if (connu && connu.url === source.url && existsSync(cible) && statSync(cible).size === connu.octets) {
    console.log(`✔ ${source.fichier} déjà présent (${enMo(connu.octets)})`);
    continue;
  }
  console.log(`↓ ${source.fichier} — ${source.description}`);
  manifeste[source.id] = await telecharger(source);
  writeFileSync(MANIFESTE, `${JSON.stringify(manifeste, null, 2)}\n`);
  console.log(`✔ ${source.fichier} téléchargé (${enMo(manifeste[source.id].octets)})`);
}

for (const fichier of ['Lexique4.tsv', 'README-Lexique.txt']) {
  const cible = path.join(DOSSIER, 'Lexique4', fichier);
  if (existsSync(cible)) continue;
  extraireDuZip(path.join(DOSSIER, 'Lexique400.zip'), `Lexique4/${fichier}`, cible);
  console.log(`✔ ${fichier} extrait de Lexique400.zip`);
}

console.log(`Terminé. Détails dans ${path.relative(process.cwd(), MANIFESTE)}`);
