import { useEffect, useRef, useState } from 'react';
import { useJouteDirecte } from '../composants/useJouteDirecte.ts';
import { useMaintenant, usePartie } from '../composants/usePartie.ts';
import { Carte } from '../composants/carte/Carte.tsx';
import { Timbre } from '../composants/timbre/Timbre.tsx';
import { ChoixDuPseudonyme } from '../composants/ChoixDuPseudonyme.tsx';
import { useChargement } from '../composants/useChargement.ts';
import { serveurEquipes } from '../services/equipes.ts';
import { secoursEtParrainage, serveurUtilise } from '../services/compte.ts';
import { commanderCombat, lireLesAdversairesDeSecours } from '../services/partie.ts';
import { ErreurDuServeur } from '../services/supabase.ts';
import { SonsDuDirect } from '../services/sonsDuDirect.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { registresMasques } from '../jeu/partie.ts';
import { MODES_DIRECTS, NOMS_DIRECTS } from '../jeu/direct.ts';
import { ID_FACE_CACHEE } from '../jeu/duel.ts';
import type { ModeDirect, PropositionDirecte } from '../jeu/direct.ts';
import { lien } from '../navigation/routes.ts';
import { messageDe } from '../partage/messages.ts';
import './joutesDirectes.css';

export function JoutesDirectes() {
  const partie = usePartie();
  const sauvegarde = partie.etat === 'prete' ? partie.sauvegarde : null;
  const inscrit = !!sauvegarde?.joutes.pseudo;
  const direct = useJouteDirecte(inscrit);
  const equipe = useChargement(async () => serveurUtilise && inscrit ? serveurEquipes().lire() : null,`equipe-direct:${inscrit}`);
  // Le bouton « Jouer en 2 contre 2 » de l'équipe mène à #/joutes/duo_equipe : le mode est déjà choisi.
  const [mode, setMode] = useState<ModeDirect>(() => window.location.hash.endsWith('/duo_equipe') ? 'duo_equipe' : 'solo');
  const [abandon, setAbandon] = useState(false);
  const horloge = useMaintenant(250);
  const maintenant = horloge + direct.decalage;
  // L'adversaire de secours : proposé quand personne n'est libre depuis un moment (hors 2v2 équipe, où l'on attend
  // son partenaire). La recherche continue tant que le joueur ne l'accepte pas.
  const attente = direct.etat?.attente ?? null;
  const [debutAttente, setDebutAttente] = useState<number | null>(null);
  useEffect(() => { setDebutAttente(attente ? Date.now() : null); }, [attente?.mode]);
  const [secours, setSecours] = useState<{ etat: 'repos' | 'en cours' } | { etat: 'erreur'; message: string }>({ etat: 'repos' });
  const proposerLeSecours = secoursEtParrainage && !!attente && attente.mode !== 'duo_equipe' && debutAttente !== null
    && horloge - debutAttente >= EQUILIBRAGE.secours.attenteAvantDeProposerEnSecondes * 1000;
  const jouerContreUnSimule = async (): Promise<void> => {
    if (!sauvegarde) return;
    setSecours({ etat: 'en cours' });
    try {
      const masques = registresMasques(sauvegarde);
      const adversaires = await lireLesAdversairesDeSecours(masques);
      if (adversaires.length === 0) throw new Error('Aucun joueur simulé n’est disponible avec tes filtres de contenu.');
      await direct.annuler();
      // Un vrai joueur est peut-être arrivé entre-temps : la joute en direct (ou le match à accepter) passe avant.
      if (direct.courant()?.partie || direct.courant()?.proposition) { setSecours({ etat: 'repos' }); return; }
      let refus: unknown;
      for (const adversaire of adversaires) {
        try {
          await commanderCombat({ type: 'commencer', requete: crypto.randomUUID(), choix: {
            mode: 'amical', adversaire: adversaire.id, masques, temps: sauvegarde.reglages.tempsDeReponse,
          } });
          window.location.hash = lien({ ecran: 'duel' });
          return;
        } catch (erreur) {
          // Un deck adverse refusé par le serveur des combats : on essaie le joueur suivant.
          refus = erreur;
          if (!(erreur instanceof ErreurDuServeur && erreur.refus)) break;
        }
      }
      throw refus;
    } catch (erreur) {
      setSecours({ etat: 'erreur', message: messageDe(erreur) });
    }
  };
  // Le match à accepter (décision de Raphaël du 25/09/2026) : « J'y vais ! » à temps, sinon la proposition tombe
  // sans défaite. L'onglet change de titre et une sonnette retentit, même onglet caché, pour faire revenir le joueur.
  const proposition = direct.etat?.proposition ?? null;
  const [sons] = useState(() => new SonsDuDirect());
  useEffect(() => { sons.activer(sauvegarde?.reglages.sonsPaquets ?? true); }, [sons, sauvegarde?.reglages.sonsPaquets]);
  useEffect(() => () => sons.fermer(), [sons]);
  const aRepondre = !!proposition && !proposition.jAccepte;
  useEffect(() => {
    if (!aRepondre) return;
    sons.adversaireTrouve();
    const titre = document.title;
    document.title = `⚔ Adversaire trouvé ! · ${titre}`;
    return () => { document.title = titre; };
  }, [aRepondre, proposition?.id, sons]);
  // Quand une proposition tombe, on dit pourquoi : les autres n'ont pas tous accepté (le joueur reprend sa place dans
  // la file), ou lui-même n'a pas répondu à temps (sa recherche s'arrête, sans défaite).
  const [avis, setAvis] = useState('');
  const precedente = useRef<PropositionDirecte | null>(null);
  const jaiRefuse = useRef(false);
  useEffect(() => {
    const avant = precedente.current;
    precedente.current = proposition;
    if (!direct.etat || proposition || !avant) return;
    if (direct.etat.partie) setAvis('');
    else if (direct.etat.attente) setAvis('Tout le monde n’a pas accepté : tu reprends ta place dans la file.');
    else if (!jaiRefuse.current) setAvis('Tu n’as pas accepté à temps : ta recherche s’est arrêtée, sans défaite. Relance-la quand tu veux.');
    jaiRefuse.current = false;
  }, [direct.etat, proposition]);
  const repondre = (accepte: boolean): void => {
    sons.preparer(); jaiRefuse.current = !accepte; setAvis('');
    void direct.repondre(accepte);
  };
  const p = direct.etat?.partie; const v = p?.vue;
  const moi = v?.joueurs[v.moi];
  const monEquipe = equipe.etat === 'pret' ? equipe.donnees?.equipe : null;
  const secondes = v ? Math.max(0,Math.ceil((v.echeance-maintenant)/1000)) : 0;
  const bloque = direct.occupe || direct.reessayer;
  const poseur = v?.ordre[v.poses.length] ?? 0;
  useEffect(() => {
    if (v?.phase === 'reponses' || v?.phase === 'arbitrage') document.querySelector('.direct__questions')?.scrollIntoView({block:'start'});
  }, [v?.phase, v?.manche]);
  const voies = v && moi ? Array.from({length:v.joueurs.length/2},(_,i) => i).filter(i => !v.poses.some(p => v.joueurs[p.joueur].equipe === moi.equipe && p.voie === i)).filter(i => v.poses.length !== 0 || i === 0) : [];
  return <main className="ecran direct" data-phase={v?.phase ?? 'salon'}>
    <header className="direct__entete"><div><p className="texte-doux">Les joutes classées</p><h1>{v ? NOMS_DIRECTS[v.mode] : 'Jouer en direct'}</h1></div><a href={lien({ecran:'classement'})}>Les trois classements ↗</a></header>
    {!serveurUtilise ? <p>Les joutes en direct nécessitent une connexion au serveur du jeu.</p>
      : !sauvegarde ? <p role="status">Chargement du compte…</p>
      : !inscrit ? <section className="bloc direct__inscription"><ChoixDuPseudonyme /></section> : <>
        {direct.erreur && <div className="bloc bloc--alerte" role="alert"><p>{direct.erreur}</p><button className="bouton" disabled={direct.occupe} onClick={() => void direct.retenter()}>Réessayer</button></div>}
        {!direct.etat && !direct.erreur && <p role="status">Connexion aux joutes…</p>}
        {direct.etat && <p className="texte-doux petit">{direct.connecte ? '● En direct' : 'Reconnexion au direct · la partie reste synchronisée régulièrement'}</p>}
        {avis && !proposition && <p className="bloc" role="status">{avis}</p>}
        {proposition && <section className="bloc direct__proposition" aria-labelledby="titre-proposition">
          <h2 id="titre-proposition">Adversaire trouvé !</h2>
          {/* Annoncé une fois aux lecteurs d'écran ; le compte à rebours, lui, n'est pas lu à chaque seconde. */}
          {!proposition.jAccepte && <p className="visuellement-cache" role="alert">Adversaire trouvé : accepte dans les {EQUILIBRAGE.direct.secondesPourAccepter} secondes.</p>}
          <p>{NOMS_DIRECTS[proposition.mode]} · {proposition.jAccepte ? `Tu es prêt. En attente des autres joueurs (${proposition.acceptes}/${proposition.total})…` : 'La partie commence quand tout le monde a accepté.'}</p>
          <p className="direct__compte" role="timer" aria-live="off">{Math.max(0,Math.ceil((proposition.accepterAvant-maintenant)/1000))} s</p>
          {!proposition.jAccepte && <div className="rangee-de-boutons">
            <button type="button" className="btn-primary" autoFocus disabled={bloque} onClick={() => repondre(true)}>J’y vais !</button>
            <button type="button" className="btn-tertiary" disabled={bloque} onClick={() => repondre(false)}>Refuser</button>
          </div>}
          <p className="texte-doux petit">Refuser, ou laisser passer le délai, ne compte pas comme une défaite.</p>
        </section>}
        {!v && !direct.etat?.attente && !proposition && <>
          <div className="modes" role="group" aria-label="Mode de joute">{MODES_DIRECTS.map(m => <button key={m} className="bouton" aria-pressed={mode===m} disabled={bloque} onClick={() => setMode(m)}>{NOMS_DIRECTS[m]}</button>)}</div>
          <section className="bloc direct__salon"><h2>{mode === 'solo' ? 'Un adversaire, en face de toi' : mode === 'duo_solo' ? 'Un partenaire à découvrir' : monEquipe?.nom ?? 'Votre duo, votre classement'}</h2>
            <p>{mode === 'solo' ? 'Deux joueurs en direct. Chacun pose une carte ; retrouve la définition du mot adverse pour parer. Le premier à poser change à chaque manche.' : mode === 'duo_solo' ? 'Inscris-toi seul. Le jeu forme deux équipes de deux joueurs. Chaque résultat compte uniquement pour ta cote personnelle 2v2.' : 'Les deux membres de ton équipe doivent ouvrir ce mode et se déclarer prêts. Vos résultats font évoluer uniquement la cote de votre équipe.'}</p>
            {mode === 'duo_equipe' && (!monEquipe || monEquipe.membres.length !== 2) ? <a className="bouton" href={lien({ecran:'equipe'})}>Former mon équipe · inviter un ami</a>
              : <button className="bouton bouton-presse" disabled={bloque || !direct.etat} onClick={() => { sons.preparer(); setAvis(''); void direct.chercher(mode,registresMasques(sauvegarde)); }}>{mode === 'duo_equipe' ? 'Je suis prêt avec mon équipe' : 'Chercher une partie'}</button>}
            <p className="texte-doux petit">Deck de dix cartes requis. Les joueurs sont réunis avec les mêmes filtres de contenu.{secoursEtParrainage && mode !== 'duo_equipe' && ` Si personne n’est libre au bout de ${EQUILIBRAGE.secours.attenteAvantDeProposerEnSecondes} secondes, tu pourras jouer contre un joueur simulé, sans effet sur le classement.`}</p>
          </section>
          <details className="bloc"><summary>Les règles du 2v2</summary><p>PV communs, mains personnelles visibles entre partenaires. Ordre A1 → B1 → B2 → A2. B1 choisit son opposition ; B2 prend la place restante. À la manche suivante, B2 → A2 → A1 → B1.</p><p>8 s pour poser une carte, 30 s pour les deux définitions adverses. En cas de désaccord, le dernier poseur a 5 s pour choisir entre les propositions. Sans arbitrage, sa proposition est retenue. Une proposition seule compte. Sans proposition, la parade échoue. Les attaques sont simultanées.</p><p>Une pose manquée joue automatiquement la première carte ; deux poses manquées consécutives entraînent une défaite. Recharge la page pour reprendre une partie interrompue.</p></details>
          <a href={lien({ecran:'duel'})}>S’entraîner contre l’ordinateur</a>
        </>}
        {direct.etat?.attente && <section className="bloc direct__attente" aria-live="polite"><h2>{NOMS_DIRECTS[direct.etat.attente.mode]} · recherche en cours</h2><p>{direct.etat.attente.mode === 'duo_equipe' && !direct.etat.attente.partenairePret ? 'Ton partenaire doit aussi se déclarer prêt dans « 2v2 équipe ».' : 'Nous attendons les autres joueurs. Tu peux annuler à tout moment.'}</p><button className="bouton" disabled={bloque || secours.etat === 'en cours'} onClick={() => void direct.annuler()}>Annuler la recherche</button>
          {proposerLeSecours && <div className="direct__secours"><p><strong>Personne n’est libre pour l’instant.</strong> En attendant, joue un duel contre un joueur simulé : il ne compte pas pour le classement, mais rapporte Encre et expérience comme un duel normal.</p>
            <button className="bouton bouton-presse" disabled={bloque || secours.etat === 'en cours'} onClick={() => void jouerContreUnSimule()}>{secours.etat === 'en cours' ? 'Préparation du duel…' : 'Jouer contre un joueur simulé'}</button></div>}
          {secours.etat === 'erreur' && <p role="alert">{secours.message}</p>}</section>}
        {v && moi && <>
          <div className="direct__scores">{v.noms.map((nom,i) => <section key={i} className="bloc" data-moi={i===moi.equipe}><h2>{nom}{i===moi.equipe && <small> · ton camp</small>}</h2><strong>{v.pv[i]} <small>PV</small></strong></section>)}</div>
          <div className="direct__phase" role="status"><strong>Manche {v.manche} · {v.phase==='pose' ? `${v.joueurs[poseur]?.pseudo} pose une carte` : v.phase==='reponses' ? 'Retrouvez les définitions adverses' : v.phase==='arbitrage' ? 'Les derniers poseurs tranchent' : v.phase==='bilan' ? 'Résultat de la manche' : 'Partie terminée'}</strong>{v.phase!=='fin' && <span aria-label={`${secondes} secondes restantes`}>{secondes} s</span>}</div>
          <div className="direct__table">{Array.from({length:v.joueurs.length/2},(_,voie) => <section className="direct__voie" key={voie}><h3>Face-à-face {voie+1}</h3>{[0,1].map(camp => {
            const pose = v.poses.find(p => p.voie===voie && v.joueurs[p.joueur].equipe===camp);
            return <div className="direct__position" key={camp}>{pose ? <><p>{v.joueurs[pose.joueur].pseudo}</p>{pose.carte.id === ID_FACE_CACHEE ? <Timbre carte={pose.carte} oblitere cliquable={false} verso dosRenseigne montrerVerso /> : <Carte carte={pose.carte} sansDefinition cliquable={false} />}</> : <p className="direct__vide">{v.noms[camp]} · carte à venir</p>}</div>;
          })}</section>)}</div>
          {v.phase==='pose' && poseur===v.moi && <section className="bloc"><h2>À toi de poser</h2><div className="direct__main">{moi.main.map(c => <div key={c.id}><Carte carte={c} sansDefinition cliquable={false} />{voies.map(voie => {
            const face = v.poses.find(p => p.voie===voie && v.joueurs[p.joueur].equipe!==moi.equipe);
            return <button key={voie} className="bouton" disabled={bloque || secondes===0} onClick={() => void direct.agir({type:'poser',carte:c.id,voie})}>Poser {c.mot} · {face ? face.carte.mot ? `face à ${face.carte.mot}` : `face à son ${face.carte.type.toLowerCase()}` : `voie ${voie+1} libre`}</button>;
          })}</div>)}</div></section>}
          {v.phase==='pose' && v.joueurs.length===4 && <details className="bloc"><summary>La main de ton partenaire</summary><div className="direct__main">{v.joueurs.filter((j,i) => j.equipe===moi.equipe && i!==v.moi).flatMap(j => j.main).map(c => <Carte key={c.id} carte={c} sansDefinition cliquable={false} />)}</div></details>}
          {(v.phase==='reponses' || v.phase==='arbitrage') && <div className="direct__questions">{v.questions.map(q => <section key={q.cible} className="bloc"><h2>{q.mot}</h2><p>{v.phase==='reponses' ? (v.mode==='solo' ? 'Retrouve la définition pour parer.' : 'Propose une définition. Ton partenaire voit ta proposition.') : q.desaccord ? `${v.joueurs[v.arbitres[moi.equipe]].pseudo} tranche le désaccord.` : 'Votre réponse est retenue.'}</p>
            <div className="direct__propositions">{q.propositions.map((texte,i) => <button key={i} className="direct__reponse" aria-pressed={v.phase==='arbitrage' ? q.decision===i : q.reponses[v.moi]===i}
              disabled={bloque || secondes===0 || (v.phase==='arbitrage' && (!q.desaccord || v.arbitres[moi.equipe]!==v.moi || !Object.values(q.reponses).includes(i)))}
              onClick={() => void direct.agir({type:v.phase==='arbitrage' ? 'trancher' : 'proposer',cible:q.cible,choix:i})}>
              <span>{texte}</span><small>{Object.entries(q.reponses).filter(([,choix]) => choix===i).map(([j]) => v.joueurs[Number(j)].pseudo).join(' · ')}</small>{q.decision===i && <small>Réponse finale</small>}</button>)}</div>
          </section>)}</div>}
          {(v.phase==='bilan' || v.phase==='fin') && v.bilan.length>0 && <section className="bloc"><h2>Les parades</h2>{v.bilan.map(b => <p key={b.joueur}><strong>{b.mot}</strong> · {b.paree ? 'paré' : 'non paré'} · {b.degats} dégâts<br /><span className="texte-doux">{b.bonne}</span></p>)}</section>}
          {v.phase==='fin' ? <section className="bloc direct__resultat"><h2>{v.vainqueur==='nul' ? 'Match nul' : v.vainqueur===moi.equipe ? 'Victoire !' : 'Défaite'}</h2>{v.raison && <p>{v.raison}</p>}{p?.cotes ? <p>Cote {NOMS_DIRECTS[v.mode]} : {p.cotes.avant} → <strong>{p.cotes.apres}</strong></p>
            : <p className="texte-doux">Tu as déjà affronté {v.mode === 'solo' ? 'ce joueur' : 'ces adversaires'} {EQUILIBRAGE.joute.rencontresClasseesParJour} fois aujourd’hui : cette partie ne change pas la cote.</p>}{p?.gains && <p>+{p.gains.xp} XP · +{p.gains.encre} Encre{p.gains.reduite && ' · récompense quotidienne réduite'}</p>}<button className="bouton" disabled={bloque} onClick={() => { setAbandon(false); void direct.quitter(); }}>Retour au salon</button></section>
            : <div className="direct__abandon">{!abandon ? <button className="bouton bouton--discret" onClick={() => setAbandon(true)}>Abandonner</button> : <><p>Abandonner compte comme une défaite pour ton camp.</p><button className="bouton" disabled={bloque} onClick={() => void direct.agir({type:'abandonner'})}>Confirmer l’abandon</button><button className="bouton bouton--discret" onClick={() => setAbandon(false)}>Continuer à jouer</button></>}</div>}
        </>}
      </>}
  </main>;
}
