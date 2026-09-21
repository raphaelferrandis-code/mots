// Le duel contre l'ordinateur. L'écran ne contient aucune règle : il affiche l'état du duel et passe par
// src/services/duel.ts pour chaque action. Une manche : le joueur choisit une carte de sa main, prouve qu'il
// connaît le mot (quatre définitions, temps limité), puis l'ordinateur joue à son tour.

import { useEffect, useRef, useState } from 'react';
import { Carte } from '../composants/carte/Carte.tsx';
import { CarteLegendee } from '../composants/carte/CarteLegendee.tsx';
import { Entete } from '../composants/Entete.tsx';
import { useChargement } from '../composants/useChargement.ts';
import { useMaintenant, usePartie } from '../composants/usePartie.ts';
import { EQUILIBRAGE, defenseEnJeu } from '../config/equilibrage.ts';
import { NIVEAUX } from '../jeu/duel.ts';
import type { Camp, Coup, Duel as EtatDuDuel, Niveau } from '../jeu/duel.ts';
import type { Epreuve } from '../jeu/epreuve.ts';
import { jourDe } from '../jeu/progression.ts';
import type { Resultat } from '../jeu/progression.ts';
import { meilleureFinition } from '../jeu/sauvegarde.ts';
import type { Sauvegarde } from '../jeu/sauvegarde.ts';
import { lien } from '../navigation/routes.ts';
import type { CarteIndex, Finition } from '../partage/types.ts';
import { deckJouable, jouerLaCarte, poserLEpreuve, preparerUnDuel, prevoirLAttaque, tourDeLOrdinateur } from '../services/duel.ts';
import type { Terrain } from '../services/duel.ts';
import { finirLeDuel, noterLaReponse } from '../services/partie.ts';

const REGLES = EQUILIBRAGE.duel;

type Etape =
  | { nom: 'accueil' }
  | { nom: 'preparation' }
  | { nom: 'choix'; choisie: string | null }
  | { nom: 'epreuve'; carte: CarteIndex; epreuve: Epreuve; debut: number }
  | { nom: 'reponse'; carte: CarteIndex; epreuve: Epreuve; choisie: number | null; reussi: boolean; maitrisee: boolean; apres: EtatDuDuel }
  | { nom: 'adversaire'; apres: EtatDuDuel }
  | { nom: 'fin'; resultat: Resultat; encre: number; reduite: boolean };

type Bilan = { posees: number; bonnes: number; maitrisees: string[] };
type Habillage = { carte: CarteIndex; finition: Finition; maitriseeLe: number | null };

// Le temps accordé pour l'épreuve, selon le réglage d'accessibilité du joueur (null = sans limite).
function secondesPourRepondre(sauvegarde: Sauvegarde): number | null {
  const choix = sauvegarde.reglages.tempsDeReponse;
  return choix === 'illimite' ? null : REGLES.secondesPourRepondre * (choix === 'double' ? 2 : 1);
}

const blocage = (carte: CarteIndex): number => Math.round(defenseEnJeu(carte.defense, carte.rarete) * REGLES.partDeLaDefense);

function descriptionDuNiveau(niveau: Niveau): string {
  const ecart = REGLES.ecartDeForceDeLOrdinateur[niveau];
  const cartes = ecart > 0 ? 'Ses cartes sont un peu plus fortes que les tiennes' : ecart < 0 ? 'Ses cartes sont un peu plus faibles que les tiennes' : 'Ses cartes valent les tiennes';
  const choix = niveau === 'Facile' ? 'il les joue au hasard' : 'il joue toujours sa meilleure attaque';
  return `${cartes} ; ${choix}, et son mot lui échappe ${Math.round((1 - REGLES.reussiteDeLOrdinateur[niveau]) * 10)} fois sur 10.`;
}

