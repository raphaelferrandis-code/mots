// « Ton courrier », sur l'accueil, sous le bouton du comptoir (audit de finition du 26/09/2026, S06 : le social et le
// marché semblaient morts) : ce qui attend une réponse, et les nouvelles depuis la dernière visite. L'accueil montre
// tout : le courrier est donc lu en arrivant (la pastille de l'en-tête s'éteint), mais ce qui s'est affiché reste là
// jusqu'à la fin de la visite. Rien ne s'affiche quand il n'y a rien.

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { phraseDeLaLettre } from '../../jeu/courrier.ts';
import type { Destination, Genre, Lettre } from '../../jeu/courrier.ts';
import { lien } from '../../navigation/routes.ts';
import { chargerEdition } from '../../services/cartes.ts';
import { TOUS_LES_GENRES, marquerLeCourrierLu } from '../../services/courrier.ts';
import { ICONES_DUEL } from '../SousOngletsDuel.tsx';
import { useChargement } from '../useChargement.ts';
import { useCourrier } from '../useCourrier.ts';

const AU_PLUS = 6;
// Les pages où se lisent les lettres qui ne tiennent pas dans l'encart.
const PAGES: { nom: string; genres: Genre[]; adresse: () => string }[] = [
  { nom: 'Amis', genres: ['ami', 'echange'], adresse: () => lien({ ecran: 'amis' }) },
  { nom: 'Équipe', genres: ['equipe'], adresse: () => lien({ ecran: 'equipe' }) },
  { nom: 'Marché', genres: ['enchere', 'vente'], adresse: () => lien({ ecran: 'marche' }) },
  { nom: 'Duel', genres: ['duel'], adresse: () => lien({ ecran: 'duel' }) },
];
const trait = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const ICONES: Record<Genre, ReactNode> = {
  ami: <svg viewBox="0 0 24 24" {...trait}><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20v-1.5a6.5 6.5 0 0 1 13 0V20M19 8v6M16 11h6" /></svg>,
  echange: <svg viewBox="0 0 24 24" {...trait}><path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" /></svg>,
  equipe: <svg viewBox="0 0 24 24" {...trait}><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z" /></svg>,
  enchere: <svg viewBox="0 0 24 24" {...trait}><path d="M4 4h7l9 9-7 7-9-9z" /><circle cx="8.5" cy="8.5" r="1.5" /></svg>,
  vente: <svg viewBox="0 0 24 24" {...trait}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="m3 8 9 6 9-6" /></svg>,
  duel: ICONES_DUEL.duel,
};

function adresse(d: Destination): string {
  if (d.ecran === 'carte') return lien({ ecran: 'carte', id: d.carte });
  if (d.ecran === 'echanges') return `${lien({ ecran: 'amis' })}/echanges`;
  return lien({ ecran: d.ecran });
}

export function Courrier() {
  const { lettres } = useCourrier();
  const edition = useChargement(chargerEdition, 'edition');
  // Ce qui s'est affiché pendant cette visite, tel qu'il s'est affiché (nouveau ou non). (Les clés dans une référence :
  // StrictMode rejoue l'effet en développement, et une lettre ne doit pas s'afficher deux fois.)
  const [affichees, setAffichees] = useState<Lettre[]>([]);
  const cles = useRef(new Set<string>());
  useEffect(() => {
    const arrivees = lettres.filter((l) => !cles.current.has(l.cle));
    if (arrivees.length === 0) return;
    for (const l of arrivees) cles.current.add(l.cle);
    setAffichees((avant) => [...avant, ...arrivees]);
    marquerLeCourrierLu(TOUS_LES_GENRES);
  }, [lettres]);

  if (affichees.length === 0 || edition.etat !== 'pret') return null;
  const mots = new Map(edition.donnees.cartes.map((c) => [c.id, c.mot]));
  const motDe = (carte: string): string => mots.get(carte) ?? carte;
  const nouvelles = affichees.filter((l) => l.nouvelle).length;
  return (
    <section className="courrier" aria-labelledby="titre-courrier">
      <h2 id="titre-courrier">Ton courrier{nouvelles > 0 && <span className="courrier__compte">{nouvelles === 1 ? '1 nouvelle' : `${nouvelles} nouvelles`}</span>}</h2>
      <ul>
        {affichees.slice(0, AU_PLUS).map((l) => {
          const phrase = phraseDeLaLettre(l, motDe);
          return (
            <li key={l.cle} data-nouvelle={l.nouvelle || undefined}>
              <span className="courrier__icone" aria-hidden="true">{ICONES[l.genre]}</span>
              <span className="courrier__texte">
                {phrase.morceaux.map((m, i) => (typeof m === 'string' ? m : <i key={i}>{m.mot}</i>))}
                {l.nouvelle && <span className="visuellement-cache"> (nouveau)</span>}
              </span>
              <a className="courrier__action" href={adresse(phrase.destination)}>{phrase.action}</a>
            </li>
          );
        })}
      </ul>
      {affichees.length > AU_PLUS && <Suite restantes={affichees.slice(AU_PLUS)} />}
    </section>
  );
}

function Suite({ restantes }: { restantes: Lettre[] }) {
  const pages = PAGES.filter((p) => restantes.some((l) => p.genres.includes(l.genre)));
  return (
    <p className="courrier__suite">
      Et {restantes.length === 1 ? 'une autre lettre' : `${restantes.length} autres lettres`}, {pages.length === 1 ? 'sur la page ' : 'sur les pages '}
      {pages.map((p, i) => <span key={p.nom}>{i > 0 && (i === pages.length - 1 ? ' et ' : ', ')}<a href={p.adresse()}>{p.nom}</a></span>)}.
    </p>
  );
}
