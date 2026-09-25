import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Carte } from '../composants/carte/Carte.tsx';
import { Entete } from '../composants/Entete.tsx';
import { ErreurDeChargement } from '../composants/ErreurDeChargement.tsx';
import { useChargement } from '../composants/useChargement.ts';
import { usePartie } from '../composants/usePartie.ts';
import { attaqueEnJeu, defenseEnJeu } from '../config/equilibrage.ts';
import { registresMasques } from '../jeu/partie.ts';
import { meilleureFinition } from '../jeu/sauvegarde.ts';
import { lien } from '../navigation/routes.ts';
import { sansAccents } from '../partage/lettres.ts';
import { RARETES } from '../partage/types.ts';
import type { CarteIndex, Nature, Rarete } from '../partage/types.ts';
import { chargerEdition } from '../services/cartes.ts';

const TYPES: Nature[] = ['Nom', 'Adjectif', 'Verbe', 'Adverbe'];
const PAR_PAGE = 60;

const TRIS = {
  recentes: 'Les plus récentes',
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
  const [pages, setPages] = useState(souvenir?.pages ?? 1);
  const [progressionVisible, setProgressionVisible] = useState(false);
  const [filtresVisibles, setFiltresVisibles] = useState(souvenir?.filtresVisibles ?? false);

  // Le souvenir est pris en quittant l'album, avant que la page suivante ne remplace la sienne (d'où « layout ») ;
  // la position revient une fois les timbres affichés.
  const vue = useRef({ rarete, type, faction, recherche, tri, pages, filtresVisibles });
  vue.current = { rarete, type, faction, recherche, tri, pages, filtresVisibles };
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
      maitrises: miennes.filter((m) => m.maitriseeLe !== null).length,
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

  const affichees = useMemo(() => {
    if (!sauvegarde) return [];
    const cherche = sansAccents(recherche.trim());
    const filtrees = possedees.filter((c) => (!rarete || c.rarete === rarete) && (!type || c.type === type) && (!faction || c.faction === faction) && (!cherche || sansAccents(c.mot).includes(cherche)));
    const ordres: Record<Tri, (a: CarteIndex, b: CarteIndex) => number> = {
      recentes: (a, b) => sauvegarde.cartes[b.id].obtenueLe - sauvegarde.cartes[a.id].obtenueLe,
      alphabet: () => 0,
      rarete: (a, b) => RARETES.indexOf(b.rarete) - RARETES.indexOf(a.rarete),
      attaque: (a, b) => attaqueEnJeu(b.attaque, b.rarete) - attaqueEnJeu(a.attaque, a.rarete),
      defense: (a, b) => defenseEnJeu(b.defense, b.rarete) - defenseEnJeu(a.defense, a.rarete),
    };
    return filtrees.sort((a, b) => ordres[tri](a, b) || a.mot.localeCompare(b.mot, 'fr'));
  }, [possedees, sauvegarde, rarete, type, faction, recherche, tri]);

  useEffect(() => {
    if (!pret || aRetrouver.current === 0) return;
    window.scrollTo(0, aRetrouver.current);
    aRetrouver.current = 0;
  }, [pret]);

  if (edition.etat === 'erreur') return <main className="ecran"><h1>Ton album</h1><ErreurDeChargement quoi="Le catalogue des timbres" reessayer={edition.relancer} /></main>;
  if (!pret) return <main className="ecran"><p className="texte-doux">Chargement…</p></main>;

  const filtrer = <T,>(regler: (valeur: T) => void) => (valeur: T): void => { regler(valeur); setPages(1); };
  const nombreDeFiltres = [rarete, type, faction].filter(Boolean).length;
  const rechercheActive = recherche.trim() !== '' || nombreDeFiltres > 0;
  const reinitialiser = (): void => { setRecherche(''); setRarete(''); setType(''); setFaction(''); setPages(1); };

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
            <p className="texte-doux petit">{bilan.maitrises} mot{bilan.maitrises > 1 ? 's' : ''} maîtrisé{bilan.maitrises > 1 ? 's' : ''} · {sauvegarde!.paquets.ouverts} paquet{sauvegarde!.paquets.ouverts > 1 ? 's' : ''} ouvert{sauvegarde!.paquets.ouverts > 1 ? 's' : ''}</p>
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
          <div className="rangee-de-cartes">
            {affichees.slice(0, pages * PAR_PAGE).map((carte) => <Carte key={carte.id} carte={carte} finition={meilleureFinition(sauvegarde!.cartes[carte.id])} maitriseeLe={sauvegarde!.cartes[carte.id].maitriseeLe} obtenuLe={sauvegarde!.cartes[carte.id].obtenueLe} />)}
          </div>
          {affichees.length > pages * PAR_PAGE && (
            <button type="button" className="bouton bouton--discret" onClick={() => setPages((p) => p + 1)}>Afficher plus de timbres</button>
          )}
        </>
      )}
    </main>
  );
}
