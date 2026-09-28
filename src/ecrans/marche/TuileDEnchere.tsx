// Une vente de la salle des ventes : le timbre, son prix en grand, le temps qui reste en pastille, la finition en badge
// (audit de finition du 26/09/2026, chantier 7), et ce que l'on peut y faire.

import { useState } from 'react';
import { Carte } from '../../composants/carte/Carte.tsx';
import { prixActuel, tempsRestant } from '../../jeu/marche.ts';
import type { Enchere } from '../../jeu/marche.ts';
import type { CarteIndex } from '../../partage/types.ts';
import { FormulaireDeMise, acheterToutDeSuite } from './Mise.tsx';
import { NomDuJoueur } from './NomDuJoueur.tsx';
import type { Retour } from './Mise.tsx';

const HORLOGE = <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>;
const UNE_HEURE = 3_600_000;

export function TuileDEnchere({ enchere, carte, maintenant, encre, ouvert, onChange }: {
  enchere: Enchere; carte: CarteIndex | undefined; maintenant: number; encre: number; ouvert: boolean; onChange: () => void;
}) {
  const [miser, setMiser] = useState(false);
  const [retour, setRetour] = useState<Retour | null>(null);
  const [occupe, setOccupe] = useState(false);
  const mot = carte?.mot ?? enchere.carte;
  const reste = enchere.fermeLe - maintenant;
  const enCours = enchere.etat === 'ouverte' && reste > 0;
  const fini = (r: Retour): void => { setRetour(r); setMiser(false); if (r.ton === 'succes') onChange(); };
  const acheter = async (): Promise<void> => {
    setOccupe(true);
    const r = await acheterToutDeSuite(enchere, mot);
    setOccupe(false);
    if (r) fini(r);
  };

  return (
    <li className="tuile-enchere" data-en-tete={enchere.enTete || undefined}>
      <div className="tuile-enchere__timbre">{carte ? <Carte carte={carte} finition={enchere.finition} /> : <div className="deck__vide" aria-hidden="true" />}</div>
      <div className="tuile-enchere__corps">
        <p className="tuile-enchere__titre">
          <strong>{mot}</strong>
          {carte && <span className="tuile-enchere__rarete">{carte.rarete}</span>}
          {enchere.finition !== 'Normale' && <span className="tuile-enchere__finition" data-finition={enchere.finition}>{enchere.finition}</span>}
        </p>
        <p className="tuile-enchere__prix">
          <strong>{prixActuel(enchere).toLocaleString('fr-FR')}</strong> Encre
          <span>{enchere.meilleureMise === null ? 'mise de départ' : enchere.enTete ? 'ta mise, en tête' : 'meilleure mise'}</span>
        </p>
        <p className="tuile-enchere__infos">
          <span className="tuile-enchere__temps" data-urgent={(enCours && reste < UNE_HEURE) || undefined}>{HORLOGE}{tempsRestant(enchere.fermeLe, maintenant)}</span>
          <span>{enchere.mienne ? 'ta vente' : <>par <NomDuJoueur pseudo={enchere.vendeur} simule={enchere.vendeurSimule} /></>}</span>
        </p>
        {(enchere.achatImmediat !== null || enchere.cote !== null) && (
          <p className="tuile-enchere__details">
            {enchere.achatImmediat !== null && <>Achat immédiat {enchere.achatImmediat.toLocaleString('fr-FR')} Encre</>}
            {enchere.achatImmediat !== null && enchere.cote !== null && ' · '}
            {enchere.cote !== null && <>cote {enchere.cote.toLocaleString('fr-FR')}</>}
          </p>
        )}
        {retour && <p className={`message message--${retour.ton} tuile-enchere__retour`} role={retour.ton === 'erreur' ? 'alert' : 'status'}>{retour.texte}</p>}
        {enCours && ouvert && !enchere.mienne && (miser
          ? <FormulaireDeMise enchere={enchere} mot={mot} encre={encre} onFini={fini} onAnnuler={() => setMiser(false)} />
          : (
            <div className="rangee-de-boutons">
              {!enchere.enTete && <button type="button" className="bouton" disabled={occupe} onClick={() => { setRetour(null); setMiser(true); }}>Miser</button>}
              {enchere.achatImmediat !== null && <button type="button" className="bouton bouton--discret" disabled={occupe} onClick={() => void acheter()}>Acheter {enchere.achatImmediat.toLocaleString('fr-FR')}</button>}
            </div>
          ))}
      </div>
    </li>
  );
}
