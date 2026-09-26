import { useRecompensesSuspendues } from '../composants/Recompenses.tsx';
// Le duel : à l'entraînement contre l'ordinateur, ou en joute classée contre le « double » d'un autre joueur.
// L'écran ne contient aucune règle : il affiche l'état du duel et passe par src/services/ pour chaque action.
// Une manche : l'un pose un mot face cachée (nature, attaque, défense), l'autre lui répond par une carte de sa main
// (en Facile, l'ordinateur pose toujours le premier ; sinon chacun son tour), puis le mot adverse se retourne et le
// joueur retrouve uniquement sa définition pour parer.
// Les attaques sont automatiques. Les deux attaques sont alors réglées, et l'on passe à la manche suivante.

import { useEffect, useRef, useState } from 'react';
import { useActionArmee } from '../composants/useActionArmee.ts';
import { useChargement } from '../composants/useChargement.ts';
import { useCombatServeur } from '../composants/useCombatServeur.ts';
import { usePartie } from '../composants/usePartie.ts';
import { useSonsDuDuel } from '../composants/useSonsDuDuel.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { taillesDesFactions } from '../jeu/duel.ts';
import type { Duel as EtatDuDuel, Niveau } from '../jeu/duel.ts';
import type { Epreuve } from '../jeu/epreuve.ts';
import { registresMasques } from '../jeu/partie.ts';
import type { Resultat } from '../jeu/progression.ts';
import type { Sauvegarde } from '../jeu/sauvegarde.ts';
import type { CarteIndex } from '../partage/types.ts';
import { chargerEdition } from '../services/cartes.ts';
import { debutDeManche, deckJouable, motDeLOrdinateur, poserLEpreuve, preparerUnDuel, reglerLaManche } from '../services/duel.ts';
import type { Adversaire, Terrain } from '../services/duel.ts';
import { abandonnerLeDuel, finirLeDuel, noterLaParade, noterLaReponse } from '../services/partie.ts';
import type { FinDeDuel } from '../services/partie.ts';
import type { Relation } from '../services/amis.ts';
import { Preparation } from './duel/Preparation.tsx';
import type { ModeDuSalon } from './duel/Preparation.tsx';
import { Partie } from './duel/Partie.tsx';
import { FinDuDuel } from './duel/FinDuDuel.tsx';
import { messageDe } from '../partage/messages.ts';

const REGLES = EQUILIBRAGE.duel;

// Une réponse du joueur à une épreuve : la proposition choisie (null = temps écoulé), si c'était la bonne,
// et si cette bonne réponse vient de faire du mot un mot maîtrisé.
type Reponse = { epreuve: Epreuve; choisie: number | null; juste: boolean; maitrise: boolean };

export type Etape =
  | { nom: 'accueil' }
  | { nom: 'preparation' }
  | { nom: 'choix'; adverse: CarteIndex | null; choisie: string | null } // null : le joueur pose le premier
  | { nom: 'reprise' }
  | { nom: 'parade'; adverse: CarteIndex; carte: CarteIndex; epreuve: Epreuve; debut: number }
  | { nom: 'bilan'; adverse: CarteIndex; carte: CarteIndex; parade: Reponse; apres: EtatDuDuel }
  // « nonEnregistree » : la joute est finie, mais le serveur qui tient le classement n'a pas répondu.
  | ({ nom: 'fin'; resultat: Resultat; nonEnregistree: boolean; interrompu?: boolean } & FinDeDuel);

type Bilan = { attaques: number; attaquesReussies: number; parades: number; paradesReussies: number; maitrises: string[] };
const BILAN_VIDE: Bilan = { attaques: 0, attaquesReussies: 0, parades: 0, paradesReussies: 0, maitrises: [] };

// Le temps accordé pour chaque épreuve, selon le réglage d'accessibilité du joueur (null = sans limite).
function secondesPourRepondre(sauvegarde: Sauvegarde): number | null {
  const choix = sauvegarde.reglages.tempsDeReponse;
  return choix === 'illimite' ? null : REGLES.secondesPourRepondre * (choix === 'double' ? 2 : 1);
}

