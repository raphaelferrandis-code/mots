import { BadgeJoueurSimule } from '../composants/BadgeJoueurSimule.tsx';
import { CadreGrave } from '../composants/cosmetiques/Gravures.tsx';
import { Entete } from '../composants/Entete.tsx';
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

function Podium({ lignes, libelleMoi = 'C’est toi' }: { lignes: LigneDeClassement[]; libelleMoi?: string }) {
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
          {joueur.moi && <span className="podium__toi">{libelleMoi}</span>}
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

// « 1 joueur classé », « 2 joueurs classés », « 0 victoire ».
const accord = (n: number, singulier: string, pluriel: string): string => `${n.toLocaleString('fr-FR')} ${n > 1 ? pluriel : singulier}`;

const DESCRIPTIONS: Record<ModeDirect, string> = {
  solo: 'Les joutes entre deux joueurs en direct.',
  duo_solo: 'La cote personnelle des joueurs inscrits avec un partenaire aléatoire.',
  duo_equipe: 'Les équipes enregistrées : une cote commune pour chaque duo.',
};

export function Classement() {
  const partie = usePartie();
  const [mode,setMode] = useState<ModeDirect>('solo');
  const [tour,setTour] = useState(0);
  const pret = partie.etat === 'prete' && serveurUtilise;
  const resultat = useChargement(async () => pret ? clientDuServeur().appeler<ClassementDirect>('classement_direct',{p_mode:mode}) : null,`${mode}:${tour}:${pret}`);
  const classement = resultat.etat === 'pret' ? resultat.donnees : null;
  const equipes = mode === 'duo_equipe';
  const suite = classement ? classement.lignes.filter(l => l.rang > 3) : [];
  return <main className="ecran palmares">
    <Entete titre="Les classements" actions={<>
      {pret && <button type="button" className="bouton outil" onClick={() => setTour(t=>t+1)}>Actualiser</button>}
      <a className="bouton outil" href={lien({ecran:'joutes'})}>Jouer en direct</a>
    </>} />
    <div className="modes" role="tablist" aria-label="Classement" onKeyDown={choisirAuxFleches([...MODES_DIRECTS],mode,setMode)}>{MODES_DIRECTS.map(m => <button type="button" key={m} role="tab" id={`classement-${m}`} aria-controls="classement-contenu" aria-selected={mode===m} tabIndex={mode===m ? 0 : -1} onClick={() => setMode(m)}>{NOMS_DIRECTS[m]}</button>)}</div>
    <section className="palmares__contenu" role="tabpanel" id="classement-contenu" aria-labelledby={`classement-${mode}`}>
      <p className="texte-doux">{DESCRIPTIONS[mode]}</p>
      {!serveurUtilise ? <p>Connecte-toi au serveur pour consulter les classements.</p> : resultat.etat==='en cours' ? <p role="status">Chargement…</p> : null}
      {resultat.etat==='erreur' && <div className="palmares__erreur" role="alert"><p>{resultat.message}</p><button className="bouton" onClick={() => setTour(t=>t+1)}>Réessayer</button></div>}
      {classement && (classement.lignes.length===0 ? <section className="etat-vide">
        <h2>{equipes ? 'Aucune équipe classée' : 'Personne n’est encore classé'}</h2>
        <p>Aucune partie terminée pour l’instant. Prends la première place !</p>
      </section> : <>
        <Podium lignes={classement.lignes.filter(l => l.rang <= 3).map(l => ({rang:l.rang,pseudo:l.nom,cote:l.cote,moi:l.moi}))} libelleMoi={equipes ? 'Ton équipe' : 'C’est toi'} />
        <div className="palmares__suite">
          <p className="palmares__effectif">{equipes ? accord(classement.total, 'équipe classée', 'équipes classées') : accord(classement.total, 'joueur classé', 'joueurs classés')}</p>
          {suite.length > 0 && <ol className="palmares__liste">{suite.map((l, i) => <li key={l.rang} value={l.rang} data-moi={l.moi} data-intervalle={l.rang > (suite[i - 1]?.rang ?? 3) + 1}>
            <span className="palmares__rang"><span className="visuellement-cache">Rang </span>{l.rang}</span>
            <div className="palmares__identite"><strong className="palmares__pseudo">{l.nom}{l.moi && <small> · {equipes ? 'ton équipe' : 'toi'}</small>}</strong><span className="palmares__ligue">{accord(l.gagnees, 'victoire', 'victoires')} · {accord(l.jouees, 'partie', 'parties')}</span></div>
            <strong className="palmares__cote">{l.cote.toLocaleString('fr-FR')}<span className="visuellement-cache"> de cote</span></strong>
          </li>)}</ol>}
        </div>
      </>)}
    </section>
  </main>;
}
