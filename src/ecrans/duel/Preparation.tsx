// La préparation du duel : les onglets Jouer et Deck réunis (BRIEF-duel.md § 2).
// À gauche, le mode (quatre onglets de même niveau), l'adversaire, le temps par définition et la récompense du jour ;
// à droite, le deck. Un seul bouton principal, dont le libellé et la légende suivent le mode choisi.
// Aucune règle ici : les chiffres viennent de config/equilibrage.ts, les amis, l'équipe et les cotes du serveur.

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { FondAnime } from '../../composants/accueil/FondAnime.tsx';
import { PortraitAmi, Presence, signeGrave } from '../../composants/correspondance/Correspondance.tsx';
import { choisirAuxFleches } from '../../composants/fleches.ts';
import { useChargement } from '../../composants/useChargement.ts';
import { EQUILIBRAGE } from '../../config/equilibrage.ts';
import type { ClassementDirect, ModeDirect } from '../../jeu/direct.ts';
import { NIVEAUX } from '../../jeu/duel.ts';
import type { Niveau } from '../../jeu/duel.ts';
import { ligueDe } from '../../jeu/joute.ts';
import { jourDe } from '../../jeu/progression.ts';
import { TEMPS_DE_REPONSE } from '../../jeu/sauvegarde.ts';
import type { Sauvegarde, TempsDeReponse } from '../../jeu/sauvegarde.ts';
import { lien } from '../../navigation/routes.ts';
import type { CarteIndex } from '../../partage/types.ts';
import { amisDisponibles } from '../../services/amis.ts';
import type { Relation } from '../../services/amis.ts';
import { clientDuServeur, serveurUtilise } from '../../services/compte.ts';
import { serveurEquipes } from '../../services/equipes.ts';
import { changerUnReglage, lireMesAmis } from '../../services/partie.ts';
import { PanneauDuDeck } from './PanneauDuDeck.tsx';
import './preparation.css';

const REGLES = EQUILIBRAGE.duel;

export type ModeDuSalon = 'entrainement' | 'joutes' | 'ami' | 'equipe';
const MODES: { id: ModeDuSalon; nom: string }[] = [
  { id: 'entrainement', nom: 'Entraînement' },
  { id: 'joutes', nom: 'Joutes classées' },
  { id: 'ami', nom: 'Défier un ami' },
  { id: 'equipe', nom: 'Mon équipe' },
];
const IDS_DES_MODES = MODES.map((m) => m.id);

const TITRES: Record<ModeDuSalon, [string, string]> = {
  entrainement: ['Choisis ton adversaire', 'Entraînement contre l’ordinateur. Tes timbres ne risquent rien, ton encre peut grimper.'],
  joutes: ['Joutes classées', 'De vrais joueurs, en direct. Ta cote monte ou descend à chaque joute.'],
  ami: ['Défie un ami', 'Tu affrontes son double : son deck, joué par l’ordinateur. Le défi ne compte pas pour le classement.'],
  equipe: ['Mon équipe', 'Ton duo et votre cote commune dans les joutes en 2 contre 2.'],
};

// Ce que chaque niveau change vraiment (jeu/duel.ts et la section « L'ordinateur » de l'équilibrage).
const NIVEAUX_DECRITS: Record<Niveau, string> = {
  Facile: 'Ses mots ont la même rareté que les tiens. Il les pose au hasard, pare moins souvent, et le jeu t’affiche les dégâts prévus.',
  Normal: 'Ses mots ont un cran de rareté de plus que les tiens, et il pose toujours sa carte la plus solide.',
  Difficile: 'Ses mots ont deux crans de rareté de plus : ils frappent plus fort et sont plus durs à parer.',
};

const TEMPS: Record<TempsDeReponse, string> = {
  normal: `${REGLES.secondesPourRepondre} s`,
  double: `${REGLES.secondesPourRepondre * 2} s`,
  illimite: 'Sans limite',
};
const tempsEnClair = (t: TempsDeReponse): string => t === 'illimite' ? 'sans limite de temps' : `${TEMPS[t]} par définition`;

const pluriel = (n: number, mot: string): string => `${n} ${mot}${n > 1 ? 's' : ''}`;

