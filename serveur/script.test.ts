// Tests des scripts du serveur : ils doivent être à jour, et refléter les chiffres et les listes du jeu.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { EQUILIBRAGE } from '../src/config/equilibrage.ts';
import { PSEUDOS_INTERDITS } from '../src/config/pseudos-interdits.ts';
import { NOMBRE_DE_JOUEURS_MAISON, fabriquerLesJoueursMaison } from '../src/jeu/joueursMaison.ts';
import { LONGUEUR_DU_CODE } from '../src/jeu/codeDeSecours.ts';
import { examinerLePseudo } from '../src/jeu/pseudo.ts';
import type { IndexEdition } from '../src/partage/types.ts';
import { cartes, migrationPersonnalisation } from './collections.ts';
import { joueursMaison, structure, migrationOffres, migrationIntegrite, migrationCombats, migrationAmis } from './fabriquer-le-script.ts';

const RACINE = path.join(import.meta.dirname, '..');
const edition: IndexEdition = JSON.parse(readFileSync(path.join(RACINE, 'public', 'data', 'edition-1.index.json'), 'utf8'));
const lire = (nom: string): string => readFileSync(path.join(RACINE, 'serveur', nom), 'utf8');

describe('les scripts du serveur', () => {
  it('embarque dans le serveur le même catalogue que dans le jeu', () => {
    const catalogue = JSON.parse(readFileSync(path.join(RACINE,'supabase/functions/_shared/catalogue-combat.json'),'utf8'));
    assert.deepEqual(catalogue.cartes,edition.cartes);
    assert.equal(new Set(catalogue.definitions.map(([id]:[string,unknown])=>id)).size,catalogue.definitions.length);
  });
  it('sont à jour : sinon, lancer « npm run serveur:script » et les recoller dans Supabase', () => {
    assert.equal(lire('1-structure.sql'), structure());
    assert.equal(lire('2-joueurs-maison.sql'), joueursMaison(edition));
    assert.equal(lire('3-cartes.sql'), cartes(edition));
    assert.equal(lire('4-personnalisation.sql'), migrationPersonnalisation());
    assert.equal(lire('6-offres.sql'), migrationOffres());
    assert.equal(lire('8-integrite.sql'), migrationIntegrite());
    assert.equal(lire('9-combats.sql'), migrationCombats());
    assert.equal(lire('10-amis.sql'), migrationAmis());
  });

  it('refuse les anciens appels d’achat cosmétique sans débiter le compte', () => {
    const sql = migrationPersonnalisation();
    assert.ok(sql.includes("raise exception 'L’Encre est réservée aux enchères.'"));
    assert.ok(!sql.includes('set encre = encre - prix'));
  });

  it('reprennent les chiffres des paquets, de l’Encre et des duels, et toutes les cartes de l’édition', () => {
    const sql = structure();
    const P = EQUILIBRAGE.paquets;
    assert.ok(sql.includes(`'${JSON.stringify(P.emplacements)}'::jsonb`));
    assert.ok(sql.includes(`>= ${P.paquetsAvantLegendaireGarantie};`));
    assert.ok(sql.includes(`random() < ${P.chanceHorsSerie}`));
    assert.ok(sql.includes('drop function if exists public.acheter_un_paquet(text[]);'));
    assert.ok(!sql.includes('create or replace function public.acheter_un_paquet'));
    assert.doesNotMatch(sql, /grant execute on function [^;]*public\.acheter_un_paquet/);
    assert.ok(sql.includes(`else ${P.minutesEntreDeuxPaquets} end`), 'la recharge gratuite');
    assert.ok(sql.includes(`when paye >= 2 then ${EQUILIBRAGE.payant.minutesEntreDeuxPaquets}`), 'la recharge payante');
    assert.ok(sql.includes(`when paye >= 2 then ${EQUILIBRAGE.payant.stockMaximum}`), 'la réserve payante');
    // Les formules : le niveau décide, l'Encre achetée ne sert qu'au marché.
    assert.ok(sql.includes("when c.abonnement = 'expert' and c.abonnement_jusqu_au > now() then 3"), 'le niveau d’un compte');
    assert.ok(sql.includes(`gain := gain * ${EQUILIBRAGE.payant.multiplicateurDEncre}`), 'l’Encre doublée');
    assert.ok(sql.includes(`encre_achetee = encre_achetee + ${EQUILIBRAGE.payant.renteQuotidienne}`), 'la rente quotidienne');
    assert.ok(!sql.includes('if public.niveau(c) < 2 then'), 'les plafonds du marché restent identiques pour les deux offres');
    assert.match(sql, /revoke execute on function [^;]*public\.niveau\(public\.comptes\)[^;]* from authenticated;/);
    assert.match(sql, /grant execute on function [^;]*public\.declarer_mon_age\(integer\)[^;]* to authenticated;/);
    assert.ok(sql.includes(`when 'Légendaire' then ${EQUILIBRAGE.encreParDoublon['Légendaire']}`));
    assert.ok(sql.includes(`when 'Holographique' then ${EQUILIBRAGE.finitions.encre.Holographique}`));
    assert.ok(sql.includes(`>= ${EQUILIBRAGE.duel.victoiresPleinesParJour};`));
    assert.ok(sql.includes(`when 'Difficile' then ${EQUILIBRAGE.duel.encreParVictoire.Difficile}`));
    assert.ok(sql.includes(`recompenser(moi.utilisateur, ${EQUILIBRAGE.joute.encreParVictoire}, p_resultat)`));
    const script = cartes(edition);
    for (const carte of edition.cartes) assert.ok(script.includes(`"id":"${carte.id}"`), carte.id);
    // Les aides internes ne sont offertes à personne ; les fonctions du jeu seulement aux joueurs connectés.
    assert.match(sql, /revoke execute on function [^;]*public\.tirer_un_paquet\(uuid, text\[\]\)[^;]* from authenticated;/);
    assert.match(sql, /grant execute on function [^;]*public\.ouvrir_un_paquet\(text\[\]\)[^;]* to authenticated;/);
    // Le code de secours : sa longueur est celle du jeu, son empreinte reste interne, et un transfert emporte timbres et duels.
    assert.ok(sql.includes(`char_length(propre) <> ${LONGUEUR_DU_CODE}`));
    assert.match(sql, /revoke execute on function [^;]*public\.empreinte_du_code\(text\)[^;]* from authenticated;/);
    assert.match(sql, /grant execute on function [^;]*public\.recuperer_par_code\(text\)[^;]* to authenticated;/);
    assert.ok(sql.includes('references public.comptes (utilisateur) on delete cascade on update cascade'));
    // Le marché : les réglages de Raphaël (décisions n° 39 à 42) sont ceux du fichier d'équilibrage.
    const M = EQUILIBRAGE.marche;
    assert.ok(sql.includes(`p_heures not in (${M.dureesEnHeures.join(', ')})`));
    assert.ok(sql.includes(`ceil(e.meilleure_mise * ${M.commission})`));
    assert.ok(sql.includes(`>= ${M.ventesEnCoursAuPlus} then`));
    assert.ok(sql.includes(`if achats >= ${M.achatsParJourAuPlus} then`));
    assert.ok(sql.includes(`when 'Légendaire' then ${M.planchers['Légendaire']}`));
    assert.match(sql, /grant execute on function [^;]*public\.encherir\(bigint, integer\)[^;]* to authenticated;/);
    assert.match(sql, /revoke execute on function [^;]*public\.cloturer_les_encheres\(\)[^;]* from authenticated;/);
    // La cote (décision n° 38) : la fenêtre des ventes, pour tous ; le relevé reste interne.
    assert.ok(sql.includes(`make_interval(days => ${M.cote.fenetreEnJours})`));
    assert.match(sql, /grant execute on function [^;]*public\.cotes\(text\)[^;]* to authenticated;/);
    assert.match(sql, /grant execute on function [^;]*public\.historique_de_la_cote\(text\)[^;]* to authenticated;/);
    assert.match(sql, /revoke execute on function [^;]*public\.calculer_les_cotes\(\)[^;]* from authenticated;/);
  });

  it('reprennent les chiffres du classement et tous les mots interdits du jeu', () => {
    const sql = structure();
    const J = EQUILIBRAGE.joute;
    assert.ok(sql.includes(`default ${J.coteDeDepart}`));
    assert.ok(sql.includes(`greatest(${J.coteMinimale}, round(moi.cote + ${J.facteurK} *`));
    assert.ok(sql.includes(`/ ${J.echelle})`));
    assert.ok(sql.includes(`array[${J.ecartsDeCoteProposes.join(', ')}]`));
    for (const mot of [...PSEUDOS_INTERDITS.motsEntiers, ...PSEUDOS_INTERDITS.fragments]) assert.ok(sql.includes(`('${mot}', `), mot);
    // Aucune table n'est ouverte en lecture ou en écriture directe, et aucune fonction du jeu n'est offerte aux visiteurs sans compte.
    assert.ok(!/create policy/i.test(sql));
    assert.ok(/revoke execute on function[^;]+from public, anon;/.test(sql));
  });

  it('fabriquent toujours les mêmes joueurs maison : decks complets, pseudonymes acceptables et tous différents', () => {
    const joueurs = fabriquerLesJoueursMaison(edition.cartes);
    assert.deepEqual(joueurs, fabriquerLesJoueursMaison(edition.cartes));
    assert.equal(joueurs.length, NOMBRE_DE_JOUEURS_MAISON);
    const connues = new Set(edition.cartes.map((c) => c.id));
    for (const joueur of joueurs) {
      assert.equal(new Set(joueur.deck).size, EQUILIBRAGE.duel.tailleDuDeck);
      assert.ok(joueur.deck.every((id) => connues.has(id)));
      assert.ok(examinerLePseudo(joueur.pseudo, PSEUDOS_INTERDITS).accepte, joueur.pseudo);
      assert.match(joueur.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      for (const savoir of [...Object.values(joueur.savoirs), ...Object.values(joueur.parades)]) assert.ok(savoir.reussies >= 0 && savoir.reussies <= savoir.posees);
    }
    assert.equal(new Set(joueurs.map((j) => j.pseudo)).size, joueurs.length);
    // Aucun mot familier ou injurieux dans leurs decks : ils conviennent à tous les réglages de contenu.
    const sensibles = new Set(edition.cartes.filter((c) => c.registre.length > 0).map((c) => c.id));
    assert.ok(joueurs.every((j) => j.deck.every((id) => !sensibles.has(id))));
  });
});
