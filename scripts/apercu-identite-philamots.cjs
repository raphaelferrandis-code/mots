// Usage : node scripts/apercu-identite-philamots.cjs <chemin-du-module-sharp>
const sharp = require(process.argv[2] || 'sharp');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const assets = path.join(root, 'public', 'identite');
const output = path.join(root, 'output', 'identite');
fs.mkdirSync(output, { recursive: true });
const read = (name) => fs.readFileSync(path.join(assets, name));
const svgBuffer = (content) => Buffer.from(content);
async function main() {
  const brown = read('philamots-brun.svg');
  const cream = read('philamots-creme.svg');
  const icon = read('favicon.svg');
  const light = read('philamots-clair.svg');
  const siteIcon = read('favicon-site.svg');
  await sharp(brown).resize({ width: 2400 }).png().toFile(path.join(assets, 'philamots-brun.png'));
  await sharp(cream).resize({ width: 2400 }).png().toFile(path.join(assets, 'philamots-creme.png'));
  await sharp(light).resize({ width: 2400 }).png().toFile(path.join(assets, 'philamots-clair.png'));
  for (const size of [16, 32, 48, 180]) {
    await sharp(icon).resize(size, size).png().toFile(path.join(assets, `icone-${size}.png`));
    await sharp(siteIcon).resize(size, size).png().toFile(path.join(assets, `icone-site-${size}.png`));
  }
  const background = svgBuffer(`<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1040" viewBox="0 0 1400 1040">
    <rect width="1400" height="1040" fill="#0B1729"/>
    <g font-family="Arial, sans-serif" fill="#ADC3DA" font-size="16">
      <text x="80" y="64" letter-spacing="2">PHILAMOTS / PLAYFAIR DISPLAY ITALIQUE</text>
      <text x="80" y="437">Encre claire · #E0EDFA</text>
      <text x="1030" y="437">Bleu nuit · #0B1729</text>
    </g>
    <path d="M80 475H1320 M80 720H1320 M815 520V680" stroke="#314A66"/>
    <g font-family="Arial, sans-serif" fill="#ADC3DA" font-size="16">
      <text x="80" y="525">À taille d’en-tête · 180 px</text>
      <text x="880" y="525">Le « p » · 16, 32 et 48 px</text>
    </g>
    <rect x="80" y="770" width="760" height="205" rx="4" fill="#F5F1E8"/>
    <g font-family="Arial, sans-serif" fill="#ADC3DA" font-size="16">
      <text x="900" y="805">Un dessin fixe, en vectoriel.</text>
      <text x="900" y="840">Fond transparent.</text>
      <text x="900" y="875">Une version claire et une sombre.</text>
      <text x="900" y="940">Monogramme renforcé en petit.</text>
    </g>
  </svg>`);
  const layers = [
    { input: await sharp(light).resize({ width: 1040 }).png().toBuffer(), left: 180, top: 150 },
    { input: await sharp(light).resize({ width: 180 }).png().toBuffer(), left: 80, top: 580 },
    { input: await sharp(light).resize({ width: 120 }).png().toBuffer(), left: 450, top: 588 },
    { input: await sharp(siteIcon).resize(16, 16).png().toBuffer(), left: 900, top: 602 },
    { input: await sharp(siteIcon).resize(32, 32).png().toBuffer(), left: 960, top: 594 },
    { input: await sharp(siteIcon).resize(48, 48).png().toBuffer(), left: 1040, top: 586 },
    { input: await sharp(brown).resize({ width: 520 }).png().toBuffer(), left: 200, top: 812 },
  ];
  await sharp(background).composite(layers).png().toFile(path.join(output, 'philamots-identite.png'));
  console.log('Aperçu et PNG exportés.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
