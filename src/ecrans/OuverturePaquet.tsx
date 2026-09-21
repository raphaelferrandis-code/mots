import type { CSSProperties } from 'react';
import { Carte, DosDeCarte } from '../composants/carte/Carte.tsx';
import { Entete } from '../composants/Entete.tsx';
import { PaquetScelle } from '../composants/paquet/PaquetScelle.tsx';
import { RYTHME_PAQUET } from '../composants/paquet/rythme.ts';
import { useOuvertureAnimee } from '../composants/paquet/useOuvertureAnimee.ts';
import { enMinutesEtSecondes, usePartie, useStockDePaquets } from '../composants/usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { lien } from '../navigation/routes.ts';
import { acheterEtOuvrirUnPaquet, ouvrirUnPaquet } from '../services/partie.ts';

const viserTimbres = (liste: HTMLUListElement | null): void => {
  liste?.focus({ preventScroll: true });
  liste?.scrollIntoView({ block: 'nearest' });
};

export function OuverturePaquet() {
  const partie = usePartie();
  const paquets = useStockDePaquets(partie);
  const reglages = partie.etat === 'prete' ? partie.sauvegarde.reglages : null;
  const sonsActifs = reglages?.sonsPaquets ?? true;
  const { ouverture, phase, erreur, arriveeAnimee, lancer, retourner, toutRetourner, passer } = useOuvertureAnimee(sonsActifs, reglages?.reduireAnimations ?? false);

  if (partie.etat !== 'prete' || !paquets) return <main className="ecran"><p className="texte-doux">Chargement…</p></main>;

  const prix = EQUILIBRAGE.paquets.prixEnEncre;
  const peutAcheter = partie.sauvegarde.encre >= prix;
  const occupe = phase === 'chargement' || phase === 'ouverture';
  const disponibles = paquets.stock > 0 || peutAcheter;
  const cartesVisibles = phase === 'cartes' && ouverture !== null;
  const toutEstRetourne = ouverture?.retournees.every(Boolean) ?? false;
  const nouvelles = ouverture?.cartes.filter((c) => c.nouvelle).length ?? 0;
  const encreGagnee = ouverture?.cartes.reduce((s, c) => s + c.encre, 0) ?? 0;
  const rythme = {
    '--duree-ouverture': `${RYTHME_PAQUET.ouverture}ms`,
    '--sortie': `${RYTHME_PAQUET.sortie}ms`,
    '--intervalle': `${RYTHME_PAQUET.intervalle}ms`,
    '--arrivee': `${RYTHME_PAQUET.arrivee}ms`,
  } as CSSProperties;

  const ouvrir = (): void => { void lancer(paquets.stock > 0 ? ouvrirUnPaquet : acheterEtOuvrirUnPaquet); };
  const actions = (
    <div className="rangee-de-boutons atelier-paquets__actions">
      {paquets.stock > 0 && <button type="button" className="bouton" disabled={occupe} onClick={ouvrir}>{cartesVisibles ? 'Ouvrir le suivant' : 'Ouvrir ce paquet'}</button>}
      {peutAcheter && <button type="button" className={`bouton${paquets.stock > 0 ? ' bouton--discret' : ''}`} disabled={occupe} onClick={() => void lancer(acheterEtOuvrirUnPaquet)}>Acheter et ouvrir — {prix} Encre</button>}
    </div>
  );

  return (
    <main className="ecran ecran--large atelier-paquets" style={rythme}>
      <Entete titre={cartesVisibles ? 'Ton paquet' : 'Les paquets'}>
        {cartesVisibles
          ? toutEstRetourne ? `${nouvelles} nouveau${nouvelles > 1 ? 'x' : ''} timbre${nouvelles > 1 ? 's' : ''}${encreGagnee > 0 ? ` · +${encreGagnee} Encre` : ''}` : 'Touche pour retourner. Fais glisser pour défiler.'
          : `${EQUILIBRAGE.paquets.emplacements.length} timbres, encore secrets.`}
      </Entete>

      {!cartesVisibles ? (
        <section className="scene-paquet" data-phase={phase} aria-label="Ouverture du paquet">
          <div className="scene-paquet__halo" aria-hidden="true" />
          <div className="scene-paquet__objet">
            {phase === 'ouverture' ? <>
              <div className="cartes-envol" aria-hidden="true">{Array.from({ length: EQUILIBRAGE.paquets.emplacements.length }, (_, i) => <span key={i} style={{ '--i': i } as CSSProperties}>M</span>)}</div>
              <PaquetScelle />
            </> : <button className="scene-paquet__ouvrir" type="button" onClick={ouvrir} disabled={!disponibles || occupe} aria-label={paquets.stock > 0 ? 'Ouvrir le paquet scellé' : `Acheter et ouvrir le paquet pour ${prix} Encre`}><PaquetScelle /></button>}
          </div>
          <div className="scene-paquet__commandes">
            {occupe ? <>
              <p role="status">{phase === 'chargement' ? 'Préparation du paquet…' : 'Le paquet s’ouvre…'}</p>
              {phase === 'ouverture' && <button type="button" className="bouton bouton--discret" onClick={passer}>Passer l’animation</button>}
            </> : <>
              {actions}
              <p className="texte-doux petit">{paquets.stock} / {paquets.maximum} en réserve{paquets.attente !== null && <> · Prochain dans <span role="timer">{enMinutesEtSecondes(paquets.attente)}</span></>}</p>
              {!disponibles && <p className="texte-doux petit">Un paquet coûte {prix} Encre.</p>}
            </>}
          </div>
        </section>
      ) : <>
        <ul ref={viserTimbres} className="paquet paquet--decouverte" data-arrivee={arriveeAnimee} aria-label="Timbres du paquet" aria-live="polite" tabIndex={0}>
          {ouverture.cartes.map((obtenue, position) => (
            <li key={`${position}-${obtenue.carte.id}`} className="paquet__place" style={{ '--i': position } as CSSProperties} data-retournee={ouverture.retournees[position]} data-rarete={obtenue.carte.rarete}>
              {ouverture.retournees[position] ? <>
                <Carte carte={obtenue.carte} finition={obtenue.finition} />
                <span className={obtenue.nouvelleFinition ? 'paquet__etiquette paquet__etiquette--nouvelle' : 'paquet__etiquette'}>
                  {obtenue.nouvelle ? 'Nouveau !' : obtenue.nouvelleFinition ? `Nouvelle finition : ${obtenue.finition.toLowerCase()}` : `Doublon · +${obtenue.encre} Encre`}
                  {obtenue.nouvelle && obtenue.finition !== 'Normale' && ` · ${obtenue.finition}`}
                </span>
              </> : <DosDeCarte onRetourner={() => retourner(position)} etiquette={`Retourner le timbre ${position + 1}`} />}
            </li>
          ))}
        </ul>
        <div className="atelier-paquets__suite">
          {!toutEstRetourne ? <button type="button" className="bouton" onClick={toutRetourner}>Tout retourner</button> : actions}
          {toutEstRetourne && <a className="bouton bouton--discret" href={lien({ ecran: 'collection' })}>Voir l’album</a>}
        </div>
        {toutEstRetourne && <p className="atelier-paquets__reserve texte-doux petit">{paquets.stock > 0 ? `${paquets.stock} en réserve` : paquets.attente !== null ? `Prochain paquet dans ${enMinutesEtSecondes(paquets.attente)}` : 'Réserve vide'}</p>}
      </>}
      {erreur && <p className="bloc bloc--alerte" role="alert">{erreur}</p>}
      <a className="atelier-paquets__retour" href={lien({ ecran: 'accueil' })}>Retour à l’accueil</a>
    </main>
  );
}
