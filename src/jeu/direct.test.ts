import { it } from 'node:test';
import assert from 'node:assert/strict';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { RYTHME_DIRECT, prochaineLecture } from './direct.ts';
import type { ReponseDirect, VueDirect } from './direct.ts';

const reponse = (r: Partial<ReponseDirect>): ReponseDirect => ({ maintenant: 0, utilisateur: 'u', attente: null, partie: null, proposition: null, ...r });
const partie = (phase: VueDirect['phase'], echeance: number): ReponseDirect['partie'] =>
  ({ id: 'p', revision: 1, vue: { phase, echeance } as VueDirect, cotes: null, gains: { xp: 0, encre: 0, reduite: false } });

it('relit juste après une échéance, et bien moins souvent qu’avant quand le temps réel prévient', () => {
  const heure = 1_000_000;
  // Une phase qui finit dans 5 s : on relit juste après, pour faire avancer la partie.
  assert.equal(prochaineLecture(reponse({ partie: partie('pose', heure + 5_000) }), true, heure), 5_000 + RYTHME_DIRECT.apresEcheance);
  // Une échéance lointaine : une lecture de sécurité quand même ; plus souvent sans temps réel.
  assert.equal(prochaineLecture(reponse({ partie: partie('reponses', heure + 30_000) }), true, heure), RYTHME_DIRECT.enDirect.partie);
  assert.equal(prochaineLecture(reponse({ partie: partie('reponses', heure + 30_000) }), false, heure), RYTHME_DIRECT.sansDirect.partie);
  // Échéance déjà passée : presque aussitôt.
  assert.equal(prochaineLecture(reponse({ partie: partie('bilan', heure - 2_000) }), true, heure), RYTHME_DIRECT.apresEcheance);
  // Une proposition à accepter : juste après la fin du délai.
  const proposition = { id: 'p', mode: 'solo' as const, accepterAvant: heure + 8_000, acceptes: 1, total: 2, jAccepte: true };
  assert.equal(prochaineLecture(reponse({ proposition }), true, heure), 8_000 + RYTHME_DIRECT.apresEcheance);
  assert.equal(prochaineLecture(reponse({ proposition }), false, heure), RYTHME_DIRECT.sansDirect.proposition);
  // Partie finie, ou simple visite : presque rien.
  assert.equal(prochaineLecture(reponse({ partie: partie('fin', heure) }), true, heure), RYTHME_DIRECT.enDirect.repos);
  assert.equal(prochaineLecture(reponse({}), true, heure), RYTHME_DIRECT.enDirect.repos);
  assert.equal(prochaineLecture(null, true, heure), RYTHME_DIRECT.premiereLecture);
});

it('en file, relit assez souvent pour y garder sa place, même dans un onglet caché ralenti par le navigateur', () => {
  const file = reponse({ attente: { mode: 'solo', equipe: null, partenairePret: false } });
  const presence = EQUILIBRAGE.direct.secondesDePresenceDansLaFile * 1000;
  for (const connecte of [true, false]) assert.ok(prochaineLecture(file, connecte, 0) * 3 <= presence);
  // Un onglet caché depuis longtemps ne relit plus qu'une fois par minute (Chrome) : la place tient encore.
  assert.ok(60_000 * 2 <= presence);
  // Avant : une lecture toutes les 2,5 s quoi qu'il arrive, soit 1 440 par heure pour qui regarde l'écran.
  assert.ok(3_600_000 / prochaineLecture(reponse({}), true, 0) <= 60);
});
