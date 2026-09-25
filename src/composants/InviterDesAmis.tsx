// Le lien d'invitation du joueur, sur la page Amis : le copier ou le partager, et voir ce qu'il a donné.
// Pas besoin de pseudonyme : le lien vient du compte.

import { useState } from 'react';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { SITE } from '../config/site.ts';
import { lienDInvitation, nouvellesDuParrainage } from '../jeu/parrainage.ts';
import { lireMonParrainage } from '../services/partie.ts';
import { useChargement } from './useChargement.ts';

export function InviterDesAmis() {
  const [tour, setTour] = useState(0);
  const parrainage = useChargement(lireMonParrainage, `parrainage:${tour}`);
  const [annonce, setAnnonce] = useState('');

  if (parrainage.etat === 'en cours') return <section className="rubrique"><h2>Inviter des amis</h2><p role="status">Préparation de ton lien…</p></section>;
  if (parrainage.etat === 'erreur') return <section className="rubrique"><h2>Inviter des amis</h2><p role="alert">{parrainage.message}</p><button className="bouton" onClick={() => setTour((t) => t + 1)}>Réessayer</button></section>;

  const p = parrainage.donnees;
  const adresse = lienDInvitation(SITE.adresse, p.code);
  const copier = async (): Promise<void> => {
    try { await navigator.clipboard.writeText(adresse); setAnnonce('Lien copié. Colle-le dans un message à tes amis.'); }
    catch { setAnnonce('La copie est impossible ici : sélectionne le lien et copie-le.'); }
  };
  const partager = async (): Promise<void> => {
    try { await navigator.share({ title: SITE.nom, text: `Viens collectionner les mots de la langue française avec moi sur ${SITE.nom} !`, url: adresse }); }
    catch { /* partage annulé */ }
  };
  const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;
  const bilan = p.invites === 0 ? 'Personne n’est encore arrivé par ton lien.'
    : `${pluriel(p.invites, 'ami')} ${p.invites > 1 ? 'sont arrivés' : 'est arrivé'} par ton lien, ${p.valides} ${p.valides > 1 ? 'ont' : 'a'} joué ${p.valides > 1 ? 'leur' : 'son'} premier duel.`;

  return (
    <section className="rubrique parrainage">
      <h2>Inviter des amis</h2>
      <p>Quand un ami arrivé par ton lien termine son premier duel, vous recevez chacun <strong>{pluriel(p.paquets, 'paquet')}</strong>.</p>
      <div className="parrainage__lien">
        <input readOnly value={adresse} aria-label="Ton lien d’invitation" onFocus={(e) => e.currentTarget.select()} />
        <div className="rangee-de-boutons">
          <button className="bouton" onClick={() => void copier()}>Copier le lien</button>
          {'share' in navigator && <button className="bouton bouton--discret" onClick={() => void partager()}>Partager…</button>}
        </div>
      </div>
      {annonce && <p role="status" className="texte-doux petit">{annonce}</p>}
      {nouvellesDuParrainage(p, true).filter((n) => n.cle === 'attente').map((n) => <p key={n.cle} role="status"><strong>{n.titre}</strong> {n.texte}</p>)}
      <p className="texte-doux petit">{bilan} Récompense limitée à {EQUILIBRAGE.parrainage.filleulsRecompensesParMois} amis par mois.</p>
    </section>
  );
}
