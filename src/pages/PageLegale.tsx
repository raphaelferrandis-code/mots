// Les pages légales fixes (/mentions-legales/, /confidentialite/, /conditions/) et la page introuvable (404.html),
// fabriquées d'avance comme les pages des mots (scripts/fabriquer-les-pages.ts) : lisibles sans lancer le jeu, donc
// sans ouvrir de compte (audit de finition du 26/09/2026, E13 et E19). Les textes sont ceux du jeu (composants/legal/).

import { TexteConditions } from '../composants/legal/TexteConditions.tsx';
import { TexteConfidentialite } from '../composants/legal/TexteConfidentialite.tsx';
import { TexteMentionsLegales } from '../composants/legal/TexteMentionsLegales.tsx';
import { SITE, dateEnToutesLettres } from '../config/site.ts';
import { Bandeau, Pied } from './Cadre.tsx';

export const PAGES_LEGALES = ['mentions-legales', 'confidentialite', 'conditions'] as const;
export type PageLegaleFixe = typeof PAGES_LEGALES[number];
export const TITRES_DES_PAGES_LEGALES: Record<PageLegaleFixe, string> = {
  'mentions-legales': 'Mentions légales',
  confidentialite: 'Confidentialité',
  conditions: 'Conditions d’utilisation',
};
export const DESCRIPTIONS_DES_PAGES_LEGALES: Record<PageLegaleFixe, string> = {
  'mentions-legales': 'Qui édite et héberge Philamots, les crédits et licences des textes, et comment signaler un contenu.',
  confidentialite: 'Ce que Philamots garde de ta partie, pourquoi, combien de temps, et comment tout effacer. Sans publicité ni pistage.',
  conditions: 'Les règles de Philamots : ton compte, ton pseudonyme, jouer loyalement, l’Encre et le marché, signaler.',
};

export function PageLegale({ page }: { page: PageLegaleFixe }) {
  const racine = '../';
  return (
    <div className="page-mot page-legale">
      <Bandeau racine={racine} />
      <main className="page-mot__corps page-legale__corps">
        <h1>{TITRES_DES_PAGES_LEGALES[page]}</h1>
        <p className="page-legale__date">Mise à jour le {dateEnToutesLettres(SITE.textesLegauxLe)}</p>
        {page === 'mentions-legales' && <TexteMentionsLegales confidentialite={`${racine}confidentialite/`} />}
        {page === 'conditions' && <TexteConditions liens={{ confidentialite: `${racine}confidentialite/`, mentions: `${racine}mentions-legales/` }} />}
        {/* Le site en ligne : collection sur le serveur, contrôle anti-robot et parrainage allumés. */}
        {page === 'confidentialite' && <TexteConfidentialite enLigne antiRobot parrainage liens={{ compte: `${racine}#/compte`, reglages: `${racine}#/reglages` }}
          effacer={<p>Dans le jeu : <a href={`${racine}#/confidentialite`}>Réglages, puis Confidentialité</a>, bouton « Supprimer mon pseudonyme public ».</p>} />}
      </main>
      <Pied racine={racine} credits={false} actuelle={page} />
    </div>
  );
}

// La page introuvable : servie par l'hébergeur pour toute adresse inconnue, à n'importe quelle profondeur (chemins
// absolus). Un petit script (public/introuvable.js) corrige une adresse de mot mal tapée (majuscules, accents) et, pour
// un mot à plusieurs natures (« beau » nom et adjectif), propose chacune : « homographes » en donne la liste.
export function PageIntrouvable({ homographes }: { homographes: Record<string, { adresse: string; nature: string; mot: string }[]> }) {
  const racine = '/';
  return (
    <div className="page-mot page-introuvable">
      <Bandeau racine={racine} />
      <main className="page-mot__corps page-introuvable__corps">
        <p className="page-introuvable__code" aria-hidden="true">404</p>
        <h1>Cette page n’existe pas…</h1>
        <p id="introuvable-explication">… ou ce mot n’est pas encore un timbre. Vérifie l’adresse, ou cherche le mot dans la liste de tous les mots.</p>
        <div id="introuvable-sens" className="page-introuvable__sens" hidden>
          <p>Ce mot a plusieurs pages :</p>
          <ul />
        </div>
        <div className="page-introuvable__actions">
          <a className="btn-primary" href={racine}>Jouer</a>
          <a className="btn-secondary" href={`${racine}mots/`}>Tous les mots</a>
        </div>
      </main>
      <Pied racine={racine} credits={false} />
      <script type="application/json" id="introuvable-homographes" dangerouslySetInnerHTML={{ __html: JSON.stringify(homographes).replace(/</g, '\\u003c') }} />
      <script type="module" src={`${racine}introuvable.js`} />
    </div>
  );
}
