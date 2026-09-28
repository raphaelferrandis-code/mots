// Composer un échange avec un ami (audit de finition du 26/09/2026, S33 : on le composait avec deux listes déroulantes
// de texte). Les timbres se voient, comme dans l'album : d'abord ce que l'on reçoit (sa collection, en tête ce qui manque
// à la sienne), puis ce que l'on donne (son album, ses doubles en tête). Un résumé « Tu reçois ⇄ Tu donnes » reste en
// haut, avec la finition quand il y en a plusieurs ; on revient à l'un ou l'autre d'un toucher.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Carte } from '../../composants/carte/Carte.tsx';
import { ChoixDUnTimbre, nombreDExemplaires } from '../../composants/ChoixDUnTimbre.tsx';
import type { Exemplaires } from '../../composants/ChoixDUnTimbre.tsx';
import { PortraitAmi } from '../../composants/correspondance/Correspondance.tsx';
import { useChargement } from '../../composants/useChargement.ts';
import { FINITIONS } from '../../partage/types.ts';
import type { CarteIndex, Finition } from '../../partage/types.ts';
import type { AlbumAmi, Relation, TimbreEchange } from '../../services/amis.ts';
import { lireAlbumAmi, proposerUnEchange } from '../../services/partie.ts';

type Agir = (action: () => Promise<void>, message: string) => Promise<boolean>;
const ECHANGE = <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" /></svg>;

const enCollection = (album: AlbumAmi): Map<string, Exemplaires> => new Map(album.map((p) => [p.carte, p.finitions]));
const finitionsDe = (e: Exemplaires | undefined): Finition[] => FINITIONS.filter((f) => (e?.[f] ?? 0) > 0);
const combien = (total: number): string => `${total.toLocaleString('fr-FR')} timbre${total > 1 ? 's' : ''}`;

