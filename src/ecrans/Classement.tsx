import { useState } from 'react';
import { BadgeJoueurSimule } from '../composants/BadgeJoueurSimule.tsx';
import { CadreGrave } from '../composants/cosmetiques/Gravures.tsx';
import { useChargement } from '../composants/useChargement.ts';
import { usePartie } from '../composants/usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { ligueDe } from '../jeu/joute.ts';
import { lien } from '../navigation/routes.ts';
import { serveurDeJoutes } from '../services/joutes.ts';
import type { LigneDeClassement } from '../services/joutes.ts';
import './classement.css';

function Podium({ lignes }: { lignes: LigneDeClassement[] }) {
  const meilleurs = lignes.filter((ligne) => ligne.rang <= 3);
  if (!meilleurs.length) return null;
  return <section className="podium" aria-labelledby="podium-titre">
    <header className="podium__entete">
      <h2 id="podium-titre">Les maîtres du jeu</h2>
    </header>
    <ol className="podium__joueurs">
      {meilleurs.map((joueur) => <li className="podium__joueur" data-rang={joueur.rang} key={joueur.rang}>
        <div className="podium__medaillon" aria-hidden="true">
          <div className="podium__coeur"><span>{joueur.pseudo.trim().slice(0, 1).toLocaleUpperCase('fr-FR')}</span></div>
          <CadreGrave modele={joueur.rang === 1 ? 'laurier' : 'postal'} />
          <span className="podium__sceau">{['', 'I', 'II', 'III'][joueur.rang]}</span>
        </div>
        <div className="podium__identite">
          <span className="visuellement-cache">{joueur.rang === 1 ? 'Premier' : joueur.rang === 2 ? 'Deuxième' : 'Troisième'} du classement : </span>
          <h3>{joueur.pseudo}</h3>
          {joueur.moi && <span className="podium__toi">C’est toi</span>}
          <p className="podium__ligue">Ligue {ligueDe(joueur.cote, EQUILIBRAGE.joute).nom}</p>
          <BadgeJoueurSimule maison={joueur.maison} />
        </div>
        <div className="podium__socle">
          <span className="podium__cote">{joueur.cote.toLocaleString('fr-FR')}</span>
          <span className="podium__unite">Cote</span>
        </div>
      </li>)}
    </ol>
    <div className="podium__signature" aria-hidden="true"><span />✦<span /></div>
  </section>;
}

function SuiteDuClassement({ lignes, joueurs }: { lignes: LigneDeClassement[]; joueurs: number }) {
  return <section className="palmares__suite" aria-label="Suite du classement">
    <p className="palmares__effectif">{joueurs.toLocaleString('fr-FR')} joueurs en lice</p>
    <ol className="palmares__liste">
      {lignes.map((ligne, index) => <li key={ligne.rang} value={ligne.rang} data-moi={ligne.moi} data-intervalle={ligne.rang > (lignes[index - 1]?.rang ?? 3) + 1}>
        <span className="palmares__rang"><span className="visuellement-cache">Rang </span>{ligne.rang}</span>
        <div className="palmares__identite">
          <span className="palmares__pseudo">{ligne.pseudo}{ligne.moi && <small> · toi</small>}</span>
          <span className="palmares__ligue">{ligueDe(ligne.cote, EQUILIBRAGE.joute).nom}</span>
          <BadgeJoueurSimule maison={ligne.maison} />
        </div>
        <span className="palmares__cote">{ligne.cote.toLocaleString('fr-FR')}<span className="visuellement-cache"> de cote</span></span>
      </li>)}
    </ol>
  </section>;
}

export function Classement() {
  const partie = usePartie();
  const [tour, actualiser] = useState(0);
  const joutes = partie.etat === 'prete' ? partie.sauvegarde.joutes : null;
  const pseudo = joutes?.pseudo ?? '';
  const cote = joutes?.cote ?? EQUILIBRAGE.joute.coteDeDepart;
  const resultat = useChargement(async () => pseudo ? serveurDeJoutes.classement(pseudo, cote) : null, `${pseudo}:${cote}:${tour}`);
  const classement = resultat.etat === 'pret' ? resultat.donnees : null;
  const suite = classement ? [...classement.tete, ...classement.voisins.filter((ligne) => !classement.tete.some((premier) => premier.rang === ligne.rang))].filter((ligne) => ligne.rang > 3).sort((a, b) => a.rang - b.rang) : [];

  return <main className="ecran palmares">
    <h1 className="visuellement-cache">Le classement</h1>
    {partie.etat === 'erreur' ? <p role="alert">{partie.message}</p> : partie.etat !== 'prete' ? <p role="status">Chargement…</p> : !pseudo ? <section className="rubrique">
      <h2>Prends ta place dans les joutes</h2>
      <p>Pour consulter le classement et y figurer, choisis ton pseudo dans l’onglet « Joutes classées » des duels.</p>
      <a className="bouton" href={lien({ ecran: 'duel' })}>Accéder aux duels</a>
    </section> : <>
      {resultat.etat === 'en cours' && <p role="status">Chargement du classement…</p>}
      {resultat.etat === 'erreur' && <div className="palmares__erreur"><p role="alert">Le classement est indisponible. {resultat.message}</p><button className="bouton bouton--discret" onClick={() => actualiser((n) => n + 1)}>Réessayer</button></div>}
      {classement && <>
        <Podium lignes={classement.tete} />
        {suite.length > 0 && <SuiteDuClassement lignes={suite} joueurs={classement.joueurs} />}
        {classement.tete.length === 0 && <p>Aucun joueur classé pour l’instant.</p>}
      </>}
    </>}
  </main>;
}
