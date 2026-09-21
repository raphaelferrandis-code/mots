import { useState } from 'react';
import { Carte } from '../composants/Carte.tsx';
import { Entete } from '../composants/Entete.tsx';
import { enMinutesEtSecondes, usePartie, useStockDePaquets } from '../composants/usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import type { CarteObtenue } from '../jeu/partie.ts';
import { lien } from '../navigation/routes.ts';
import { acheterEtOuvrirUnPaquet, ouvrirUnPaquet } from '../services/partie.ts';

type Ouverture = { cartes: CarteObtenue[]; retournees: boolean[] };

export function OuverturePaquet() {
  const partie = usePartie();
  const paquets = useStockDePaquets(partie);
  const [ouverture, setOuverture] = useState<Ouverture | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  if (partie.etat !== 'prete' || !paquets) return <main className="ecran"><p className="texte-doux">Chargement…</p></main>;

  const prix = EQUILIBRAGE.paquets.prixEnEncre;
  const peutAcheter = partie.sauvegarde.encre >= prix;

  const lancer = (action: () => Promise<CarteObtenue[]>) => (): void => {
    setErreur(null);
    action().then(
      (cartes) => setOuverture({ cartes, retournees: cartes.map(() => false) }),
      (e: unknown) => setErreur(e instanceof Error ? e.message : String(e)),
    );
  };
  const retourner = (position: number): void => setOuverture((o) => o && { ...o, retournees: o.retournees.map((r, i) => r || i === position) });
  const toutRetourner = (): void => setOuverture((o) => o && { ...o, retournees: o.retournees.map(() => true) });

  const boutons = (
    <div className="rangee-de-boutons">
      {paquets.stock > 0 && <button type="button" className="bouton" onClick={lancer(ouvrirUnPaquet)}>Ouvrir un paquet ({paquets.stock} en stock)</button>}
      {peutAcheter && <button type="button" className="bouton bouton--discret" onClick={lancer(acheterEtOuvrirUnPaquet)}>Un paquet tout de suite — {prix} Encre</button>}
    </div>
  );

  // ── Aucun paquet en cours d'ouverture ─────────────────────────────────────
  if (!ouverture) {
    return (
      <main className="ecran">
        <Entete surtitre="Paquets" titre="Ouvrir un paquet">Cinq cartes par paquet. Touche une carte pour la retourner.</Entete>
        <section className="bloc">
          <p className="paquets__stock"><strong>{paquets.stock}</strong> / {paquets.maximum}</p>
          <p className="texte-doux">{paquets.attente === null ? 'Stock plein.' : <>Prochain paquet dans <strong>{enMinutesEtSecondes(paquets.attente)}</strong></>} · Encre : {partie.sauvegarde.encre.toLocaleString('fr-FR')}</p>
          {boutons}
          {paquets.stock === 0 && !peutAcheter && <p className="texte-doux petit">Rien à ouvrir pour l'instant : reviens dans quelques minutes.</p>}
          {erreur && <p role="alert">{erreur}</p>}
        </section>
        <a className="bouton bouton--discret" href={lien({ ecran: 'accueil' })}>Retour à l'accueil</a>
      </main>
    );
  }

  // ── Un paquet est ouvert ──────────────────────────────────────────────────
  const toutEstRetourne = ouverture.retournees.every(Boolean);
  const encreGagnee = ouverture.cartes.reduce((somme, c) => somme + c.encre, 0);
  const nouvelles = ouverture.cartes.filter((c) => c.nouvelle).length;

  return (
    <main className="ecran ecran--large">
      <Entete surtitre="Paquets" titre="Ton paquet">
        {toutEstRetourne ? `${nouvelles} nouvelle${nouvelles > 1 ? 's' : ''} carte${nouvelles > 1 ? 's' : ''}${encreGagnee > 0 ? ` · +${encreGagnee} Encre pour les doublons` : ''}` : 'Touche une carte pour la retourner.'}
      </Entete>

      <ul className="paquet" aria-live="polite">
        {ouverture.cartes.map((obtenue, position) => (
          <li key={obtenue.carte.id} className="paquet__place" data-retournee={ouverture.retournees[position]} data-rarete={obtenue.carte.rarete}>
            {ouverture.retournees[position] ? (
              <>
                <Carte carte={obtenue.carte} />
                <span className={obtenue.nouvelle ? 'paquet__etiquette paquet__etiquette--nouvelle' : 'paquet__etiquette'}>
                  {obtenue.nouvelle ? 'Nouvelle !' : `Doublon · +${obtenue.encre} Encre`}
                </span>
              </>
            ) : (
              <button type="button" className="dos-de-carte" onClick={() => retourner(position)} aria-label={`Retourner la carte ${position + 1}`}>
                <span aria-hidden="true">M</span>
              </button>
            )}
          </li>
        ))}
      </ul>

      {!toutEstRetourne && <button type="button" className="bouton bouton--discret" onClick={toutRetourner}>Tout retourner</button>}
      {toutEstRetourne && (
        <>
          {boutons}
          <a className="bouton bouton--discret" href={lien({ ecran: 'accueil' })}>Retour à l'accueil</a>
        </>
      )}
      {erreur && <p role="alert">{erreur}</p>}
    </main>
  );
}
