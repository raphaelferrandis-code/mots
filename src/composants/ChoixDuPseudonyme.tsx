import { useId, useState } from 'react';
import { LONGUEUR_DU_PSEUDO } from '../jeu/pseudo.ts';
import { pseudoDuJoueur } from '../services/identite.ts';
import { rejoindreLesJoutes } from '../services/partie.ts';
import { usePartie } from './usePartie.ts';
import { messageDe } from '../partage/messages.ts';
import './choixDuPseudonyme.css';

// Le pseudonyme : un seul nom pour tout le jeu, demandé une seule fois, et public dès qu'il est choisi
// (décision de Raphaël du 24/09/2026). La même case sert partout où le jeu en a besoin — profil, amis,
// joutes en direct, équipe — et le profil permet ensuite de le changer.
export function ChoixDuPseudonyme({ titre = 'Choisis ton pseudonyme', autoFocus = false, onValide, onAnnuler, onOccupe }: {
  titre?: string;
  autoFocus?: boolean;
  onValide?: () => void;
  onAnnuler?: () => void;
  onOccupe?: (occupe: boolean) => void;
}) {
  const partie = usePartie();
  const actuel = partie.etat === 'prete' ? pseudoDuJoueur(partie.sauvegarde) : '';
  const [saisie, setSaisie] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');
  const id = useId();
  const valeur = saisie ?? actuel;
  const occuper = (oui: boolean) => { setOccupe(oui); onOccupe?.(oui); };

  return <form className="choix-pseudonyme" aria-labelledby={id} onSubmit={async (e) => {
    e.preventDefault();
    if (occupe) return;
    occuper(true); setErreur('');
    try { await rejoindreLesJoutes(valeur.trim()); onValide?.(); }
    catch (raison) { setErreur(messageDe(raison)); }
    finally { occuper(false); }
  }}>
    <h2 id={id}>{titre}</h2>
    <p>C’est ton nom dans tout le jeu, et les autres joueurs le voient : tes amis te trouvent avec, et il apparaît au classement quand tu joues en direct. Un conseil : n’y mets pas ton vrai nom.</p>
    <label>Ton pseudonyme<input value={valeur} onChange={(e) => setSaisie(e.target.value)} required minLength={LONGUEUR_DU_PSEUDO.minimum}
      maxLength={LONGUEUR_DU_PSEUDO.maximum} disabled={occupe} autoFocus={autoFocus} autoComplete="nickname" /></label>
    {erreur && <p className="choix-pseudonyme__erreur" role="alert">{erreur}</p>}
    <div className="rangee-de-boutons">
      <button className="bouton" disabled={occupe}>{occupe ? 'Vérification…' : 'Valider mon pseudonyme'}</button>
      {onAnnuler && <button type="button" className="bouton bouton--discret" disabled={occupe} onClick={onAnnuler}>Annuler</button>}
    </div>
  </form>;
}
