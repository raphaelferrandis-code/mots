import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  cadrer, decouper, lecteurDeCouche, lettresLeLongDuChemin, lireCouleur, lireDegrade, lireLesAdresses, lireLesFonds,
  lireLesOmbres, lisserLesAplats, peindreLeFond, placerLesArrets, placerLesLettres, preparerLeBruit, turbulence,
} from './pinceaux.ts';
import type { Degrade } from './pinceaux.ts';
import { CHIFFRES_ALIGNES, chiffresPlaces, largeurDesChiffres } from '../timbre/chiffresAlignes.ts';

describe('pinceaux de l’image de partage : lecture des valeurs CSS', () => {
  it('lit les couleurs telles que getComputedStyle les écrit', () => {
    assert.deepEqual(lireCouleur('#3557a8'), [0x35, 0x57, 0xa8, 1]);
    assert.deepEqual(lireCouleur('#fff'), [255, 255, 255, 1]);
    assert.deepEqual(lireCouleur('#ff000080'), [255, 0, 0, 128 / 255]);
    assert.deepEqual(lireCouleur('rgb(252, 246, 230)'), [252, 246, 230, 1]);
    assert.deepEqual(lireCouleur('rgba(78, 54, 26, 0.62)'), [78, 54, 26, 0.62]);
    assert.deepEqual(lireCouleur('transparent'), [0, 0, 0, 0]);
    // Le résultat d'un color-mix() (finitions Brillante et Holographique).
    const melange = lireCouleur('color(srgb 0.150196 0.240706 0.466118)')!;
    assert.deepEqual(melange.map((v) => Math.round(v)), [38, 61, 119, 1]);
    assert.equal(lireCouleur('var(--encre)'), null);
  });

  it('découpe une liste à ses virgules de premier niveau seulement', () => {
    assert.deepEqual(decouper('linear-gradient(90deg, red, blue), radial-gradient(circle, red, blue)'), ['linear-gradient(90deg, red, blue)', 'radial-gradient(circle, red, blue)']);
    assert.deepEqual(decouper('rgb(200, 145, 75) 0px 0px 0px 2px inset', ' '), ['rgb(200, 145, 75)', '0px', '0px', '0px', '2px', 'inset']);
  });

  it('lit les dégradés du timbre, linéaires, radiaux et répétés', () => {
    const lineaire = lireDegrade('linear-gradient(125deg, rgb(138, 79, 38), rgb(231, 171, 122) 30%, rgb(154, 90, 44))');
    assert.equal(lineaire?.sorte, 'lineaire');
    assert.equal(lineaire?.sorte === 'lineaire' && lineaire.angle, 125);
    assert.equal(lineaire?.arrets.length, 3);
    assert.deepEqual(lineaire?.arrets[1].position, { v: 30, u: '%' });
    const radial = lireDegrade('radial-gradient(130% 100% at 25% 12%, rgb(252, 246, 230) 0%, rgb(240, 228, 200) 58%, rgb(225, 207, 168) 100%)') as Extract<Degrade, { sorte: 'radial' }>;
    assert.deepEqual(radial.taille, [{ v: 130, u: '%' }, { v: 100, u: '%' }]);
    assert.deepEqual(radial.centre, [{ v: 25, u: '%' }, { v: 12, u: '%' }]);
    const lueur = lireDegrade('radial-gradient(circle at 32% 22%, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0) 52%)') as Extract<Degrade, { sorte: 'radial' }>;
    assert.equal(lueur.cercle, true);
    assert.equal(lueur.taille, 'farthest-corner');
    const rayures = lireDegrade('repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.07) 0px, rgba(255, 255, 255, 0.07) 9px, rgba(0, 0, 0, 0) 9px, rgba(0, 0, 0, 0) 27px)');
    assert.equal(rayures?.repete, true);
    assert.equal(rayures?.arrets.length, 4);
    assert.equal(lireDegrade('conic-gradient(#f00, #00f)'), null);
  });

  it('distingue les dégradés des images, et lit une adresse qui contient des parenthèses', () => {
    const grain = 'url("data:image/svg+xml,%3Csvg%3E%3Crect filter=\'url(%23n)\'/%3E%3C/svg%3E")';
    assert.deepEqual(lireLesFonds(`${grain}, linear-gradient(rgb(255, 0, 0), rgb(0, 0, 255))`).map((f) => (f && f !== 'image' ? f.sorte : f)), ['image', 'lineaire']);
    assert.deepEqual(lireLesAdresses(grain), ["data:image/svg+xml,%3Csvg%3E%3Crect filter='url(%23n)'/%3E%3C/svg%3E"]);
    assert.deepEqual(lireLesFonds('none'), []);
  });

  it('lit les ombres intérieures et extérieures', () => {
    const ombres = lireLesOmbres('rgb(200, 145, 75) 0px 0px 0px 2px inset, rgba(0, 0, 0, 0.3) 0px 0px 0px 3.8px inset');
    assert.equal(ombres.length, 2);
    assert.deepEqual(ombres[0], { couleur: [200, 145, 75, 1], x: 0, y: 0, flou: 0, etendue: 2, interieure: true });
    assert.deepEqual(lireLesOmbres('rgba(160, 220, 255, 0.5) 0px 0px 96px')[0], { couleur: [160, 220, 255, 0.5], x: 0, y: 0, flou: 96, etendue: 0, interieure: false });
    assert.deepEqual(lireLesOmbres('none'), []);
  });
});

