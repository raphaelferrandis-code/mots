// Le lien d'invitation du joueur, sur la page Amis : le copier ou le partager, et voir ce qu'il a donné.
// Pas besoin de pseudonyme : le lien vient du compte. Habillé « par avion » (refonte du 25/09/2026).

import { useState } from 'react';
import type { ReactNode } from 'react';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { SITE } from '../config/site.ts';
import { lienDInvitation, nouvellesDuParrainage } from '../jeu/parrainage.ts';
import { lireMonParrainage } from '../services/partie.ts';
import { Cachet } from './correspondance/Correspondance.tsx';
import { useChargement } from './useChargement.ts';

export function InviterDesAmis({ grand = false }: { grand?: boolean }) {
  const [tour, setTour] = useState(0);
  const parrainage = useChargement(lireMonParrainage, `parrainage:${tour}`);
  const [annonce, setAnnonce] = useState('');
  const [copie, setCopie] = useState(false);
  const titre = grand ? 'Envoyer ton lien' : 'Inviter des amis';
  const cadre = (contenu: ReactNode) => <section id="inviter" className={`par-avion${grand ? ' par-avion--grand' : ''}`} aria-labelledby="titre-inviter"><div className="par-avion__lettre">{contenu}</div></section>;

  if (parrainage.etat === 'en cours') return cadre(<><h2 id="titre-inviter">{titre}</h2><p role="status">Préparation de ton lien…</p></>);
  if (parrainage.etat === 'erreur') return cadre(<><h2 id="titre-inviter">{titre}</h2><p role="alert">{parrainage.message}</p><button className="bouton" onClick={() => setTour((t) => t + 1)}>Réessayer</button></>);

  const p = parrainage.donnees;
  const adresse = lienDInvitation(SITE.adresse, p.code);
  const limite = EQUILIBRAGE.parrainage.filleulsRecompensesParMois;
  const copier = async (): Promise<void> => {
    try { await navigator.clipboard.writeText(adresse); setCopie(true); setAnnonce('Lien copié. Colle-le dans un message à tes amis.'); window.setTimeout(() => setCopie(false), 2500); }
    catch { setAnnonce('La copie est impossible ici : sélectionne le lien et copie-le.'); }
  };
  const partager = async (): Promise<void> => {
    try { await navigator.share({ title: SITE.nom, text: `Viens collectionner les mots de la langue française avec moi sur ${SITE.nom} !`, url: adresse }); }
    catch { /* partage annulé */ }
  };
  const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;
  const bilan = p.invites === 0 ? 'Personne n’est encore arrivé par ton lien.'
    : `${pluriel(p.invites, 'ami')} ${p.invites > 1 ? 'sont arrivés' : 'est arrivé'} par ton lien, ${p.valides} ${p.valides > 1 ? 'ont' : 'a'} joué ${p.valides > 1 ? 'leur' : 'son'} premier duel.`
      + (p.aConfirmer > 0 ? ` ${p.aConfirmer} ${p.aConfirmer > 1 ? 'doivent' : 'doit'} encore relier un compte ou revenir jouer un autre jour pour te rapporter tes paquets.` : '');

  return cadre(<>
    <div className="par-avion__tete">
      <h2 id="titre-inviter">{titre}</h2>
      <Cachet chiffre={String(p.paquets)} haut={p.paquets > 1 ? 'paquets' : 'paquet'} bas="chacun" />
    </div>
    {p.confirmation
      ? <p className="par-avion__texte">Un ami arrivé par ton lien reçoit <strong>{pluriel(p.paquets, 'paquet')}</strong> dès son premier duel. Toi, tu reçois les tiens quand il a relié un compte Google ou e-mail et qu’il est revenu jouer un autre jour.</p>
      : <p className="par-avion__texte">Quand un ami arrivé par ton lien termine son premier duel, vous recevez chacun <strong>{pluriel(p.paquets, 'paquet')}</strong>.</p>}
    <label className="champ-correspondance">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
      <input readOnly value={adresse} aria-label="Ton lien d’invitation" onFocus={(e) => e.currentTarget.select()} />
    </label>
    <div className="par-avion__actions">
      <button className="bouton bouton--accent" onClick={() => void copier()}>{copie ? 'Lien copié' : 'Copier le lien'}</button>
      {'share' in navigator && <button className="bouton" onClick={() => void partager()}>Partager…</button>}
    </div>
    {annonce && <p role="status" className="visuellement-cache">{annonce}</p>}
    {nouvellesDuParrainage(p, true).filter((n) => n.cle === 'attente').map((n) => <p key={n.cle} role="status"><strong>{n.titre}</strong> {n.texte}</p>)}
    <div className="par-avion__bilan">
      <div className="par-avion__compte"><span className="mention">Amis récompensés</span><span><strong>{p.recompenses}</strong> · {limite} par mois au plus</span></div>
      <div className="jauge-parrainage" aria-hidden="true">{Array.from({ length: limite }, (_, i) => <i key={i} className={i < p.recompenses ? 'allume' : undefined} />)}</div>
      <p>{bilan}</p>
    </div>
  </>);
}