type Props = {
  sauvegarde: Sauvegarde;
  deck: CarteIndex[]; // le deck jouable (cartes possédées et visibles)
  deckEnEdition: boolean; // le panneau deck est en édition sur place
  onDeckEnEdition: (edition: boolean) => void;
  mode: ModeDuSalon;
  onMode: (mode: ModeDuSalon) => void;
  niveau: Niveau;
  onNiveau: (niveau: Niveau) => void;
  enPreparation: boolean; // un duel est en train de se préparer
  bloque: boolean; // le serveur des combats est occupé ou en erreur
  combatsEnLigne: boolean; // le serveur des combats tient les duels (nécessaire pour défier un ami)
  erreur: string | null;
  incident: ReactNode;
  onLancer: () => void;
  onDefier: (ami: Relation) => void;
};

export function Preparation(props: Props) {
  const { sauvegarde, deck, mode, onMode, niveau, onNiveau, enPreparation, bloque, erreur, incident } = props;
  const [titre, sousTitre] = TITRES[mode];
  const manque = REGLES.tailleDuDeck - deck.length;

  // La récompense du jour : les victoires restantes à pleine récompense, puis la part réduite.
  const victoiresDuJour = sauvegarde.duels.jour === jourDe(Date.now()) ? sauvegarde.duels.victoiresDuJour : 0;
  const pleinesRestantes = Math.max(0, REGLES.victoiresPleinesParJour - victoiresDuJour);
  const gain = (pleine: number): number => pleinesRestantes > 0 ? pleine : Math.max(1, Math.round(pleine * REGLES.partDeLEncreEnsuite));

  const amis = useChargement(async () => mode === 'ami' && amisDisponibles ? (await lireMesAmis()).relations.filter((r) => r.etat === 'ami') : null, `amis:${mode === 'ami'}`);
  const [amiChoisi, setAmiChoisi] = useState<string | null>(null);
  const listeDAmis = amis.etat === 'pret' ? amis.donnees ?? [] : [];
  const defiables = listeDAmis.filter((a) => a.defiable);
  useEffect(() => {
    if (!defiables.some((a) => a.id === amiChoisi)) setAmiChoisi(defiables[0]?.id ?? null);
  }, [amis]); // eslint-disable-line react-hooks/exhaustive-deps
  const ami = defiables.find((a) => a.id === amiChoisi) ?? null;

  const equipe = useChargement(async () => mode === 'equipe' && serveurUtilise ? serveurEquipes().lire() : null, `equipe:${mode === 'equipe'}`);
  const cotes = useChargement(async () => {
    if (mode !== 'joutes' || !serveurUtilise) return null;
    const lire = (m: ModeDirect) => clientDuServeur().appeler<ClassementDirect>('classement_direct', { p_mode: m }).then((c) => c.lignes.find((l) => l.moi) ?? null);
    const [solo, duo] = await Promise.all([lire('solo'), lire('duo_solo')]);
    return { solo, duo };
  }, `cotes:${mode === 'joutes'}`);

  // ── Le bouton principal et sa légende, selon le mode ──
  let appel: ReactNode;
  let legende: ReactNode;
  if (manque > 0) {
    appel = <button type="button" className="btn-primary" disabled aria-describedby="legende-preparation">{mode === 'entrainement' ? 'Lancer le duel' : mode === 'ami' ? 'Défier' : 'Chercher un adversaire'}</button>;
    legende = <span data-manque="true">Il manque {pluriel(manque, 'timbre')} à ton deck.</span>;
  } else if (mode === 'entrainement') {
    appel = <button type="button" className="btn-primary" aria-busy={enPreparation} aria-describedby="legende-preparation" disabled={enPreparation || bloque} onClick={props.onLancer}>{enPreparation ? 'Préparation du duel…' : 'Lancer le duel'}</button>;
    legende = <><b>{niveau}</b> · {tempsEnClair(sauvegarde.reglages.tempsDeReponse)}<br />Jusqu’à <b>+{gain(REGLES.encreParVictoire[niveau])} Encre</b></>;
  } else if (mode === 'joutes') {
    appel = serveurUtilise ? <a className="btn-primary" href={lien({ ecran: 'joutes' })} aria-describedby="legende-preparation">Chercher un adversaire</a>
      : <button type="button" className="btn-primary" disabled aria-describedby="legende-preparation">Chercher un adversaire</button>;
    legende = serveurUtilise ? <>En direct, contre un joueur de ton niveau<br />Jusqu’à <b>+{gain(EQUILIBRAGE.joute.encreParVictoire)} Encre</b></> : <span data-manque="true">Les joutes demandent une connexion au serveur du jeu.</span>;
  } else if (mode === 'ami') {
    appel = <button type="button" className="btn-primary" aria-busy={enPreparation} aria-describedby="legende-preparation" disabled={!ami || !props.combatsEnLigne || enPreparation || bloque} onClick={() => ami && props.onDefier(ami)}>{enPreparation ? 'Préparation du duel…' : ami ? `Défier ${ami.pseudo}` : 'Défier'}</button>;
    legende = !props.combatsEnLigne || !amisDisponibles ? <span data-manque="true">Les défis entre amis demandent une connexion au serveur du jeu.</span>
      : !ami ? <span data-manque="true">{amis.etat === 'en cours' ? 'Chargement de tes amis…' : 'Choisis un ami à défier.'}</span>
      : <>{tempsEnClair(sauvegarde.reglages.tempsDeReponse)} · sans classement<br />Jusqu’à <b>+{gain(EQUILIBRAGE.joute.encreParVictoire)} Encre</b></>;
  } else {
    const donnees = equipe.etat === 'pret' ? equipe.donnees : null;
    const complete = (donnees?.equipe?.membres.length ?? 0) === 2;
    appel = !serveurUtilise || equipe.etat === 'en cours' ? <button type="button" className="btn-primary" disabled aria-describedby="legende-preparation">Jouer en 2 contre 2</button>
      : complete ? <a className="btn-primary" href={`${lien({ ecran: 'joutes' })}/duo_equipe`} aria-describedby="legende-preparation">Jouer en 2 contre 2</a>
      : <a className="btn-primary" href={lien({ ecran: 'equipe' })} aria-describedby="legende-preparation">{donnees?.equipe ? 'Inviter un coéquipier' : 'Former mon équipe'}</a>;
    legende = !serveurUtilise ? <span data-manque="true">Les équipes demandent une connexion au serveur du jeu.</span>
      : equipe.etat === 'en cours' ? 'Chargement de ton équipe…'
      : complete ? 'En direct, avec ton coéquipier' : donnees?.equipe ? 'Il faut deux joueurs pour jouer en équipe.' : 'Forme un duo avec un ami pour les joutes en équipe.';
  }

  return (
    <main className="ecran ecran--large preparation">
      <FondAnime />
      {incident}
      <div className="preparation__colonnes">
        <div className="preparation__reglages">
          <header className="preparation__entete">
            <div>
              <h1 id="preparation-titre">{titre}</h1>
              <p className="preparation__sous-titre">{sousTitre}</p>
            </div>
            <a className="btn-tertiary" href={lien({ ecran: 'classement' })}>Voir le classement</a>
          </header>

          <div className="preparation__modes" role="tablist" aria-label="Mode de duel" onKeyDown={choisirAuxFleches(IDS_DES_MODES, mode, onMode)}>
            {MODES.map((m) => (
              <button key={m.id} type="button" role="tab" id={`mode-${m.id}`} aria-controls="preparation-panneau" aria-selected={mode === m.id} tabIndex={mode === m.id ? 0 : -1} onClick={() => onMode(m.id)}>{m.nom}</button>
            ))}
          </div>

          <div className="preparation__panneau" role="tabpanel" id="preparation-panneau" aria-labelledby={`mode-${mode}`}>
            {erreur && <p className="bloc bloc--alerte" role="alert">{erreur}</p>}

            {mode === 'entrainement' && <>
              <div className="adversaires" role="radiogroup" aria-label="Niveau de l’ordinateur" onKeyDown={choisirAuxFleches(NIVEAUX, niveau, onNiveau)}>
                {NIVEAUX.map((n, rang) => (
                  <button key={n} type="button" role="radio" className="adversaire" aria-checked={niveau === n} tabIndex={niveau === n ? 0 : -1} onClick={() => onNiveau(n)}>
                    <span className="adversaire__sceau" aria-hidden="true">{Array.from({ length: rang + 1 }, (_, i) => <Plume key={i} />)}</span>
                    <span className="adversaire__texte"><strong className="adversaire__nom">{n}</strong><span className="adversaire__phrase">{NIVEAUX_DECRITS[n]}</span></span>
                    <span className="adversaire__gain"><b>+{gain(REGLES.encreParVictoire[n])}</b><small>Encre</small></span>
                    <span className="adversaire__coche" aria-hidden="true"><Coche /></span>
                  </button>
                ))}
              </div>
            </>}

            {mode === 'joutes' && (
              !serveurUtilise ? <p className="preparation__note">Les joutes classées se jouent en ligne. Connecte-toi au serveur du jeu pour y participer.</p>
                : <div className="cartes-de-mode">
                  {([['solo', 'Solo', 'Un contre un, en direct.'], ['duo', '2 contre 2', 'Avec un partenaire tiré au sort.']] as const).map(([cle, nom, phrase]) => {
                    const ligne = cotes.etat === 'pret' ? cotes.donnees?.[cle] ?? null : null;
                    return <section key={cle} className="carte-de-mode">
                      <h2>{nom}</h2>
                      <p className="carte-de-mode__phrase">{phrase}</p>
                      {cotes.etat === 'en cours' ? <p className="carte-de-mode__chiffre" role="status">…</p>
                        : cotes.etat === 'erreur' ? <p className="carte-de-mode__phrase" role="alert">{cotes.message}</p>
                        : ligne ? <>
                          <p className="carte-de-mode__chiffre"><b>{ligne.cote.toLocaleString('fr-FR')}</b><small>cote</small></p>
                          <p className="carte-de-mode__phrase">Ligue {ligueDe(ligne.cote, EQUILIBRAGE.joute).nom} · {ligne.rang.toLocaleString('fr-FR')}<sup>e</sup> · {pluriel(ligne.gagnees, 'victoire')} en {pluriel(ligne.jouees, 'joute')}</p>
                        </> : <p className="carte-de-mode__phrase">Pas encore classé : ta première joute t’y fera entrer.</p>}
                    </section>;
                  })}
                </div>
            )}

            {mode === 'ami' && (
              !amisDisponibles ? <p className="preparation__note">Les amis et leurs défis se jouent en ligne. Connecte-toi au serveur du jeu pour en profiter.</p>
                : amis.etat === 'en cours' ? <p className="preparation__note" role="status">Chargement de tes amis…</p>
                : amis.etat === 'erreur' ? <p className="bloc bloc--alerte" role="alert">{amis.message}</p>
                : listeDAmis.length === 0 ? <div className="preparation__vide"><p>Tu n’as pas encore d’amis à défier.</p><a className="btn-secondary" href={lien({ ecran: 'amis' })}>Ajouter des amis</a></div>
                : <div className="amis-a-defier" role="radiogroup" aria-label="Ami à défier" onKeyDown={defiables.length ? choisirAuxFleches(defiables.map((a) => a.id), amiChoisi, setAmiChoisi) : undefined}>
                  {listeDAmis.map((a) => (
                    <button key={a.id} type="button" role="radio" className="ami-a-defier" aria-checked={a.id === amiChoisi} aria-disabled={!a.defiable} tabIndex={a.id === amiChoisi ? 0 : -1} onClick={() => a.defiable && setAmiChoisi(a.id)}>
                      <PortraitAmi apparence={a} taille={44} />
                      <span className="ami-a-defier__texte"><strong>{a.pseudo}</strong>{a.defiable ? <Presence vuLe={a.vu_le} /> : <small>Son deck n’est pas complet</small>}</span>
                      <span className="adversaire__coche" aria-hidden="true"><Coche /></span>
                    </button>
                  ))}
                </div>
            )}

            {mode === 'equipe' && (
              !serveurUtilise ? <p className="preparation__note">Les équipes se forment en ligne. Connecte-toi au serveur du jeu pour en créer une.</p>
                : equipe.etat === 'en cours' ? <p className="preparation__note" role="status">Chargement de ton équipe…</p>
                : equipe.etat === 'erreur' ? <p className="bloc bloc--alerte" role="alert">{equipe.message}</p>
                : !equipe.donnees?.equipe ? <div className="preparation__vide"><p>Tu n’as pas encore d’équipe. Forme un duo avec un ami : vous aurez une cote commune en 2 contre 2.</p></div>
                : <section className="carte-de-mode carte-d-equipe">
                  <span className="carte-d-equipe__embleme" aria-hidden="true">{signeGrave(equipe.donnees.equipe.embleme)}</span>
                  <div>
                    <h2>{equipe.donnees.equipe.nom}</h2>
                    <p className="carte-de-mode__phrase">{equipe.donnees.equipe.membres.map((m) => m.pseudo).join(' et ')}{equipe.donnees.equipe.membres.length < 2 && ' · en attente d’un coéquipier'}</p>
                    <p className="carte-de-mode__chiffre">{equipe.donnees.equipe.cote != null ? <><b>{equipe.donnees.equipe.cote.toLocaleString('fr-FR')}</b><small>cote d’équipe</small></> : <small>Pas encore classée</small>}</p>
                  </div>
                  <a className="btn-secondary sm" href={lien({ ecran: 'equipe' })}>Voir mon équipe</a>
                </section>
            )}

            {(mode === 'entrainement' || mode === 'ami') && <>
              <fieldset className="preparation__reglage">
                <legend>Temps par définition</legend>
                <div className="pastilles" role="radiogroup" aria-label="Temps par définition" onKeyDown={choisirAuxFleches(TEMPS_DE_REPONSE, sauvegarde.reglages.tempsDeReponse, (t) => changerUnReglage('tempsDeReponse', t))}>
                  {TEMPS_DE_REPONSE.map((t) => (
                    <button key={t} type="button" role="radio" className="pastille" aria-checked={sauvegarde.reglages.tempsDeReponse === t} tabIndex={sauvegarde.reglages.tempsDeReponse === t ? 0 : -1} disabled={enPreparation || bloque} onClick={() => changerUnReglage('tempsDeReponse', t)}>{TEMPS[t]}</button>
                  ))}
                </div>
              </fieldset>

              <div className="preparation__reglage">
                <p className="preparation__etiquette">Récompense du jour</p>
                <p className="gouttes">
                  <span className="gouttes__encre" aria-hidden="true">{Array.from({ length: REGLES.victoiresPleinesParJour }, (_, i) => <Goutte key={i} pleine={i < pleinesRestantes} />)}</span>
                  <b>{pleinesRestantes > 0 ? `Encore ${pluriel(pleinesRestantes, 'victoire')} à pleine récompense aujourd’hui` : 'Récompense réduite jusqu’à demain'}</b>
                </p>
                <p className="preparation__note">{pleinesRestantes > 0 ? `Ensuite, chaque victoire rapporte ${Math.round(REGLES.partDeLEncreEnsuite * 100)} % de sa récompense.` : `Chaque victoire rapporte ${Math.round(REGLES.partDeLEncreEnsuite * 100)} % de sa récompense.`} Défaite ou égalité : +{REGLES.encreParDefaite} Encre.</p>
              </div>
            </>}
          </div>
        </div>

        <PanneauDuDeck sauvegarde={sauvegarde} enEdition={props.deckEnEdition} onEdition={props.onDeckEnEdition} />

        <div className="preparation__appel appel">
          {appel}
          <p className="appel__legende" id="legende-preparation">{legende}</p>
        </div>

        {(mode === 'entrainement' || mode === 'ami') && <details className="preparation__regles">
            <summary>Règles du duel</summary>
            <ul>
              <li><strong>Format :</strong> {REGLES.pointsDeVie} points de vie, {REGLES.tailleDuDeck} timbres, {REGLES.cartesEnMain} en main. Chaque timbre se joue une fois.</li>
              <li><strong>Manche :</strong> l’adversaire pose son mot, tu lui opposes le tien. Tu frappes le premier ; s’il survit, il riposte.</li>
              <li><strong>Parade :</strong> retrouve la définition de son mot pour diviser par deux les dégâts qu’il t’inflige.</li>
              <li><strong>Dégâts :</strong> attaque + bonus − moitié de la défense adverse (au moins {REGLES.degatsMinimum}).</li>
              <li><strong>Bonus :</strong> +{REGLES.bonusDeType} pour l’avantage de type ; +{REGLES.bonusDeFaction} pour deux mots de même origine à la suite (+{REGLES.bonusDePetiteFaction} pour une petite langue).</li>
              <li><strong>Victoire :</strong> l’adversaire tombe à 0. Sinon, les points de vie départagent après {REGLES.manchesMaximum} manches.</li>
              <li><strong>Maîtrise :</strong> {REGLES.reussitesPourLaMaitrise} bonnes définitions d’un mot que tu possèdes lui donnent le cachet « Maîtrisé ».</li>
            </ul>
          </details>}
      </div>
    </main>
  );
}

// ── Petits dessins ──
function Coche() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
}
function Plume() {
  return <svg viewBox="0 0 16 26" fill="currentColor"><path d="M8 1c4 5 5 12 1 20l-1 4-1-4C3 13 4 6 8 1Z" /><path d="M8 5v17" stroke="#0b1729" strokeWidth=".8" fill="none" /></svg>;
}
function Goutte({ pleine }: { pleine: boolean }) {
  return <svg viewBox="0 0 20 26" data-pleine={pleine}><path d="M10 1C6 8 2 12 2 17a8 8 0 0 0 16 0c0-5-4-9-8-16Z" /></svg>;
}
