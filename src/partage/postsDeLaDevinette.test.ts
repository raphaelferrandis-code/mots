// Tests : les textes des posts de la devinette, pour chaque jour du calendrier.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Devinettes } from '../jeu/devinette.ts';
import { adressesDesPages } from './pagesDesMots.ts';
import { LIMITE_BLUESKY, descriptionDeLaQuestion, facettes, graphemes, texteDeLaReponse, texteDuPost } from './postsDeLaDevinette.ts';
import type { IndexEdition } from './types.ts';

const racine = path.join(import.meta.dirname, '..', '..');
const { jours } = JSON.parse(readFileSync(path.join(racine, 'public', 'data', 'devinettes.json'), 'utf8')) as Devinettes;
const edition = JSON.parse(readFileSync(path.join(racine, 'public', 'data', 'edition-1.index.json'), 'utf8')) as IndexEdition;
const adresses = adressesDesPages(edition.cartes);

describe('posts de la devinette', () => {
  it('chaque post et chaque réponse tiennent dans un post Bluesky', () => {
    jours.forEach((d, i) => {
      const hier = i > 0 ? { devinette: jours[i - 1], adresse: adresses.get(jours[i - 1].id)! } : null;
      assert.ok(graphemes(texteDuPost(d, hier)) <= LIMITE_BLUESKY, d.id);
      assert.ok(graphemes(texteDeLaReponse(d, adresses.get(d.id)!)) <= LIMITE_BLUESKY, d.id);
    });
  });
  it('pose la question sans donner la réponse', () => {
    for (const d of jours) {
      const texte = texteDuPost(d, null);
      if (d.format === 'mot') assert.ok(!texte.toLowerCase().includes(d.mot.toLowerCase()), d.id);
      assert.ok(texte.startsWith('Devinette du jour'));
    }
  });
  it('la réponse donne la lettre, le mot et sa page', () => {
    const d = jours.find((j) => j.format === 'definition')!;
    const texte = texteDeLaReponse(d, adresses.get(d.id)!);
    assert.match(texte, new RegExp(`^Réponse ${'ABCD'[d.format === 'definition' ? d.bonne : 0]} : « ${d.mot} »`));
    assert.ok(texte.endsWith(`philamots.fr/mot/${adresses.get(d.id)}/`));
  });
  it('décrit toute l’image de la question', () => {
    const d = jours.find((j) => j.format === 'definition')!;
    if (d.format === 'definition') for (const p of d.propositions) assert.ok(descriptionDeLaQuestion(d).includes(p));
  });
  it('repère liens et mots-dièse à l’octet près, accents compris', () => {
    const texte = 'Hier, c’était « épiphane » : philamots.fr/mot/epiphane/\n#languefrançaise';
    const f = facettes(texte);
    const octets = new TextEncoder().encode(texte);
    const extrait = (i: number): string => new TextDecoder().decode(octets.slice(f[i].index.byteStart, f[i].index.byteEnd));
    assert.equal(extrait(0), 'philamots.fr/mot/epiphane/');
    assert.deepEqual(f[0].features[0], { $type: 'app.bsky.richtext.facet#link', uri: 'https://philamots.fr/mot/epiphane/' });
    assert.equal(extrait(1), '#languefrançaise');
    assert.deepEqual(f[1].features[0], { $type: 'app.bsky.richtext.facet#tag', tag: 'languefrançaise' });
  });
});
