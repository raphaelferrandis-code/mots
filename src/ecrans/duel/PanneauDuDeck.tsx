// Le deck, à droite de la préparation (docs/duel/BRIEF-duel.md § 2) : les dix emplacements, remplis ou vides (dentelés),
// et l'analyse du deck. « Modifier » passe le panneau en édition sur place : chaque timbre du deck reçoit une
// pastille pour le retirer, et la collection apparaît en dessous avec une pastille pour ajouter.
// Le deck est enregistré à chaque changement, et le dernier changement peut être annulé.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Carte } from '../../composants/carte/Carte.tsx';
import { useActionArmee } from '../../composants/useActionArmee.ts';
import { mouvementReduit } from '../../composants/mouvement.ts';
import { ErreurDeChargement } from '../../composants/ErreurDeChargement.tsx';
import { useChargement } from '../../composants/useChargement.ts';
import { EQUILIBRAGE } from '../../config/equilibrage.ts';
import { NATURES } from '../../jeu/aidesDuDuel.ts';
import { forceDeLaCarte, meilleurDeck, taillesDesFactions } from '../../jeu/duel.ts';
import { registresMasques } from '../../jeu/partie.ts';
import { COMPARAISONS, correspond, trierLesCartes } from '../../jeu/rangement.ts';
import type { Comparaison } from '../../jeu/rangement.ts';
import { cartesDuDeck } from '../../jeu/progression.ts';
import { meilleureFinition } from '../../jeu/sauvegarde.ts';
import type { Sauvegarde } from '../../jeu/sauvegarde.ts';
import { lien } from '../../navigation/routes.ts';
import type { CarteIndex, Nature } from '../../partage/types.ts';
import { chargerEdition } from '../../services/cartes.ts';
import { changerLeDeck } from '../../services/partie.ts';
import { AnalyseDuDeck } from './AnalyseDuDeck.tsx';

const REGLES = EQUILIBRAGE.duel;
const TAILLE = REGLES.tailleDuDeck;
const PAR_PAGE = 30;
const TRIS = { force: 'Les plus forts', attaque: 'Attaque', defense: 'Défense', rarete: 'Les plus rares', alphabet: 'Ordre alphabétique' } as const;
type Tri = keyof typeof TRIS;

const Moins = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" aria-hidden="true"><path d="M6 12h12" /></svg>;
const Plus = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;

