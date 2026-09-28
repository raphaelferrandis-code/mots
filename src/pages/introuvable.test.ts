import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { adresseDuMot } from '../partage/pagesDesMots.ts';

// Le script de la page introuvable vit dans public/ (servi tel quel) : on le charge comme le ferait le navigateur.
type Introuvable = { adresseDuMot: (mot: string) => string; correction: (chemin: string) => { vers?: string; adresse?: string } | null };
const module = pathToFileURL(path.join(import.meta.dirname, '..', '..', 'public', 'introuvable.js')).href;
const introuvable = await import(module) as Introuvable;

describe('la page introuvable', () => {
  it('fabrique les adresses des mots comme le jeu', () => {
    for (const mot of ['Amour', 'sérendipité', 'œuvre', 'aujourd’hui', 'Nævus', 'à-peu-près', 'pomme de terre', '  élan  ']) {
      assert.equal(introuvable.adresseDuMot(mot), adresseDuMot(mot), mot);
    }
  });

  it('corrige une adresse de mot mal tapée, et laisse une adresse juste sur place', () => {
    assert.deepEqual(introuvable.correction('/mot/Amour/'), { vers: '/mot/amour/' });
    assert.deepEqual(introuvable.correction(`/mot/${encodeURIComponent('sérendipité')}/`), { vers: '/mot/serendipite/' });
    assert.deepEqual(introuvable.correction('/mot/beau/'), { adresse: 'beau' }, 'une adresse juste : on cherche ses homographes, sans boucler');
    assert.deepEqual(introuvable.correction('/mot/'), { vers: '/mots/' });
    assert.equal(introuvable.correction('/une-page-inconnue/'), null);
    assert.equal(introuvable.correction('/mot/%E0%A4%A/'), null, 'un encodage cassé ne fait rien');
  });
});