// Donne la main au bouton principal (pour jouer au clavier) sans faire défiler la page jusqu'à lui.
const viser = (bouton: HTMLButtonElement | null): void => bouton?.focus({ preventScroll: true });


export function Duel({ editionDuDeck = false }: { editionDuDeck?: boolean } = {}) {
  const partie = usePartie();
  const sauvegarde = partie.etat === 'prete' ? partie.sauvegarde : null;
  // Le deck est relu à chaque changement de deck ou de réglage de contenu.
  const cleDuDeck = sauvegarde ? `${sauvegarde.deck.join(',')}|${sauvegarde.reglages.masquerFamiliers}|${sauvegarde.reglages.masquerInjurieux}` : 'attente';
  const deck = useChargement(deckJouable, `deck:${cleDuDeck}`);
  const edition = useChargement(chargerEdition, 'edition');

  const xpAuDebut = useRef(0);
  const [mode, setMode] = useState<ModeDuSalon>('entrainement');
  // Jusqu'à sa première victoire, le joueur commence en Facile : l'ordinateur y joue au hasard, et le jeu montre les
  // dégâts prévus (décision de Raphaël du 26/09/2026 ; Normal, sans ces aides, décourageait les débutants).
  const [niveau, setNiveau] = useState<Niveau>(() => (sauvegarde && sauvegarde.duels.gagnes === 0 ? 'Facile' : 'Normal'));
  // #/deck ouvre la préparation avec le deck en édition (depuis la fin d'un duel, l'album, les amis…).
  const [deckEnEdition, setDeckEnEdition] = useState(editionDuDeck);
  const [terrain, setTerrain] = useState<Terrain | null>(null);
  const [duel, setDuel] = useState<EtatDuDuel | null>(null);
  const [etape, setEtape] = useState<Etape>({ nom: 'accueil' });
  useRecompensesSuspendues(etape.nom !== 'accueil' && etape.nom !== 'fin');
  const [bilan, setBilan] = useState<Bilan>(BILAN_VIDE);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const enregistrementEnCours = useRef(false);
  const sons = useSonsDuDuel(sauvegarde?.reglages.sonsPaquets ?? true);

  // La dernière étape connue, pour qu'une réponse et la fin du temps ne comptent jamais toutes les deux.
  const etapeActuelle = useRef(etape);
  etapeActuelle.current = etape;

  const changerDEtape = (suivante: Etape, remonter = true): void => {
    etapeActuelle.current = suivante;
    setEtape(suivante);
    if (remonter) window.scrollTo({ top: 0 });
  };

  const enLigne = useCombatServeur(sauvegarde !== null, (reponse) => {
    const combat = reponse.combat;
    setErreur(null);
    if (!combat) { setDuel(null); setTerrain(null); changerDEtape({nom:'accueil'}); return; }
    const vue = combat.vue;
    setTerrain({adversaire:vue.adversaire,visibles:[],definitions:new Map(),tailles:new Map(),masques:[]});
    setMode(vue.adversaire.type === 'entrainement' ? 'entrainement' : vue.adversaire.amical ? 'ami' : 'joutes');
    if (vue.adversaire.type === 'entrainement') setNiveau(vue.adversaire.niveau);
    setDuel(vue.duel); setBilan(vue.bilan);
    const e = vue.etape;
    const precedente = etapeActuelle.current;
    if (precedente.nom === 'parade' && e.nom === 'bilan') {
      if (e.parade.juste) sons.juste(); else sons.faux();
      // Les coups et le cachet s'entendent pendant la résolution animée (duel/deroulement.ts).
    }
    if (precedente.nom === 'bilan' && e.nom === 'fin') {
      if (e.resultat === 'victoire') sons.victoire(); else if (e.resultat === 'defaite') sons.defaite();
    }
    if (e.nom === 'fin') {
      changerDEtape({nom:'fin',resultat:e.resultat,nonEnregistree:false,interrompu:e.abandonne || e.expire,...(combat.recompense ?? {encre:0,reduite:false,cote:null})});
      if (e.expire) setErreur('Ce duel a expiré après 24 heures : défaite enregistrée, sans récompense de fin.');
      else if (e.abandonne) setErreur('Duel abandonné : défaite enregistrée, sans récompense de fin.');
    } else {
      // Convertir uniquement l'affichage de l'horloge ; le serveur vérifie lui-même le délai.
      changerDEtape(e.nom === 'parade' ? {...e,debut:e.debut + Date.now() - reponse.etat.maintenant} : e);
    }
  });

  const retourAuSalon = (): void => {
    if (enLigne.actif) { void enLigne.agir({type:'quitter'}); return; }
    setDuel(null); changerDEtape({nom:'accueil'});
  };

  const lancer = async (adversaire: Adversaire): Promise<void> => {
    if (etapeActuelle.current.nom === 'preparation') return;
    if (enLigne.actif) {
      if (!sauvegarde || enLigne.bloque) return;
      sons.preparer(); changerDEtape({nom:'preparation'});
      const commun = {masques:registresMasques(sauvegarde),temps:sauvegarde.reglages.tempsDeReponse};
      const ok = await enLigne.commencer(adversaire.type === 'entrainement' ? {...commun,mode:'entrainement',niveau:adversaire.niveau} : {...commun,mode:'joute',adversaire:adversaire.profil.id});
      if (!ok) changerDEtape({nom:'accueil'});
      return;
    }
    sons.preparer(); // dans le geste du joueur : les navigateurs n'ouvrent la sortie audio qu'à ce moment-là
    changerDEtape({ nom: 'preparation' });
    setErreur(null);
    try {
      const pret = await preparerUnDuel(adversaire);
      xpAuDebut.current = sauvegarde?.profil.xp ?? 0;
      setTerrain(pret.terrain);
      setDuel(pret.duel);
      setBilan(BILAN_VIDE);
      changerDEtape({ nom: 'choix', adverse: debutDeManche(pret.terrain, pret.duel), choisie: null });
    } catch (e) {
      setErreur(messageDe(e));
      changerDEtape({ nom: 'accueil' });
    }
  };

  // Défier un ami : un duel contre son double (son deck, joué par l'ordinateur), tenu par le serveur des combats.
  const defier = async (ami: Relation): Promise<void> => {
    if (!sauvegarde || !enLigne.actif || enLigne.bloque || etapeActuelle.current.nom === 'preparation') return;
    sons.preparer(); changerDEtape({ nom: 'preparation' }); setErreur(null);
    const ok = await enLigne.commencer({ mode: 'amical', adversaire: ami.id, masques: registresMasques(sauvegarde), temps: sauvegarde.reglages.tempsDeReponse });
    if (!ok) changerDEtape({ nom: 'accueil' });
  };

  // Choisir un timbre de la main : il se soulève et apparaît en transparence dans ta case.
  const choisir = (id: string): void => {
    const enCours = etapeActuelle.current;
    if (enCours.nom !== 'choix' || enCours.choisie === id) return;
    sons.preparer(); sons.selection();
    changerDEtape({ ...enCours, choisie: id }, false);
  };

  // Jouer le timbre choisi : il est posé (l'adversaire répond s'il ne l'a pas encore fait), puis vient la parade.
  const jouer = (carte: CarteIndex): void => {
    const enCours = etapeActuelle.current;
    if (!terrain || !duel || enCours.nom !== 'choix' || enLigne.bloque) return;
    sons.preparer(); sons.poser();
    if (enLigne.actif) { void enLigne.agir({ type: 'choisir', carte: carte.id }); return; }
    const adverse = enCours.adverse ?? motDeLOrdinateur(terrain, duel, carte.type);
    changerDEtape({ nom: 'parade', adverse, carte, epreuve: poserLEpreuve(terrain, adverse, carte), debut: Date.now() });
  };

  // Une seule réponse par manche : la définition du mot adverse pour parer.
  const repondre = (choisie: number | null): void => {
    const enCours = etapeActuelle.current;
    if (!terrain || !duel || enCours.nom !== 'parade') return;
    if (choisie !== null && Date.now() - enCours.debut < 500) return;
    if (enLigne.actif) { void enLigne.agir({type:'repondre',choisie}); return; }
    const juste = choisie === enCours.epreuve.bonne;
    noterLaParade(enCours.adverse.rarete, juste);
    // Seul le mot réellement reconnu progresse, s'il appartient à la collection.
    const parade: Reponse = { epreuve: enCours.epreuve, choisie, juste, maitrise: noterLaReponse(enCours.adverse.id, juste, false) };
    setBilan((b) => ({ ...b, attaques: b.attaques + 1, attaquesReussies: b.attaquesReussies + 1, parades: b.parades + 1, paradesReussies: b.paradesReussies + Number(juste), maitrises: parade.maitrise ? [...b.maitrises, enCours.adverse.mot] : b.maitrises }));
    const apres = reglerLaManche(terrain, duel, enCours.carte, enCours.adverse, juste);
    // Les coups et le cachet s'entendent pendant la résolution animée (duel/deroulement.ts).
    if (juste) sons.juste(); else sons.faux();
    changerDEtape({ nom: 'bilan', adverse: enCours.adverse, carte: enCours.carte, parade, apres });
  };

  // Le temps de l'épreuve : à son terme, la réponse est comptée fausse.
  const temps = enLigne.combat?.vue.temps;
  const duree = temps ? temps === 'illimite' ? null : REGLES.secondesPourRepondre * (temps === 'double' ? 2 : 1) : sauvegarde ? secondesPourRepondre(sauvegarde) : null;
  const repondreALaFinDuTemps = useRef(repondre);
  repondreALaFinDuTemps.current = repondre;
  useEffect(() => {
    if (etape.nom !== 'parade' || duree === null) return;
    const minuterie = setTimeout(() => repondreALaFinDuTemps.current(null), Math.max(0, etape.debut + duree * 1000 - Date.now()));
    return () => clearTimeout(minuterie);
  }, [etape, duree]);

  // Après le bilan d'une manche : le duel est fini, ou la manche suivante commence.
  const continuer = async (apres: EtatDuDuel): Promise<void> => {
    if (enLigne.actif) { await enLigne.agir({type:'continuer'}); return; }
    if (!terrain || !sauvegarde || enregistrementEnCours.current) return;
    setDuel(apres);
    if (apres.vainqueur === null) { changerDEtape({ nom: 'choix', adverse: debutDeManche(terrain, apres), choisie: null }); return; }

    const resultat: Resultat = apres.vainqueur === 'joueur' ? 'victoire' : apres.vainqueur === 'nul' ? 'nul' : 'defaite';
    enregistrementEnCours.current = true;
    setEnregistrement(true);
    setErreur(null);
    try {
      const fin = await finirLeDuel(terrain.adversaire, resultat);
      if (resultat === 'victoire') sons.victoire(); else if (resultat === 'defaite') sons.defaite();
      changerDEtape({ nom: 'fin', resultat, nonEnregistree: false, ...fin });
    } catch (e) {
      setErreur(`${messageDe(e)} Ton résultat reste affiché : réessaie avec « Voir le résultat ».`);
    } finally {
      enregistrementEnCours.current = false;
      setEnregistrement(false);
    }
  };

  const abandonner = async (): Promise<void> => {
    if (!terrain || enregistrementEnCours.current) return;
    if (enLigne.actif) { await enLigne.agir({type:'abandonner'}); return; }
    enregistrementEnCours.current = true;
    setEnregistrement(true);
    setErreur(null);
    try {
      await abandonnerLeDuel(terrain.adversaire);
      setDuel(null);
      changerDEtape({ nom: 'accueil' });
    } catch (e) { setErreur(messageDe(e)); }
    finally { enregistrementEnCours.current = false; setEnregistrement(false); }
  };

  // Deux temps : « Abandonner » arme l'action, « Confirmer l'abandon » l'exécute (défaite, sans récompense).
  const abandon = useActionArmee(() => void abandonner());

  // (Tant que le serveur n'a pas répondu une première fois, il n'y a rien à reprendre : « Réessayer » suffit.)
  const incidentServeur = enLigne.erreur && <div className="bloc bloc--alerte" role="alert"><p>{enLigne.erreur}</p><div className="rangee-de-boutons"><button type="button" className="btn-primary sm" disabled={enLigne.occupe} onClick={() => void enLigne.reessayer()}>Réessayer</button>{enLigne.repris && <button type="button" className="btn-secondary" disabled={enLigne.occupe} onClick={() => void enLigne.reprendre()}>Reprendre le duel enregistré</button>}</div></div>;
  // Le serveur dit d'abord s'il y a un duel en cours. S'il ne répond pas, la préparation s'affiche quand même, avec
  // l'incident : le carnet reste modifiable (audit de finition du 26/09/2026).
  if (enLigne.actif && !enLigne.repris && !enLigne.erreur) return <main className="ecran"><h1 className="visuellement-cache">Duel</h1><p role="status" className="texte-doux">Chargement des duels…</p></main>;
  if (deck.etat === 'erreur' && !enLigne.combat) return <main className="ecran"><p role="alert">{deck.message}</p><button type="button" className="btn-primary sm" onClick={deck.relancer}>Réessayer</button></main>;
  if (!sauvegarde || (deck.etat !== 'pret' && !enLigne.combat)) return <main className="ecran"><p className="texte-doux">Chargement…</p></main>;

  // ── Avant le duel : la préparation (mode, adversaire, temps, récompense du jour) et le deck ──
  if (etape.nom === 'accueil' || etape.nom === 'preparation' || !duel || !terrain) {
    return (
      <Preparation
        sauvegarde={sauvegarde} deck={deck.etat === 'pret' ? deck.donnees : []}
        deckEnEdition={deckEnEdition} onDeckEnEdition={setDeckEnEdition}
        mode={mode} onMode={setMode} niveau={niveau} onNiveau={setNiveau}
        enPreparation={etape.nom === 'preparation'} bloque={enLigne.bloque} combatsEnLigne={enLigne.actif}
        erreur={erreur} incident={incidentServeur}
        onLancer={() => void lancer({ type: 'entrainement', niveau })}
        onDefier={(ami) => void defier(ami)}
        onDuelDeSecours={() => { sons.preparer(); void enLigne.reprendre(); }}
      />
    );
  }

  // ── Pendant le duel : la partie (en-tête, historique, ring, barre d'action, main) ──
  const affiche = etape.nom === 'bilan' ? etape.apres : duel;
  // Les tailles des origines décident du bonus des petites langues : celles du terrain local, sinon celles de l'édition
  // (le serveur des combats ne les transmet pas ; il les calcule sur la même édition complète).
  const tailles = terrain.tailles.size > 0 ? terrain.tailles : edition.etat === 'pret' ? taillesDesFactions(edition.donnees.cartes) : terrain.tailles;
  const enEpreuve = etape.nom === 'parade';

  // Après la manche : la définition du mot adverse (la leçon, si la parade a manqué) et la progression de sa maîtrise.
  const aRetenir = etape.nom === 'bilan' && (() => {
    const connue = sauvegarde.cartes[etape.adverse.id];
    const reussites = connue?.reussites ?? 0;
    return (
      <section className="partie__retenir" aria-label="À retenir">
        {etape.parade.juste
          ? <p className="partie__definition"><b lang="fr">{etape.adverse.mot}</b> : <span lang="fr">{etape.adverse.definition}</span></p>
          : <div className="duel__lecon">
            <p className="entete__surtitre">À retenir — {etape.adverse.mot}</p>
            <Propositions epreuve={etape.parade.epreuve} reponse={etape.parade} seulementLUtile />
          </div>}
        {connue && <p className="texte-doux petit">
          {etape.parade.maitrise
            ? `Cachet « Maîtrisé » obtenu : ${etape.adverse.mot}.`
            : connue.maitriseeLe !== null ? `« ${etape.adverse.mot} » : maîtrisé.` : `Maîtrise · ${etape.adverse.mot} : ${Math.min(reussites, REGLES.reussitesPourLaMaitrise)} / ${REGLES.reussitesPourLaMaitrise}`}
        </p>}
      </section>
    );
  })();

  const fin = (jaillir: Parameters<Parameters<typeof Partie>[0]['fin']>[0]) => etape.nom === 'fin' && (
    <FinDuDuel
      resultat={etape.resultat} interrompu={etape.interrompu === true} duel={duel}
      nomAdverse={terrain.adversaire.type === 'joute' ? terrain.adversaire.profil.pseudo : 'L’ordinateur'}
      encre={etape.encre} xp={enLigne.combat?.xp ?? Math.max(0, sauvegarde.profil.xp - xpAuDebut.current)} reduite={etape.reduite}
      cote={etape.cote} nonEnregistree={etape.nonEnregistree} bilan={bilan}
      reduit={sauvegarde.reglages.reduireAnimations || window.matchMedia('(prefers-reduced-motion: reduce)').matches}
      bloque={enLigne.bloque} jaillir={jaillir}
      rejouer={terrain.adversaire.type === 'entrainement' ? () => void lancer(terrain.adversaire) : null}
      onChangerDAdversaire={retourAuSalon}
    />
  );

  return (
    <Partie
      sauvegarde={sauvegarde} etape={etape} duel={duel} affiche={affiche} adversaire={terrain.adversaire} tailles={tailles}
      bloque={enLigne.bloque} enregistrement={enregistrement}
      alertes={<>{incidentServeur}{enLigne.occupe && <p role="status" className="texte-doux petit">Enregistrement…</p>}{erreur && <p className="bloc bloc--alerte" role="alert">{erreur}</p>}</>}
      bilan={aRetenir} fin={fin} pseudo={sauvegarde.joutes.pseudo}
      incident={!!enLigne.erreur || !!erreur} duree={duree} reduireAnimations={sauvegarde.reglages.reduireAnimations || window.matchMedia('(prefers-reduced-motion: reduce)').matches}
      onRepondre={repondre} onTic={(restantes) => sons.tic(restantes)} sons={sons}
      abandon={{ ...abandon, visible: (enLigne.actif || !enEpreuve) && (!!erreur || !(etape.nom === 'bilan' && etape.apres.vainqueur !== null)) }}
      viser={viser}
      onChoisir={choisir}
      onJouer={jouer}
      onContinuer={() => { if (etape.nom === 'bilan') void continuer(etape.apres); else if (etape.nom === 'reprise') void enLigne.agir({ type: 'continuer' }); }}
    />
  );
}

