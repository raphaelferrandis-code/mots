// Le duel : à l'entraînement contre l'ordinateur, ou en joute classée contre le « double » d'un autre joueur.
// L'écran ne contient aucune règle : il affiche l'état du duel et passe par src/services/ pour chaque action.
// Une manche : l'adversaire pose un mot, le joueur lui répond par une
// carte de sa main, puis il doit retrouver la définition de SON mot (son attaque porte) et celle du mot ADVERSE
// (il pare). Les deux attaques sont alors réglées, et l'on passe à la manche suivante.

import { useEffect, useRef, useState } from 'react';
import { Carte } from '../composants/carte/Carte.tsx';
import { CarteLegendee } from '../composants/carte/CarteLegendee.tsx';
import { Entete } from '../composants/Entete.tsx';
import { useChargement } from '../composants/useChargement.ts';
import { useMaintenant, usePartie } from '../composants/usePartie.ts';
import { EQUILIBRAGE, attaqueEnJeu } from '../config/equilibrage.ts';
import { NIVEAUX } from '../jeu/duel.ts';
import type { Attaque, Camp, Duel as EtatDuDuel, Niveau, Prevision } from '../jeu/duel.ts';
import type { Epreuve } from '../jeu/epreuve.ts';
import { ligueDe } from '../jeu/joute.ts';
import { jourDe } from '../jeu/progression.ts';
import type { Resultat } from '../jeu/progression.ts';
import { meilleureFinition } from '../jeu/sauvegarde.ts';
import type { Sauvegarde } from '../jeu/sauvegarde.ts';
import { lien } from '../navigation/routes.ts';
import type { CarteIndex, Finition } from '../partage/types.ts';
import { deckJouable, motDeLOrdinateur, poserLEpreuve, preparerUnDuel, prevoirLaManche, reglerLaManche } from '../services/duel.ts';
import type { Adversaire, Terrain } from '../services/duel.ts';
import { finirLeDuel, noterLaParade, noterLaReponse } from '../services/partie.ts';
import type { FinDeDuel } from '../services/partie.ts';
import { PanneauDesJoutes } from './PanneauDesJoutes.tsx';

const REGLES = EQUILIBRAGE.duel;

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
  | ({ nom: 'fin'; resultat: Resultat } & FinDeDuel);

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

const pluriel = (n: number, mot: string): string => `${n} ${mot}${n > 1 ? 's' : ''}`;

function descriptionDuNiveau(niveau: Niveau): string {
  const crans = REGLES.cransDeRareteDeLOrdinateur[niveau];
  const mots = crans <= 0 ? 'Ses mots sont aussi courants que les tiens' : `Ses mots sont ${crans >= 2 ? 'bien ' : ''}plus rares que les tiens : ils frappent plus fort, et sont plus durs à parer`;
  const oublis = Math.round((1 - REGLES.reussiteDeLOrdinateur[niveau]) * 100) / 10; // arrondi : 1 − 0,9 ne fait pas tout à fait 0,1 pour un ordinateur
  const frequence = Number.isInteger(oublis) ? `${oublis}` : `${Math.floor(oublis)} à ${Math.ceil(oublis)}`;
  return `${mots}. ${niveau === 'Facile' ? 'Il les pose au hasard' : 'Il pose toujours sa carte la plus solide'}, et son mot lui échappe ${frequence} fois sur 10.`;
}

