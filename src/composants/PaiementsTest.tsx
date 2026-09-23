import { useState } from 'react';
import { usePartie } from './usePartie.ts';
import { paiement } from '../services/paiements.ts';
import { synchroniser } from '../services/partie.ts';
import { lien } from '../navigation/routes.ts';
import { abonnementActif, peutPayer } from '../jeu/formule.ts';
import type { CleDeFormule } from '../jeu/formule.ts';

export function PaiementsTest() {
  const partie = usePartie();
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState('');
  if (partie.etat !== 'prete' || !partie.compte) return null;
  const { formule, codeDeSecoursLe } = partie.compte;
  const pret = !!codeDeSecoursLe && peutPayer(formule, new Date().getFullYear());
  const retour = new URLSearchParams(window.location.search).get('paiement');
  async function lancer(action: 'achat' | 'portail' | 'synchroniser', offre?: CleDeFormule) {
    setOccupe(true); setMessage('');
    try {
      await paiement(action, offre);
      if (action === 'synchroniser') {
        if (!await synchroniser()) throw new Error('Le paiement a été vérifié, mais la collection ne s’est pas actualisée. Réessaie.');
        setMessage('Tes avantages sont à jour.');
      }
    } catch (erreur) { setMessage(erreur instanceof Error ? erreur.message : 'Paiement indisponible.'); }
    finally { setOccupe(false); }
  }
  return <section className="rubrique" aria-label="Paiements de test">
    <h2>Essayer les paiements</h2>
    <p>Mode test réservé aux comptes autorisés. Aucun argent réel n’est encaissé.</p>
    {retour === 'retour' && <p role="status">De retour de Stripe : clique sur « Vérifier mes avantages » pour confirmer le paiement.</p>}
    {retour === 'annule' && <p>Tu as quitté le paiement. Tu peux reprendre avec le même bouton.</p>}
    {!pret && <p>Avant l’achat, confirme ton âge en cliquant sur « Acheter » dans une formule et <a href={lien({ ecran: 'reglages' })}>crée ton code de secours dans les Réglages</a>.</p>}
    <div className="rangee-de-boutons">
      <button className="bouton" disabled={occupe || !pret || formule.achatUnique} onClick={() => void lancer('achat', 'necessaire')}>Tester Mon album · 5,99 €</button>
      <button className="bouton" disabled={occupe || !pret || abonnementActif(formule)} onClick={() => void lancer('achat', 'collectionneur')}>Tester Collectionneur · 4,99 €/mois</button>
      <button className="bouton" disabled={occupe} onClick={() => void lancer('portail')}>Gérer mon abonnement</button>
      <button className="bouton" disabled={occupe} onClick={() => void lancer('synchroniser')}>Vérifier mes avantages</button>
    </div>
    {occupe && <p role="status">Vérification en cours…</p>}
    {message && <p role="status">{message}</p>}
  </section>;
}