describe('pinceaux de l’image de partage : dégradés peints comme CSS', () => {
  it('place les arrêts sans position selon la règle CSS', () => {
    const arrets = lireDegrade('linear-gradient(90deg, #f00, #0f0, #00f 80%, white 50%, black)')!.arrets;
    assert.deepEqual(placerLesArrets(arrets, 100).map((a) => a.position), [0, 40, 80, 80, 100]);
  });

  it('mélange les couleurs prémultipliées : un blanc qui s’efface reste blanc', () => {
    const lire = lecteurDeCouche({ degrade: lireDegrade('linear-gradient(90deg, rgb(255, 255, 255), rgba(0, 0, 0, 0))')!, tuile: [100, 10], decalage: [0, 0] });
    const c = new Float64Array(4);
    lire(50, 5, c);
    assert.ok(Math.abs(c[3] - 0.5) < 0.01);
    assert.ok(Math.abs(c[0] / c[3] - 255) < 1, 'la couleur reste blanche à mi-chemin');
  });

  it('répète les rayures et peint les pixels à cheval sur le bord en partie', () => {
    const degrade = lireDegrade('repeating-linear-gradient(0deg, rgb(255, 0, 0) 0px, rgb(255, 0, 0) 1px, rgb(0, 0, 255) 1px, rgb(0, 0, 255) 3px)')!;
    const boite = { x: 0.5, y: 0, l: 4, h: 6 };
    const pixels = cadrer(boite, 1);
    peindreLeFond(pixels, boite, 1, null, [lecteurDeCouche({ degrade, tuile: [4, 6], decalage: [0, 0] })]);
    const pixel = (x: number, y: number): number[] => Array.from(pixels.donnees.slice((y * pixels.largeur + x) * 4, (y * pixels.largeur + x) * 4 + 4));
    // 0deg : le dégradé part du bas ; la rangée du bas est rouge, puis deux rangées bleues, et on recommence.
    assert.deepEqual(pixel(1, 5).slice(0, 3), [255, 0, 0]);
    assert.deepEqual(pixel(1, 4).slice(0, 3), [0, 0, 255]);
    assert.deepEqual(pixel(1, 2).slice(0, 3), [255, 0, 0]);
    assert.equal(pixel(1, 3)[3], 255);
    assert.equal(pixel(0, 3)[3], 128, 'la première colonne n’est couverte qu’à moitié');
  });
});

