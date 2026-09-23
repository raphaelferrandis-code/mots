import { GainDuDuel, useRecompensesSuspendues } from '../composants/Recompenses.tsx';
// Le duel : à l'entraînement contre l'ordinateur, ou en joute classée contre le « double » d'un autre joueur.
// L'écran ne contient aucune règle : il affiche l'état du duel et passe par src/services/ pour chaque action.
// Une manche : l'adversaire pose un mot, le joueur lui répond par une
// carte de sa main, puis il doit retrouver la définition de SON mot (son attaque porte) et celle du mot ADVERSE
// (il pare). Les deux attaques sont alors réglées, et l'on passe à la manche suivante.

import { useEffect, useRef, useState } from 'react';
import { BadgeJoueurSimule } from '../composants/BadgeJoueurSimule.tsx';
import { SceauDuel } from '../composants/SceauDuel.tsx';
import { Carte } from '../composants/carte/Carte.tsx';
import { CarteLegendee } from '../composants/carte/CarteLegendee.tsx';
import { choisirAuxFleches } from '../composants/fleches.ts';
import { useChargement } from '../composants/useChargement.ts';
import { useCombatServeur } from '../composants/useCombatServeur.ts';
import { useMaintenant, usePartie } from '../composants/usePartie.ts';
import { useSonsDuDuel } from '../composants/useSonsDuDuel.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { NIVEAUX } from '../jeu/duel.ts';
import type { Attaque, Camp, Duel as EtatDuDuel, Niveau } from '../jeu/duel.ts';
import type { Epreuve } from '../jeu/epreuve.ts';
import { ligueDe } from '../jeu/joute.ts';
import { jourDe } from '../jeu/progression.ts';
import { registresMasques } from '../jeu/partie.ts';
import type { Resultat } from '../jeu/progression.ts';
import { meilleureFinition } from '../jeu/sauvegarde.ts';
import type { Sauvegarde } from '../jeu/sauvegarde.ts';
import { lien } from '../navigation/routes.ts';
import type { CarteIndex, Finition } from '../partage/types.ts';
import { deckJouable, motDeLOrdinateur, poserLEpreuve, preparerUnDuel, reglerLaManche } from '../services/duel.ts';
import type { Adversaire, Terrain } from '../services/duel.ts';
import { serveurDeJoutes } from '../services/joutes.ts';
import { abandonnerLeDuel, commencerUnDuel, finirLeDuel, noterLaParade, noterLaReponse } from '../services/partie.ts';
import type { FinDeDuel, RecompenseDuServeur } from '../services/partie.ts';
import { PanneauDesJoutes } from './PanneauDesJoutes.tsx';
import '../composants/commandeDuel.css';
import '../composants/duelManche.css';

const REGLES = EQUILIBRAGE.duel;
const MODES: Adversaire['type'][] = ['entrainement', 'joute'];

// Une réponse du joueur à une épreuve : la proposition choisie (null = temps écoulé), si c'était la bonne,
// et si cette bonne réponse vient de faire du mot un mot maîtrisé.
type Reponse = { epreuve: Epreuve; choisie: number | null; juste: boolean; maitrise: boolean };

type Etape =
  | { nom: 'accueil' }
  | { nom: 'preparation' }
  | { nom: 'choix'; adverse: CarteIndex; choisie: string | null }
  | { nom: 'attaque'; adverse: CarteIndex; carte: CarteIndex; epreuve: Epreuve; debut: number }
  | { nom: 'echappe'; adverse: CarteIndex; carte: CarteIndex; attaque: Reponse }
  | { nom: 'parade'; adverse: CarteIndex; carte: CarteIndex; attaque: Reponse; epreuve: Epreuve; debut: number }
  | { nom: 'bilan'; adverse: CarteIndex; carte: CarteIndex; attaque: Reponse; parade: Reponse; apres: EtatDuDuel }
  // « nonEnregistree » : la joute est finie, mais le serveur qui tient le classement n'a pas répondu.
  | ({ nom: 'fin'; resultat: Resultat; nonEnregistree: boolean } & FinDeDuel);

type Bilan = { attaques: number; attaquesReussies: number; parades: number; paradesReussies: number; maitrises: string[] };
const BILAN_VIDE: Bilan = { attaques: 0, attaquesReussies: 0, parades: 0, paradesReussies: 0, maitrises: [] };
type Habillage = { carte: CarteIndex; finition: Finition; maitriseeLe: number | null };

// Le temps accordé pour chaque épreuve, selon le réglage d'accessibilité du joueur (null = sans limite).
function secondesPourRepondre(sauvegarde: Sauvegarde): number | null {
  const choix = sauvegarde.reglages.tempsDeReponse;
  return choix === 'illimite' ? null : REGLES.secondesPourRepondre * (choix === 'double' ? 2 : 1);
}

// Donne la main au bouton principal (pour jouer au clavier) sans faire défiler la page jusqu'à lui.
const viser = (bouton: HTMLButtonElement | null): void => bouton?.focus({ preventScroll: true });
// Donne la main au mot demandé : un lecteur d'écran l'annonce, et la touche Tab mène droit aux quatre définitions.
const viserLeMot = (titre: HTMLHeadingElement | null): void => titre?.focus({ preventScroll: true });

const pluriel = (n: number, mot: string): string => `${n} ${mot}${n > 1 ? 's' : ''}`;

