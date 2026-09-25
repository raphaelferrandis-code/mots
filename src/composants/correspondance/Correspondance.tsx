// Les pièces communes aux pages Amis et Mon équipe (refonte du 25/09/2026) : la carte d'expéditeur et les onglets,
// le portrait d'un ami avec son niveau, sa présence, sa vitrine de timbres et les cachets de la poste.

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { ornement, profilVisible, progressionDuNiveau } from '../../jeu/personnalisation.ts';
import { presence } from '../../jeu/presence.ts';
import { lien } from '../../navigation/routes.ts';
import type { CarteIndex } from '../../partage/types.ts';
import type { Apparence, TimbreEchange } from '../../services/amis.ts';
import { EMBLEMES } from '../../services/equipes.ts';
import type { Embleme } from '../../services/equipes.ts';
import { Portrait } from '../Identite.tsx';
import { Timbre } from '../timbre/Timbre.tsx';
import { useMaintenant, usePartie } from '../usePartie.ts';
import './correspondance.css';

// L'adresse de la section Échanges de la page Amis (la route reste « amis »), et celle des joutes, mode 2v2 équipe choisi.
export const LIEN_ECHANGES = `${lien({ ecran: 'amis' })}/echanges`;
export const LIEN_EQUIPE_2V2 = `${lien({ ecran: 'joutes' })}/duo_equipe`;

/** Le signe d'un emblème, forcé en caractère d'imprimerie (sans quoi ✒ ou ☼ s'affichent en emoji). */
export const signeGrave = (embleme: Embleme): string => `${EMBLEMES.find(e => e.id === embleme)?.signe ?? ''}︎`;

/** L'emblème de l'équipe, gravé sur un timbre de papier. `nom` : écrit sous l'emblème (grand format). */
export function TimbreEmbleme({ embleme, nom, grand = false }: { embleme: Embleme; nom?: string; grand?: boolean }) {
  return <span className={`timbre-papier timbre-embleme${grand ? ' timbre-embleme--grand' : ''}`} aria-hidden="true">
    <small>Équipe</small><span className="timbre-embleme__signe">{signeGrave(embleme)}</span>{nom && <em>{nom}</em>}{grand && <small>Deux · joueurs</small>}
  </span>;
}

/** Un portrait publié par un autre joueur : un identifiant inconnu retombe sur l'avatar et le cadre de départ. */
export function PortraitAmi({ apparence, taille = 58, sansNiveau = false }: { apparence: Apparence; taille?: number; sansNiveau?: boolean }) {
  const avatar = ornement(apparence.avatar ?? '')?.categorie === 'avatar' ? apparence.avatar! : 'plume';
  const cadre = apparence.cadre === '' || ornement(apparence.cadre ?? '')?.categorie === 'cadre' ? apparence.cadre! : 'simple';
  const niveau = sansNiveau || apparence.xp == null ? null : progressionDuNiveau(apparence.xp).niveau;
  return <span className="correspondant" style={{ '--taille': `${taille}px` } as CSSProperties}>
    <Portrait avatar={avatar} cadre={cadre} anime={false} />
    {niveau !== null && <b className="correspondant__niveau" title={`Niveau ${niveau}`}>{niveau}</b>}
  </span>;
}

export function Presence({ vuLe }: { vuLe: number | null | undefined }) {
  const maintenant = useMaintenant(60_000);
  const p = presence(vuLe, maintenant);
  if (!p) return null;
  return <span className="presence"><i className={p.enLigne ? 'presence__point presence__point--en-ligne' : 'presence__point'} aria-hidden="true" />{p.texte}</span>;
}

/** Le cachet rond de la poste : une ligne en petites capitales, une en grand. Décoratif : le texte est aussi dit ailleurs. */
export function Cachet({ haut, bas, ton = 'accent', incline = -10, chiffre }: { haut?: string; bas?: string; ton?: 'accent' | 'doux'; incline?: number; chiffre?: string }) {
  return <span className={`cachet cachet--${ton}`} style={{ '--inclinaison': `${incline}deg` } as CSSProperties} aria-hidden="true">
    {chiffre ? <span><b className="cachet__chiffre">{chiffre}</b>{haut}<br />{bas}</span> : <span>{haut}<b>{bas}</b></span>}
  </span>;
}