describe('pinceaux de l’image de partage : bruit des cachets', () => {
  it('reproduit feTurbulence du navigateur (valeurs relevées dans Chrome)', () => {
    // <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7"/> : canal opacité, sur 255,
    // au centre des pixels. Le navigateur arrondit un peu autrement : on tolère quelques niveaux.
    const bruit = preparerLeBruit(7);
    const releves: [number, number, number][] = [[3, 5, 101], [10, 40, 124], [31, 17, 172], [50, 50, 174], [60, 2, 128], [22, 61, 99]];
    for (const [x, y, chrome] of releves) {
      const calcule = turbulence(bruit, 3, x + 0.5, y + 0.5, [0.05, 0.05], 2, true) * 255;
      assert.ok(Math.abs(calcule - chrome) <= 5, `(${x}, ${y}) : ${calcule.toFixed(1)} au lieu de ${chrome}`);
    }
  });

  it('donne toujours le même grain pour la même graine', () => {
    const a = preparerLeBruit(42);
    const b = preparerLeBruit(42);
    const c = preparerLeBruit(43);
    assert.equal(turbulence(a, 3, 12.3, 45.6, [1.1, 1.1], 1, true), turbulence(b, 3, 12.3, 45.6, [1.1, 1.1], 1, true));
    assert.notEqual(turbulence(a, 3, 12.3, 45.6, [1.1, 1.1], 1, true), turbulence(c, 3, 12.3, 45.6, [1.1, 1.1], 1, true));
  });
});

describe('pinceaux de l’image de partage : lettres', () => {
  // Une police imaginaire : chaque lettre fait 10, sauf la paire « AV » qui se rapproche de 2 (crénage).
  const mesurer = (t: string): number => [...t].length * 10 - (t === 'AV' ? 2 : 0);

  it('place les lettres espacées, crénage compris', () => {
    const placement = placerLesLettres('AVA', 3, mesurer);
    assert.deepEqual(placement.x, [0, 11, 24]);
    assert.equal(placement.largeur, 37);
  });

  it('abandonne les lettres dont le milieu dépasse le bout du chemin, comme SVG', () => {
    const placement = placerLesLettres('ABCDE', 0, mesurer);
    assert.deepEqual(lettresLeLongDuChemin(placement, 0, 32).map((l) => l.lettre), ['A', 'B', 'C']);
    // textLength="60" : l'écart est réparti entre les lettres.
    assert.deepEqual(lettresLeLongDuChemin(placement, 0, 100, 60).map((l) => l.milieu), [5, 17, 29, 41, 53]);
  });

  it('trace les chiffres alignés de Playfair, à leur chasse', () => {
    assert.equal(CHIFFRES_ALIGNES.length, 10);
    assert.equal(largeurDesChiffres('10', 100), (412 + 683) / 10);
    assert.deepEqual(chiffresPlaces('12').map((c) => c.x), [0, 412]);
    assert.ok(CHIFFRES_ALIGNES.every(([chasse, contour]) => chasse > 0 && contour.startsWith('M') && contour.endsWith('z')));
  });
});

describe('pinceaux de l’image de partage : poids', () => {
  it('aligne les pixels presque égaux sans jamais s’écarter de plus que la tolérance', () => {
    const largeur = 40;
    const hauteur = 3;
    const pixels = new Uint8ClampedArray(largeur * hauteur * 4);
    for (let y = 0; y < hauteur; y++) for (let x = 0; x < largeur; x++) {
      const o = (y * largeur + x) * 4;
      // Un dégradé très doux, puis un bord net à x = 20.
      const v = x < 20 ? 100 + Math.floor(x / 3) : 200;
      pixels.set([v, v, v, 255], o);
    }
    const origine = pixels.slice();
    lisserLesAplats(pixels, largeur, hauteur, 2);
    let ecartMaximum = 0;
    for (let i = 0; i < pixels.length; i++) ecartMaximum = Math.max(ecartMaximum, Math.abs(pixels[i] - origine[i]));
    assert.ok(ecartMaximum <= 2);
    assert.equal(pixels[20 * 4], 200, 'le bord net reste intact');
    const valeurs = new Set(Array.from({ length: 20 }, (_, x) => pixels[x * 4]));
    assert.ok(valeurs.size < 7, 'le dégradé doux compte moins de teintes différentes');
  });
});
