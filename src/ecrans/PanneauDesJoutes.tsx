// Les joutes classées, avant le duel : le rang du joueur, les adversaires qu'on lui propose, le classement.
// Tout passe par src/services/joutes.ts — aujourd'hui des adversaires fictifs, demain un serveur.

import { useEffect, useState } from 'react';
import { useChargement } from '../composants/useChargement.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { coteApres, ligueDe } from '../jeu/joute.ts';
import type { ProfilDeJoute } from '../jeu/joute.ts';
import type { Sauvegarde } from '../jeu/sauvegarde.ts';
import { RARETES } from '../partage/types.ts';
import type { CarteIndex } from '../partage/types.ts';
import { chargerEdition } from '../services/cartes.ts';
import { serveurDeJoutes, tirerUnPseudonyme } from '../services/joutes.ts';
import { changerDePseudonyme } from '../services/partie.ts';

const REGLES = EQUILIBRAGE.joute;
const signe = (n: number): string => (n > 0 ? `+${n}` : `${n}`);

// « 4 communes, 3 peu communes, 2 rares, 1 épique » : on montre la force d'un deck, pas ses mots.
function raretesDuDeck(deck: readonly string[], cartes: ReadonlyMap<string, CarteIndex>): string {
  return [...RARETES].reverse()
    .map((rarete) => ({ rarete, nombre: deck.filter((id) => cartes.get(id)?.rarete === rarete).length }))
    .filter((r) => r.nombre > 0)
    .map((r) => `${r.nombre} ${r.rarete.toLowerCase()}${r.nombre > 1 && !r.rarete.endsWith('s') && r.rarete !== 'Hors-série' ? 's' : ''}`)
    .join(', ');
}

export function PanneauDesJoutes({ sauvegarde, enPreparation, onDefier }: { sauvegarde: Sauvegarde; enPreparation: boolean; onDefier: (profil: ProfilDeJoute) => void }) {
  const { pseudo, jouees, gagnees, recents } = sauvegarde.joutes;
  const cote = sauvegarde.joutes.cote ?? REGLES.coteDeDepart;
  const ligue = ligueDe(cote, REGLES);
  // La barre de progression vers la ligue suivante. Dans la première ligue, elle part d'un peu sous la cote de départ
  // (et non de zéro), pour qu'un nouveau joueur ne la trouve pas déjà presque pleine.
  const bas = ligue.rang === 0 ? Math.min(cote, REGLES.coteDeDepart) - 100 : ligue.aPartirDe;
  const [tirage, setTirage] = useState(0);

  // Première visite : le joueur reçoit un pseudonyme, tiré au sort parmi les mots du jeu.
  useEffect(() => { if (pseudo === '') void tirerUnPseudonyme().then(changerDePseudonyme); }, [pseudo]);

  const edition = useChargement(chargerEdition, 'edition');
  const adversaires = useChargement(() => serveurDeJoutes.adversaires(cote, recents), `adversaires:${cote}:${tirage}`);
  const classement = useChargement(() => serveurDeJoutes.classement(pseudo, cote), `classement:${pseudo}:${cote}`);
  const cartes = edition.etat === 'pret' ? new Map(edition.donnees.cartes.map((c) => [c.id, c])) : null;

  return (
    <>
      {serveurDeJoutes.fictif && (
        <section className="bloc bloc--a-venir">
          <span className="entete__surtitre">Version d'essai</span>
          <p className="petit">Les joutes opposeront de vrais joueurs dès que le jeu aura son serveur. En attendant, <strong>ces adversaires sont fictifs</strong> : ils servent à essayer le classement. Ta cote est enregistrée sur cet appareil.</p>
        </section>
      )}

      <section className="bloc">
        <p className="entete__surtitre">Ligue {ligue.nom}</p>
        <h2>{pseudo || '…'} <small className="joute__cote">cote {cote}</small></h2>
        <p className="texte-doux petit">
          {classement.etat === 'pret' && <>{classement.donnees.rang === 1 ? '1ᵉʳ' : `${classement.donnees.rang}ᵉ`} sur {classement.donnees.joueurs} joueurs · </>}
          {jouees === 0 ? 'aucune joute pour l\'instant' : `${gagnees} victoire${gagnees > 1 ? 's' : ''} en ${jouees} joute${jouees > 1 ? 's' : ''}`}
          {ligue.suivante && <> · ligue {ligue.suivante.nom} à {ligue.suivante.aPartirDe}</>}
        </p>
        {ligue.suivante && (
          <span className="progression__barre" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, ((cote - bas) / (ligue.suivante.aPartirDe - bas)) * 100))}%` }} /></span>
        )}
        <button type="button" className="bouton bouton--discret joute__pseudo" onClick={() => void tirerUnPseudonyme().then(changerDePseudonyme)}>Tirer un autre pseudonyme</button>
      </section>

      <section className="bloc">
        <h2>Choisis ton adversaire</h2>
        <p className="texte-doux petit">Tu affrontes son <strong>double</strong> : son deck, joué par l'ordinateur, qui connaît ses mots ni mieux ni moins bien que lui. Battre plus fort que soi rapporte davantage.</p>
        {adversaires.etat === 'erreur' && <p role="alert">Impossible de trouver des adversaires. {adversaires.message}</p>}
        {adversaires.etat === 'en cours' && <p className="texte-doux">Recherche d'adversaires…</p>}
        {adversaires.etat === 'pret' && (
          <div className="niveaux">
            {adversaires.donnees.map((profil) => (
              <button key={profil.id} type="button" className="niveau" disabled={enPreparation} onClick={() => onDefier(profil)}>
                <strong>{profil.pseudo} <small className="joute__cote">cote {profil.cote} · {ligueDe(profil.cote, REGLES).nom}</small></strong>
                {cartes && <span className="texte-doux petit">Son deck : {raretesDuDeck(profil.deck, cartes)}.</span>}
                <span className="niveau__gain">Victoire {signe(coteApres(cote, profil.cote, 'victoire', REGLES) - cote)} · Défaite {signe(coteApres(cote, profil.cote, 'defaite', REGLES) - cote)} · +{REGLES.encreParVictoire} Encre</span>
              </button>
            ))}
          </div>
        )}
        <button type="button" className="bouton bouton--discret" disabled={enPreparation} onClick={() => setTirage((t) => t + 1)}>{enPreparation ? 'Préparation de la joute…' : "Proposer d'autres adversaires"}</button>
      </section>

      {classement.etat === 'pret' && (
        <details className="bloc repliable">
          <summary><h2>Le classement</h2></summary>
          <ol className="classement">
            {[...classement.donnees.tete, ...classement.donnees.voisins.filter((v) => v.rang > classement.donnees.tete.length)].map((ligne, i, toutes) => (
              <li key={ligne.rang} data-moi={ligne.moi} data-apres-un-saut={i > 0 && ligne.rang > toutes[i - 1].rang + 1}>
                <span className="classement__rang">{ligne.rang}</span>
                <span className="classement__pseudo">{ligne.moi ? `${ligne.pseudo} (toi)` : ligne.pseudo}</span>
                <span className="classement__ligue texte-doux">{ligueDe(ligne.cote, REGLES).nom}</span>
                <span className="classement__cote">{ligne.cote}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </>
  );
}
