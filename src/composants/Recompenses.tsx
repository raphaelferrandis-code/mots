import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { FAMILLES_SUCCES, titreDuSucces } from '../jeu/catalogueSucces.ts';
import type { Succes } from '../jeu/catalogueSucces.ts';
import { ORNEMENTS } from '../jeu/personnalisation.ts';
import { nouvellesRecompenses, resumerLesRecompenses } from '../jeu/recompenses.ts';
import type { Recompense } from '../jeu/recompenses.ts';
import type { Ornement, ProfilPersonnel } from '../jeu/personnalisation.ts';
import type { Resultat } from '../jeu/progression.ts';
import { lien } from '../navigation/routes.ts';
import { personnaliser } from '../services/partie.ts';
import { Motif } from './cosmetiques/Gravures.tsx';
import { usePartie } from './usePartie.ts';
import './recompenses.css';

// Le guichet des récompenses. Pendant un paquet ou un duel, elles attendent (« retenir ») ; à son écran de fin, elles
// s'y affichent en vraies cartes (« capturer »), au lieu du petit bandeau, et sont oubliées quand on le quitte (audit
// de finition du 26/09/2026 : niveau, succès et titre passaient par une notification de 5 s, par-dessus la fin du duel).
type Guichet = { retenir: () => () => void; capturer: () => () => void; attente: readonly Recompense[] };
const GuichetDesRecompenses = createContext<Guichet>({ retenir: () => () => {}, capturer: () => () => {}, attente: [] });
export function useRecompensesSuspendues(suspendre: boolean) {
  const { retenir } = useContext(GuichetDesRecompenses);
  useEffect(() => suspendre ? retenir() : undefined, [suspendre, retenir]);
}
// Les récompenses du moment (paquet, duel), tant que son écran de fin est ouvert : il les montre, puis elles sont vidées.
export function useRecompensesDuMoment(actif: boolean): readonly Recompense[] {
  const { capturer, attente } = useContext(GuichetDesRecompenses);
  useEffect(() => (actif ? capturer() : undefined), [actif, capturer]);
  return actif ? attente : [];
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
  // Les pièces premium ne comptent que si elles sont offertes à ce niveau (prestige).
  const palier = (o: Ornement) => o.premium ? o.prestige ?? 0 : o.niveau;
  const objets = recompense.type === 'niveau' ? ORNEMENTS.filter(o => o.categorie !== 'titre' && palier(o) > recompense.avant && palier(o) <= recompense.niveau) : [];
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

// Les progrès d'un paquet ou d'un duel, dans son écran de fin : le niveau atteint et ce qu'il débloque ; chaque succès,
// son sceau aux couleurs de sa famille et son titre, à porter tout de suite. Compact : le résumé d'un paquet tient sur
// un petit téléphone.
export function MomentsDeProgres({ recompenses }: { recompenses: readonly Recompense[] }) {
  const partie = usePartie();
  if (recompenses.length === 0 || partie.etat !== 'prete') return null;
  const profil = partie.sauvegarde.profil;
  const niveaux = recompenses.flatMap((r) => (r.type === 'niveau' ? [r] : []));
  const niveau = niveaux.length ? { avant: Math.min(...niveaux.map((r) => r.avant)), apres: Math.max(...niveaux.map((r) => r.niveau)) } : null;
  const succes = [...new Map(recompenses.flatMap((r) => (r.type === 'titre' ? [[r.succes.id, r.succes] as const] : []))).values()];
  // (Les pièces premium ne comptent que si elles sont offertes à ce niveau : prestige.)
  const palier = (o: Ornement) => (o.premium ? o.prestige ?? 0 : o.niveau);
  const objets = niveau ? ORNEMENTS.filter((o) => o.categorie !== 'titre' && palier(o) > niveau.avant && palier(o) <= niveau.apres) : [];
  return (
    <section className="progres" aria-label="Tes progrès">
      {niveau && (
        <article className="progres__carte" data-type="niveau">
          <span className="progres__niveau" aria-hidden="true">{niveau.apres}</span>
          <div className="progres__texte">
            <span className="progres__rubrique">Niveau atteint</span>
            <strong>Niveau {niveau.apres}</strong>
            {objets.length > 0 && <span className="progres__detail">À toi : {objets.slice(0, 2).map((o) => o.nom).join(', ')}{objets.length > 2 ? ` et ${objets.length - 2} autre${objets.length > 3 ? 's' : ''}` : ''} · <a href={lien({ ecran: 'profil' })}>Voir</a></span>}
          </div>
        </article>
      )}
      {succes.map((s) => <CarteDeSucces key={s.id} succes={s} porte={profil.titre === titreDuSucces(s.id)} />)}
    </section>
  );
}

function CarteDeSucces({ succes, porte }: { succes: Succes; porte: boolean }) {
  const famille = FAMILLES_SUCCES[succes.famille];
  return (
    <article className="progres__carte" data-type="succes" style={{ '--metal-recompense': famille.teinte } as CSSProperties}>
      <Medaille motif={famille.motif} />
      <div className="progres__texte">
        <span className="progres__rubrique">Succès accompli</span>
        <strong>{succes.nom}</strong>
        <span className="progres__detail">Titre : <em className="progres__titre">{succes.titre}</em></span>
      </div>
      <button type="button" className="progres__porter" disabled={porte} onClick={() => personnaliser('titre', titreDuSucces(succes.id))}>{porte ? 'Titre porté' : 'Porter ce titre'}</button>
    </article>
  );
}

// « repere » (services/partie.ts, repereDesRecompenses) : null tant que le compte n'est pas à jour ; il change avec le
// compte. Le premier profil vu après lui sert de référence : ce qui arrive avec la collection n'est pas un gain.
export function Recompenses({ children, profil, repere }: { children: ReactNode; profil: ProfilPersonnel | null; repere: number | null }) {
  const precedent = useRef<Pick<ProfilPersonnel, 'xp' | 'succes'> | null>(null);
  const reperePrecedent = useRef<number | null>(null);
  const [attente, setAttente] = useState<Recompense[]>([]);
  const [suspensions, setSuspensions] = useState(0);
  const [captures, setCaptures] = useState(0);
  // Le dernier écran de fin vient de se fermer : ses récompenses ont été vues, pas de bandeau après coup. (Oubliées ici,
  // et non dans le nettoyage de l'écran : en développement, React démonte et remonte chaque écran une fois.)
  const [vues, setVues] = useState(false);
  const [survolee, setSurvolee] = useState(false);
  const [focusDedans, setFocusDedans] = useState(false);
  const retenir = useCallback(() => {
    setSuspensions(n => n + 1);
    return () => setSuspensions(n => n - 1);
  }, []);
  const capturer = useCallback(() => {
    setCaptures(n => n + 1); setVues(false);
    return () => { setCaptures(n => n - 1); setVues(true); };
  }, []);
  useLayoutEffect(() => {
    if (vues && captures === 0) { setAttente([]); setVues(false); }
  }, [vues, captures]);
  const panneau = useRef<HTMLElement>(null);
  const origineFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!profil || repere === null) { precedent.current = null; reperePrecedent.current = null; setAttente([]); return; }
    if (reperePrecedent.current !== repere) { precedent.current = null; reperePrecedent.current = repere; setAttente([]); }
    if (precedent.current) {
      const gains = nouvellesRecompenses(precedent.current, profil);
      if (gains.length) setAttente(liste => [...liste, ...gains]);
      // Une correction serveur ne fait pas rejouer un succès déjà vu pendant cette session.
      precedent.current = { xp: Math.max(precedent.current.xp, profil.xp), succes: [...new Set([...precedent.current.succes, ...profil.succes])] };
    } else precedent.current = { xp: profil.xp, succes: [...profil.succes] };
  }, [profil, repere]);
  // Le bandeau ne sert plus qu’aux récompenses gagnées hors d’un paquet ou d’un duel (leur écran de fin les montre).
  const visible = suspensions === 0 && captures === 0 && !vues && attente.length > 0;
  useEffect(() => {
    if (visible && !panneau.current?.contains(document.activeElement)) origineFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!visible) { setSurvolee(false); setFocusDedans(false); }
  }, [visible]);
  const fermer = useCallback(() => {
    if (panneau.current?.contains(document.activeElement)) {
      if (origineFocus.current?.isConnected) origineFocus.current.focus({ preventScroll: true });
      else { const main = document.querySelector('main'); if (main) { main.tabIndex = -1; main.focus({ preventScroll: true }); } }
    }
    setAttente([]);
  }, []);
  // Un seul résumé, même après une ouverture ou un duel riche en récompenses.
  // Laisser le temps de le lire au clavier ou au survol, sans prendre le focus.
  useEffect(() => {
    if (!visible || survolee || focusDedans) return;
    const minuterie = window.setTimeout(fermer, 5000);
    return () => window.clearTimeout(minuterie);
  }, [visible, attente, survolee, focusDedans, fermer]);
  const resume = resumerLesRecompenses(attente);
  return <GuichetDesRecompenses.Provider value={{ retenir, capturer, attente }}>{children}
    <div className="visuellement-cache" role="status" aria-atomic="true">{visible && resume ? `${resume.titre}. ${resume.detail}` : ''}</div>
    {visible && profil && resume && <aside ref={panneau} className="recompenses" aria-label="Récompenses débloquées"
      onMouseEnter={() => setSurvolee(true)} onMouseLeave={() => setSurvolee(false)}
      onFocus={() => setFocusDedans(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocusDedans(false); }}
      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); fermer(); } }}>
      <span className="recompenses__icone" aria-hidden="true">✧</span>
      <div className="recompenses__texte"><strong>{resume.titre}</strong><span>{resume.detail}</span></div>
      <button type="button" className="recompenses__fermer" onClick={fermer} aria-label="Fermer la notification">×</button>
    </aside>}
  </GuichetDesRecompenses.Provider>;
}