export function PanneauDuDeck({ sauvegarde, enEdition, onEdition }: { sauvegarde: Sauvegarde; enEdition: boolean; onEdition: (edition: boolean) => void }) {
  const edition = useChargement(chargerEdition, 'edition');
  const cartes = edition.etat === 'pret' ? edition.donnees.cartes : null;
  const [recherche, setRecherche] = useState('');
  const [nature, setNature] = useState<Nature | ''>('');
  const [origine, setOrigine] = useState('');
  const [tri, setTri] = useState<Tri>('force');
  const [pages, setPages] = useState(1);
  const [retour, setRetour] = useState<{ ids: string[]; message: string } | null>(null);
  const [plein, setPlein] = useState<string | null>(null); // le timbre qu'on a voulu ajouter à un deck plein
  const places = useRef(new Map<string, HTMLElement>());
  const collection = useRef<HTMLUListElement>(null);
  const panneau = useRef<HTMLElement>(null);
  const precedentes = useRef(new Map<string, DOMRect>());
  const arrivee = useRef<{ id: string; rect: DOMRect } | null>(null);

  // Les timbres que l'on peut mettre dans un deck : possédés, et pas masqués par les réglages.
  const possedees = useMemo(() => {
    if (!cartes) return [];
    const masques = registresMasques(sauvegarde);
    return cartes.filter((c) => c.id in sauvegarde.cartes && !c.registre.some((r) => masques.includes(r)));
  }, [sauvegarde, cartes]);
  const deck = useMemo(() => cartesDuDeck(sauvegarde, new Map(possedees.map((c) => [c.id, c]))), [sauvegarde, possedees]);
  const tailles = useMemo(() => (cartes ? taillesDesFactions(cartes) : new Map<string, number>()), [cartes]);

  // Un timbre ajouté vole depuis la collection jusqu'à sa place ; les autres glissent vers leur nouvelle place.
  useLayoutEffect(() => {
    const animations: Animation[] = [];
    if (!mouvementReduit()) places.current.forEach((element, id) => {
      const depuisLaCollection = arrivee.current?.id === id ? arrivee.current.rect : null;
      const origineDuVol = depuisLaCollection ?? precedentes.current.get(id);
      if (!origineDuVol) return;
      const apres = element.getBoundingClientRect();
      if (!apres.width) return;
      const dx = origineDuVol.left - apres.left;
      const dy = origineDuVol.top - apres.top;
      if (!depuisLaCollection && Math.abs(dx) + Math.abs(dy) < 1) return;
      animations.push(element.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(${origineDuVol.width / apres.width})`, transformOrigin: 'top left', zIndex: 10 },
        { transform: 'translate(0, 0) scale(1)', transformOrigin: 'top left', zIndex: 10 },
      ], { duration: depuisLaCollection ? 460 : 260, easing: 'cubic-bezier(.2,.75,.25,1)' }));
    });
    precedentes.current.clear();
    arrivee.current = null;
    return () => animations.forEach((animation) => animation.cancel());
  }, [deck, sauvegarde.reglages.reduireAnimations]);

  const disponibles = useMemo(() => {
    const dansLeDeck = new Set(deck.map((c) => c.id));
    const ordres: Record<Tri, Comparaison> = { ...COMPARAISONS, force: (a, b) => forceDeLaCarte(b) - forceDeLaCarte(a) };
    const convient = correspond({ recherche, nature, origine });
    return trierLesCartes(possedees.filter((c) => !dansLeDeck.has(c.id) && convient(c)), ordres[tri]);
  }, [possedees, deck, nature, origine, recherche, tri]);

  const modifier = (ids: string[], message: string): void => {
    precedentes.current = new Map([...places.current].map(([id, element]) => [id, element.getBoundingClientRect()]));
    setRetour({ ids: deck.map((c) => c.id), message });
    setPlein(null);
    changerLeDeck(ids);
  };
  const vider = useActionArmee(() => modifier([], 'Carnet vidé'));

  // Arrivé en édition (#/deck, « Modifier mon deck ») : sur téléphone, le deck est sous les réglages, on l'amène à l'écran.
  const amene = useRef(false);
  useEffect(() => {
    if (amene.current || !cartes || !enEdition) return;
    amene.current = true;
    if (window.matchMedia('(max-width: 999px)').matches) panneau.current?.scrollIntoView({ block: 'start' });
  }, [cartes, enEdition]);

  if (edition.etat === 'erreur') return <section className="panneau-deck"><ErreurDeChargement quoi="Le catalogue des timbres" reessayer={edition.relancer} /></section>;
  if (!cartes) return <section className="panneau-deck" aria-busy="true"><p className="preparation__note" role="status">Chargement du carnet…</p></section>;

  const ajouter = (carte: CarteIndex, source: HTMLElement): void => {
    if (deck.length >= TAILLE) {
      // Le timbre secoue la tête le temps de l'animation (.42 s), puis se calme.
      setPlein(carte.id);
      window.setTimeout(() => setPlein((actuel) => (actuel === carte.id ? null : actuel)), 450);
      setRetour({ ids: deck.map((c) => c.id), message: `Ton carnet est plein : retire d’abord un timbre pour ajouter « ${carte.mot} ».` });
      return;
    }
    arrivee.current = { id: carte.id, rect: source.getBoundingClientRect() };
    modifier([...deck.map((c) => c.id), carte.id], `« ${carte.mot} » ajouté`);
  };
  const retirer = (carte: CarteIndex): void => modifier(deck.filter((c) => c.id !== carte.id).map((c) => c.id), `« ${carte.mot} » retiré`);
  const filtrer = <T,>(regler: (valeur: T) => void) => (valeur: T): void => { regler(valeur); setPages(1); };
  const origines = [...new Set(possedees.map((c) => c.faction))].sort((a, b) => a.localeCompare(b, 'fr'));
  const annulable = retour && retour.message !== '' && !retour.message.startsWith('Ton carnet est plein');

  return (
    <section className="panneau-deck" ref={panneau} data-edition={enEdition} aria-labelledby="panneau-deck-titre">
      <header className="panneau-deck__entete">
        <h2 id="panneau-deck-titre">Ton carnet <span className="panneau-deck__compte">{deck.length} / {TAILLE}</span></h2>
        <button type="button" className="btn-secondary sm" aria-pressed={enEdition} onClick={() => { setPlein(null); onEdition(!enEdition); }}>{enEdition ? 'Terminer' : 'Modifier'}</button>
      </header>

      {possedees.length < TAILLE && (
        <div className="preparation__vide">
          <p>Encore {TAILLE - possedees.length} timbre{TAILLE - possedees.length > 1 ? 's' : ''} à collectionner pour composer ton carnet.</p>
          <a className="btn-secondary" href={lien({ ecran: 'paquet' })}>Ouvrir des paquets</a>
        </div>
      )}

      <ol className="panneau-deck__grille" aria-label={enEdition ? 'Timbres du carnet : touche un timbre pour le retirer' : 'Timbres du carnet'}>
        {deck.map((carte) => (
          <li key={carte.id} className="panneau-deck__place" ref={(element) => { if (element) places.current.set(carte.id, element); else places.current.delete(carte.id); }}>
            {enEdition
              ? <button type="button" className="panneau-deck__timbre" onClick={() => retirer(carte)} aria-label={`Retirer « ${carte.mot} » du carnet`}>
                <Carte carte={carte} finition={meilleureFinition(sauvegarde.cartes[carte.id])} maitriseeLe={sauvegarde.cartes[carte.id]?.maitriseeLe ?? null} obtenuLe={sauvegarde.cartes[carte.id]?.obtenueLe ?? null} cliquable={false} />
                <span className="panneau-deck__pastille panneau-deck__pastille--retirer"><Moins /></span>
              </button>
              : <Carte carte={carte} finition={meilleureFinition(sauvegarde.cartes[carte.id])} maitriseeLe={sauvegarde.cartes[carte.id]?.maitriseeLe ?? null} obtenuLe={sauvegarde.cartes[carte.id]?.obtenueLe ?? null} cliquable={false} />}
          </li>
        ))}
        {Array.from({ length: Math.max(0, TAILLE - deck.length) }, (_, i) => (
          <li key={`vide-${i}`} className="panneau-deck__place panneau-deck__place--vide"><span className="visuellement-cache">Emplacement vide</span></li>
        ))}
      </ol>

      <p className="panneau-deck__retour" role="status" data-alerte={!!retour && !annulable}>
        {retour?.message}
        {annulable && <button type="button" className="btn-tertiary" onClick={() => { changerLeDeck(retour.ids); setRetour(null); }}>Annuler</button>}
      </p>

      {enEdition && (
        <div className="panneau-deck__outils">
          <button type="button" className="btn-secondary sm" onClick={() => modifier(meilleurDeck(possedees, REGLES).map((c) => c.id), 'Carnet composé avec tes timbres les plus forts')}>Composer pour moi</button>
          {deck.length > 0 && <button type="button" className="btn-tertiary danger" data-arme={vider.arme} onClick={vider.cliquer} onBlur={vider.desarmer}>{vider.arme ? 'Confirmer : vider le carnet' : 'Vider le carnet'}</button>}
        </div>
      )}

      <AnalyseDuDeck deck={deck} tailles={tailles} />

      {enEdition && (
        <section className="collection-deck" aria-labelledby="collection-deck-titre">
          <h3 id="collection-deck-titre">Ta collection <span className="panneau-deck__compte">{disponibles.length.toLocaleString('fr-FR')} à ajouter</span></h3>
          <div className="collection-deck__filtres">
            <input type="search" placeholder="Chercher un mot…" value={recherche} onChange={(e) => filtrer(setRecherche)(e.target.value)} aria-label="Chercher un mot" />
            <select value={nature} onChange={(e) => filtrer(setNature)(e.target.value as Nature | '')} aria-label="Nature du mot">
              <option value="">Toutes les natures</option>
              {NATURES.map((n) => <option key={n}>{n}</option>)}
            </select>
            <select value={origine} onChange={(e) => filtrer(setOrigine)(e.target.value)} aria-label="Origine">
              <option value="">Toutes les origines</option>
              {origines.map((nom) => <option key={nom}>{nom}</option>)}
            </select>
            <select value={tri} onChange={(e) => filtrer(setTri)(e.target.value as Tri)} aria-label="Tri">
              {Object.entries(TRIS).map(([cle, nom]) => <option key={cle} value={cle}>{nom}</option>)}
            </select>
          </div>
          {disponibles.length === 0
            ? <div className="preparation__vide"><p>Aucun timbre ne correspond.</p><button type="button" className="btn-secondary sm" onClick={() => { setRecherche(''); setNature(''); setOrigine(''); setPages(1); }}>Effacer les filtres</button></div>
            : <ul className="collection-deck__grille" ref={collection}>
              {disponibles.slice(0, pages * PAR_PAGE).map((carte) => (
                <li key={carte.id}>
                  <button type="button" className="panneau-deck__timbre" data-secoue={plein === carte.id} onClick={(e) => ajouter(carte, e.currentTarget)} aria-label={`Ajouter « ${carte.mot} » au carnet`}>
                    <Carte carte={carte} finition={meilleureFinition(sauvegarde.cartes[carte.id])} maitriseeLe={sauvegarde.cartes[carte.id]?.maitriseeLe ?? null} obtenuLe={sauvegarde.cartes[carte.id]?.obtenueLe ?? null} cliquable={false} />
                    <span className="panneau-deck__pastille panneau-deck__pastille--ajouter"><Plus /></span>
                  </button>
                </li>
              ))}
            </ul>}
          {disponibles.length > pages * PAR_PAGE && <button type="button" className="btn-secondary sm" onClick={() => setPages((p) => p + 1)}>Afficher plus de timbres</button>}
        </section>
      )}
    </section>
  );
}
