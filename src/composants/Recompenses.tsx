import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { FAMILLES_SUCCES, titreDuSucces } from '../jeu/catalogueSucces.ts';
import { ORNEMENTS } from '../jeu/personnalisation.ts';
import { nouvellesRecompenses } from '../jeu/recompenses.ts';
import type { Recompense } from '../jeu/recompenses.ts';
import type { ProfilPersonnel } from '../jeu/personnalisation.ts';
import type { Resultat } from '../jeu/progression.ts';
import { Motif } from './cosmetiques/Gravures.tsx';
import './recompenses.css';

const Suspension = createContext<() => () => void>(() => () => {});
export function useRecompensesSuspendues(suspendre: boolean) {
  const retenir = useContext(Suspension);
  useEffect(() => suspendre ? retenir() : undefined, [suspendre, retenir]);
}

function Medaille({ motif = 'plume' }: { motif?: string }) {
  return <svg className="recompense__medaille" viewBox="0 0 100 110" fill="none" stroke="currentColor" aria-hidden="true"><path d="m28 73-5 30 27-13 27 13-5-30" fill="currentColor" fillOpacity=".1" /><circle cx="50" cy="45" r="39" /><circle cx="50" cy="45" r="33" strokeDasharray="1 4" /><g transform="translate(23 18) scale(.54)"><Motif nom={motif} /></g></svg>;
}

export function GainDuDuel({ resultat, encre, xp }: { resultat: Resultat; encre: number; xp: number }) {
  return <div className="gain-duel" data-resultat={resultat}>
    <Medaille motif={resultat === 'victoire' ? 'phenix' : 'plume'} />
    <h2>{resultat === 'victoire' ? 'Victoire' : resultat === 'nul' ? 'Match nul' : 'Défaite'}</h2>
    <div className="gain-duel__gains"><span><b>+{encre}</b> Encre</span><span><b>+{xp}</b> XP</span></div>
  </div>;
}

export function CarteRecompense({ recompense, pseudo, equipe, onEquiper }: { recompense: Recompense; pseudo: string; equipe?: boolean; onEquiper?: () => void }) {
  const succes = recompense.type === 'titre' ? recompense.succes : null;
  const famille = succes ? FAMILLES_SUCCES[succes.famille] : null;
  const objets = recompense.type === 'niveau' ? ORNEMENTS.filter(o => !o.premium && o.categorie !== 'titre' && o.niveau > recompense.avant && o.niveau <= recompense.niveau) : [];
  return <div className="recompense" data-type={recompense.type} style={{ '--metal-recompense': famille?.teinte ?? '#d7c397' } as CSSProperties}>
    <span className="recompense__rubrique">{succes ? 'Succès accompli' : 'Niveau atteint'}</span>
    {recompense.type === 'niveau' ? <>
      <div className="recompense__niveau" aria-hidden="true"><span>{recompense.niveau}</span></div>
      <h2>Niveau {recompense.niveau}</h2>
      {objets.length > 0 && <p className="recompense__objets">{objets.slice(0, 2).map(o => o.nom).join(' · ')}{objets.length > 2 && ` · +${objets.length - 2}`}<small>Accessibles par niveau</small></p>}
    </> : <>
      <Medaille motif={famille!.motif} />
      <h2>{succes!.nom}</h2>
      <p className="recompense__signature"><span>{pseudo || 'Collectionneur'}</span><strong>{succes!.titre}</strong><small>Titre débloqué</small></p>
      {onEquiper && <button className="bouton" disabled={equipe} onClick={onEquiper}>{equipe ? 'Titre équipé' : 'Porter ce titre'}</button>}
    </>}
  </div>;
}

export function Recompenses({ children, profil, onEquiper }: { children: ReactNode; profil: ProfilPersonnel | null; onEquiper: (id: string) => void }) {
  const precedent = useRef<Pick<ProfilPersonnel, 'xp' | 'succes'> | null>(null);
  const [attente, setAttente] = useState<Recompense[]>([]);
  const [suspensions, setSuspensions] = useState(0);
  const retenir = useCallback(() => {
    setSuspensions(n => n + 1);
    return () => setSuspensions(n => n - 1);
  }, []);
  const panneau = useRef<HTMLElement>(null);
  const origineFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!profil) { precedent.current = null; setAttente([]); return; }
    if (precedent.current) {
      const gains = nouvellesRecompenses(precedent.current, profil);
      if (gains.length) setAttente(liste => [...liste, ...gains]);
      // Une correction serveur ne fait pas rejouer un succès déjà vu pendant cette session.
      precedent.current = { xp: Math.max(precedent.current.xp, profil.xp), succes: [...new Set([...precedent.current.succes, ...profil.succes])] };
    } else precedent.current = { xp: profil.xp, succes: [...profil.succes] };
  }, [profil]);
  const actuelle = suspensions === 0 ? attente[0] : undefined;
  useEffect(() => {
    if (actuelle && !panneau.current?.contains(document.activeElement)) origineFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, [actuelle]);
  const fermer = () => {
    if (attente.length === 1 && panneau.current?.contains(document.activeElement)) {
      if (origineFocus.current?.isConnected) origineFocus.current.focus({ preventScroll: true });
      else { const main = document.querySelector('main'); if (main) { main.tabIndex = -1; main.focus({ preventScroll: true }); } }
    }
    setAttente(liste => liste.slice(1));
  };
  return <Suspension.Provider value={retenir}>{children}
    {actuelle && profil && <aside ref={panneau} className="recompenses" aria-label="Récompenses débloquées">
      <div className="visuellement-cache" role="status">{actuelle.type === 'niveau' ? `Niveau ${actuelle.niveau} atteint` : `Succès ${actuelle.succes.nom}. Titre ${actuelle.succes.titre} débloqué.`}</div>
      <CarteRecompense key={actuelle.type === 'niveau' ? `niveau-${actuelle.niveau}` : actuelle.succes.id} recompense={actuelle} pseudo={profil.pseudo} equipe={actuelle.type === 'titre' && profil.titre === titreDuSucces(actuelle.succes.id)} onEquiper={actuelle.type === 'titre' && profil.succes.includes(actuelle.succes.id) ? () => onEquiper(titreDuSucces(actuelle.succes.id)) : undefined} />
      <div className="recompenses__suite"><span>{attente.length > 1 ? `${attente.length - 1} autre${attente.length > 2 ? 's' : ''} récompense${attente.length > 2 ? 's' : ''}` : ''}</span><button type="button" className="bouton" onClick={fermer}>{attente.length > 1 ? 'Suivante' : 'Fermer'}</button></div>
    </aside>}
  </Suspension.Provider>;
}