export function Vitrine({ timbres, nombre, cartes }: { timbres: TimbreEchange[]; nombre: number; cartes: Map<string, CarteIndex> }) {
  const connus = timbres.filter((t) => cartes.has(t.carte));
  return <div className="vitrine">
    <ul className="vitrine__timbres" aria-label="Ses plus beaux timbres">
      {connus.map((t) => <li key={t.carte} className="vitrine__timbre" title={`${cartes.get(t.carte)!.mot} · ${t.finition} · ${cartes.get(t.carte)!.rarete}`}>
        <Timbre carte={cartes.get(t.carte)!} finition={t.finition} cliquable={false} reagir={false} />
        <span className="visuellement-cache">{cartes.get(t.carte)!.mot}, {t.finition.toLowerCase()}, {cartes.get(t.carte)!.rarete.toLowerCase()}</span>
      </li>)}
      {Array.from({ length: Math.max(0, 4 - connus.length) }, (_, i) => <li key={`vide${i}`} className="vitrine__vide" aria-hidden="true" />)}
    </ul>
    <span className="vitrine__nombre"><strong>{nombre}</strong> {nombre > 1 ? 'timbres' : 'timbre'}</span>
  </div>;
}

type Onglet = 'amis' | 'echanges' | 'equipe';

export function EnteteCorrespondance({ actif, pseudo, amis, echanges, invitations = 0, signe, occupe, actualiser }: {
  actif: Onglet; pseudo: string | null; amis?: number; echanges?: number; invitations?: number; signe?: string; occupe?: boolean; actualiser?: () => void;
}) {
  const partie = usePartie();
  const [copie, setCopie] = useState(false);
  const profil = partie.etat === 'prete' ? profilVisible(partie.sauvegarde.profil, partie.compte?.formule ?? null) : null;
  const copier = async () => {
    if (!pseudo) return;
    try { await navigator.clipboard.writeText(pseudo); setCopie(true); window.setTimeout(() => setCopie(false), 2500); } catch { /* le pseudonyme reste lisible */ }
  };
  const courant = (o: Onglet) => o === actif ? 'page' as const : undefined;
  return <header className="correspondance__entete">
    {pseudo && profil && <div className="carte-expediteur">
      <PortraitAmi apparence={{ avatar: profil.avatar, cadre: profil.cadre, xp: profil.xp }} taille={58} />
      <div className="carte-expediteur__nom"><span className="mention">Ton pseudonyme</span><strong>{pseudo}</strong></div>
      <button type="button" className="bouton bouton--discret bouton--petit" onClick={() => void copier()}>{copie ? 'Copié' : 'Copier'}</button>
      <span className="visuellement-cache" role="status">{copie ? 'Pseudonyme copié.' : ''}</span>
    </div>}
    <nav className="onglets-correspondance" aria-label="Amis et équipe">
      <a href={lien({ ecran: 'amis' })} aria-current={courant('amis')}>Amis{amis !== undefined && <span className="compte">{amis}</span>}</a>
      <a href={LIEN_ECHANGES} aria-current={courant('echanges')}>Échanges{!!echanges && <span className="compte">{echanges}</span>}</a>
      <a href={lien({ ecran: 'equipe' })} aria-current={courant('equipe')}>Mon équipe{invitations > 0
        ? <span className="compte compte--vif" title={`${invitations} invitation${invitations > 1 ? 's' : ''}`}>{invitations}</span>
        : signe && <span className="onglets-correspondance__signe" aria-hidden="true">{signe}</span>}</a>
      {actualiser && <button type="button" className="outil onglets-correspondance__outil" disabled={occupe} onClick={actualiser}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" /><path d="M21 3v5h-5" /></svg><span className="onglets-correspondance__libelle">Actualiser</span>
      </button>}
    </nav>
  </header>;
}
