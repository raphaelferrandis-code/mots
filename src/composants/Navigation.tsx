import { useEffect, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { SITE } from '../config/site.ts';
import { lien } from '../navigation/routes.ts';
import type { Route } from '../navigation/routes.ts';
import { Icone } from './Icone.tsx';
import { Portrait } from './Identite.tsx';
import { useCompteur } from './ceremonie/compteurs.ts';
import { progressionDuNiveau } from '../jeu/personnalisation.ts';
import { compteConnecte, deconnecter } from '../services/connexion.ts';
import { messageDe } from '../partage/messages.ts';
import { ICONES_DUEL } from './SousOngletsDuel.tsx';
import './navigation.css';

// Quatre onglets, sur ordinateur comme sur téléphone. Le carnet, les joutes et les classements se rangent dans Duel :
// l'onglet mène à la page Duel, dont les sous-onglets donnent tout le reste, et reste allumé sur leurs pages.
// Le reste (profil, amis, compte, réglages, formules) passe dans le menu du joueur, derrière l'avatar.
type Onglet = { route: Route; nom: string; nomCourt?: string; icone: ReactNode; actifPour: Route['ecran'][] };
type Menu = 'encre' | 'profil';

const trait = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const DESSINS = {
  accueil: <svg viewBox="0 0 24 24" {...trait}><path d="M4 11 12 4l8 7" /><path d="M6 10v9h12v-9" /></svg>,
  collection: <svg viewBox="0 0 24 24" {...trait}><rect x="4" y="6" width="11" height="14" rx="2" /><path d="M8 3h10a2 2 0 0 1 2 2v12" /></svg>,
  marche: <svg viewBox="0 0 24 24" {...trait}><path d="M4 4h7l9 9-7 7-9-9z" /><circle cx="8.5" cy="8.5" r="1.5" /></svg>,
  profil: <svg viewBox="0 0 24 24" {...trait}><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg>,
  amis: <svg viewBox="0 0 24 24" {...trait}><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2" /></svg>,
  compte: <svg viewBox="0 0 24 24" {...trait}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>,
  reglages: <svg viewBox="0 0 24 24" {...trait}><path d="m9.5 3-.6 2.3-1.7 1-2.3-.6-2.5 4.3 1.7 1.7v2l-1.7 1.7 2.5 4.3 2.3-.6 1.7 1 .6 2.3h5l.6-2.3 1.7-1 2.3.6 2.5-4.3-1.7-1.7v-2l1.7-1.7-2.5-4.3-2.3.6-1.7-1-.6-2.3z" /><circle cx="12" cy="12" r="3" /></svg>,
  paquet: <svg viewBox="0 0 24 24" {...trait}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="m3 8 9 6 9-6" /></svg>,
  boutique: <svg viewBox="0 0 24 24" {...trait}><path d="M5 8h14l-1.2 12H6.2Z" /><path d="M9 11V6a3 3 0 0 1 6 0v5" /></svg>,
  chevron: <svg viewBox="0 0 24 24" {...trait} strokeWidth={2}><path d="m6 9 6 6 6-6" /></svg>,
  suite: <svg viewBox="0 0 24 24" {...trait} strokeWidth={2}><path d="m9 6 6 6-6 6" /></svg>,
  sortie: <svg viewBox="0 0 24 24" {...trait}><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></svg>,
};

// L'étincelle des formules, avec ses couleurs à elle.
function Eclat({ id }: { id: string }) {
  return <svg className="eclat" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffe1a1" /><stop offset=".5" stopColor="#e1b7ff" /><stop offset="1" stopColor="#8ce4eb" /></linearGradient></defs><path d="m15 4 3.5 8.5L27 16l-8.5 3.5L15 28l-3.5-8.5L3 16l8.5-3.5Z" fill={`url(#${id})`} /><path d="m26 2 1.3 3.7L31 7l-3.7 1.3L26 12l-1.3-3.7L21 7l3.7-1.3Z" fill="#f9e9bd" /></svg>;
}

const ONGLETS: Onglet[] = [
  { route: { ecran: 'accueil' }, nom: 'Accueil', actifPour: ['accueil', 'paquet'], icone: DESSINS.accueil },
  { route: { ecran: 'collection' }, nom: 'Album', actifPour: ['collection', 'carte'], icone: DESSINS.collection },
  { route: { ecran: 'duel' }, nom: 'Duel', actifPour: ['duel', 'joutes', 'deck', 'classement'], icone: ICONES_DUEL.duel },
  { route: { ecran: 'marche' }, nom: 'Marché', actifPour: ['marche'], icone: DESSINS.marche },
];

const ESPACE_DU_JOUEUR: { route: Route; nom: string; detail: string; icone: ReactNode; actifPour: Route['ecran'][] }[] = [
  { route: { ecran: 'profil' }, nom: 'Mon profil', detail: 'Succès, apparence', icone: DESSINS.profil, actifPour: ['profil'] },
  { route: { ecran: 'amis' }, nom: 'Amis', detail: 'Échanges, défis', icone: DESSINS.amis, actifPour: ['amis'] },
  { route: { ecran: 'compte' }, nom: 'Mon compte', detail: 'Connexion, code de secours', icone: DESSINS.compte, actifPour: ['compte'] },
  { route: { ecran: 'reglages' }, nom: 'Réglages', detail: 'Préférences', icone: DESSINS.reglages, actifPour: ['reglages', 'confidentialite'] },
];

// Le meilleur gain d'une victoire en duel, pour le menu de l'Encre.
const ENCRE_PAR_VICTOIRE = Math.max(...Object.values(EQUILIBRAGE.duel.encreParVictoire));

// L'anneau d'XP autour de l'avatar : il se remplit vers le niveau suivant.
const TOUR = 2 * Math.PI * 21;

// `portrait` : l'avatar et le cadre que le joueur a équipés (ceux qu'il voit sur son profil).
export function Navigation({ ecran, encre: encreReelle, xp: xpReel = null, pseudo = '', portrait = null }: {
  ecran: Route['ecran']; encre: number | null; xp?: number | null; pseudo?: string; portrait?: { avatar: string; cadre: string } | null;
}) {
  // Pendant une cérémonie, l'Encre et l'XP restent figées, puis montent au rangement des timbres.
  const encre = useCompteur('encre', encreReelle);
  const xp = useCompteur('xp', xpReel);
  const progression = xp === null ? null : progressionDuNiveau(xp);
  const nom = pseudo.trim();

  // Un seul menu ouvert à la fois. Il se referme tout seul quand on change d'écran.
  const [choix, setChoix] = useState<{ menu: Menu; ecran: Route['ecran'] } | null>(null);
  const ouvert = choix?.ecran === ecran ? choix.menu : null;
  const basculer = (menu: Menu) => setChoix(ouvert === menu ? null : { menu, ecran });
  const fermerSurLien = (evenement: MouseEvent) => { if ((evenement.target as Element).closest('a')) setChoix(null); };

  // Échap referme le menu et rend la main à son bouton ; un clic ailleurs le referme aussi.
  useEffect(() => {
    if (!ouvert) return;
    const bouton = () => document.querySelector<HTMLElement>(`[aria-controls="menu-${ouvert}"]`);
    const clavier = (e: KeyboardEvent) => { if (e.key === 'Escape') { setChoix(null); bouton()?.focus(); } };
    const dehors = (e: PointerEvent) => {
      const cible = e.target as Element | null;
      if (!cible?.closest(`#menu-${ouvert}`) && !bouton()?.contains(cible)) setChoix(null);
    };
    document.addEventListener('keydown', clavier);
    document.addEventListener('pointerdown', dehors);
    return () => { document.removeEventListener('keydown', clavier); document.removeEventListener('pointerdown', dehors); };
  }, [ouvert]);

  // Se déconnecter n'est proposé qu'à un vrai compte : un invité perdrait sa collection.
  const [connecte] = useState(compteConnecte);
  const [sortie, setSortie] = useState<{ enCours: boolean; erreur: string | null }>({ enCours: false, erreur: null });
  const sortir = async () => {
    setSortie({ enCours: true, erreur: null });
    try { await deconnecter(); }
    catch (e) { setSortie({ enCours: false, erreur: messageDe(e) }); }
  };

  const encreEnClair = encre === null ? '…' : encre.toLocaleString('fr-FR');

  return (
    <header className="entete-application">
      <a className="marque" href={lien({ ecran: 'accueil' })} aria-label={`${SITE.nom} — accueil`}>
        <img src={`${import.meta.env.BASE_URL}identite/philamots-clair.svg`} alt="" className="marque__logo" />
      </a>
      <nav className="navigation" aria-label="Navigation principale">
        <ul className="navigation__liste">
          {ONGLETS.map((onglet) => <li key={onglet.nom}>
            {/* Pas d'aria-label : le nom lu est celui qui s'affiche (un nom court sur téléphone, s'il y en a un). */}
            <a className="navigation__lien" href={lien(onglet.route)} aria-current={onglet.actifPour.includes(ecran) ? 'page' : undefined}>
              <span className="navigation__icone" aria-hidden="true">{onglet.icone}</span>
              <span className="navigation__nom-long">{onglet.nom}</span>
              <span className="navigation__nom-court">{onglet.nomCourt ?? onglet.nom}</span>
            </a>
          </li>)}
        </ul>
      </nav>

      <div className="navigation__personnel">
        <div className="encre">
          {/* Un compteur discret, sans « + » (qui promettait un achat) : il ouvre la fiche de l'Encre (décision du 26/09/2026). */}
          <button type="button" className="reserve-encre" aria-expanded={ouvert === 'encre'} aria-controls="menu-encre" onClick={() => basculer('encre')} aria-current={ecran === 'boutique' ? 'page' : undefined}
            aria-label={encre === null ? 'Chargement de l’Encre' : `Ta réserve : ${encreEnClair} Encre`}>
            <Icone nom="encre" />
            <span className="reserve-encre__nombre">{encreEnClair}</span>
          </button>
          {ouvert === 'encre' && <div id="menu-encre" className="menu-flottant menu-encre" onClick={fermerSurLien}>
            <div className="menu-encre__reserve">
              <span className="menu-encre__flacon" aria-hidden="true"><Icone nom="encre" /></span>
              <p><span className="menu-flottant__surtitre">Ta réserve</span><strong>{encreEnClair} <em>Encre</em></strong></p>
            </div>
            <p className="menu-encre__usage">Avec l’Encre, tu t’offres des pièces uniques à la boutique (jusqu’à un Hors-série au choix) et tu enchéris sur les timbres des autres joueurs, au marché.</p>
            <p className="menu-flottant__surtitre">Pour en gagner</p>
            <ul className="menu-encre__gains">
              <li><span className="menu-encre__icone" aria-hidden="true">{ICONES_DUEL.duel}</span><span><strong>Gagne des duels</strong>jusqu’à {ENCRE_PAR_VICTOIRE} Encre par victoire</span></li>
              <li><span className="menu-encre__icone" aria-hidden="true">{DESSINS.paquet}</span><span><strong>Ouvre des paquets</strong>chaque doublon se change en Encre</span></li>
            </ul>
            <a className="bouton-menu bouton-menu--plein" href={lien({ ecran: 'boutique' })}>{DESSINS.boutique}La boutique</a>
            <a className="bouton-menu bouton-menu--trait" href={lien({ ecran: 'marche' })}>{DESSINS.marche}Le marché</a>
          </div>}
        </div>

        <div className="espace-joueur">
          <button type="button" className="bouton-joueur" aria-expanded={ouvert === 'profil'} aria-controls="menu-profil" onClick={() => basculer('profil')}
            aria-label={`Mon espace${nom ? ` — ${nom}` : ''}${progression ? `, niveau ${progression.niveau}` : ''}`}
            aria-current={ESPACE_DU_JOUEUR.some((e) => e.actifPour.includes(ecran)) || ecran === 'formules' ? 'page' : undefined}>
            <span className="avatar" aria-hidden="true">
              {progression && <svg className="avatar__anneau" viewBox="0 0 46 46"><circle className="avatar__anneau-fond" cx="23" cy="23" r="21" /><circle className="avatar__anneau-plein" cx="23" cy="23" r="21" strokeDasharray={TOUR.toFixed(2)} strokeDashoffset={(TOUR * (1 - progression.acquis / progression.requis)).toFixed(2)} /></svg>}
              {portrait ? <Portrait avatar={portrait.avatar} cadre={portrait.cadre} anime={false} /> : <span className="avatar__visage">{DESSINS.profil}</span>}
              {progression && <b className="avatar__niveau">{progression.niveau}</b>}
            </span>
            <span className="bouton-joueur__chevron" aria-hidden="true">{DESSINS.chevron}</span>
          </button>
          {ouvert === 'profil' && <>
            <div className="voile" aria-hidden="true" />
            <div id="menu-profil" className="menu-flottant menu-profil" onClick={fermerSurLien}>
              <div className="menu-profil__tete">
                <span className="timbre-joueur" aria-hidden="true">
                  <span className="timbre-joueur__papier">{portrait ? <Portrait avatar={portrait.avatar} cadre={portrait.cadre} /> : DESSINS.profil}</span>
                  {progression && <span className="timbre-joueur__cachet"><small>Niv.</small>{progression.niveau}</span>}
                </span>
                <div className="menu-profil__identite">
                  <strong>{nom || 'Sans pseudonyme'}</strong>
                  {progression && <>
                    <span className="menu-profil__niveau">Niveau {progression.niveau}</span>
                    <span className="menu-profil__jauge" role="progressbar" aria-label="Expérience vers le niveau suivant" aria-valuemin={0} aria-valuemax={progression.requis} aria-valuenow={progression.acquis}><span style={{ width: `${Math.min(100, (100 * progression.acquis) / progression.requis)}%` }} /></span>
                    <span className="menu-profil__xp">{progression.acquis.toLocaleString('fr-FR')} / {progression.requis.toLocaleString('fr-FR')} XP</span>
                  </>}
                </div>
              </div>
              <ul className="menu-profil__liens">
                {ESPACE_DU_JOUEUR.map((e) => <li key={e.nom}>
                  <a href={lien(e.route)} aria-current={e.actifPour.includes(ecran) ? 'page' : undefined}>
                    <span className="menu-profil__icone" aria-hidden="true">{e.icone}</span>
                    <span className="menu-profil__nom">{e.nom}</span>
                    <span className="menu-profil__detail">{e.detail}</span>
                  </a>
                </li>)}
              </ul>
              <a className="menu-profil__formules" href={lien({ ecran: 'formules' })} aria-current={ecran === 'formules' ? 'page' : undefined}>
                <Eclat id="eclat-profil" />
                <span><strong>Les formules</strong><em>Un peu plus de merveille.</em></span>
                {DESSINS.suite}
              </a>
              {connecte && <div className="menu-profil__pied">
                <button type="button" className="menu-profil__sortie" disabled={sortie.enCours} onClick={() => void sortir()}>{DESSINS.sortie}{sortie.enCours ? 'Déconnexion…' : 'Se déconnecter'}</button>
                {sortie.erreur && <p role="alert">{sortie.erreur}</p>}
              </div>}
            </div>
          </>}
        </div>
      </div>
    </header>
  );
}
