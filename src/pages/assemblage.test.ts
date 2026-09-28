// Tests : les adresses des pages par mot et ce qui entoure leur rendu (en-tête, voisins, plan du site, allègement).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { adresseDuMot, adressesDesPages } from '../partage/pagesDesMots.ts';
import type { CarteDetails, CarteIndex, IndexEdition } from '../partage/types.ts';
import { adapterLeModele, allegerLesTimbres, attestationEnClair, avecLesRenvois, descriptionDuMot, enteteDeLaListe, enteteDeLaPage, enteteDeLaPageIntrouvable, enteteDeLaPageLegale, planDuSite, voisinsDe } from './assemblage.ts';

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
    const cartes = edition.cartes;
    const adresses = adressesDesPages(cartes);
    assert.equal(adresses.size, cartes.length);
    assert.equal(new Set(adresses.values()).size, cartes.length);
    for (const a of adresses.values()) assert.match(a, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(adresses.get('zakouski-nom'), 'zakouski');
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
    assert.equal(donnees.inLanguage, 'fr');
  });
  it('met la nature dans le titre quand deux timbres portent le même mot, et donne le fil d’Ariane', () => {
    assert.match(enteteDeLaPage(carte('beau', 'Adjectif'), details, undefined, 'beau-adjectif', true), /<title>Beau \(adjectif\) : définition et origine — Philamots<\/title>/);
    const seul = enteteDeLaPage(carte('zakouski', 'Nom'), details, undefined, 'zakouski');
    assert.match(seul, /<title>Zakouski : définition et origine — Philamots<\/title>/);
    assert.match(seul, /<meta property="og:image:alt" content="[^"]+" \/>/);
    const fil = [...seul.matchAll(/<script type="application\/ld\+json">(.*)<\/script>/g)].map((m) => JSON.parse(m[1])).find((d) => d['@type'] === 'BreadcrumbList');
    assert.deepEqual(fil.itemListElement.map((e: { name: string; item: string }) => `${e.name} ${e.item}`),
      ['Philamots https://philamots.fr/', 'Tous les mots https://philamots.fr/mots/', 'zakouski https://philamots.fr/mot/zakouski/']);
  });
  it('la liste des mots a un aperçu complet quand on la partage', () => {
    const tete = enteteDeLaListe(3016);
    for (const balise of ['og:type', 'og:url', 'og:description', 'og:image:alt']) assert.ok(tete.includes(`property="${balise}"`), balise);
    assert.ok(tete.includes('<meta name="twitter:card" content="summary_large_image" />'));
  });
});

describe('voisins et plan du site', () => {
  it('six voisins de la même faction, toujours les mêmes', () => {
    const cartes = edition.cartes;
    const z = cartes.find((c) => c.id === 'zakouski-nom')!;
    const v = voisinsDe(z, cartes);
    assert.equal(v.length, 6);
    assert.ok(v.every((c) => c.faction === z.faction && c.id !== z.id));
    assert.deepEqual(voisinsDe(z, cartes).map((c) => c.id), v.map((c) => c.id));
  });
  const jours = { mots: '2026-09-23', site: '2026-09-30', legales: '2026-09-28' };
  it('le plan du site déclare l’accueil, la liste et chaque page', () => {
    const plan = planDuSite(['zakouski', 'beau-nom'], jours);
    assert.equal(plan.match(/<url>/g)?.length, 4);
    assert.ok(plan.includes('<loc>https://philamots.fr/mot/beau-nom/</loc>'));
    assert.ok(!plan.includes('<!--'), 'pas de commentaire de travail');
  });
  it('le plan du site déclare aussi les pages légales, après la liste', () => {
    const plan = planDuSite(['zakouski'], jours, ['mentions-legales', 'confidentialite', 'conditions']);
    assert.equal(plan.match(/<url>/g)?.length, 6);
    const ordre = ['mots/', 'mentions-legales/', 'confidentialite/', 'conditions/', 'mot/zakouski/'].map((c) => plan.indexOf(`<loc>https://philamots.fr/${c}</loc>`));
    assert.ok(ordre.every((position, i) => position > (ordre[i - 1] ?? 0)), ordre.join(', '));
  });
  it('le plan du site date chaque page de son dernier vrai changement', () => {
    const plan = planDuSite(['zakouski'], jours, ['conditions']);
    const date = (chemin: string) => new RegExp(`<loc>https://philamots\\.fr/${chemin}</loc>\\s*<lastmod>([^<]+)</lastmod>`).exec(plan)?.[1];
    assert.equal(date(''), '2026-09-30', 'l’accueil : le jour de la mise en ligne');
    assert.equal(date('mots/'), '2026-09-30');
    assert.equal(date('conditions/'), '2026-09-28', 'une page légale : la date de ses textes');
    assert.equal(date('mot/zakouski/'), '2026-09-23', 'un mot : la version de ses textes');
  });
});

