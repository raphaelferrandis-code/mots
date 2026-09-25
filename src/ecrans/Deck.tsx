// Le deck de duel : dix cartes choisies dans la collection. On touche un timbre de la collection pour
// l'ajouter, un timbre du deck pour le retirer. Le deck est enregistré à chaque changement.

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Carte } from '../composants/carte/Carte.tsx';
import { CarteLegendee } from '../composants/carte/CarteLegendee.tsx';
import { Entete } from '../composants/Entete.tsx';
import { SousOngletsDuel } from '../composants/SousOngletsDuel.tsx';
import { ConseilsComposition } from '../composants/ConseilsComposition.tsx';
import { useChargement } from '../composants/useChargement.ts';
import { usePartie } from '../composants/usePartie.ts';
import { EQUILIBRAGE, attaqueEnJeu, defenseEnJeu } from '../config/equilibrage.ts';
import { forceDeLaCarte, meilleurDeck, taillesDesFactions } from '../jeu/duel.ts';
import { registresMasques } from '../jeu/partie.ts';
import { cartesDuDeck } from '../jeu/progression.ts';
import { meilleureFinition } from '../jeu/sauvegarde.ts';
import { lien } from '../navigation/routes.ts';
import { sansAccents } from '../partage/lettres.ts';
import { RARETES } from '../partage/types.ts';
import type { CarteIndex, Nature } from '../partage/types.ts';
import { chargerEdition } from '../services/cartes.ts';
import { changerLeDeck } from '../services/partie.ts';
import { encresDe } from '../composants/carte/decor.ts';
import './deck.css';

const REGLES = EQUILIBRAGE.duel;
const TYPES: Nature[] = ['Nom', 'Adjectif', 'Verbe', 'Adverbe'];
const PAR_PAGE = 40;

const TRIS = {
  force: 'Les plus fortes',
  attaque: 'Attaque',
  defense: 'Défense',
  rarete: 'Les plus rares',
  alphabet: 'Ordre alphabétique',
} as const;
type Tri = keyof typeof TRIS;

