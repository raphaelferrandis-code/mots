// Décompresse la police WOFF livrée par Fontsource pour l’export vectoriel Windows.
// Aucune police système ni téléchargement ne sont nécessaires.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const source = fs.readFileSync(path.resolve(__dirname, '../node_modules/@fontsource/playfair-display/files/playfair-display-latin-400-italic.woff'));
if (source.toString('ascii', 0, 4) !== 'wOFF') throw new Error('Police WOFF attendue');
const count = source.readUInt16BE(12);
const target = Buffer.alloc(source.readUInt32BE(16));
source.copy(target, 0, 4, 8);
target.writeUInt16BE(count, 4);
const power = Math.floor(Math.log2(count));
target.writeUInt16BE(16 * 2 ** power, 6);
target.writeUInt16BE(power, 8);
target.writeUInt16BE(count * 16 - 16 * 2 ** power, 10);
let cursor = 12 + count * 16;
for (let i = 0; i < count; i++) {
  const start = 44 + i * 20;
  const offset = source.readUInt32BE(start + 4);
  const length = source.readUInt32BE(start + 8);
  const original = source.readUInt32BE(start + 12);
  const compressed = source.subarray(offset, offset + length);
  const table = length < original ? zlib.inflateSync(compressed) : compressed;
  if (table.length !== original) throw new Error('Table de police invalide');
  const entry = 12 + i * 16;
  source.copy(target, entry, start, start + 4);
  target.writeUInt32BE(source.readUInt32BE(start + 16), entry + 4);
  target.writeUInt32BE(cursor, entry + 8);
  target.writeUInt32BE(original, entry + 12);
  table.copy(target, cursor);
  cursor += (original + 3) & ~3;
}
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'philamots-police-'));
const filename = path.join(directory, 'PlayfairDisplay-Italic.ttf');
fs.writeFileSync(filename, target);
console.log(filename);
