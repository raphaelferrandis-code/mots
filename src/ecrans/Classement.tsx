import { BadgeJoueurSimule } from '../composants/BadgeJoueurSimule.tsx';
import { CadreGrave } from '../composants/cosmetiques/Gravures.tsx';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { ligueDe } from '../jeu/joute.ts';
import type { LigneDeClassement } from '../services/joutes.ts';
import { useState } from 'react';
import { useChargement } from '../composants/useChargement.ts';
import { usePartie } from '../composants/usePartie.ts';
import { choisirAuxFleches } from '../composants/fleches.ts';
import { clientDuServeur, serveurUtilise } from '../services/compte.ts';
import { MODES_DIRECTS, NOMS_DIRECTS } from '../jeu/direct.ts';
import type { ClassementDirect, ModeDirect } from '../jeu/direct.ts';
import { lien } from '../navigation/routes.ts';
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

export function Classement() {
  const partie = usePartie();
  const [mode,setMode] = useState<ModeDirect>('solo');
  const [tour,setTour] = useState(0);
  const pret = partie.etat === 'prete' && serveurUtilise;
  const resultat = useChargement(async () => pret ? clientDuServeur().appeler<ClassementDirect>('classement_direct',{p_mode:mode}) : null,`${mode}:${tour}:${pret}`);
  const classement = resultat.etat === 'pret' ? resultat.donnees : null;
  return <main className="ecran palmares">
    <h1>Les classements</h1>
    <div className="modes" role="tablist" aria-label="Classement" onKeyDown={choisirAuxFleches([...MODES_DIRECTS],mode,setMode)}>{MODES_DIRECTS.map(m => <button type="button" key={m} role="tab" id={`classement-${m}`} aria-controls="classement-contenu" aria-selected={mode===m} tabIndex={mode===m ? 0 : -1} onClick={() => setMode(m)}>{NOMS_DIRECTS[m]}</button>)}</div>
    <section role="tabpanel" id="classement-contenu" aria-labelledby={`classement-${mode}`}>
      <p className="texte-doux">{mode==='solo' ? 'Les joutes entre deux joueurs en direct.' : mode==='duo_solo' ? 'La cote personnelle des joueurs inscrits avec un partenaire aléatoire.' : 'Les équipes enregistrées : une cote commune pour chaque duo.'}</p>
      {!serveurUtilise ? <p>Connecte-toi au serveur pour consulter les classements.</p> : resultat.etat==='en cours' ? <p role="status">Chargement…</p> : null}
      {resultat.etat==='erreur' && <div role="alert"><p>{resultat.message}</p><button className="bouton" onClick={() => setTour(t=>t+1)}>Réessayer</button></div>}
      {classement && <>
        <Podium lignes={classement.lignes.filter(l => l.rang <= 3).map(l => ({rang:l.rang,pseudo:l.nom,cote:l.cote,moi:l.moi}))} /><p>{classement.total} {mode==='duo_equipe' ? 'équipes classées' : 'joueurs classés'}</p>
        {classement.lignes.length===0 ? <p>Aucune partie terminée pour l’instant. Prends la première place !</p> : <ol className="palmares__liste">{classement.lignes.filter(l => l.rang > 3).map(l => <li key={l.rang} value={l.rang} data-moi={l.moi}>
          <span className="palmares__rang">{l.rang}</span><div className="palmares__identite"><strong className="palmares__pseudo">{l.nom}{l.moi && <small> · {mode==='duo_equipe' ? 'ton équipe' : 'toi'}</small>}</strong><span>{l.gagnees} victoires · {l.jouees} parties</span></div><strong className="palmares__cote">{l.cote}</strong>
        </li>)}</ol>}
        <button className="bouton bouton--discret" onClick={() => setTour(t=>t+1)}>Actualiser</button>
      </>}
    </section>
    <a className="bouton" href={lien({ecran:'joutes'})}>Jouer en direct</a>
  </main>;
}