export function Duel() {
  const partie = usePartie();
  const sauvegarde = partie.etat === 'prete' ? partie.sauvegarde : null;
  // Le deck est relu à chaque changement de deck ou de réglage de contenu.
  const cleDuDeck = sauvegarde ? `${sauvegarde.deck.join(',')}|${sauvegarde.reglages.masquerFamiliers}|${sauvegarde.reglages.masquerInjurieux}` : 'attente';
  const deck = useChargement(deckJouable, `deck:${cleDuDeck}`);

  const xpAuDebut = useRef(0);
  const [mode, setMode] = useState<Adversaire['type']>('entrainement');
  const [niveau, setNiveau] = useState<Niveau>('Normal');
  const [terrain, setTerrain] = useState<Terrain | null>(null);
  const [duel, setDuel] = useState<EtatDuDuel | null>(null);
  const [etape, setEtape] = useState<Etape>({ nom: 'accueil' });
  useRecompensesSuspendues(etape.nom !== 'accueil' && etape.nom !== 'fin');
  const [bilan, setBilan] = useState<Bilan>(BILAN_VIDE);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ticket, setTicket] = useState<number | null>(null); // le numéro de la joute en cours, quand un serveur tient le classement
  const [enregistrement, setEnregistrement] = useState(false);
  const enregistrementEnCours = useRef(false);
  const sons = useSonsDuDuel(sauvegarde?.reglages.sonsPaquets ?? true);

  // La dernière étape connue, pour qu'une réponse et la fin du temps ne comptent jamais toutes les deux.
  const etapeActuelle = useRef(etape);
  etapeActuelle.current = etape;

  const changerDEtape = (suivante: Etape): void => {
    etapeActuelle.current = suivante;
    setEtape(suivante);
    window.scrollTo({ top: 0 });
  };

  const enLigne = useCombatServeur(sauvegarde !== null, (reponse) => {
    const combat = reponse.combat;
    setErreur(null);
    if (!combat) { setDuel(null); setTerrain(null); changerDEtape({nom:'accueil'}); return; }
    const vue = combat.vue;
    setTerrain({adversaire:vue.adversaire,visibles:[],definitions:new Map(),tailles:new Map(),masques:[]});
    setMode(vue.adversaire.type);
    if (vue.adversaire.type === 'entrainement') setNiveau(vue.adversaire.niveau);
    setDuel(vue.duel); setBilan(vue.bilan);
    const e = vue.etape;
    const precedente = etapeActuelle.current;
    if (precedente.nom === 'attaque' && (e.nom === 'parade' || e.nom === 'echappe')) {
      if (e.attaque.juste) sons.juste(); else sons.faux();
    }
    if (precedente.nom === 'parade' && e.nom === 'bilan') {
      if (e.parade.juste) sons.juste(); else sons.faux();
      const manche = e.apres.manches.at(-1);
      sons.coup(manche?.joueur.infliges ?? 0,0.45); sons.coup(manche?.adversaire.infliges ?? 0,0.75);
      if (e.attaque.maitrise || e.parade.maitrise) sons.cachet(1.1);
    }
    if (precedente.nom === 'bilan' && e.nom === 'fin') {
      if (e.resultat === 'victoire') sons.victoire(); else if (e.resultat === 'defaite') sons.defaite();
    }
    if (e.nom === 'fin') {
      changerDEtape({nom:'fin',resultat:e.resultat,nonEnregistree:false,...(combat.recompense ?? {encre:0,reduite:false,cote:null})});
      if (e.expire) setErreur('Ce duel a expiré après 24 heures : défaite enregistrée, sans récompense de fin.');
      else if (e.abandonne) setErreur('Duel abandonné : défaite enregistrée, sans récompense de fin.');
    } else {
      // Convertir uniquement l'affichage de l'horloge ; le serveur vérifie lui-même le délai.
      changerDEtape(e.nom === 'attaque' || e.nom === 'parade' ? {...e,debut:e.debut + Date.now() - reponse.etat.maintenant} : e);
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
      // Le ticket de la joute, ou celui du duel d'entraînement quand le serveur tient la collection (il versera l'Encre).
      setTicket(adversaire.type === 'joute' ? await serveurDeJoutes.commencer(adversaire.profil) : await commencerUnDuel(adversaire.niveau));
      xpAuDebut.current = sauvegarde?.profil.xp ?? 0;
      setTerrain(pret.terrain);
      setDuel(pret.duel);
      setBilan(BILAN_VIDE);
      changerDEtape({ nom: 'choix', adverse: motDeLOrdinateur(pret.terrain, pret.duel), choisie: null });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
      changerDEtape({ nom: 'accueil' });
    }
  };

  // Le joueur répond à l'épreuve en cours : d'abord celle de son mot, puis celle du mot adverse.
  const repondre = (choisie: number | null): void => {
    const enCours = etapeActuelle.current;
    if (!terrain || !duel) return;
    // Les deux questions s'enchaînent au même endroit de l'écran : un double toucher ne doit pas répondre à la seconde.
    if (choisie !== null && (enCours.nom === 'attaque' || enCours.nom === 'parade') && Date.now() - enCours.debut < 500) return;
    if (enLigne.actif) { void enLigne.agir({type:'repondre',choisie}); return; }
    if (enCours.nom === 'attaque') {
      const juste = choisie === enCours.epreuve.bonne;
      if (juste) sons.juste(); else sons.faux();
      const attaque: Reponse = { epreuve: enCours.epreuve, choisie, juste, maitrise: noterLaReponse(enCours.carte.id, juste) };
      setBilan((b) => ({ ...b, attaques: b.attaques + 1, attaquesReussies: b.attaquesReussies + (juste ? 1 : 0), maitrises: attaque.maitrise ? [...b.maitrises, enCours.carte.mot] : b.maitrises }));
      // Bonne réponse : on enchaîne aussitôt sur la parade. Sinon, on laisse le temps de lire la bonne définition.
      if (attaque.juste) changerDEtape({ nom: 'parade', adverse: enCours.adverse, carte: enCours.carte, attaque, epreuve: poserLEpreuve(terrain, enCours.adverse, enCours.carte), debut: Date.now() });
      else changerDEtape({ nom: 'echappe', adverse: enCours.adverse, carte: enCours.carte, attaque });
    } else if (enCours.nom === 'parade') {
      const juste = choisie === enCours.epreuve.bonne;
      // Chaque parade tentée est comptée (son double parera comme lui). Et si le joueur possède aussi ce mot,
      // le reconnaître chez l'adversaire compte pour sa maîtrise.
      noterLaParade(enCours.adverse.rarete, juste);
      const parade: Reponse = { epreuve: enCours.epreuve, choisie, juste, maitrise: noterLaReponse(enCours.adverse.id, juste, false) };
      setBilan((b) => ({ ...b, parades: b.parades + 1, paradesReussies: b.paradesReussies + (juste ? 1 : 0), maitrises: parade.maitrise ? [...b.maitrises, enCours.adverse.mot] : b.maitrises }));
      const apres = reglerLaManche(terrain, duel, enCours.carte, enCours.adverse, enCours.attaque.juste, juste);
      // La réponse d'abord, puis les deux attaques l'une après l'autre, puis le cachet s'il vient d'être gagné.
      const manche = apres.manches.at(-1);
      if (juste) sons.juste(); else sons.faux();
      sons.coup(manche?.joueur.infliges ?? 0, 0.45);
      sons.coup(manche?.adversaire.infliges ?? 0, 0.75);
      if (enCours.attaque.maitrise || parade.maitrise) sons.cachet(1.1);
      changerDEtape({ nom: 'bilan', adverse: enCours.adverse, carte: enCours.carte, attaque: enCours.attaque, parade, apres });
    }
  };

  // Le temps de l'épreuve : à son terme, la réponse est comptée fausse.
  const temps = enLigne.combat?.vue.temps;
  const duree = temps ? temps === 'illimite' ? null : REGLES.secondesPourRepondre * (temps === 'double' ? 2 : 1) : sauvegarde ? secondesPourRepondre(sauvegarde) : null;
  const repondreALaFinDuTemps = useRef(repondre);
  repondreALaFinDuTemps.current = repondre;
  useEffect(() => {
    if ((etape.nom !== 'attaque' && etape.nom !== 'parade') || duree === null) return;
    const minuterie = setTimeout(() => repondreALaFinDuTemps.current(null), Math.max(0, etape.debut + duree * 1000 - Date.now()));
    return () => clearTimeout(minuterie);
  }, [etape, duree]);

  // Après le bilan d'une manche : le duel est fini, ou l'ordinateur pose son mot suivant.
  const continuer = async (apres: EtatDuDuel): Promise<void> => {
    if (enLigne.actif) { await enLigne.agir({type:'continuer'}); return; }
    if (!terrain || !sauvegarde || enregistrementEnCours.current) return;
    setDuel(apres);
    if (apres.vainqueur === null) { changerDEtape({ nom: 'choix', adverse: motDeLOrdinateur(terrain, apres), choisie: null }); return; }

    const resultat: Resultat = apres.vainqueur === 'joueur' ? 'victoire' : apres.vainqueur === 'nul' ? 'nul' : 'defaite';
    enregistrementEnCours.current = true;
    setEnregistrement(true);
    setErreur(null);
    try {
      // Un échec laisse le bilan disponible pour réessayer le même ticket.
      let coteDuServeur: { avant: number; apres: number } | undefined;
      let recompenseDuServeur: RecompenseDuServeur | undefined;
      if (terrain.adversaire.type === 'joute' && serveurDeJoutes.enLigne) {
        const finDeJoute = await serveurDeJoutes.terminer(ticket, resultat);
        coteDuServeur = finDeJoute ?? undefined;
        if (finDeJoute && typeof finDeJoute.encre === 'number') recompenseDuServeur = { encre: finDeJoute.encre, reduite: finDeJoute.reduite === true, etat: finDeJoute.etat };
      }
      const fin = await finirLeDuel(terrain.adversaire, resultat, ticket, coteDuServeur, recompenseDuServeur);
      if (resultat === 'victoire') sons.victoire(); else if (resultat === 'defaite') sons.defaite();
      changerDEtape({ nom: 'fin', resultat, nonEnregistree: false, ...fin });
    } catch (e) {
      setErreur(`${e instanceof Error ? e.message : String(e)} Ton résultat reste affiché : réessaie avec « Voir le résultat ».`);
    } finally {
      enregistrementEnCours.current = false;
      setEnregistrement(false);
    }
  };

  const abandonner = async (): Promise<void> => {
    if (!terrain || enregistrementEnCours.current || !window.confirm('Abandonner ce duel ? Cela compte comme une défaite, sans récompense.')) return;
    if (enLigne.actif) { await enLigne.agir({type:'abandonner'}); return; }
    enregistrementEnCours.current = true;
    setEnregistrement(true);
    setErreur(null);
    try {
      await abandonnerLeDuel(terrain.adversaire, ticket);
      setDuel(null);
      changerDEtape({ nom: 'accueil' });
    } catch (e) { setErreur(e instanceof Error ? e.message : String(e)); }
    finally { enregistrementEnCours.current = false; setEnregistrement(false); }
  };

  const incidentServeur = enLigne.erreur && <div className="bloc bloc--alerte" role="alert"><p>{enLigne.erreur}</p><div className="rangee-de-boutons"><button type="button" className="bouton" disabled={enLigne.occupe} onClick={() => void enLigne.reessayer()}>Réessayer</button><button type="button" className="bouton bouton--discret" disabled={enLigne.occupe} onClick={() => void enLigne.reprendre()}>Reprendre la partie enregistrée</button></div></div>;
  if (enLigne.actif && !enLigne.repris) return <main className="ecran"><p>Reprise de ta partie…</p>{incidentServeur}</main>;
  if (deck.etat === 'erreur' && !enLigne.combat) return <main className="ecran"><p role="alert">{deck.message}</p><button className="bouton" onClick={() => window.location.reload()}>Réessayer</button></main>;
  if (!sauvegarde || (deck.etat !== 'pret' && !enLigne.combat)) return <main className="ecran"><p className="texte-doux">Chargement…</p></main>;

  // ── Avant le duel : le niveau, le deck, les règles ─────────────────────────
  if (etape.nom === 'accueil' || etape.nom === 'preparation' || !duel || !terrain) {
    const disponibles = deck.etat === 'pret' ? deck.donnees : [];
    const pret = disponibles.length === REGLES.tailleDuDeck;
    const victoiresDuJour = sauvegarde.duels.jour === jourDe(Date.now()) ? sauvegarde.duels.victoiresDuJour : 0;
    const pleinesRestantes = Math.max(0, REGLES.victoiresPleinesParJour - victoiresDuJour);
    return (
      <main className="ecran duel-salon">
        {incidentServeur}
        <h1 className="visuellement-cache">Les duels</h1>
        <header className="duel-salon__modes">

          <div className="modes" role="tablist" aria-label="Mode de duel" onKeyDown={choisirAuxFleches(MODES, mode, setMode)}>
            <button type="button" role="tab" id="onglet-entrainement" aria-controls="panneau-des-duels" aria-selected={mode === 'entrainement'} tabIndex={mode === 'entrainement' ? 0 : -1} onClick={() => setMode('entrainement')}>Entraînement</button>
            <button type="button" role="tab" id="onglet-joute" aria-controls="panneau-des-duels" aria-selected={mode === 'joute'} tabIndex={mode === 'joute' ? 0 : -1} onClick={() => setMode('joute')}>Joutes classées</button>
          </div>
        </header>

        <div className="duel-salon__panneau" role="tabpanel" id="panneau-des-duels" aria-labelledby={`onglet-${mode}`}>
        {!pret ? (
          <section className="rubrique">
            <p>Deck incomplet : {disponibles.length} / {REGLES.tailleDuDeck} timbres jouables.</p>
            <a className="bouton" href={lien({ ecran: 'deck' })}>Composer mon deck</a>
          </section>
        ) : mode === 'joute' ? (
          <>
            {erreur && <p className="bloc bloc--alerte" role="alert">{erreur}</p>}
            <PanneauDesJoutes sauvegarde={sauvegarde} enPreparation={etape.nom === 'preparation' || enLigne.bloque} onDefier={(profil) => void lancer({ type: 'joute', profil })} />
          </>
        ) : (
          <div className="panneaux">
            <section className="rubrique panneaux__large commande-duel">
              <div className="niveaux niveaux--entrainement" role="radiogroup" aria-label="Niveau de l'ordinateur" onKeyDown={choisirAuxFleches(NIVEAUX, niveau, setNiveau)}>
                {NIVEAUX.map((n, rang) => (
                  <button key={n} type="button" role="radio" aria-checked={niveau === n} tabIndex={niveau === n ? 0 : -1} className="niveau" onClick={() => setNiveau(n)}>
                    <span className="niveau__gravure" aria-hidden="true">
                      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor">
                        <path className="niveau__medaillon" d="M32 3 57 17v30L32 61 7 47V17Z" />
                        <path d="M32 8 52 20v24L32 56 12 44V20Z" opacity=".35" />
                        {Array.from({ length: rang + 1 }, (_, i) => <path key={i} d={`m${32 - rang * 7 + i * 14} 19 3 7-3 19-3-19Z`} fill="currentColor" strokeWidth=".5" />)}
                      </svg>
                    </span>
                    <span className="niveau__inscription"><strong>{n}</strong><span className="niveau__gain">Victoire <b>+{REGLES.encreParVictoire[n]}</b> Encre</span></span>
                    <span className="niveau__temoin" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="m4 8 3 3 5-6" strokeWidth="1.5" /></svg></span>
                  </button>
                ))}
              </div>
              <p className="texte-doux petit">
                {pleinesRestantes > 0
                  ? `${pluriel(pleinesRestantes, 'victoire')} à pleine récompense restante${pleinesRestantes > 1 ? 's' : ''} aujourd'hui, puis gains réduits.`
                  : "Gains réduits jusqu'à demain."}
                {' '}Défaite : +{REGLES.encreParDefaite} Encre.
              </p>
              {erreur && <p className="bloc bloc--alerte" role="alert">{erreur}</p>}
              <div className="rangee-de-boutons commande-duel__actions">
                <button type="button" className="bouton bouton-presse bouton-sceau" data-frappe={etape.nom === 'preparation'} aria-busy={etape.nom === 'preparation'} disabled={etape.nom === 'preparation' || enLigne.bloque} onClick={() => void lancer({ type: 'entrainement', niveau })}><SceauDuel /><span>{etape.nom === 'preparation' ? 'Préparation du duel…' : 'Lancer le duel'}</span><span className="bouton-presse__fleche" aria-hidden="true">↗</span></button>
                <a className="bouton bouton--discret bouton-plaque" href={lien({ ecran: 'deck' })}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M7 5h13v16H7ZM4 18H2V2h14" /><path d="m13.5 10 3 3-3 3-3-3Z" /></svg><span>Modifier mon deck</span></a>
              </div>
            </section>

            <details className="rubrique repliable">
              <summary><h2>Voir mon deck</h2></summary>
              <div className="deck">
                {disponibles.map((carte) => <CarteLegendee key={carte.id} carte={carte} finition={meilleureFinition(sauvegarde.cartes[carte.id])} maitriseeLe={sauvegarde.cartes[carte.id].maitriseeLe} />)}
              </div>
            </details>

            <details className="rubrique repliable">
              <summary><h2>Règles du duel</h2></summary>
              <ul className="regles">
                <li><strong>Départ :</strong> {REGLES.pointsDeVie} points de vie et {REGLES.cartesEnMain} cartes en main. Choisis une carte face au mot adverse.</li>
                <li><strong>Cartes :</strong> chaque carte jouée est épuisée pour ce duel, même en cas d’erreur. Pioche une nouvelle carte tant qu’il en reste ; ta collection est conservée.</li>
                <li><strong>Attaque :</strong> retrouve la définition de ton mot parmi quatre{duree === null ? ', sans limite de temps' : ` en ${duree} secondes`}. Une erreur annule ton attaque.</li>
                <li><strong>Parade :</strong> retrouve ensuite la définition du mot adverse pour diviser ses dégâts par deux.</li>
                <li><strong>Dégâts :</strong> attaque + bonus − moitié de la défense adverse, minimum {REGLES.degatsMinimum}. Tu frappes en premier. Les mots rares ont un bonus d'attaque et sont moins souvent parés. Les Hors-série sont plus connues, mais restent très puissantes même parées.</li>
                <li><strong>Bonus :</strong> +{REGLES.bonusDeType} selon le cycle nom &gt; adjectif &gt; verbe &gt; nom ; +{REGLES.bonusDeFaction} pour deux mots de même origine à la suite (+{REGLES.bonusDePetiteFaction} pour une petite langue).</li>
                <li><strong>Victoire :</strong> réduis l'adversaire à zéro point de vie, ou garde le plus de points après {REGLES.manchesMaximum} manches ou lorsqu’un camp n’a plus de cartes. À égalité, match nul.</li>
                <li><strong>Maîtrise :</strong> {REGLES.reussitesPourLaMaitrise} bonnes réponses sur un mot de ta collection lui donnent son cachet « Maîtrisé ».</li>
              </ul>
            </details>
          </div>
        )}
        </div>
      </main>
    );
  }

  // ── Pendant le duel ────────────────────────────────────────────────────────
  const affiche = etape.nom === 'bilan' ? etape.apres : duel;
  const { joueur, adversaire } = affiche.camps;
  // Les cartes du joueur gardent leur plus belle finition et leur cachet de maîtrise.
  const timbreDuJoueur = (carte: CarteIndex): Habillage => {
    const possedee = sauvegarde.cartes[carte.id];
    return { carte, finition: possedee ? meilleureFinition(possedee) : 'Normale', maitriseeLe: possedee?.maitriseeLe ?? null };
  };
  const enEpreuve = etape.nom === 'attaque' || etape.nom === 'echappe' || etape.nom === 'parade';
  const enJoute = terrain.adversaire.type === 'joute' ? terrain.adversaire.profil : null;
  const nomAdverse = enJoute ? enJoute.pseudo : "L'ordinateur";
  const resolution = etape.nom === 'bilan' ? etape.apres.manches.at(-1) : undefined;
  const carteJouee = etape.nom === 'choix' ? joueur.main.find((c) => c.id === etape.choisie) : 'carte' in etape ? etape.carte : undefined;

  return (
    <main className="ecran duel" data-phase={etape.nom} aria-busy={enLigne.occupe}>
      {incidentServeur}
      {enLigne.occupe && <p role="status" className="texte-doux petit">Enregistrement…</p>}
      {erreur && <p className="bloc bloc--alerte" role="alert">{erreur}</p>}
      <h1 className="visuellement-cache">Duel contre {nomAdverse}</h1>
      <header className="duel__camps">
        <Jauge nom={nomAdverse} camp={adversaire} maison={enJoute?.maison} avant={duel.camps.adversaire.pv} delai="450ms" />
        <span className="duel__manche">{duel.manche === 1 && <SceauDuel empreinte />}<span>Manche {duel.manche}<small> / {REGLES.manchesMaximum}</small></span><small>{terrain.adversaire.type === 'joute' ? `Joute · cote ${terrain.adversaire.profil.cote}` : `Niveau ${terrain.adversaire.niveau.toLowerCase()}`}</small></span>
        <Jauge nom="Toi" camp={joueur} avant={duel.camps.joueur.pv} delai="750ms" />
      </header>

      {'adverse' in etape && <section className="duel__table duel-arene" aria-label="Les mots de la manche" data-compact={enEpreuve}>
        <div className="duel-arene__place" data-camp="adversaire" data-actif={etape.nom === 'parade'} data-frappe={!!resolution && adversaire.pv > 0 && resolution.adversaire.reussie}>
          <MotPose key={etape.adverse.id} titre="Son mot" carte={etape.adverse} secret={etape.nom !== 'bilan'} />
          {resolution && <Impact key={`adversaire-${duel.manche}`} attaque={resolution.joueur} />}
        </div>
        <div className="duel-arene__liaison" aria-hidden="true"><span>{etape.nom === 'attaque' ? '↖' : etape.nom === 'parade' ? '↘' : '◇'}</span></div>
        <div className="duel-arene__place" data-camp="joueur" data-actif={etape.nom === 'attaque'} data-frappe={resolution?.joueur.reussie ?? false}>
          {carteJouee ? <MotPose key={carteJouee.id} titre="Ton mot" habillage={timbreDuJoueur(carteJouee)} carte={carteJouee} secret={etape.nom !== 'bilan'} />
            : <figure className="duel__mot-pose"><figcaption className="entete__surtitre">Ton mot</figcaption><div className="deck__vide" /></figure>}
          {resolution && <Impact key={`joueur-${duel.manche}`} attaque={resolution.adversaire} annulee={adversaire.pv === 0} />}
        </div>
      </section>}

      {etape.nom === 'choix' && (() => {
        const choisie = joueur.main.find((c) => c.id === etape.choisie) ?? null;
        return (
          <>
            <section className="rubrique duel__tour" aria-live="polite">
              <h2>Ta main</h2>
              <p className="texte-doux petit">{joueur.main.length + joueur.pioche.length} cartes encore disponibles · {joueur.pioche.length} dans la pioche. Chaque carte ne se joue qu’une fois.</p>
              <p className="texte-doux petit">Connaître ton mot, choisir le bon type, garder une carte pour la suite : à toi de décider.</p>
              {joueur.derniere && <p className="texte-doux petit">Ton mot précédent : <strong>{joueur.derniere.mot}</strong> · {joueur.derniere.faction}.</p>}
              {adversaire.derniere && <p className="texte-doux petit">Son mot précédent : <strong>{adversaire.derniere.mot}</strong> · {adversaire.derniere.faction}.</p>}
              <div className="duel__main">
                {joueur.main.map((carte) => (
                  <div key={carte.id} className="duel__carte" data-choisie={carte.id === etape.choisie}>
                    <CarteLegendee {...timbreDuJoueur(carte)} sansDefinition onChoisir={() => changerDEtape({ ...etape, choisie: carte.id })} action="répondre par cette carte" />
                  </div>
                ))}
              </div>
              {choisie ? (
                // Sur téléphone, ce bandeau reste collé en bas de l'écran : le bouton « Jouer » est toujours sous le pouce.
                <div className="duel__action">
                  <p className="duel__engagement">
                    <strong>Jouer « {choisie.mot} » ?</strong>
                    <span className="texte-doux petit">Cette carte sera épuisée pour le reste du duel, même si tu rates sa définition.</span>
                  </p>
                  <button type="button" className="bouton" disabled={enLigne.bloque} onClick={() => { sons.preparer(); sons.poser(); if (enLigne.actif) { void enLigne.agir({type:'choisir',carte:choisie.id}); return; } changerDEtape({ nom: 'attaque', adverse: etape.adverse, carte: choisie, epreuve: poserLEpreuve(terrain, choisie, etape.adverse), debut: Date.now() }); }}>Jouer</button>
                </div>
              ) : null}
            </section>
          </>
        );
      })()}

      {(etape.nom === 'attaque' || etape.nom === 'parade') && (
        // La clé change entre l'attaque et la parade : le mot de la nouvelle question reprend la main.
        <section key={etape.nom} className="bloc epreuve">
          {etape.nom === 'parade' && etape.attaque.juste && <p className="epreuve__rappel" data-reussi="true">✔ Attaque réussie</p>}
          {etape.nom === 'parade' && !etape.attaque.juste && <p className="epreuve__rappel" data-reussi="false">Attaque manquée</p>}
          <p className="entete__surtitre">{etape.nom === 'attaque' ? 'Attaque · ton mot' : 'Parade · son mot'}</p>
          <h2 className="epreuve__mot" lang="fr" tabIndex={-1} ref={viserLeMot}>{etape.epreuve.mot}</h2>
          <p className="texte-doux petit">{(etape.nom === 'attaque' ? etape.carte : etape.adverse).type} · Quelle est sa définition ?</p>
          {duree !== null && <Sablier debut={etape.debut} secondes={duree} onTic={() => sons.tic()} />}
          <Propositions epreuve={etape.epreuve} onRepondre={repondre} disabled={enLigne.bloque} />
        </section>
      )}

      {etape.nom === 'echappe' && (
        <section className="bloc epreuve" aria-live="polite">
          <p className="entete__surtitre">{etape.attaque.choisie === null ? 'Temps écoulé' : 'Mauvaise réponse'}</p>
          <h2 className="epreuve__mot" lang="fr">{etape.carte.mot}</h2>
          <p className="duel__verdict" data-reussi="false">Pas d'attaque cette manche.</p>
          <Propositions epreuve={etape.attaque.epreuve} reponse={etape.attaque} />
          <div className="duel__suite">
            <button type="button" className="bouton" ref={viser} disabled={enLigne.bloque} onClick={() => { if (enLigne.actif) { void enLigne.agir({type:'continuer'}); return; } changerDEtape({ nom: 'parade', adverse: etape.adverse, carte: etape.carte, attaque: etape.attaque, epreuve: poserLEpreuve(terrain, etape.adverse, etape.carte), debut: Date.now() }); }}>
              Passer à la parade
            </button>
          </div>
        </section>
      )}

      {etape.nom === 'bilan' && (() => {
        const manche = etape.apres.manches.at(-1)!;
        const fini = etape.apres.vainqueur !== null;
        const reussites = sauvegarde.cartes[etape.carte.id]?.reussites ?? 0;
        const dejaMaitrise = (sauvegarde.cartes[etape.carte.id]?.maitriseeLe ?? null) !== null;
        const viennentDEtreMaitrises = [etape.attaque.maitrise ? etape.carte.mot : '', etape.parade.maitrise ? etape.adverse.mot : ''].filter(Boolean);
        return (
          <>
            <section className="rubrique duel__tour" aria-live="polite">
              <h2>Manche {manche.numero}</h2>
              <p className="duel__verdict" data-reussi={manche.joueur.reussie}>
                <span className="entete__surtitre">Ton attaque</span>
                {manche.joueur.reussie
                  ? <><strong>{pluriel(manche.joueur.infliges, 'dégât')}</strong>{manche.joueur.paree && <> · parée (au lieu de {manche.joueur.degats})</>}</>
                  : <>Manquée · aucun dégât</>}
              </p>
              <p className="duel__verdict" data-reussi={!manche.adversaire.reussie || manche.adversaire.paree}>
                <span className="entete__surtitre">Son attaque</span>
                {adversaire.pv === 0
                  ? <>Adversaire vaincu avant de frapper</>
                  : !manche.adversaire.reussie
                    ? <>Manquée · aucun dégât</>
                    : etape.parade.juste
                      ? <><strong>{pluriel(manche.adversaire.infliges, 'dégât')}</strong> · parée (au lieu de {manche.adversaire.degats})</>
                      : <><strong>{pluriel(manche.adversaire.infliges, 'dégât')}</strong> · {etape.parade.choisie === null ? 'temps écoulé pour parer' : 'parade manquée'}</>}
              </p>

              {!etape.parade.juste && (
                <div className="duel__lecon">
                  <p className="entete__surtitre">À retenir — {etape.adverse.mot}</p>
                  <Propositions epreuve={etape.parade.epreuve} reponse={etape.parade} seulementLUtile />
                </div>
              )}

              <p className="texte-doux petit">
                {viennentDEtreMaitrises.length > 0
                  ? `Cachet « Maîtrisé » obtenu : ${viennentDEtreMaitrises.join(', ')}.`
                  : dejaMaitrise ? `« ${etape.carte.mot} » : maîtrisé.` : `Maîtrise · ${etape.carte.mot} : ${Math.min(reussites, REGLES.reussitesPourLaMaitrise)} / ${REGLES.reussitesPourLaMaitrise}`}
              </p>
              <div className="duel__suite"><button type="button" className="bouton" ref={viser} disabled={enregistrement || enLigne.bloque} onClick={() => void continuer(etape.apres)}>{enregistrement ? 'Enregistrement du résultat…' : fini ? 'Voir le résultat' : 'Manche suivante'}</button></div>
            </section>
          </>
        );
      })()}

      {etape.nom === 'fin' && (
        <section className="bloc duel__fin" aria-live="polite">
          <p className="entete__surtitre">{pluriel(duel.manches.length, 'manche')}</p>
          <GainDuDuel resultat={etape.resultat} encre={etape.encre} xp={enLigne.combat?.xp ?? Math.max(0, sauvegarde.profil.xp - xpAuDebut.current)} />
          <p>
            {etape.nonEnregistree && <><span className="joute__refus">Serveur indisponible : résultat non enregistré, cote inchangée.</span><br /></>}
            {etape.cote && !etape.nonEnregistree && (
              <>
                <strong>Cote : {etape.cote.avant} → {etape.cote.apres}</strong> ({etape.cote.apres >= etape.cote.avant ? '+' : ''}{etape.cote.apres - etape.cote.avant})
                {ligueDe(etape.cote.apres, EQUILIBRAGE.joute).rang > ligueDe(etape.cote.avant, EQUILIBRAGE.joute).rang && <> — <strong>tu montes en ligue {ligueDe(etape.cote.apres, EQUILIBRAGE.joute).nom} !</strong></>}
                {ligueDe(etape.cote.apres, EQUILIBRAGE.joute).rang < ligueDe(etape.cote.avant, EQUILIBRAGE.joute).rang && <> — tu redescends en ligue {ligueDe(etape.cote.apres, EQUILIBRAGE.joute).nom}.</>}
                <br />
              </>
            )}
            {etape.reduite && <span className="texte-doux petit">Gains réduits après {REGLES.victoiresPleinesParJour} victoires aujourd'hui.</span>}
          </p>
          <p className="texte-doux">
            Attaques réussies : {bilan.attaquesReussies} / {bilan.attaques} · Parades : {bilan.paradesReussies} / {bilan.parades}
            {bilan.maitrises.length > 0 && ` Mot${bilan.maitrises.length > 1 ? 's' : ''} maîtrisé${bilan.maitrises.length > 1 ? 's' : ''} : ${bilan.maitrises.join(', ')}.`}
          </p>
          <div className="rangee-de-boutons">
            {terrain.adversaire.type === 'entrainement'
              ? <button type="button" className="bouton" disabled={enLigne.bloque} onClick={() => void lancer(terrain.adversaire)}>Rejouer</button>
              : <button type="button" className="bouton" disabled={enLigne.bloque} onClick={retourAuSalon}>Nouvelle joute</button>}
            {terrain.adversaire.type === 'entrainement' && <button type="button" className="bouton bouton--discret" disabled={enLigne.bloque} onClick={retourAuSalon}>Changer de niveau</button>}
            <a className="bouton bouton--discret" href={lien({ ecran: 'deck' })}>Modifier mon deck</a>
          </div>
        </section>
      )}

      {etape.nom !== 'fin' && (enLigne.actif || !enEpreuve) && (!!erreur || !(etape.nom === 'bilan' && etape.apres.vainqueur !== null)) && <button type="button" className="bouton bouton--discret duel__abandon" disabled={enregistrement || enLigne.bloque} onClick={() => void abandonner()}>Abandonner</button>}
    </main>
  );
}

function Jauge({ nom, camp, maison, avant, delai }: { nom: string; camp: Camp; maison?: boolean; avant: number; delai: string }) {
  return (
    <div className="jauge" style={{ '--impact-delai': delai } as import('react').CSSProperties} role="img" aria-label={`${nom}${maison === true ? ', joueur simulé' : ''} : ${pluriel(camp.pv, 'point')} de vie sur ${REGLES.pointsDeVie}`}>
      <span className="jauge__nom">{nom}</span>
      <BadgeJoueurSimule maison={maison} />
      <span className="jauge__barre" aria-hidden="true"><span style={{ width: `${(camp.pv / REGLES.pointsDeVie) * 100}%` }} /></span>
      <span key={`${avant}-${camp.pv}`} className="jauge__pv" data-perte={avant > camp.pv} aria-hidden="true"><span className="jauge__actuels">{camp.pv}</span>{avant > camp.pv && <span className="jauge__precedents">{avant}</span>}</span>
    </div>
  );
}

function Impact({ attaque, annulee = false }: { attaque: Attaque; annulee?: boolean }) {
  const touche = !annulee && attaque.reussie;
  return <div className="duel-impact" data-touche={touche} data-pare={touche && attaque.paree} aria-hidden="true">
    {touche && <svg className="duel-impact__trace" viewBox="0 0 100 120" fill="none" stroke="currentColor">
      {attaque.paree ? <path d="M50 9 85 25v34c0 23-20 42-35 51C35 101 15 82 15 59V25Z M50 20v74" />
        : <><path d="m20 90 60-60m-50 68 54-72" /><path d="m19 49-8-4m69 34 10 5M45 18l-3-9M57 99l3 11" /></>}
    </svg>}
    <span className="duel-impact__chiffre">{annulee ? 'Sans riposte' : touche ? attaque.infliges === 0 ? 'Bloquée' : `${attaque.paree ? 'Parée · ' : ''}−${attaque.infliges}` : 'Manquée'}</span>
  </div>;
}

// Un mot posé sur la table. « secret » : sa définition reste cachée (elle va être demandée).
function MotPose({ titre, carte, habillage, secret = false }: { titre: string; carte: CarteIndex; habillage?: Habillage; secret?: boolean }) {
  return (
    <figure className="duel__mot-pose">
      <figcaption className="entete__surtitre">{titre}</figcaption>
      <Carte {...(habillage ?? { carte })} cliquable={false} sansDefinition={secret} />
      {/* La définition en clair : sur un petit écran, celle du timbre est trop fine pour être lue. */}
      {!secret && <span className="duel__definition texte-doux" lang="fr">{carte.definition}</span>}
    </figure>
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

// Le temps qui reste pour répondre : une barre qui se vide, et les secondes en toutes lettres.
function Sablier({ debut, secondes, onTic }: { debut: number; secondes: number; onTic: () => void }) {
  const maintenant = useMaintenant(200);
  const reste = Math.max(0, debut + secondes * 1000 - maintenant);
  // Les cinq dernières secondes s'entendent : un tic par seconde.
  const secondesRestantes = Math.ceil(reste / 1000);
  const tic = useRef(onTic);
  tic.current = onTic;
  useEffect(() => { if (secondesRestantes > 0 && secondesRestantes <= 5) tic.current(); }, [secondesRestantes]);
  return (
    <div className="sablier" role="timer" aria-label={`${Math.ceil(reste / 1000)} secondes restantes`} data-presse={reste < 5000}>
      <span className="sablier__barre" aria-hidden="true"><span style={{ width: `${(reste / (secondes * 1000)) * 100}%` }} /></span>
      <span className="sablier__secondes" aria-hidden="true">{Math.ceil(reste / 1000)} s</span>
    </div>
  );
}