export function Duel() {
  const partie = usePartie();
  const sauvegarde = partie.etat === 'prete' ? partie.sauvegarde : null;
  // Le deck est relu à chaque changement de deck ou de réglage de contenu.
  const cleDuDeck = sauvegarde ? `${sauvegarde.deck.join(',')}|${sauvegarde.reglages.masquerFamiliers}|${sauvegarde.reglages.masquerInjurieux}` : 'attente';
  const deck = useChargement(deckJouable, `deck:${cleDuDeck}`);

  const [niveau, setNiveau] = useState<Niveau>('Normal');
  const [terrain, setTerrain] = useState<Terrain | null>(null);
  const [duel, setDuel] = useState<EtatDuDuel | null>(null);
  const [etape, setEtape] = useState<Etape>({ nom: 'accueil' });
  const [bilan, setBilan] = useState<Bilan>({ posees: 0, bonnes: 0, maitrisees: [] });
  const [erreur, setErreur] = useState<string | null>(null);

  // La dernière étape connue, pour qu'une réponse et la fin du temps ne comptent jamais toutes les deux.
  const etapeActuelle = useRef(etape);
  etapeActuelle.current = etape;

  const changerDEtape = (suivante: Etape): void => {
    etapeActuelle.current = suivante;
    setEtape(suivante);
    window.scrollTo({ top: 0 });
  };

  const lancer = async (): Promise<void> => {
    changerDEtape({ nom: 'preparation' });
    setErreur(null);
    try {
      const pret = await preparerUnDuel(niveau);
      setTerrain(pret.terrain);
      setDuel(pret.duel);
      setBilan({ posees: 0, bonnes: 0, maitrisees: [] });
      changerDEtape(pret.duel.aLaMain === 'joueur' ? { nom: 'choix', choisie: null } : { nom: 'adversaire', apres: tourDeLOrdinateur(pret.terrain, pret.duel) });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
      changerDEtape({ nom: 'accueil' });
    }
  };

  const repondre = (choisie: number | null): void => {
    const enCours = etapeActuelle.current;
    if (enCours.nom !== 'epreuve' || !terrain || !duel) return;
    const reussi = choisie === enCours.epreuve.bonne;
    const maitrisee = noterLaReponse(enCours.carte.id, reussi);
    setBilan((b) => ({ posees: b.posees + 1, bonnes: b.bonnes + (reussi ? 1 : 0), maitrisees: maitrisee ? [...b.maitrisees, enCours.carte.mot] : b.maitrisees }));
    changerDEtape({ nom: 'reponse', carte: enCours.carte, epreuve: enCours.epreuve, choisie, reussi, maitrisee, apres: jouerLaCarte(terrain, duel, enCours.carte.id, reussi) });
  };

  // Le temps de l'épreuve : à son terme, le mot échappe au joueur.
  const duree = sauvegarde ? secondesPourRepondre(sauvegarde) : null;
  const repondreALaFinDuTemps = useRef(repondre);
  repondreALaFinDuTemps.current = repondre;
  useEffect(() => {
    if (etape.nom !== 'epreuve' || duree === null) return;
    const minuterie = setTimeout(() => repondreALaFinDuTemps.current(null), Math.max(0, etape.debut + duree * 1000 - Date.now()));
    return () => clearTimeout(minuterie);
  }, [etape, duree]);

  // Après un coup : le duel est fini, ou la main passe.
  const continuer = (apres: EtatDuDuel): void => {
    if (!terrain) return;
    setDuel(apres);
    if (apres.vainqueur !== null) {
      const resultat: Resultat = apres.vainqueur === 'joueur' ? 'victoire' : apres.vainqueur === 'nul' ? 'nul' : 'defaite';
      changerDEtape({ nom: 'fin', resultat, ...finirLeDuel(terrain.niveau, resultat) });
    } else if (apres.aLaMain === 'adversaire') changerDEtape({ nom: 'adversaire', apres: tourDeLOrdinateur(terrain, apres) });
    else changerDEtape({ nom: 'choix', choisie: null });
  };

  const abandonner = (): void => {
    if (!window.confirm('Abandonner ce duel ? Tu ne recevras aucune récompense.')) return;
    setDuel(null);
    changerDEtape({ nom: 'accueil' });
  };

  if (!sauvegarde || deck.etat !== 'pret') return <main className="ecran"><p className="texte-doux">Chargement…</p></main>;

  // ── Avant le duel : le deck, le niveau ─────────────────────────────────────
  if (etape.nom === 'accueil' || etape.nom === 'preparation' || !duel || !terrain) {
    const pret = deck.donnees.length === REGLES.tailleDuDeck;
    const victoiresDuJour = sauvegarde.duels.jour === jourDe(Date.now()) ? sauvegarde.duels.victoiresDuJour : 0;
    const pleinesRestantes = Math.max(0, REGLES.victoiresPleinesParJour - victoiresDuJour);
    return (
      <main className="ecran">
        <Entete surtitre="Duel" titre="Duel contre l'ordinateur">Tu choisis ta carte, puis tu prouves que tu connais le mot.</Entete>

        {!pret ? (
          <section className="bloc">
            <p>{deck.donnees.length === 0 ? "Tu n'as pas encore de deck." : `Ton deck compte ${deck.donnees.length} carte${deck.donnees.length > 1 ? 's' : ''} jouable${deck.donnees.length > 1 ? 's' : ''} sur ${REGLES.tailleDuDeck}.`} Compose-le d'abord : dix cartes choisies dans ta collection.</p>
            <a className="bouton" href={lien({ ecran: 'deck' })}>Composer mon deck</a>
          </section>
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
                  ? `Encore ${pleinesRestantes} victoire${pleinesRestantes > 1 ? 's' : ''} à pleine récompense aujourd'hui ; les suivantes rapportent moins.`
                  : "Tu as eu tes victoires à pleine récompense aujourd'hui : les suivantes rapportent moins, jusqu'à demain."}
                {' '}Une défaite rapporte {REGLES.encreParDefaite} Encre.
              </p>
              {erreur && <p className="bloc bloc--alerte" role="alert">{erreur}</p>}
              <div className="rangee-de-boutons">
                <button type="button" className="bouton" disabled={etape.nom === 'preparation'} onClick={() => void lancer()}>{etape.nom === 'preparation' ? 'Préparation du duel…' : 'Lancer le duel'}</button>
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
                <li>Chacun a {REGLES.pointsDeVie} points de vie, {REGLES.cartesEnMain} cartes en main, et un <strong>mot en jeu</strong> qui le défend.</li>
                <li>À ton tour, choisis une carte. Tu as {duree === null ? 'tout ton temps' : `${duree} secondes`} pour retrouver <strong>la définition de ton mot</strong> parmi quatre.</li>
                <li><strong>Tu la trouves</strong> : ta carte attaque. Dégâts = son attaque, plus les bonus, moins ce que bloque le mot adverse en jeu (au moins {REGLES.degatsMinimum}).</li>
                <li><strong>Tu te trompes</strong> : le mot t'échappe, pas d'attaque. La bonne définition s'affiche : c'est le moment d'apprendre.</li>
                <li>Dans les deux cas, ta carte devient ton nouveau mot en jeu, et tu pioches.</li>
                <li>Bonus : le triangle des types (+{REGLES.bonusDeType} : nom &gt; adjectif &gt; verbe &gt; nom) et deux mots de même origine à la suite (+{REGLES.bonusDeFaction}, ou +{REGLES.bonusDePetiteFaction} pour une petite langue).</li>
                <li>Après {REGLES.manchesMaximum} manches, celui qui a le plus de points de vie l'emporte. {REGLES.reussitesPourLaMaitrise} bonnes réponses sur un mot : il est <strong>maîtrisé</strong>, et son timbre reçoit un cachet daté.</li>
              </ul>
            </details>
          </>
        )}
      </main>
    );
  }

  // ── Pendant le duel ────────────────────────────────────────────────────────
  const affiche = etape.nom === 'adversaire' || etape.nom === 'reponse' ? etape.apres : duel;
  const { joueur, adversaire } = affiche.camps;
  // Les cartes du joueur gardent leur plus belle finition et leur cachet de maîtrise.
  const timbreDuJoueur = (carte: CarteIndex): Habillage => {
    const possedee = sauvegarde.cartes[carte.id];
    return { carte, finition: possedee ? meilleureFinition(possedee) : 'Normale', maitriseeLe: possedee?.maitriseeLe ?? null };
  };
  const enEpreuve = etape.nom === 'epreuve' || etape.nom === 'reponse';
  // Pendant qu'un coup est montré, la manche affichée reste celle où il a été joué.
  const manche = etape.nom === 'fin' ? affiche.manche : duel.manche;

  return (
    <main className="ecran duel">
      <header className="duel__camps">
        <Jauge nom="L'ordinateur" camp={adversaire} />
        <span className="duel__manche"><span>Manche {manche}<small> / {REGLES.manchesMaximum}</small></span><small>Niveau {terrain.niveau.toLowerCase()}</small></span>
        <Jauge nom="Toi" camp={joueur} />
      </header>

      {!enEpreuve && etape.nom !== 'fin' && (
        <section className="duel__table" aria-label="Les mots en jeu">
          <MotEnJeu titre="Mot adverse en jeu" camp={adversaire} />
          <MotEnJeu titre="Ton mot en jeu" camp={joueur} habillage={joueur.enJeu ? timbreDuJoueur(joueur.enJeu) : undefined} />
        </section>
      )}

      {etape.nom === 'choix' && (() => {
        const choisie = joueur.main.find((c) => c.id === etape.choisie) ?? null;
        const prevision = choisie ? prevoirLAttaque(terrain, duel, choisie) : null;
        return (
          <section className="bloc duel__tour" aria-live="polite">
            <h2>À toi de jouer</h2>
            <div className="duel__main">
              {joueur.main.map((carte) => (
                <div key={carte.id} className="duel__carte" data-choisie={carte.id === etape.choisie}>
                  <CarteLegendee {...timbreDuJoueur(carte)} sansDefinition onChoisir={() => changerDEtape({ nom: 'choix', choisie: carte.id })} action="choisir cette carte" />
                </div>
              ))}
            </div>
            {choisie && prevision ? (
              // Sur téléphone, ce bandeau reste collé en bas de l'écran : le bouton « Jouer » est toujours sous le pouce.
              <div className="duel__action">
                <p className="duel__prevision">
                  <strong>{prevision.degats} dégât{prevision.degats > 1 ? 's' : ''}</strong> si tu connais « {choisie.mot} »
                  <span className="texte-doux petit">{detailDuCalcul(choisie.attaque, prevision)}. Ensuite, ce mot bloquera {blocage(choisie)}.</span>
                </p>
                <button type="button" className="bouton" onClick={() => changerDEtape({ nom: 'epreuve', carte: choisie, epreuve: poserLEpreuve(terrain, choisie), debut: Date.now() })}>Jouer</button>
              </div>
            ) : <p className="texte-doux petit">Touche une carte de ta main pour voir ce qu'elle ferait.</p>}
          </section>
        );
      })()}

      {etape.nom === 'epreuve' && (
        <section className="bloc epreuve">
          <p className="entete__surtitre">Épreuve de maîtrise</p>
          <h2 className="epreuve__mot" lang="fr">{etape.epreuve.mot}</h2>
          <p className="texte-doux petit">{etape.carte.type} · Quelle est sa définition ?</p>
          {duree !== null && <Sablier debut={etape.debut} secondes={duree} />}
          <ol className="epreuve__propositions">
            {etape.epreuve.propositions.map((texte, i) => (
              <li key={i}><button type="button" className="proposition" lang="fr" onClick={() => repondre(i)}>{texte}</button></li>
            ))}
          </ol>
        </section>
      )}

      {etape.nom === 'reponse' && (() => {
        const coup = etape.apres.coups.at(-1)!;
        const reussites = sauvegarde.cartes[etape.carte.id]?.reussites ?? 0;
        return (
          <section className="bloc epreuve" aria-live="polite">
            <p className="entete__surtitre">{etape.reussi ? 'Bonne réponse' : etape.choisie === null ? 'Temps écoulé' : 'Mauvaise réponse'}</p>
            <h2 className="epreuve__mot" lang="fr">{etape.epreuve.mot}</h2>
            <p className="duel__verdict" data-reussi={etape.reussi}>
              {etape.reussi ? <>Ton mot attaque : <strong>{coup.degats} dégât{coup.degats > 1 ? 's' : ''}</strong>.</> : <>Le mot t'échappe : pas d'attaque. Voici sa définition.</>}
            </p>
            <ol className="epreuve__propositions">
              {etape.epreuve.propositions.map((texte, i) => (
                <li key={i}><span className="proposition" lang="fr" data-etat={i === etape.epreuve.bonne ? 'bonne' : i === etape.choisie ? 'fausse' : 'autre'}>{texte}</span></li>
              ))}
            </ol>
            <p className="texte-doux petit">
              {etape.maitrisee
                ? `Mot maîtrisé ! Le timbre « ${etape.carte.mot} » reçoit son cachet.`
                : sauvegarde.cartes[etape.carte.id]?.maitriseeLe ? 'Mot déjà maîtrisé.' : `Maîtrise de ce mot : ${Math.min(reussites, REGLES.reussitesPourLaMaitrise)} / ${REGLES.reussitesPourLaMaitrise} bonnes réponses.`}
            </p>
            <button type="button" className="bouton" autoFocus onClick={() => continuer(etape.apres)}>Continuer</button>
          </section>
        );
      })()}

      {etape.nom === 'adversaire' && (() => {
        const coup = etape.apres.coups.at(-1)!;
        return (
          <section className="bloc duel__tour" aria-live="polite">
            <h2>L'ordinateur joue « {coup.carte.mot} »</h2>
            <p className="duel__verdict" data-reussi={!coup.reussi}>
              {coup.reussi
                ? <>Il connaît son mot : <strong>{coup.degats} dégât{coup.degats > 1 ? 's' : ''}</strong> <span className="texte-doux petit">— {detailDuCalcul(coup.carte.attaque, coup)}.</span></>
                : <>Le mot lui échappe : pas d'attaque.</>}
            </p>
            <button type="button" className="bouton" autoFocus onClick={() => continuer(etape.apres)}>Continuer</button>
          </section>
        );
      })()}

      {etape.nom === 'fin' && (
        <section className="bloc duel__fin" aria-live="polite">
          <p className="entete__surtitre">Fin du duel · {affiche.manche} manche{affiche.manche > 1 ? 's' : ''}</p>
          <h2>{etape.resultat === 'victoire' ? 'Victoire !' : etape.resultat === 'nul' ? 'Match nul' : 'Défaite'}</h2>
          <p>
            <strong>+{etape.encre} Encre</strong>
            {etape.reduite && <span className="texte-doux petit"> — récompense réduite : tu as déjà eu tes {REGLES.victoiresPleinesParJour} victoires à pleine récompense aujourd'hui.</span>}
          </p>
          <p className="texte-doux">
            {bilan.posees > 0 ? `Tu as retrouvé ${bilan.bonnes} définition${bilan.bonnes > 1 ? 's' : ''} sur ${bilan.posees}.` : "Tu n'as pas eu le temps de jouer."}
            {bilan.maitrisees.length > 0 && ` Mot${bilan.maitrisees.length > 1 ? 's' : ''} maîtrisé${bilan.maitrisees.length > 1 ? 's' : ''} : ${bilan.maitrisees.join(', ')}.`}
          </p>
          <div className="rangee-de-boutons">
            <button type="button" className="bouton" onClick={() => void lancer()}>Rejouer</button>
            <button type="button" className="bouton bouton--discret" onClick={() => { setDuel(null); changerDEtape({ nom: 'accueil' }); }}>Changer de niveau</button>
            <a className="bouton bouton--discret" href={lien({ ecran: 'deck' })}>Changer mon deck</a>
          </div>
        </section>
      )}

      {etape.nom !== 'fin' && <button type="button" className="bouton bouton--discret duel__abandon" onClick={abandonner}>Abandonner</button>}
    </main>
  );
}

// « attaque 8, nom contre adjectif +2, même origine +1, bloqué 4 »
function detailDuCalcul(attaque: number, coup: Pick<Coup, 'bonusDeType' | 'bonusDeFaction' | 'defenseAdverse'>): string {
  return [
    `attaque ${attaque}`,
    coup.bonusDeType > 0 ? `triangle des types +${coup.bonusDeType}` : '',
    coup.bonusDeFaction > 0 ? `même origine +${coup.bonusDeFaction}` : '',
    coup.defenseAdverse > 0 ? `${coup.defenseAdverse} bloqué${coup.defenseAdverse > 1 ? 's' : ''} par le mot adverse` : '',
  ].filter(Boolean).join(', ');
}

function Jauge({ nom, camp }: { nom: string; camp: Camp }) {
  return (
    <div className="jauge" role="img" aria-label={`${nom} : ${camp.pv} point${camp.pv > 1 ? 's' : ''} de vie sur ${REGLES.pointsDeVie}`}>
      <span className="jauge__nom">{nom}</span>
      <span className="jauge__barre" aria-hidden="true"><span style={{ width: `${(camp.pv / REGLES.pointsDeVie) * 100}%` }} /></span>
      <span className="jauge__pv" aria-hidden="true">{camp.pv}</span>
    </div>
  );
}

function MotEnJeu({ titre, camp, habillage }: { titre: string; camp: Camp; habillage?: Habillage }) {
  return (
    <figure className="duel__mot-en-jeu">
      <figcaption className="entete__surtitre">{titre}</figcaption>
      {camp.enJeu ? <Carte {...(habillage ?? { carte: camp.enJeu })} cliquable={false} /> : <div className="deck__vide" />}
      <span className="duel__blocage">{camp.enJeu ? `Bloque ${blocage(camp.enJeu)} dégât${blocage(camp.enJeu) > 1 ? 's' : ''}` : 'Aucune défense'}</span>
      {/* La définition en clair : sur un petit écran, celle du timbre est trop fine pour être lue. */}
      {camp.enJeu && <span className="duel__definition texte-doux" lang="fr">{camp.enJeu.definition}</span>}
    </figure>
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