export function ComposerEchange({ ami, monAlbum, cartes, occupe, agir, fermer }: {
  ami: Relation; monAlbum: AlbumAmi; cartes: Map<string, CarteIndex>; occupe: boolean; agir: Agir; fermer: () => void;
}) {
  const [tour, setTour] = useState(0);
  const album = useChargement(() => lireAlbumAmi(ami.id), `${ami.id}:${tour}`);
  const [recue, setRecue] = useState<TimbreEchange | null>(null);
  const [donnee, setDonnee] = useState<TimbreEchange | null>(null);
  const [etape, setEtape] = useState<'recevoir' | 'donner'>('recevoir');
  const requete = useRef({ signature: '', id: '' });
  const panneau = useRef<HTMLElement>(null);
  useEffect(() => { panneau.current?.scrollIntoView({ block: 'start' }); panneau.current?.focus({ preventScroll: true }); }, []);

  const liste = useMemo(() => [...cartes.values()], [cartes]);
  const mienne = useMemo(() => enCollection(monAlbum), [monAlbum]);
  const sienne = useMemo(() => (album.etat === 'pret' ? enCollection(album.donnees) : new Map<string, Exemplaires>()), [album]);
  const manque = useCallback((c: CarteIndex) => (mienne.has(c.id) ? null : 'Nouveau'), [mienne]);
  const double = useCallback((c: CarteIndex) => { const n = nombreDExemplaires(mienne.get(c.id)); return n > 1 ? `×${n}` : null; }, [mienne]);

  // On reçoit volontiers sa plus belle finition, on donne d'abord la plus simple ; les deux se changent dans le résumé.
  const recevoir = (c: CarteIndex): void => { setRecue({ carte: c.id, finition: finitionsDe(sienne.get(c.id)).at(-1) ?? 'Normale' }); if (!donnee) setEtape('donner'); };
  const donner = (c: CarteIndex): void => setDonnee({ carte: c.id, finition: finitionsDe(mienne.get(c.id))[0] ?? 'Normale' });
  const identiques = recue !== null && donnee !== null && recue.carte === donnee.carte && recue.finition === donnee.finition;
  const envoyer = (): void => {
    if (!recue || !donnee || identiques) return;
    const signature = JSON.stringify([ami.id, donnee, recue]);
    if (requete.current.signature !== signature) requete.current = { signature, id: crypto.randomUUID() };
    void agir(() => proposerUnEchange(requete.current.id, ami.id, donnee, recue), 'Proposition envoyée. Tes timbres restent dans ta collection jusqu’à l’acceptation.').then((ok) => { if (ok) fermer(); });
  };

  return (
    <section className="amis__composition composition-echange" ref={panneau} tabIndex={-1} aria-label={`Échange avec ${ami.pseudo}`}>
      <div className="amis__composition-tete"><PortraitAmi apparence={ami} taille={46} sansNiveau /><div><h2>Échanger avec {ami.pseudo}</h2><p className="texte-doux">Choisis ce que tu veux recevoir, puis ce que tu donnes en retour. Proposition valable 7 jours.</p></div></div>
      {album.etat === 'en cours' && <p role="status">Lecture de sa collection…</p>}
      {album.etat === 'erreur' && <p role="alert">{album.message} <button className="bouton" onClick={() => setTour((t) => t + 1)}>Réessayer</button></p>}
      {album.etat === 'pret' && <>
        <div className="composition-echange__resume">
          <Emplacement titre="Tu reçois" timbre={recue} exemplaires={recue ? sienne.get(recue.carte) : undefined} cartes={cartes} actif={etape === 'recevoir'}
            onChoisir={() => setEtape('recevoir')} onFinition={(f) => setRecue((r) => r && { ...r, finition: f })} />
          <span className="echange__fleche" aria-hidden="true">{ECHANGE}</span>
          <Emplacement titre="Tu donnes" timbre={donnee} exemplaires={donnee ? mienne.get(donnee.carte) : undefined} cartes={cartes} actif={etape === 'donner'}
            onChoisir={() => setEtape('donner')} onFinition={(f) => setDonnee((d) => d && { ...d, finition: f })} />
        </div>
        {identiques && <p className="message message--avertissement" role="alert">Choisis deux timbres différents.</p>}
        <div className="rangee-de-boutons">
          <button type="button" className="bouton bouton--accent" disabled={occupe || !recue || !donnee || identiques} onClick={envoyer}>Envoyer la proposition</button>
          <button type="button" className="bouton bouton--discret" disabled={occupe} onClick={fermer}>Fermer</button>
        </div>
        <p className="texte-doux petit">Si tu échanges ton dernier exemplaire d’un mot, il sera retiré de ton carnet à l’acceptation. Tes apprentissages restent acquis.</p>
        <h3 className="composition-echange__etape">{etape === 'recevoir' ? `La collection de ${ami.pseudo}` : 'Ton album'}</h3>
        {etape === 'recevoir'
          ? (album.donnees.length === 0
            ? <p>{ami.pseudo} ne possède pas encore de timbres.</p>
            : <ChoixDUnTimbre key="recevoir" cartes={liste} collection={sienne} action="recevoir" recherche={`Chercher dans la collection de ${ami.pseudo}…`}
                choisie={recue?.carte ?? null} avant={manque} onChoisir={recevoir}
                legende={(total, nouveaux) => `${combien(total)}${nouveaux > 0 ? `, ceux qui te manquent d’abord (${nouveaux})` : ''}.`} />)
          : <ChoixDUnTimbre key="donner" cartes={liste} collection={mienne} action="donner" recherche="Chercher dans ton album…"
              choisie={donnee?.carte ?? null} avant={double} onChoisir={donner}
              legende={(total, doubles) => `${combien(total)}${doubles > 0 ? `, tes doubles d’abord (${doubles})` : ''}.`} />}
      </>}
      {album.etat !== 'pret' && <button className="bouton bouton--discret" disabled={occupe} onClick={fermer}>Fermer la proposition</button>}
    </section>
  );
}

// Une moitié de l'échange : le timbre choisi (ou une place vide), sa finition s'il en a plusieurs, et « Choisir »/« Changer ».
function Emplacement({ titre, timbre, exemplaires, cartes, actif, onChoisir, onFinition }: {
  titre: string; timbre: TimbreEchange | null; exemplaires: Exemplaires | undefined; cartes: Map<string, CarteIndex>; actif: boolean;
  onChoisir: () => void; onFinition: (f: Finition) => void;
}) {
  const carte = timbre ? cartes.get(timbre.carte) : undefined;
  const finitions = finitionsDe(exemplaires);
  return (
    <div className="emplacement-echange" data-actif={actif || undefined}>
      <p className="emplacement-echange__titre">{titre}</p>
      {carte && timbre ? <>
        <div className="emplacement-echange__timbre"><Carte carte={carte} finition={timbre.finition} cliquable={false} /></div>
        <p className="emplacement-echange__mot">{carte.mot}</p>
        {finitions.length > 1 && (
          <div className="emplacement-echange__finitions" role="radiogroup" aria-label={`Finition — ${titre.toLowerCase()}`}>
            {finitions.map((f) => <button key={f} type="button" role="radio" aria-checked={timbre.finition === f} onClick={() => onFinition(f)}>{f}</button>)}
          </div>
        )}
      </> : <div className="emplacement-echange__vide" aria-hidden="true" />}
      <button type="button" className="bouton bouton--discret emplacement-echange__choisir" aria-pressed={actif} onClick={onChoisir}>{carte ? 'Changer' : 'Choisir'}</button>
    </div>
  );
}
