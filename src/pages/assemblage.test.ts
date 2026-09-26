// Tests : les adresses des pages par mot et ce qui entoure leur rendu (en-tête, voisins, plan du site, allègement).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { adresseDuMot, adressesDesPages, cartesAvecUnePage } from '../partage/pagesDesMots.ts';
import type { CarteDetails, CarteIndex, IndexEdition } from '../partage/types.ts';
import { adapterLeModele, allegerLesTimbres, descriptionDuMot, enteteDeLaPage, planDuSite, voisinsDe } from './assemblage.ts';

const edition = JSON.parse(readFileSync(path.join(import.meta.dirname, '..', '..', 'public', 'data', 'edition-1.index.json'), 'utf8')) as IndexEdition;
const carte = (mot: string, type: CarteIndex['type'], autres: Partial<CarteIndex> = {}): CarteIndex => ({
  id: `${mot}-${type}`, mot, type, rarete: 'Rare', attaque: 5, defense: 5, faction: 'Latin', registre: [], definition: 'Une définition.', ...autres,
});
const details: CarteDetails = { definitions: [{ texte: 'Hors-d’œuvre variés.', quiz: true }], etymologie: '', langueOrigine: 'Russe', frequence: 0.1, prevalence: 18 };

describe('adresses des pages', () => {
  it('sans accent ni caractère encodé', () => {
    assert.equal(adresseDuMot('Pêcher'), 'pecher');
    assert.equal(adresseDuMot('cœur'), 'coeur');
    assert.equal(adresseDuMot('aujourd’hui'), 'aujourd-hui');
    assert.equal(adresseDuMot('électro-encéphalogramme'), 'electro-encephalogramme');
  });
  it('départage les mots qui tomberaient sur la même adresse', () => {
    const adresses = adressesDesPages([carte('beau', 'Adjectif'), carte('beau', 'Nom'), carte('chique', 'Nom'), carte('chiqué', 'Nom'), carte('zakouski', 'Nom')]);
    assert.deepEqual([...adresses.values()], ['beau-adjectif', 'beau-nom', 'chique-nom', 'chique-nom-2', 'zakouski']);
  });
  it('donne une adresse unique et stable à chaque timbre de l’édition', () => {
    const cartes = cartesAvecUnePage(edition.cartes);
    const adresses = adressesDesPages(cartes);
    assert.equal(adresses.size, cartes.length);
    assert.equal(new Set(adresses.values()).size, cartes.length);
    for (const a of adresses.values()) assert.match(a, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(adresses.get('zakouski-nom'), 'zakouski');
  });
  it('ne fait pas de page aux timbres étiquetés injurieux', () => {
    const avec = cartesAvecUnePage(edition.cartes);
    assert.ok(avec.length < edition.cartes.length);
    assert.ok(avec.every((c) => !c.registre.includes('Injurieux')));
  });
});

describe('en-tête des pages', () => {
  it('une description que Google n’a pas à couper', () => {
    const longue = 'Une très longue définition qui continue encore et encore, bien au-delà de ce que Google accepte d’afficher sous le titre d’une page de résultats, vraiment très loin.';
    const d = descriptionDuMot(carte('zakouski', 'Nom'), longue);
    assert.ok(d.length <= 155, d);
    assert.ok(d.startsWith('Zakouski (nom) : Une très longue'));
    assert.ok(d.endsWith('…'));
    assert.equal(descriptionDuMot(carte('zakouski', 'Nom'), 'Court.'), 'Zakouski (nom) : Court.');
  });
  it('échappe les textes, et une définition ne peut pas refermer le script des données', () => {
    const tete = enteteDeLaPage(carte('zakouski', 'Nom'), { ...details, definitions: [{ texte: 'Des « guillemets » et </script><b>', quiz: true }] }, undefined, 'zakouski');
    assert.ok(!tete.includes('</script><b>'));
    assert.ok(tete.includes('&lt;/script&gt;&lt;b&gt;'));
    assert.ok(tete.includes('<link rel="canonical" href="https://philamots.fr/mot/zakouski/" />'));
    const donnees = JSON.parse(tete.match(/<script type="application\/ld\+json">(.*)<\/script>/)![1]);
    assert.equal(donnees.name, 'zakouski');
    assert.equal(donnees.description, 'Des « guillemets » et </script><b>');
  });
});

describe('voisins et plan du site', () => {
  it('six voisins de la même faction, toujours les mêmes', () => {
    const cartes = cartesAvecUnePage(edition.cartes);
    const z = cartes.find((c) => c.id === 'zakouski-nom')!;
    const v = voisinsDe(z, cartes);
    assert.equal(v.length, 6);
    assert.ok(v.every((c) => c.faction === z.faction && c.id !== z.id));
    assert.deepEqual(voisinsDe(z, cartes).map((c) => c.id), v.map((c) => c.id));
  });
  it('le plan du site déclare l’accueil, la liste et chaque page', () => {
    const plan = planDuSite(['zakouski', 'beau-nom'], '2026-09-23');
    assert.equal(plan.match(/<url>/g)?.length, 4);
    assert.ok(plan.includes('<loc>https://philamots.fr/mot/beau-nom/</loc>'));
    assert.ok(plan.includes('<lastmod>2026-09-23</lastmod>'));
  });
});

describe('fabrication', () => {
  it('le modèle perd son script et ses chemins remontent jusqu’à la racine', () => {
    const modele = '<link rel="stylesheet" href="./assets/mot.css"><script type="module" crossorigin src="./assets/mot.js"></script><link rel="modulepreload" crossorigin href="./assets/a.js"><img src="./identite/x.svg">';
    assert.equal(adapterLeModele(modele, 2), '<link rel="stylesheet" href="../../assets/mot.css"><img src="../../identite/x.svg">');
  });
  it('allège les guillochis : précis sur le grand timbre, absents des petits', () => {
    const points = Array.from({ length: 150 }, (_, i) => `L${(i * 1.234).toFixed(2)} -${(i * 0.567).toFixed(2)}`).join('');
    const trace = `<path class="tb__trait" d="M100.00 0.00${points}Z" stroke-width=".42"></path>`;
    const html = `<div>${trace}</div><div class="page-mot__texte"></div><span>${trace}</span>`;
    const allege = allegerLesTimbres(html, '<div class="page-mot__texte">');
    assert.ok(allege.includes('d="M100 0 0 0 1.2 -0.6'), allege.slice(0, 80));
    assert.ok(allege.endsWith('<span></span>'));
    assert.ok(allege.length < html.length / 2);
  });
});