describe('le texte des pages des mots', () => {
  it('dit l’attestation en clair', () => {
    const cas: [string | null, string | null][] = [
      ['842', 'attesté en 842'], ['1840-1850', 'attesté en 1840-1850'], ['1552, forme picarde', 'attesté en 1552, forme picarde'],
      ['XVIᵉ siècle', 'attesté au XVIᵉ siècle'], ['XVIIIe', 'attesté au XVIIIe'], ['Vers 1540', 'attesté vers 1540'], ['c. 1200', 'attesté vers 1200'],
      ['Ca 1300', 'attesté vers 1300'], ['Avant 1500', 'attesté avant 1500'], ['Années 1960', 'attesté dans les années 1960'],
      ['Attesté en 1840', 'attesté en 1840'], ['12 avril 1832', 'attesté le 12 avril 1832'], ['Fin XIXᵉ siècle', 'attesté : fin XIXᵉ siècle'],
      ['à déterminer', null], [null, null], ['', null],
    ];
    for (const [brut, attendu] of cas) assert.equal(attestationEnClair(brut), attendu, String(brut));
  });
  it('fait des renvois du Wiktionnaire des liens vers les pages qui existent', () => {
    const liens = new Map([['babiller', 'babiller'], ['babine', 'babine'], ['arabe', 'arabe-nom']]);
    assert.deepEqual(avecLesRenvois('De l’ancien français → voir babiller et babine.', liens), [
      { texte: 'De l’ancien français → voir ' }, { texte: 'babiller', adresse: 'babiller' }, { texte: ' et ' }, { texte: 'babine', adresse: 'babine' }, { texte: '.' },
    ]);
    assert.deepEqual(avecLesRenvois('Mot savant → voir al- et khôl pour les étymons.', liens), [{ texte: 'Mot savant → voir al- et khôl pour les étymons.' }], 'sans page, du texte');
    assert.deepEqual(avecLesRenvois('Emprunt → voir Arabe.', liens), [{ texte: 'Emprunt → voir ' }, { texte: 'Arabe', adresse: 'arabe-nom' }, { texte: '.' }]);
    assert.deepEqual(avecLesRenvois('Sans renvoi.', liens), [{ texte: 'Sans renvoi.' }]);
  });
});

describe('pages légales et page introuvable', () => {
  it('une page légale a son adresse canonique et ses textes échappés', () => {
    const tete = enteteDeLaPageLegale('conditions', 'Conditions d’utilisation', 'Les règles « du jeu » & de la maison');
    assert.ok(tete.includes('<title>Conditions d’utilisation — Philamots</title>'));
    assert.ok(tete.includes('<link rel="canonical" href="https://philamots.fr/conditions/" />'));
    assert.ok(tete.includes('content="Les règles « du jeu » &amp; de la maison"'));
  });
  it('la page introuvable reste hors des résultats de recherche', () => {
    assert.match(enteteDeLaPageIntrouvable(), /<meta name="robots" content="noindex" \/>/);
  });
  it('la page introuvable prend ses chemins depuis la racine, à n’importe quelle profondeur', () => {
    const modele = '<link rel="stylesheet" href="./assets/mot.css"><script type="module" crossorigin src="./assets/mot.js"></script><img src="./identite/x.svg">';
    assert.equal(adapterLeModele(modele, 'absolu'), '<link rel="stylesheet" href="/assets/mot.css"><img src="/identite/x.svg">');
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
