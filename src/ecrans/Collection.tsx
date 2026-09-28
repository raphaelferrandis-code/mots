import { startTransition, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Carte } from '../composants/carte/Carte.tsx';
import { Entete } from '../composants/Entete.tsx';
import { ErreurDeChargement } from '../composants/ErreurDeChargement.tsx';
import { useChargement } from '../composants/useChargement.ts';
import { usePartie } from '../composants/usePartie.ts';
import { registresMasques } from '../jeu/partie.ts';
import { COMPARAISONS, correspond, trierLesCartes } from '../jeu/rangement.ts';
import type { Comparaison } from '../jeu/rangement.ts';
import { meilleureFinition } from '../jeu/sauvegarde.ts';
import { lien } from '../navigation/routes.ts';
import { RARETES } from '../partage/types.ts';
import type { Nature, Rarete } from '../partage/types.ts';
import { chargerEdition } from '../services/cartes.ts';

const TYPES: Nature[] = ['Nom', 'Adjectif', 'Verbe', 'Adverbe'];
// Des lots de 30 timbres, chargés tout seuls à l'approche du bas (audit de finition, P04 : 60 à la fois, au bouton,
// faisaient attendre plus d'une demi-seconde sur téléphone).
const PAR_PAGE = 30;

const TRIS = {
  recentes: 'Les plus récents',
  alphabet: 'Ordre alphabétique',
  rarete: 'Les plus rares',
  attaque: 'Attaque',
  defense: 'Défense',
} as const;
type Tri = keyof typeof TRIS;

// L'album se souvient, le temps de la visite, de ses filtres et de l'endroit où l'on en était : en revenant d'une fiche
// (ou d'un autre onglet), on retrouve sa page au lieu de repartir du haut, sans filtre.
type Souvenir = { rarete: Rarete | ''; type: Nature | ''; faction: string; recherche: string; tri: Tri; pages: number; filtresVisibles: boolean; defilement: number };
let souvenir: Souvenir | null = null;