export function Duel() {
  const partie = usePartie();
  const sauvegarde = partie.etat === 'prete' ? partie.sauvegarde : null;
  // Le deck est relu à chaque changement de deck ou de réglage de contenu.
  const cleDuDeck = sauvegarde ? `${sauvegarde.deck.join(',')}|${sauvegarde.reglages.masquerFamiliers}|${sauvegarde.reglages.masquerInjurieux}` : 'attente';
  const deck = useChargement(deckJouable, `deck:${cleDuDeck}`);

  const [mode, setMode] = useState<Adversaire['type']>('entrainement');
  const [niveau, setNiveau] = useState<Niveau>('Normal');
  const [terrain, setTerrain] = useState<Terrain | null>(null);
  const [duel, setDuel] = useState<EtatDuDuel | null>(null);
  const [etape, setEtape] = useState<Etape>({ nom: 'accueil' });
  const [bilan, setBilan] = useState<Bilan>(BILAN_VIDE);
  const [erreur, setErreur] = useState<string | null>(null);

  // La dernière étape connue, pour qu'une réponse et la fin du temps ne comptent jamais toutes les deux.
  const etapeActuelle = useRef(etape);
  etapeActuelle.current = etape;

  const changerDEtape = (suivante: Etape): void => {
    etapeActuelle.current = suivante;
    setEtape(suivante);
    window.scrollTo({ top: 0 });
  };

  const lancer = async (adversaire: Adversaire): Promise<void> => {
    changerDEtape({ nom: 'preparation' });
    setErreur(null);
    try {
      const pret = await preparerUnDuel(adversaire);
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
    if (enCours.nom === 'attaque') {
      const juste = choisie === enCours.epreuve.bonne;
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
      const parade: Reponse = { epreuve: enCours.epreuve, choisie, juste, maitrise: noterLaReponse(enCours.adverse.id, juste) };
      setBilan((b) => ({ ...b, parades: b.parades + 1, paradesReussies: b.paradesReussies + (juste ? 1 : 0), maitrises: parade.maitrise ? [...b.maitrises, enCours.adverse.mot] : b.maitrises }));
      changerDEtape({ nom: 'bilan', adverse: enCours.adverse, carte: enCours.carte, attaque: enCours.attaque, parade, apres: reglerLaManche(terrain, duel, enCours.carte, enCours.adverse, enCours.attaque.juste, juste) });
    }
  };

  // Le temps de l'épreuve : à son terme, la réponse est comptée fausse.
  const duree = sauvegarde ? secondesPourRepondre(sauvegarde) : null;
  const repondreALaFinDuTemps = useRef(repondre);
  repondreALaFinDuTemps.current = repondre;
  useEffect(() => {
    if ((etape.nom !== 'attaque' && etape.nom !== 'parade') || duree === null) return;
    const minuterie = setTimeout(() => repondreALaFinDuTemps.current(null), Math.max(0, etape.debut + duree * 1000 - Date.now()));
    return () => clearTimeout(minuterie);
  }, [etape, duree]);

  // Après le bilan d'une manche : le duel est fini, ou l'ordinateur pose son mot suivant.
  const continuer = (apres: EtatDuDuel): void => {
    if (!terrain) return;
    setDuel(apres);
    if (apres.vainqueur !== null) {
      const resultat: Resultat = apres.vainqueur === 'joueur' ? 'victoire' : apres.vainqueur === 'nul' ? 'nul' : 'defaite';
      changerDEtape({ nom: 'fin', resultat, ...finirLeDuel(terrain.adversaire, resultat) });
    } else changerDEtape({ nom: 'choix', adverse: motDeLOrdinateur(terrain, apres), choisie: null });
  };

  const abandonner = (): void => {
    if (!window.confirm('Abandonner ce duel ? Tu ne recevras aucune récompense.')) return;
    setDuel(null);
    changerDEtape({ nom: 'accueil' });
  };

  if (!sauvegarde || deck.etat !== 'pret') return <main className="ecran"><p className="texte-doux">Chargement…</p></main>;

  // ── Avant le duel : le niveau, le deck, les règles ─────────────────────────
  if (etape.nom === 'accueil' || etape.nom === 'preparation' || !duel || !terrain) {
    const pret = deck.donnees.length === REGLES.tailleDuDeck;
    const victoiresDuJour = sauvegarde.duels.jour === jourDe(Date.now()) ? sauvegarde.duels.victoiresDuJour : 0;
    const pleinesRestantes = Math.max(0, REGLES.victoiresPleinesParJour - victoiresDuJour);
    return (
      <main className="ecran">
        <Entete surtitre="Duel" titre={mode === 'joute' ? 'Joutes classées' : "Duel d'entraînement"}>Mot contre mot : prouve que tu connais le tien… et le sien.</Entete>

        <div className="modes" role="tablist" aria-label="Mode de duel">
          <button type="button" role="tab" aria-selected={mode === 'entrainement'} onClick={() => setMode('entrainement')}>Entraînement<small>contre l'ordinateur</small></button>
          <button type="button" role="tab" aria-selected={mode === 'joute'} onClick={() => setMode('joute')}>Joutes classées<small>contre d'autres joueurs</small></button>
        </div>

        {!pret ? (
          <section className="bloc">
            <p>{deck.donnees.length === 0 ? "Tu n'as pas encore de deck." : `Ton deck compte ${pluriel(deck.donnees.length, 'carte')} jouable${deck.donnees.length > 1 ? 's' : ''} sur ${REGLES.tailleDuDeck}.`} Compose-le d'abord : dix cartes choisies dans ta collection.</p>
            <a className="bouton" href={lien({ ecran: 'deck' })}>Composer mon deck</a>
          </section>
        ) : mode === 'joute' ? (
          <>
            {erreur && <p className="bloc bloc--alerte" role="alert">{erreur}</p>}
            <PanneauDesJoutes sauvegarde={sauvegarde} enPreparation={etape.nom === 'preparation'} onDefier={(profil) => void lancer({ type: 'joute', profil })} />
          </>
        ) : (
          <>
            <section className="bloc">
              <h2>Ton adversaire</h2>
              <div className="niveaux" role="radiogroup" aria-label="Niveau de l'ordinateur">
                {NIVEAUX.map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={niveau === n} className="niveau" onClick={() => setNiveau(n)}>
                    <strong>{n}</strong>
                    <span className="texte-doux petit">{descriptionDuNiveau(n)}</span>
                    <span className="niveau__gain">Victoire : +{REGLES.encreParVictoire[n]} Encre</span>
                  </button>
                ))}
              </div>
              <p className="texte-doux petit">
                {pleinesRestantes > 0
                  ? `Encore ${pluriel(pleinesRestantes, 'victoire')} à pleine récompense aujourd'hui ; les suivantes rapportent moins.`
                  : "Tu as eu tes victoires à pleine récompense aujourd'hui : les suivantes rapportent moins, jusqu'à demain."}
                {' '}Une défaite rapporte {REGLES.encreParDefaite} Encre.
              </p>
              {erreur && <p className="bloc bloc--alerte" role="alert">{erreur}</p>}
              <div className="rangee-de-boutons">
                <button type="button" className="bouton" disabled={etape.nom === 'preparation'} onClick={() => void lancer({ type: 'entrainement', niveau })}>{etape.nom === 'preparation' ? 'Préparation du duel…' : 'Lancer le duel'}</button>
                <a className="bouton bouton--discret" href={lien({ ecran: 'deck' })}>Changer mon deck</a>
              </div>
            </section>

            <section className="bloc">
              <h2>Ton deck</h2>
              <div className="deck">
                {deck.donnees.map((carte) => <CarteLegendee key={carte.id} carte={carte} finition={meilleureFinition(sauvegarde.cartes[carte.id])} maitriseeLe={sauvegarde.cartes[carte.id].maitriseeLe} />)}
              </div>
            </section>

            <details className="bloc repliable">
              <summary><h2>Les règles en bref</h2></summary>
              <ul className="regles">
                <li>Chacun a {REGLES.pointsDeVie} points de vie et {REGLES.cartesEnMain} cartes en main. À chaque manche, l'ordinateur pose un mot ; tu lui réponds par une de tes cartes.</li>
                <li><strong>Ton mot.</strong> Tu as {duree === null ? 'tout ton temps' : `${duree} secondes`} pour retrouver sa définition parmi quatre. Trouvée : ta carte attaque. Sinon, le mot t'échappe : pas d'attaque.</li>
                <li><strong>Son mot.</strong> Même épreuve sur le mot de l'ordinateur. Trouvée : tu <strong>pares</strong>, et tu ne reçois que la moitié des dégâts. Ses mots changent à chaque duel : on apprend toujours quelque chose.</li>
                <li><strong>Les dégâts</strong> = l'attaque de la carte (chiffre de gauche), plus les bonus, moins la moitié de la défense de la carte d'en face (chiffre de droite), au moins {REGLES.degatsMinimum}. Ton attaque part la première.</li>
                <li><strong>Un mot rare frappe plus fort</strong> (son bonus est déjà compté dans son attaque), et l'ordinateur le pare moins souvent. Mais il est plus difficile à retrouver… pour toi comme pour lui.</li>
                <li>Bonus : le triangle des types (+{REGLES.bonusDeType} : nom &gt; adjectif &gt; verbe &gt; nom) et deux mots de même origine à la suite (+{REGLES.bonusDeFaction}, ou +{REGLES.bonusDePetiteFaction} pour une petite langue).</li>
                <li>Après {REGLES.manchesMaximum} manches, celui qui a le plus de points de vie l'emporte. {REGLES.reussitesPourLaMaitrise} bonnes réponses sur un de tes mots : il est <strong>maîtrisé</strong>, et son timbre reçoit un cachet daté.</li>
              </ul>
            </details>
          </>
        )}
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

  return (
    <main className="ecran duel">
      <header className="duel__camps">
        <Jauge nom={nomAdverse} camp={adversaire} />
        <span className="duel__manche"><span>Manche {duel.manche}<small> / {REGLES.manchesMaximum}</small></span><small>{terrain.adversaire.type === 'joute' ? `Joute · cote ${terrain.adversaire.profil.cote}` : `Niveau ${terrain.adversaire.niveau.toLowerCase()}`}</small></span>
        <Jauge nom="Toi" camp={joueur} />
      </header>

      {etape.nom === 'choix' && (() => {
        const choisie = joueur.main.find((c) => c.id === etape.choisie) ?? null;
        const prevision = choisie ? prevoirLaManche(terrain, duel, choisie, etape.adverse) : null;
        return (
          <>
            <section className="duel__table" aria-label="Les mots de la manche">
              <MotPose titre="Il pose son mot" carte={etape.adverse} secret />
              {choisie ? <MotPose titre="Tu réponds par" habillage={timbreDuJoueur(choisie)} carte={choisie} secret /> : <figure className="duel__mot-pose"><figcaption className="entete__surtitre">Tu réponds par…</figcaption><div className="deck__vide" /></figure>}
            </section>

            <section className="bloc duel__tour" aria-live="polite">
              <h2>Ta main</h2>
              <div className="duel__main">
                {joueur.main.map((carte) => (
                  <div key={carte.id} className="duel__carte" data-choisie={carte.id === etape.choisie}>
                    <CarteLegendee {...timbreDuJoueur(carte)} sansDefinition onChoisir={() => changerDEtape({ ...etape, choisie: carte.id })} action="répondre par cette carte" />
                  </div>
                ))}
              </div>
              {choisie && prevision ? (
                // Sur téléphone, ce bandeau reste collé en bas de l'écran : le bouton « Jouer » est toujours sous le pouce.
                <div className="duel__action">
                  <p className="duel__prevision">
                    <strong>Tu infliges {prevision.mienne.degats}</strong>, tu reçois <strong>{prevision.sienne.degats}</strong> <span className="duel__si-parade">({prevision.sienne.degatsSiParee} si tu pares)</span>
                    <span className="texte-doux petit">{detailDuCalcul(choisie, prevision.mienne)}.</span>
                  </p>
                  <button type="button" className="bouton" onClick={() => changerDEtape({ nom: 'attaque', adverse: etape.adverse, carte: choisie, epreuve: poserLEpreuve(terrain, choisie, etape.adverse), debut: Date.now() })}>Jouer</button>
                </div>
              ) : <p className="texte-doux petit">Touche une carte de ta main pour voir ce que donnerait la manche.</p>}
            </section>
          </>
        );
      })()}

      {(etape.nom === 'attaque' || etape.nom === 'parade') && (
        <section className="bloc epreuve">
          {etape.nom === 'parade' && etape.attaque.juste && <p className="epreuve__rappel" data-reussi="true">✔ Tu connais « {etape.carte.mot} » : ton attaque portera.</p>}
          {etape.nom === 'parade' && !etape.attaque.juste && <p className="epreuve__rappel" data-reussi="false">« {etape.carte.mot} » t'a échappé. Il te reste à parer.</p>}
          <p className="entete__surtitre">{etape.nom === 'attaque' ? 'Ton mot — pour attaquer' : 'Son mot — pour parer'}</p>
          <h2 className="epreuve__mot" lang="fr">{etape.epreuve.mot}</h2>
          <p className="texte-doux petit">{(etape.nom === 'attaque' ? etape.carte : etape.adverse).type} · Quelle est sa définition ?</p>
          {duree !== null && <Sablier debut={etape.debut} secondes={duree} />}
          <Propositions epreuve={etape.epreuve} onRepondre={repondre} />
        </section>
      )}

      {etape.nom === 'echappe' && (
        <section className="bloc epreuve" aria-live="polite">
          <p className="entete__surtitre">{etape.attaque.choisie === null ? 'Temps écoulé' : 'Mauvaise réponse'}</p>
          <h2 className="epreuve__mot" lang="fr">{etape.carte.mot}</h2>
          <p className="duel__verdict" data-reussi="false">Le mot t'échappe : pas d'attaque cette manche. Voici sa définition.</p>
          <Propositions epreuve={etape.attaque.epreuve} reponse={etape.attaque} />
          <div className="duel__suite">
            <button type="button" className="bouton" ref={viser} onClick={() => changerDEtape({ nom: 'parade', adverse: etape.adverse, carte: etape.carte, attaque: etape.attaque, epreuve: poserLEpreuve(terrain, etape.adverse, etape.carte), debut: Date.now() })}>
              À toi de parer « {etape.adverse.mot} »
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
            <section className="duel__table" aria-label="Les mots de la manche">
              <MotPose titre="Son mot" carte={etape.adverse} />
              <MotPose titre="Ton mot" habillage={timbreDuJoueur(etape.carte)} carte={etape.carte} />
            </section>

            <section className="bloc duel__tour" aria-live="polite">
              <h2>Manche {manche.numero}</h2>
              <p className="duel__verdict" data-reussi={manche.joueur.reussie}>
                <span className="entete__surtitre">Ton attaque</span>
                {manche.joueur.reussie
                  ? <>« {etape.carte.mot} » frappe : <strong>{pluriel(manche.joueur.infliges, 'dégât')}</strong>{manche.joueur.paree && <> — {enJoute ? 'ton adversaire' : "l'ordinateur"} connaissait le mot, il a paré (au lieu de {manche.joueur.degats})</>}.</>
                  : <>« {etape.carte.mot} » t'a échappé : pas d'attaque.</>}
              </p>
              <p className="duel__verdict" data-reussi={!manche.adversaire.reussie || manche.adversaire.paree}>
                <span className="entete__surtitre">Son attaque</span>
                {adversaire.pv === 0
                  ? <>Ton attaque l'a terrassé avant qu'il ne frappe.</>
                  : !manche.adversaire.reussie
                    ? <>« {etape.adverse.mot} » lui a échappé : pas d'attaque.</>
                    : etape.parade.juste
                      ? <>Tu connaissais « {etape.adverse.mot} » : <strong>paré</strong>, {pluriel(manche.adversaire.infliges, 'dégât')} au lieu de {manche.adversaire.degats}.</>
                      : <>« {etape.adverse.mot} » frappe : <strong>{pluriel(manche.adversaire.infliges, 'dégât')}</strong>. {etape.parade.choisie === null ? 'Le temps a manqué pour parer.' : "Tu n'as pas su parer."}</>}
              </p>

              {!etape.parade.juste && (
                <div className="duel__lecon">
                  <p className="entete__surtitre">À retenir — {etape.adverse.mot}</p>
                  <Propositions epreuve={etape.parade.epreuve} reponse={etape.parade} seulementLUtile />
                </div>
              )}

              <p className="texte-doux petit">
                {viennentDEtreMaitrises.length > 0
                  ? `Mot maîtrisé ! Le timbre « ${viennentDEtreMaitrises.join(' », « ')} » reçoit son cachet.`
                  : dejaMaitrise ? `« ${etape.carte.mot} » : mot déjà maîtrisé.` : `Maîtrise de « ${etape.carte.mot} » : ${Math.min(reussites, REGLES.reussitesPourLaMaitrise)} / ${REGLES.reussitesPourLaMaitrise} bonnes réponses.`}
              </p>
              <div className="duel__suite"><button type="button" className="bouton" ref={viser} onClick={() => continuer(etape.apres)}>{fini ? 'Voir le résultat' : 'Manche suivante'}</button></div>
            </section>
          </>
        );
      })()}

      {etape.nom === 'fin' && (
        <section className="bloc duel__fin" aria-live="polite">
          <p className="entete__surtitre">Fin du duel · {pluriel(duel.manches.length, 'manche')}</p>
          <h2>{etape.resultat === 'victoire' ? 'Victoire !' : etape.resultat === 'nul' ? 'Match nul' : 'Défaite'}</h2>
          <p>
            {etape.cote && (
              <>
                <strong>Cote : {etape.cote.avant} → {etape.cote.apres}</strong> ({etape.cote.apres >= etape.cote.avant ? '+' : ''}{etape.cote.apres - etape.cote.avant})
                {ligueDe(etape.cote.apres, EQUILIBRAGE.joute).rang > ligueDe(etape.cote.avant, EQUILIBRAGE.joute).rang && <> — <strong>tu montes en ligue {ligueDe(etape.cote.apres, EQUILIBRAGE.joute).nom} !</strong></>}
                {ligueDe(etape.cote.apres, EQUILIBRAGE.joute).rang < ligueDe(etape.cote.avant, EQUILIBRAGE.joute).rang && <> — tu redescends en ligue {ligueDe(etape.cote.apres, EQUILIBRAGE.joute).nom}.</>}
                <br />
              </>
            )}
            <strong>+{etape.encre} Encre</strong>
            {etape.reduite && <span className="texte-doux petit"> — récompense réduite : tu as déjà eu tes {REGLES.victoiresPleinesParJour} victoires à pleine récompense aujourd'hui.</span>}
          </p>
          <p className="texte-doux">
            Tes mots : {bilan.attaquesReussies} définition{bilan.attaquesReussies > 1 ? 's' : ''} retrouvée{bilan.attaquesReussies > 1 ? 's' : ''} sur {bilan.attaques}. Ses mots : {pluriel(bilan.paradesReussies, 'parade')} sur {bilan.parades}.
            {bilan.maitrises.length > 0 && ` Mot${bilan.maitrises.length > 1 ? 's' : ''} maîtrisé${bilan.maitrises.length > 1 ? 's' : ''} : ${bilan.maitrises.join(', ')}.`}
          </p>
          <div className="rangee-de-boutons">
            {terrain.adversaire.type === 'entrainement'
              ? <button type="button" className="bouton" onClick={() => void lancer(terrain.adversaire)}>Rejouer</button>
              : <button type="button" className="bouton" onClick={() => { setDuel(null); changerDEtape({ nom: 'accueil' }); }}>Nouvelle joute</button>}
            {terrain.adversaire.type === 'entrainement' && <button type="button" className="bouton bouton--discret" onClick={() => { setDuel(null); changerDEtape({ nom: 'accueil' }); }}>Changer de niveau</button>}
            <a className="bouton bouton--discret" href={lien({ ecran: 'deck' })}>Changer mon deck</a>
          </div>
        </section>
      )}

      {etape.nom !== 'fin' && !enEpreuve && !(etape.nom === 'bilan' && etape.apres.vainqueur !== null) && <button type="button" className="bouton bouton--discret duel__abandon" onClick={abandonner}>Abandonner</button>}
    </main>
  );
}

// « attaque 9 (dont mot rare +1), triangle des types +2, même origine +1, 3 bloqués par sa défense »
function detailDuCalcul(carte: CarteIndex, attaque: Prevision | Attaque): string {
  return [
    `attaque ${attaqueEnJeu(carte.attaque, carte.rarete)}${attaque.bonusDeRarete > 0 ? ` (dont mot ${carte.rarete.toLowerCase()} +${attaque.bonusDeRarete})` : ''}`,
    attaque.bonusDeType > 0 ? `triangle des types +${attaque.bonusDeType}` : '',
    attaque.bonusDeFaction > 0 ? `même origine +${attaque.bonusDeFaction}` : '',
    attaque.bloques > 0 ? `${attaque.bloques} bloqué${attaque.bloques > 1 ? 's' : ''} par sa défense` : '',
  ].filter(Boolean).join(', ');
}

function Jauge({ nom, camp }: { nom: string; camp: Camp }) {
  return (
    <div className="jauge" role="img" aria-label={`${nom} : ${pluriel(camp.pv, 'point')} de vie sur ${REGLES.pointsDeVie}`}>
      <span className="jauge__nom">{nom}</span>
      <span className="jauge__barre" aria-hidden="true"><span style={{ width: `${(camp.pv / REGLES.pointsDeVie) * 100}%` }} /></span>
      <span className="jauge__pv" aria-hidden="true">{camp.pv}</span>
    </div>
  );
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
function Propositions({ epreuve, reponse, onRepondre, seulementLUtile = false }: { epreuve: Epreuve; reponse?: Reponse; onRepondre?: (choisie: number) => void; seulementLUtile?: boolean }) {
  return (
    <ol className="epreuve__propositions">
      {epreuve.propositions.map((texte, i) => {
        if (!reponse) return <li key={i}><button type="button" className="proposition" lang="fr" onClick={() => onRepondre?.(i)}>{texte}</button></li>;
        const etat = i === epreuve.bonne ? 'bonne' : i === reponse.choisie ? 'fausse' : 'autre';
        return seulementLUtile && etat === 'autre' ? null : <li key={i}><span className="proposition" lang="fr" data-etat={etat}>{texte}</span></li>;
      })}
    </ol>
  );
}

// Le temps qui reste pour répondre : une barre qui se vide, et les secondes en toutes lettres.
function Sablier({ debut, secondes }: { debut: number; secondes: number }) {
  const maintenant = useMaintenant(200);
  const reste = Math.max(0, debut + secondes * 1000 - maintenant);
  return (
    <div className="sablier" role="timer" aria-label={`${Math.ceil(reste / 1000)} secondes restantes`} data-presse={reste < 5000}>
      <span className="sablier__barre" aria-hidden="true"><span style={{ width: `${(reste / (secondes * 1000)) * 100}%` }} /></span>
      <span className="sablier__secondes" aria-hidden="true">{Math.ceil(reste / 1000)} s</span>
    </div>
  );
}