// Les quatre définitions : des boutons pendant l'épreuve, puis la correction une fois la réponse donnée.
function Propositions({ epreuve, reponse, onRepondre, seulementLUtile = false, disabled = false }: { epreuve: Epreuve; reponse?: Reponse; onRepondre?: (choisie: number) => void; seulementLUtile?: boolean; disabled?: boolean }) {
  return (
    <ol className="epreuve__propositions">
      {epreuve.propositions.map((texte, i) => {
        if (!reponse) return <li key={i}><button type="button" className="proposition" lang="fr" disabled={disabled} onClick={() => onRepondre?.(i)}>{texte}</button></li>;
        const etat = i === epreuve.bonne ? 'bonne' : i === reponse.choisie ? 'fausse' : 'autre';
        // La coche et la croix sont dessinées par la feuille de style : on les dit aussi en toutes lettres.
        const lue = etat === 'bonne' ? (i === reponse.choisie ? 'Ta réponse, la bonne : ' : 'La bonne réponse : ') : etat === 'fausse' ? 'Ta réponse, fausse : ' : '';
        return seulementLUtile && etat === 'autre' ? null : <li key={i}><span className="proposition" lang="fr" data-etat={etat}>{lue && <span className="visuellement-cache" lang="fr">{lue}</span>}{texte}</span></li>;
      })}
    </ol>
  );
}
