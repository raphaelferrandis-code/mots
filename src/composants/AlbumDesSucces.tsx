import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { FAMILLES_SUCCES, SUCCES, titreDuSucces } from '../jeu/catalogueSucces.ts';
import type { ProfilPersonnel } from '../jeu/personnalisation.ts';
import { chargerLesSucces, personnaliser } from '../services/partie.ts';
import { Motif } from './cosmetiques/Gravures.tsx';
import './succes.css';

export function AlbumDesSucces({ profil, cible }: { profil: ProfilPersonnel; cible: string | null }) {
  const [famille, choisirFamille] = useState('tout');
  const [filtre, filtrer] = useState('tout');
  const [erreur, signaler] = useState(false);
  const [message, annoncer] = useState('');
  const cibleRef = useRef<HTMLElement>(null);
  async function charger() { signaler(false); try { await chargerLesSucces(); } catch { signaler(true); } }
  useEffect(() => { void charger(); }, []);
  useEffect(() => { if (cible) cibleRef.current?.scrollIntoView({ block: 'center' }); }, [cible]);
  const accomplis = new Set(profil.succes);
  const visibles = SUCCES.filter(s => (famille === 'tout' || s.famille === famille) && (filtre === 'tout' || (filtre === 'acquis' ? accomplis.has(s.id) : !accomplis.has(s.id))));
  return <section className="succes" aria-labelledby="titre-succes">
    <header className="succes__entete"><div><h2 id="titre-succes">Succès <span>{accomplis.size}<small> / {SUCCES.length}</small></span></h2><progress value={accomplis.size} max={SUCCES.length} aria-label={`${accomplis.size} succès sur ${SUCCES.length}`} /></div><span className="succes__total">{accomplis.size} titre{accomplis.size > 1 ? 's' : ''} remporté{accomplis.size > 1 ? 's' : ''}</span></header>
    <div className="succes__outils"><label className="visuellement-cache" htmlFor="famille-succes">Famille de succès</label><select id="famille-succes" value={famille} onChange={e => choisirFamille(e.target.value)}><option value="tout">Toutes les familles</option>{Object.entries(FAMILLES_SUCCES).map(([id,f]) => <option value={id} key={id}>{f.nom}</option>)}</select><div role="group" aria-label="Filtrer les succès">{[['tout','Tous'],['avenir','À accomplir'],['acquis','Accomplis']].map(([id,nom]) => <button key={id} aria-pressed={filtre === id} onClick={() => filtrer(id)}>{nom}</button>)}</div></div>
    {erreur && <p role="alert">Certains objectifs attendent le chargement des timbres. <button className="bouton" onClick={() => void charger()}>Réessayer</button></p>}
    <p role="status" className="visuellement-cache">{message}</p>
    <div className="succes__grille">{visibles.map(s => {
      const f = FAMILLES_SUCCES[s.famille];
      const acquis = accomplis.has(s.id);
      const progression = Math.min(s.objectif, profil.progressionSucces[s.mesure] ?? 0);
      const equipe = profil.titre === titreDuSucces(s.id);
      return <article key={s.id} ref={s.id === cible ? cibleRef : undefined} className="succes__carte" data-acquis={acquis} data-cible={s.id === cible} style={{ '--famille-succes': f.teinte } as CSSProperties}>
        <div className="succes__medaille" aria-hidden="true"><svg viewBox="0 0 100 100" fill="none" stroke="currentColor"><path d="m36 67-7 29 21-11 21 11-7-29" fill="currentColor" fillOpacity=".1" /><circle cx="50" cy="43" r="35" /><circle cx="50" cy="43" r="30" strokeDasharray="1 4" /><g transform="translate(20 13) scale(.6)"><Motif nom={f.motif} /></g></svg>{acquis && <span>✓</span>}</div>
        <div className="succes__contenu"><span className="succes__famille">{f.nom}{acquis && ' · Accompli'}</span><h3>{s.nom}</h3><p>{s.description}</p><div className="succes__progression"><progress aria-label={s.nom} value={progression} max={s.objectif} /><span>{progression.toLocaleString('fr-FR')} / {s.objectif.toLocaleString('fr-FR')}</span></div></div>
        <div className="succes__recompense"><div><span>Titre</span><strong>{s.titre}</strong></div>{acquis ? <button className="bouton" disabled={equipe} onClick={() => { personnaliser('titre', titreDuSucces(s.id)); annoncer(`Titre ${s.titre} équipé.`); }}>{equipe ? '✓ Équipé' : 'Équiper'}</button> : <span className="succes__verrou" aria-label="Titre verrouillé"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M5 7V5a3 3 0 0 1 6 0v2" /><rect x="3.5" y="7" width="9" height="7" rx="1.5" /></svg></span>}</div>
      </article>;
    })}</div>
    {!visibles.length && <p className="vestiaire__vide">Aucun succès dans cette sélection.</p>}
  </section>;
}
