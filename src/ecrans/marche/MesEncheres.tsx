// « Tes enchères », en tête du marché (audit de finition du 26/09/2026, chantier 7) : chacune avec son état en un mot
// (Dépassée, En tête, En vente, Remportée, Vendue, Invendue, Perdue…), ce qu'il veut dire, et le geste qui va avec.

import { useState } from 'react';
import { Carte } from '../../composants/carte/Carte.tsx';
import { demanderConfirmation } from '../../composants/Confirmation.tsx';
import { EQUILIBRAGE } from '../../config/equilibrage.ts';
import { mesEncheresEnOrdre, prixActuel, statutDeMonEnchere, tempsRestant, vendeurRecoit } from '../../jeu/marche.ts';
import type { Enchere } from '../../jeu/marche.ts';
import { lien } from '../../navigation/routes.ts';
import { messageDe } from '../../partage/messages.ts';
import type { CarteIndex } from '../../partage/types.ts';
import { retirerDeLaVente } from '../../services/partie.ts';
import { FormulaireDeMise } from './Mise.tsx';
import type { Retour } from './Mise.tsx';

const REGLES = EQUILIBRAGE.marche;
const encre = (n: number | null): string => `${(n ?? 0).toLocaleString('fr-FR')} Encre`;

// Ce que l'état veut dire, en une ligne.
function detail(e: Enchere, maintenant: number): string {
  const temps = tempsRestant(e.fermeLe, maintenant);
  switch (statutDeMonEnchere(e).cle) {
    case 'depassee': return `Meilleure mise : ${encre(prixActuel(e))} · ${temps}`;
    case 'en-tete': return `Ta mise : ${encre(prixActuel(e))}, mis de côté · ${temps}`;
    case 'en-vente': return `${e.meilleureMise === null ? 'Mise de départ' : 'Meilleure mise'} : ${encre(prixActuel(e))} · ${temps}`;
    case 'remportee': return `Pour ${encre(e.prixFinal)} : il est dans ton album`;
    case 'vendue': return `${encre(e.prixFinal)}, dont ${encre(vendeurRecoit(e.prixFinal ?? 0, REGLES))} pour toi${e.acheteur ? ` · à ${e.acheteur}` : ''}`;
    case 'invendue': return 'Sans preneur : revenu dans ton album';
    case 'perdue': return `Parti à ${encre(e.prixFinal)} : ton Encre t’est revenue`;
    case 'retiree': return 'Revenu dans ton album';
    case 'annulee': return 'Vente annulée : ton Encre t’est revenue';
  }
}

export function MesEncheres({ ventes, mises, cartes, maintenant, encre: reserve, ouvert, onChange }: {
  ventes: Enchere[]; mises: Enchere[]; cartes: Map<string, CarteIndex> | null; maintenant: number; encre: number; ouvert: boolean; onChange: () => void;
}) {
  const liste = mesEncheresEnOrdre(ventes, mises);
  if (liste.length === 0) return null;
  return (
    <section className="rubrique mes-encheres" aria-labelledby="titre-mes-encheres">
      <h2 id="titre-mes-encheres">Tes enchères</h2>
      <ul className="mes-encheres__liste">
        {liste.map((e) => <MonEnchere key={e.id} enchere={e} carte={cartes?.get(e.carte)} maintenant={maintenant} encre={reserve} ouvert={ouvert} onChange={onChange} />)}
      </ul>
    </section>
  );
}

function MonEnchere({ enchere, carte, maintenant, encre: reserve, ouvert, onChange }: {
  enchere: Enchere; carte: CarteIndex | undefined; maintenant: number; encre: number; ouvert: boolean; onChange: () => void;
}) {
  const [miser, setMiser] = useState(false);
  const [retour, setRetour] = useState<Retour | null>(null);
  const [occupe, setOccupe] = useState(false);
  const statut = statutDeMonEnchere(enchere);
  const mot = carte?.mot ?? enchere.carte;
  const enCours = enchere.etat === 'ouverte' && enchere.fermeLe > maintenant;
  const fini = (r: Retour): void => { setRetour(r); setMiser(false); if (r.ton === 'succes') onChange(); };
  const retirer = async (): Promise<void> => {
    if (!(await demanderConfirmation({ titre: 'Retirer cette vente ?', message: 'Le timbre revient dans ton album.', confirmer: 'Retirer la vente' }))) return;
    setOccupe(true);
    try { await retirerDeLaVente(enchere.id); fini({ ton: 'succes', texte: 'Vente retirée : le timbre est revenu dans ton album.' }); }
    catch (erreur) { fini({ ton: 'erreur', texte: messageDe(erreur) }); }
    finally { setOccupe(false); }
  };

  return (
    <li className="mon-enchere" data-ton={statut.ton}>
      <div className="mon-enchere__timbre">{carte ? <Carte carte={carte} finition={enchere.finition} /> : <div className="deck__vide" aria-hidden="true" />}</div>
      <div className="mon-enchere__corps">
        <p className="mon-enchere__titre"><strong>{mot}</strong><span className="etiquette-enchere" data-ton={statut.ton}>{statut.libelle}</span></p>
        <p className="mon-enchere__detail">{detail(enchere, maintenant)}</p>
        {retour && <p className={`message message--${retour.ton} petit`} role={retour.ton === 'erreur' ? 'alert' : 'status'}>{retour.texte}</p>}
        {statut.cle === 'depassee' && enCours && ouvert && (miser
          ? <FormulaireDeMise enchere={enchere} mot={mot} encre={reserve} onFini={fini} onAnnuler={() => setMiser(false)} />
          : <div className="rangee-de-boutons"><button type="button" className="bouton" onClick={() => { setRetour(null); setMiser(true); }}>Surenchérir</button></div>)}
        {statut.cle === 'en-vente' && enCours && enchere.meilleureMise === null && (
          <div className="rangee-de-boutons"><button type="button" className="bouton bouton--discret" disabled={occupe} onClick={() => void retirer()}>Retirer de la vente</button></div>
        )}
        {statut.cle === 'remportee' && <a className="mon-enchere__lien" href={lien({ ecran: 'carte', id: enchere.carte })}>Voir le timbre</a>}
      </div>
    </li>
  );
}
