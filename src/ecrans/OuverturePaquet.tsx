import { useState } from 'react';
import { Carte, DosDeCarte } from '../composants/carte/Carte.tsx';
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
      {paquets.stock > 0 && <button type="button" className="bouton" onClick={lancer(ouvrirUnPaquet)}>{ouverture ? `Ouvrir un autre paquet (${paquets.stock})` : 'Ouvrir un paquet'}</button>}
      {peutAcheter && <button type="button" className="bouton bouton--discret" onClick={lancer(acheterEtOuvrirUnPaquet)}>Acheter et ouvrir — {prix} Encre</button>}
    </div>
  );

  // ── Aucun paquet en cours d'ouverture ─────────────────────────────────────
  if (!ouverture) {
    return (
      <main className="ecran reserve-paquets">
        <Entete titre="Les paquets">{EQUILIBRAGE.paquets.emplacements.length} timbres par paquet</Entete>
        <section className="bloc">
          <p className="paquets__stock"><strong>{paquets.stock}</strong> / {paquets.maximum} en réserve</p>
          {paquets.attente !== null && <p className="texte-doux">Prochain paquet dans <strong>{enMinutesEtSecondes(paquets.attente)}</strong></p>}
          {boutons}
          {paquets.stock === 0 && !peutAcheter && <p className="texte-doux petit">Ou {prix} Encre par paquet.</p>}
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
      <Entete titre="Ton paquet">
        {toutEstRetourne ? `${nouvelles} nouveau${nouvelles > 1 ? 'x' : ''} timbre${nouvelles > 1 ? 's' : ''}${encreGagnee > 0 ? ` · +${encreGagnee} Encre` : ''}` : 'Touche pour retourner. Fais glisser pour défiler.'}
      </Entete>

      <ul className="paquet" aria-label="Timbres du paquet" aria-live="polite" tabIndex={0}>
        {ouverture.cartes.map((obtenue, position) => (
          <li key={obtenue.carte.id} className="paquet__place" data-retournee={ouverture.retournees[position]} data-rarete={obtenue.carte.rarete}>
            {ouverture.retournees[position] ? (
              <>
                <Carte carte={obtenue.carte} finition={obtenue.finition} />
                <span className={obtenue.nouvelleFinition ? 'paquet__etiquette paquet__etiquette--nouvelle' : 'paquet__etiquette'}>
                  {obtenue.nouvelle ? 'Nouveau !' : obtenue.nouvelleFinition ? `Nouvelle finition : ${obtenue.finition.toLowerCase()}` : `Doublon · +${obtenue.encre} Encre`}
                  {obtenue.nouvelle && obtenue.finition !== 'Normale' && ` · ${obtenue.finition}`}
                </span>
              </>
            ) : (
              <DosDeCarte onRetourner={() => retourner(position)} etiquette={`Retourner le timbre ${position + 1}`} />
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
