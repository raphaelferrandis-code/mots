import { XP } from '../jeu/personnalisation.ts';
import { useRecompensesSuspendues } from '../composants/Recompenses.tsx';
import type { CSSProperties } from 'react';
import { CartesDuPaquet } from '../composants/paquet/CartesDuPaquet.tsx';
import { DosDeCarte } from '../composants/carte/Carte.tsx';
import { Entete } from '../composants/Entete.tsx';
import { PaquetScelle } from '../composants/paquet/PaquetScelle.tsx';
import { RYTHME_PAQUET } from '../composants/paquet/rythme.ts';
import { useOuvertureAnimee } from '../composants/paquet/useOuvertureAnimee.ts';
import { enMinutesEtSecondes, usePartie, useStockDePaquets } from '../composants/usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { lien } from '../navigation/routes.ts';
import { HORS_LIGNE, ouvrirUnPaquet, ouvrirRecompense, synchroniser } from '../services/partie.ts';

export function OuverturePaquet() {
  const partie = usePartie();
  const paquets = useStockDePaquets(partie);
  const reglages = partie.etat === 'prete' ? partie.sauvegarde.reglages : null;
  const sonsActifs = reglages?.sonsPaquets ?? true;
  const { ouverture, phase, erreur, arriveeAnimee, lancer, retourner, toutRetourner, passer } = useOuvertureAnimee(sonsActifs, reglages?.reduireAnimations ?? false);
  // Les récompenses attendent la sortie de l'écran : elles masqueraient les commandes du carrousel.
  useRecompensesSuspendues(phase !== 'repos');

  if (partie.etat !== 'prete' || !paquets) return <main className="ecran"><p className="texte-doux">Chargement…</p></main>;

  const occupe = phase === 'chargement' || phase === 'ouverture';
  const disponibles = paquets.stock > 0;
  const cartesVisibles = phase === 'cartes' && ouverture !== null;
  const toutEstRetourne = ouverture?.retournees.every(Boolean) ?? false;
  const formule = partie.compte?.formule;
  const hebdomadaires = formule?.paquetsHebdomadaires ?? 0;
  const cadeau = formule?.achatUnique && formule.cadeauAchatReclame === false;
  const nouvelles = ouverture?.cartes.filter((c) => c.nouvelle).length ?? 0;
  const encreGagnee = ouverture?.cartes.reduce((s, c) => s + c.encre, 0) ?? 0;
  const rythme = {
    '--duree-ouverture': `${RYTHME_PAQUET.ouverture}ms`,
    '--sortie': `${RYTHME_PAQUET.sortie}ms`,
    '--intervalle': `${RYTHME_PAQUET.intervalle}ms`,
    '--arrivee': `${RYTHME_PAQUET.arrivee}ms`,
  } as CSSProperties;

  const ouvrir = (): void => { void lancer(ouvrirUnPaquet); };
  const actions = (
    <div className="rangee-de-boutons atelier-paquets__actions">
      {paquets.stock > 0 && <button type="button" className="bouton" disabled={occupe} onClick={ouvrir}>{cartesVisibles ? 'Ouvrir le suivant' : 'Ouvrir ce paquet'}</button>}
      {hebdomadaires > 0 && <button type="button" className="bouton" disabled={occupe} onClick={() => void lancer(() => ouvrirRecompense('hebdomadaire'))}>Paquet hebdomadaire · {hebdomadaires} disponible{hebdomadaires > 1 ? 's' : ''}</button>}
      {cadeau && <button type="button" className="bouton" disabled={occupe} onClick={() => void lancer(() => ouvrirRecompense('achat'))}>Découvrir ma Hors-série</button>}
    </div>
  );

  return (
    <main className="ecran ecran--large atelier-paquets" style={rythme}>
      {cartesVisibles ? (
        <Entete titre={ouverture.cartes.length === 1 ? 'Ta Hors-série' : 'Ton paquet'}>
          {toutEstRetourne ? `+${(ouverture.cartes.length === 1 ? 0 : XP.paquet) + nouvelles * XP.decouverte} XP · ${nouvelles} nouveau${nouvelles > 1 ? 'x' : ''} timbre${nouvelles > 1 ? 's' : ''}${encreGagnee > 0 ? ` · +${encreGagnee} Encre` : ''}` : null}
        </Entete>
      ) : <h1 className="visuellement-cache">Les paquets · {EQUILIBRAGE.paquets.emplacements.length} timbres par paquet</h1>}

      {!cartesVisibles ? (
        <section className="scene-paquet" data-phase={phase} aria-label="Ouverture du paquet">
          <div className="scene-paquet__halo" aria-hidden="true" />
          <div className="scene-paquet__objet">
            {phase === 'ouverture' ? <>
              <div className="cartes-envol" aria-hidden="true">{Array.from({ length: ouverture?.cartes.length ?? EQUILIBRAGE.paquets.emplacements.length }, (_, i) => <span key={i} style={{ '--i': i, '--centre': ((ouverture?.cartes.length ?? 5) - 1) / 2 } as CSSProperties}><DosDeCarte etiquette="" anime={false} /></span>)}</div>
              <div className="scene-paquet__eclats" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--i': i } as CSSProperties} />)}</div>
              <PaquetScelle />
            </> : <button className="scene-paquet__ouvrir" type="button" onClick={ouvrir} disabled={!disponibles || occupe} aria-label="Ouvrir le paquet scellé"><PaquetScelle /></button>}
          </div>
          <div className="scene-paquet__commandes">
            {occupe ? <>
              <p role="status">{phase === 'chargement' ? 'Préparation du paquet…' : 'Le paquet s’ouvre…'}</p>
              {phase === 'ouverture' && <button type="button" className="bouton bouton--discret" onClick={passer}>Passer l’animation</button>}
            </> : <>
              {actions}
              <p className="texte-doux petit">{paquets.stock} / {paquets.maximum} en réserve{paquets.attente !== null && <> · Prochain dans <span role="timer">{enMinutesEtSecondes(paquets.attente)}</span></>}</p>
            </>}
          </div>
        </section>
      ) : <>
        <CartesDuPaquet cartes={ouverture.cartes} retournees={ouverture.retournees}
          arriveeAnimee={arriveeAnimee} reduireAnimations={reglages?.reduireAnimations ?? false} retourner={retourner} />
        <div className="atelier-paquets__suite">
          {!toutEstRetourne ? <button type="button" className="bouton" onClick={toutRetourner}>Tout retourner</button> : actions}
          {toutEstRetourne && <a className="bouton bouton--discret" href={lien({ ecran: 'collection' })}>Voir l’album</a>}
        </div>
        {toutEstRetourne && <p className="atelier-paquets__reserve texte-doux petit">{paquets.stock > 0 ? `${paquets.stock} en réserve` : paquets.attente !== null ? `Prochain paquet dans ${enMinutesEtSecondes(paquets.attente)}` : 'Réserve vide'}</p>}
      </>}
      {partie.serveur.etat === 'hors ligne' && (
        <p className="bloc bloc--alerte" role="alert">{HORS_LIGNE} <button type="button" className="bouton outil" onClick={() => void synchroniser()}>Réessayer</button></p>
      )}
      {erreur && erreur !== HORS_LIGNE && <p className="bloc bloc--alerte" role="alert">{erreur}</p>}
      <a className="atelier-paquets__retour" href={lien({ ecran: 'accueil' })}>Retour à l’accueil</a>
    </main>
  );
}
