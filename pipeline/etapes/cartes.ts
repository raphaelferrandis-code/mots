// Étape 5 — Assemblage : transforme chaque mot en carte complète (stats, rareté, faction, définitions).

import { idDeCarte } from '../../src/partage/types.ts';
import type { CarteDetails, CarteIndex } from '../../src/partage/types.ts';
import { valeurDesLettres } from '../../src/partage/lettres.ts';
import type { CONFIG } from '../config.ts';
import { cle } from './lexique.ts';
import { resoudreOrigines } from './factions.ts';
import { construireDefinitions, couper } from './nettoyage.ts';
import { attribuerRaretes, prevalenceMesuree } from './rarete.ts';
import { registresDeLaCarte, registresDuSens, sensActuelsDAbord } from './registre.ts';
import { notesSurDix } from './stats.ts';
import type { MotBrut } from './wiktionnaire.ts';

// Une carte avec tout ce que le pipeline sait d'elle (le jeu n'en recevra qu'une partie).
export type CarteComplete = {
  index: CarteIndex;
  details: CarteDetails;
  factionReconnue: boolean;
  herite: string | null; // mot dont l'origine a été héritée
  homographes: number;
  nombreDeSens: number;
  synonymes: number;
  derives: number;
  valeurLettres: number;
  richesse: number;
  etiquettesDuPremierSens: string[];
  domainesDuPremierSens: string[];
  prevalenceMesuree: boolean;
  definitionsDeDuel: number;
};

const LONGUEUR_MAXIMALE_ETYMOLOGIE = 400;

// Le Wiktionnaire écrit « Siècle à préciser » quand la date n'est pas connue.
const DATE_INCONNUE = /à préciser/i;

export function assemblerCartes(mots: Map<string, MotBrut>, config: typeof CONFIG, corrections: Map<string, string> = new Map()): CarteComplete[] {
  const tous = [...mots.values()];
  // Les mots sans définition ne font pas de cartes, mais peuvent transmettre leur origine à leurs dérivés.
  const origines = resoudreOrigines(tous.map((m) => ({ cle: cle(m.mot, m.nature), mot: m.mot, etymologies: m.etymologies, base: m.lexique.base })), corrections);

  const jouables = tous.filter((m) => m.sens.length > 0);
  const valeurs = jouables.map((m) => valeurDesLettres(m.mot));
  const richesses = jouables.map((m) => config.richesse.poidsSens * m.sens.length + config.richesse.poidsSynonymes * m.synonymes + config.richesse.poidsDerives * m.derives);
  const attaques = notesSurDix(valeurs);
  const defenses = notesSurDix(richesses);
  const raretes = attribuerRaretes(
    jouables.map((m) => ({ id: idDeCarte(m.mot, m.nature), frequence: m.lexique.frequence, prevalence: m.lexique.prevalence, avis: m.lexique.avis })),
    config.rarete,
  );

  return jouables.map((m, i) => {
    const id = idDeCarte(m.mot, m.nature);
    const origine = origines.get(cle(m.mot, m.nature))!;
    const sens = sensActuelsDAbord(m.sens, (s) => registresDuSens(s.etiquettes));
    const registres = sens.map((s) => registresDuSens(s.etiquettes));
    const definitions = construireDefinitions(m.mot, sens.map((s, k) => ({ definition: s.definition, registre: registres[k] })), config.definitions);
    const mesuree = prevalenceMesuree({ id, frequence: m.lexique.frequence, prevalence: m.lexique.prevalence, avis: m.lexique.avis }, config.rarete.avisMinimum);

    const details: CarteDetails = {
      definitions,
      etymologie: couper(m.etymologies[0] ?? '', LONGUEUR_MAXIMALE_ETYMOLOGIE),
      langueOrigine: origine.langue,
      frequence: m.lexique.frequence,
      prevalence: mesuree ? m.lexique.prevalence : null,
    };
    if (m.attestation && !DATE_INCONNUE.test(m.attestation)) details.attestation = m.attestation;

    const index: CarteIndex = {
      id,
      mot: m.mot,
      type: m.nature,
      rarete: raretes.get(id)!,
      attaque: attaques[i],
      defense: defenses[i],
      faction: origine.faction,
      registre: registresDeLaCarte(registres),
      definition: couper(sens[0].definition, config.definitions.longueurSurLaCarte),
    };
    // La date de première apparition sert de date au cachet du timbre : elle est donc aussi sur la carte.
    if (details.attestation) index.attestation = details.attestation;

    return {
      index,
      details,
      factionReconnue: origine.reconnue,
      herite: origine.via,
      homographes: m.entrees,
      nombreDeSens: m.sens.length,
      synonymes: m.synonymes,
      derives: m.derives,
      valeurLettres: valeurs[i],
      richesse: richesses[i],
      etiquettesDuPremierSens: sens[0].etiquettes,
      domainesDuPremierSens: sens[0].domaines,
      prevalenceMesuree: mesuree,
      definitionsDeDuel: definitions.filter((d) => d.quiz).length,
    };
  });
}