export function Deck() {
  const partie = usePartie();
  const edition = useChargement(chargerEdition, 'edition');
  const [type, setType] = useState<Nature | ''>('');
  const [faction, setFaction] = useState('');
  const [recherche, setRecherche] = useState('');
  const [tri, setTri] = useState<Tri>('force');
  const [pages, setPages] = useState(1);
  const [retour, setRetour] = useState<{ ids: string[]; message: string } | null>(null);
  const places = useRef(new Map<string, HTMLDivElement>());
  const disponiblesRef = useRef<HTMLDivElement>(null);
  const rechercheRef = useRef<HTMLInputElement>(null);
  const precedentes = useRef(new Map<string, DOMRect>());
  const arrivee = useRef<{ id: string; rect: DOMRect } | null>(null);
  const focusApres = useRef<string | null>(null);

  const sauvegarde = partie.etat === 'prete' ? partie.sauvegarde : null;
  const cartes = edition.etat === 'pret' ? edition.donnees.cartes : null;

  // Les cartes que l'on peut mettre dans un deck : possédées, et pas masquées par les réglages.
  const possedees = useMemo(() => {
    if (!sauvegarde || !cartes) return [];
    const masques = registresMasques(sauvegarde);
    return cartes.filter((c) => c.id in sauvegarde.cartes && !c.registre.some((r) => masques.includes(r)));
  }, [sauvegarde, cartes]);

  const deck = useMemo(() => (sauvegarde ? cartesDuDeck(sauvegarde, new Map(possedees.map((c) => [c.id, c]))) : []), [sauvegarde, possedees]);
  const tailles = useMemo(() => (cartes ? taillesDesFactions(cartes) : new Map<string, number>()), [cartes]);

  useLayoutEffect(() => {
    const animations: Animation[] = [];
    const reduire = sauvegarde?.reglages.reduireAnimations || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduire) places.current.forEach((element, id) => {
      const avant = precedentes.current.get(id);
      const depuisCollection = arrivee.current?.id === id ? arrivee.current.rect : null;
      const cible = depuisCollection ? element.querySelector<HTMLElement>('.tim') : element;
      const origine = depuisCollection ?? avant;
      if (!origine || !cible) return;
      const apres = cible.getBoundingClientRect();
      if (!apres.width) return;
      const dx = origine.left - apres.left;
      const dy = origine.top - apres.top;
      if (!depuisCollection && Math.abs(dx) + Math.abs(dy) < 1) return;
      animations.push(cible.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(${origine.width / apres.width})`, transformOrigin: 'top left', zIndex: 10 },
        { transform: 'translate(0, 0) scale(1)', transformOrigin: 'top left', zIndex: 10 },
      ], { duration: depuisCollection ? 480 : 260, easing: 'cubic-bezier(.2,.75,.25,1)' }));
    });
    precedentes.current.clear();
    arrivee.current = null;
    if (focusApres.current !== null) {
      const bouton = places.current.get(focusApres.current)?.querySelector<HTMLButtonElement>('button');
      (bouton ?? rechercheRef.current)?.focus({ preventScroll: true });
      focusApres.current = null;
    }
    return () => animations.forEach((animation) => animation.cancel());
  }, [deck, sauvegarde?.reglages.reduireAnimations]);

  const disponibles = useMemo(() => {
    const dansLeDeck = new Set(deck.map((c) => c.id));
    const cherche = sansAccents(recherche.trim());
    const ordres: Record<Tri, (a: CarteIndex, b: CarteIndex) => number> = {
      force: (a, b) => forceDeLaCarte(b) - forceDeLaCarte(a),
      attaque: (a, b) => attaqueEnJeu(b.attaque, b.rarete) - attaqueEnJeu(a.attaque, a.rarete),
      defense: (a, b) => defenseEnJeu(b.defense, b.rarete) - defenseEnJeu(a.defense, a.rarete),
      rarete: (a, b) => RARETES.indexOf(b.rarete) - RARETES.indexOf(a.rarete),
      alphabet: () => 0,
    };
    return possedees
      .filter((c) => !dansLeDeck.has(c.id) && (!type || c.type === type) && (!faction || c.faction === faction) && (!cherche || sansAccents(c.mot).includes(cherche)))
      .sort((a, b) => ordres[tri](a, b) || a.mot.localeCompare(b.mot, 'fr'));
  }, [possedees, deck, type, faction, recherche, tri]);

  if (!sauvegarde || !cartes) return <main className="ecran"><p className="texte-doux">Chargement…</p></main>;

  const complet = deck.length === REGLES.tailleDuDeck;
  const modifier = (ids: string[], message: string): void => {
    precedentes.current = new Map([...places.current].map(([id, element]) => [id, element.getBoundingClientRect()]));
    setRetour({ ids: deck.map((c) => c.id), message });
    changerLeDeck(ids);
  };
  const ajouter = (carte: CarteIndex): void => {
    const source = disponiblesRef.current?.querySelector<HTMLElement>(`[data-carte-id="${CSS.escape(carte.id)}"] .tim`);
    if (source) {
      arrivee.current = { id: carte.id, rect: source.getBoundingClientRect() };
      if (source.matches(':focus-visible')) focusApres.current = carte.id;
    }
    modifier([...deck.map((c) => c.id), carte.id], `${carte.mot} ajouté`);
  };
  const retirer = (carte: CarteIndex): void => {
    const index = deck.findIndex((c) => c.id === carte.id);
    if (places.current.get(carte.id)?.querySelector('button:focus-visible')) focusApres.current = deck[index + 1]?.id ?? deck[index - 1]?.id ?? '';
    modifier(deck.filter((c) => c.id !== carte.id).map((c) => c.id), `${carte.mot} retiré`);
  };
  const filtrer = <T,>(regler: (valeur: T) => void) => (valeur: T): void => { regler(valeur); setPages(1); };

  const parType = TYPES.map((t) => ({ type: t, nombre: deck.filter((c) => c.type === t).length })).filter((t) => t.nombre > 0);
  const factionsDuDeck = [...new Set(deck.map((c) => c.faction))].map((nom) => ({ nom, nombre: deck.filter((c) => c.faction === nom).length })).filter((f) => f.nombre >= 2);
  const factionsPossedees = [...new Set(possedees.map((c) => c.faction))].sort((a, b) => a.localeCompare(b, 'fr'));

  return (
    <main className="ecran ecran--large atelier-deck">
      <SousOngletsDuel actif="deck" />
      <Entete titre="Ton deck">
        {deck.length} / {REGLES.tailleDuDeck} timbres
      </Entete>

      {possedees.length < REGLES.tailleDuDeck ? (
        <section className="rubrique">
          <p>Encore {REGLES.tailleDuDeck - possedees.length} timbre{REGLES.tailleDuDeck - possedees.length > 1 ? 's' : ''} à collectionner pour composer ton deck.</p>
          <a className="bouton" href={lien({ ecran: 'paquet' })}>Ouvrir des paquets</a>
        </section>
      ) : (
        <>
          <section className="rubrique atelier-deck__selection" aria-label="Timbres sélectionnés">
            <div className="deck atelier-deck__places">
              {deck.map((carte, index) => (
                <div className="atelier-deck__place" key={carte.id} style={{ '--nature': encresDe(carte.type)[1] } as CSSProperties} ref={(element) => { if (element) places.current.set(carte.id, element); else places.current.delete(carte.id); }}>
                  <span className="atelier-deck__numero" aria-hidden="true">{String(index + 1).padStart(2, '0')}<span>−</span></span>
                  <CarteLegendee carte={carte} finition={meilleureFinition(sauvegarde.cartes[carte.id])} maitriseeLe={sauvegarde.cartes[carte.id].maitriseeLe} obtenuLe={sauvegarde.cartes[carte.id].obtenueLe} onChoisir={() => retirer(carte)} action="retirer du deck" />
                </div>
              ))}
              {Array.from({ length: REGLES.tailleDuDeck - deck.length }, (_, i) => <div key={`vide-${i}`} className="atelier-deck__place atelier-deck__place--vide" aria-hidden="true"><span className="atelier-deck__numero">{String(deck.length + i + 1).padStart(2, '0')}</span><div className="atelier-deck__empreinte"><span>+</span></div></div>)}
            </div>

            {deck.length > 0 && (
              <div className="atelier-deck__composition">
                <ul className="atelier-deck__natures" aria-label="Composition du deck">{parType.map((t) => <li key={t.type} style={{ '--nature': encresDe(t.type)[1] } as CSSProperties}><b>{t.nombre}</b> {t.type}{t.nombre > 1 ? 's' : ''}</li>)}</ul>
                {factionsDuDeck.length > 0 && <ul className="atelier-deck__origines" aria-label="Enchaînements d’origine">{factionsDuDeck.map((f) => <li key={f.nom}>{f.nombre} {f.nom} <b>+{(tailles.get(f.nom) ?? Infinity) <= REGLES.petiteFactionJusquA ? REGLES.bonusDePetiteFaction : REGLES.bonusDeFaction}</b></li>)}</ul>}
              </div>
            )}

            <div className="rangee-de-boutons">
              {complet
                ? <a className="bouton" href={lien({ ecran: 'duel' })}>Lancer un duel</a>
                : <span className="bouton bouton--inactif">Encore {REGLES.tailleDuDeck - deck.length} carte{REGLES.tailleDuDeck - deck.length > 1 ? 's' : ''}</span>}
              <button type="button" className="bouton bouton--discret" onClick={() => modifier(meilleurDeck(possedees, REGLES).map((c) => c.id), 'Deck composé')}>Composer pour moi</button>
              {deck.length > 0 && <button type="button" className="bouton bouton--discret" onClick={() => modifier([], 'Deck vidé')}>Vider le deck</button>}
            </div>
            <div className="atelier-deck__retour"><span role="status">{retour?.message}</span>{retour && <button type="button" onClick={() => { focusApres.current = retour.ids[0] ?? ''; changerLeDeck(retour.ids); setRetour(null); }}>Annuler</button>}</div>
          </section>

          <details className="rubrique repliable">
            <summary><h2>Conseils de composition</h2></summary>
            <ConseilsComposition />
          </details>

          {!complet && (
            <>
              <section className="filtres" aria-label="Filtres">
                <input ref={rechercheRef} type="search" placeholder="Chercher un mot…" value={recherche} onChange={(e) => filtrer(setRecherche)(e.target.value)} aria-label="Chercher un mot" />
                <select value={type} onChange={(e) => filtrer(setType)(e.target.value as Nature | '')} aria-label="Nature du mot">
                  <option value="">Toutes les natures</option>
                  {TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <select value={faction} onChange={(e) => filtrer(setFaction)(e.target.value)} aria-label="Origine">
                  <option value="">Toutes les origines</option>
                  {factionsPossedees.map((nom) => <option key={nom}>{nom}</option>)}
                </select>
                <select value={tri} onChange={(e) => filtrer(setTri)(e.target.value as Tri)} aria-label="Tri">
                  {Object.entries(TRIS).map(([cle, nom]) => <option key={cle} value={cle}>{nom}</option>)}
                </select>
              </section>

              <p className="texte-doux petit" aria-live="polite">{disponibles.length.toLocaleString('fr-FR')} timbre{disponibles.length > 1 ? 's' : ''} à ajouter</p>
              {disponibles.length === 0 && <div className="etat-vide"><h2>Aucun timbre ne correspond</h2><button type="button" className="bouton" onClick={() => { setRecherche(''); setType(''); setFaction(''); setPages(1); }}>Effacer les filtres</button></div>}
              <div className="rangee-de-cartes" ref={disponiblesRef}>
                {disponibles.slice(0, pages * PAR_PAGE).map((carte) => (
                  <div key={carte.id} data-carte-id={carte.id}><Carte carte={carte} finition={meilleureFinition(sauvegarde.cartes[carte.id])} maitriseeLe={sauvegarde.cartes[carte.id].maitriseeLe} obtenuLe={sauvegarde.cartes[carte.id].obtenueLe} onChoisir={() => ajouter(carte)} action="ajouter au deck" /></div>
                ))}
              </div>
              {disponibles.length > pages * PAR_PAGE && (
                <button type="button" className="bouton bouton--discret" onClick={() => setPages((p) => p + 1)}>Afficher plus de timbres</button>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