export function Collection() {
  const partie = usePartie();
  const edition = useChargement(chargerEdition, 'edition');
  const [rarete, setRarete] = useState<Rarete | ''>(souvenir?.rarete ?? '');
  const [type, setType] = useState<Nature | ''>(souvenir?.type ?? '');
  const [faction, setFaction] = useState(souvenir?.faction ?? '');
  const [recherche, setRecherche] = useState(souvenir?.recherche ?? '');
  const [tri, setTri] = useState<Tri>(souvenir?.tri ?? 'recentes');
  // Au retour d'une fiche, l'album se reconstruit par petits lots, caché, sans geler l'écran (il redessinait tout d'un
  // coup : plusieurs secondes de gel pour un gros album), puis retrouve la position où l'on en était.
  const pagesVoulues = useRef(souvenir?.pages ?? 1);
  const [pages, setPages] = useState(() => Math.min(pagesVoulues.current, 2));
  const enReconstruction = pages < pagesVoulues.current;
  const [progressionVisible, setProgressionVisible] = useState(false);
  const [filtresVisibles, setFiltresVisibles] = useState(souvenir?.filtresVisibles ?? false);

  // Le souvenir est pris en quittant l'album, avant que la page suivante ne remplace la sienne (d'où « layout ») ;
  // la position revient une fois les timbres affichés.
  const vue = useRef({ rarete, type, faction, recherche, tri, pages, filtresVisibles });
  vue.current = { rarete, type, faction, recherche, tri, pages: Math.max(pages, pagesVoulues.current), filtresVisibles };
  useLayoutEffect(() => () => { souvenir = { ...vue.current, defilement: window.scrollY }; }, []);
  const aRetrouver = useRef(souvenir?.defilement ?? 0);

  const pret = partie.etat === 'prete' && edition.etat === 'pret';
  const sauvegarde = partie.etat === 'prete' ? partie.sauvegarde : null;
  const cartes = edition.etat === 'pret' ? edition.donnees.cartes : null;

  // Les cartes que le joueur a choisi de masquer disparaissent de la collection et des compteurs.
  const visibles = useMemo(() => {
    if (!sauvegarde || !cartes) return [];
    const masques = registresMasques(sauvegarde);
    return cartes.filter((c) => !c.registre.some((r) => masques.includes(r)));
  }, [sauvegarde, cartes]);

  const possedees = useMemo(() => (sauvegarde ? visibles.filter((c) => c.id in sauvegarde.cartes) : []), [visibles, sauvegarde]);

  // Les cartes Hors-série sont comptées à part ; les finitions brillantes et holographiques aussi.
  const bilan = useMemo(() => {
    const ordinaires = visibles.filter((c) => c.rarete !== 'Hors-série');
    const miennes = possedees.map((c) => sauvegarde!.cartes[c.id]);
    return {
      total: ordinaires.length,
      possedees: possedees.filter((c) => c.rarete !== 'Hors-série').length,
      horsSerie: visibles.length - ordinaires.length,
      horsSeriePossedees: possedees.filter((c) => c.rarete === 'Hors-série').length,
      brillantes: miennes.filter((m) => (m.finitions.Brillante ?? 0) > 0).length,
      holographiques: miennes.filter((m) => (m.finitions.Holographique ?? 0) > 0).length,
    };
  }, [visibles, possedees, sauvegarde]);

  const factions = useMemo(() => {
    const table = new Map<string, { total: number; possedees: number }>();
    for (const c of visibles) {
      if (c.rarete === 'Hors-série') continue;
      const ligne = table.get(c.faction) ?? { total: 0, possedees: 0 };
      ligne.total++;
      if (sauvegarde && c.id in sauvegarde.cartes) ligne.possedees++;
      table.set(c.faction, ligne);
    }
    return [...table].sort((a, b) => b[1].total - a[1].total);
  }, [visibles, sauvegarde]);

  // La recherche : le champ suit la frappe tout de suite, la liste juste après (elle bloquait chaque lettre).
  const rechercheDifferee = useDeferredValue(recherche);
  const affichees = useMemo(() => {
    if (!sauvegarde) return [];
    const ordres: Record<Tri, Comparaison> = { ...COMPARAISONS, recentes: (a, b) => sauvegarde.cartes[b.id].obtenueLe - sauvegarde.cartes[a.id].obtenueLe };
    return trierLesCartes(possedees.filter(correspond({ recherche: rechercheDifferee, rarete, nature: type, origine: faction })), ordres[tri]);
  }, [possedees, sauvegarde, rarete, type, faction, rechercheDifferee, tri]);

  // La reconstruction : deux lots de plus à chaque image, en tâche de fond.
  useEffect(() => {
    if (!pret || !enReconstruction) return;
    const cadre = requestAnimationFrame(() => startTransition(() => setPages((p) => Math.min(p + 2, pagesVoulues.current))));
    return () => cancelAnimationFrame(cadre);
  }, [pret, enReconstruction, pages]);
  // La position retrouvée, avant que l'image ne s'affiche.
  useLayoutEffect(() => {
    if (!pret || enReconstruction || aRetrouver.current === 0) return;
    window.scrollTo(0, aRetrouver.current);
    aRetrouver.current = 0;
  }, [pret, enReconstruction]);

  // Le lot suivant, à l'approche du bas (le bouton reste, pour le clavier et au cas où).
  const suite = useRef<HTMLButtonElement>(null);
  const encoreDesTimbres = affichees.length > pages * PAR_PAGE;
  useEffect(() => {
    const bouton = suite.current;
    if (!bouton || enReconstruction || !encoreDesTimbres || typeof IntersectionObserver === 'undefined') return;
    const guetteur = new IntersectionObserver((vues) => { if (vues.some((v) => v.isIntersecting)) startTransition(() => setPages((p) => p + 1)); }, { rootMargin: '900px 0px' });
    guetteur.observe(bouton);
    return () => guetteur.disconnect();
  }, [pages, enReconstruction, encoreDesTimbres]);

  if (edition.etat === 'erreur') return <main className="ecran"><h1>Ton album</h1><ErreurDeChargement quoi="Le catalogue des timbres" reessayer={edition.relancer} /></main>;
  if (!pret) return <main className="ecran"><p className="texte-doux">Chargement…</p></main>;

  const filtrer = <T,>(regler: (valeur: T) => void) => (valeur: T): void => { regler(valeur); pagesVoulues.current = 1; setPages(1); };
  const nombreDeFiltres = [rarete, type, faction].filter(Boolean).length;
  const rechercheActive = recherche.trim() !== '' || nombreDeFiltres > 0;
  const reinitialiser = (): void => { setRecherche(''); setRarete(''); setType(''); setFaction(''); pagesVoulues.current = 1; setPages(1); };

  return (
    <main className="ecran ecran--large album">
      <Entete titre="Ton album" actions={possedees.length > 0 && <button className="bouton outil" type="button" aria-expanded={progressionVisible} aria-controls="progression-album" onClick={() => setProgressionVisible(!progressionVisible)}>Progression <span aria-hidden="true">{progressionVisible ? '−' : '+'}</span></button>}>
        {bilan.possedees.toLocaleString('fr-FR')} / {bilan.total.toLocaleString('fr-FR')} timbres · {bilan.horsSeriePossedees} / {bilan.horsSerie} hors-série
      </Entete>

      {possedees.length === 0 ? (
        <section className="etat-vide">
          <p>Ton album est vide pour l'instant.</p>
          <a className="bouton" href={lien({ ecran: 'paquet' })}>Ouvrir mon premier paquet</a>
        </section>
      ) : (
        <>
          <section id="progression-album" className="rubrique album__progression" aria-label="Progression et statistiques" hidden={!progressionVisible}>
            <p className="texte-doux petit">Finitions : {bilan.brillantes} brillantes · {bilan.holographiques} holographiques</p>
            <p className="texte-doux petit">{sauvegarde!.paquets.ouverts} paquet{sauvegarde!.paquets.ouverts > 1 ? 's' : ''} ouvert{sauvegarde!.paquets.ouverts > 1 ? 's' : ''}</p>
            <ul className="progressions">
              {factions.map(([nom, p]) => (
                <li key={nom}>
                  <button type="button" className="progression" aria-pressed={faction === nom} onClick={() => filtrer(setFaction)(faction === nom ? '' : nom)}>
                    <span className="progression__nom">{nom}</span>
                    <span className="progression__compte">{p.possedees} / {p.total}</span>
                    <span className="progression__barre" aria-hidden="true"><span style={{ width: `${(p.possedees / p.total) * 100}%` }} /></span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="outils-album" aria-label="Rechercher et trier les timbres">
            <input type="search" placeholder="Chercher un mot…" value={recherche} onChange={(e) => filtrer(setRecherche)(e.target.value)} aria-label="Chercher un mot" />
            <select value={tri} onChange={(e) => filtrer(setTri)(e.target.value as Tri)} aria-label="Tri">
              {Object.entries(TRIS).map(([cle, nom]) => <option key={cle} value={cle}>{nom}</option>)}
            </select>
            <button type="button" className="bouton outil" aria-expanded={filtresVisibles} aria-controls="filtres-album" onClick={() => setFiltresVisibles(!filtresVisibles)}>Filtres{nombreDeFiltres > 0 && ` · ${nombreDeFiltres}`} <span aria-hidden="true">{filtresVisibles ? '−' : '+'}</span></button>
          </section>
          <section id="filtres-album" className="filtres" aria-label="Filtres" hidden={!filtresVisibles}>
            <select value={rarete} onChange={(e) => filtrer(setRarete)(e.target.value as Rarete | '')} aria-label="Rareté">
              <option value="">Toutes les raretés</option>
              {[...RARETES].reverse().map((r) => <option key={r}>{r}</option>)}
            </select>
            <select value={type} onChange={(e) => filtrer(setType)(e.target.value as Nature | '')} aria-label="Nature du mot">
              <option value="">Toutes les natures</option>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select value={faction} onChange={(e) => filtrer(setFaction)(e.target.value)} aria-label="Origine">
              <option value="">Toutes les origines</option>
              {factions.map(([nom]) => <option key={nom}>{nom}</option>)}
            </select>
          </section>

          {rechercheActive && (
            <div className="album__resultats">
              <p className="texte-doux petit" role="status">{affichees.length.toLocaleString('fr-FR')} résultat{affichees.length > 1 ? 's' : ''}{faction && ` · ${faction}`}</p>
              <button className="bouton outil" type="button" onClick={reinitialiser}>Effacer les filtres</button>
            </div>
          )}
          {affichees.length === 0 && <div className="etat-vide"><h2>Aucun timbre ne correspond</h2><p>Modifie ta recherche ou efface les filtres.</p></div>}
          {enReconstruction && <p className="texte-doux petit" role="status">Retour à ta page…</p>}
          <div className="rangee-de-cartes" aria-busy={enReconstruction || undefined} style={enReconstruction ? { visibility: 'hidden' } : undefined}>
            {affichees.slice(0, pages * PAR_PAGE).map((carte) => <Carte key={carte.id} carte={carte} finition={meilleureFinition(sauvegarde!.cartes[carte.id])} obtenuLe={sauvegarde!.cartes[carte.id].obtenueLe} />)}
          </div>
          {encoreDesTimbres && !enReconstruction && (
            <button ref={suite} type="button" className="bouton bouton--discret" onClick={() => startTransition(() => setPages((p) => p + 1))}>Afficher plus de timbres</button>
          )}
        </>
      )}
    </main>
  );
}
