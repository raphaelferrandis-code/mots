// Le deck de duel : dix cartes choisies dans la collection. On touche un timbre de la collection pour
// l'ajouter, un timbre du deck pour le retirer. Le deck est enregistré à chaque changement.

import { useMemo, useState } from 'react';
import { Carte } from '../composants/carte/Carte.tsx';
import { CarteLegendee } from '../composants/carte/CarteLegendee.tsx';
import { Entete } from '../composants/Entete.tsx';
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
  const ajouter = (carte: CarteIndex): void => changerLeDeck([...deck.map((c) => c.id), carte.id]);
  const retirer = (carte: CarteIndex): void => changerLeDeck(deck.filter((c) => c.id !== carte.id).map((c) => c.id));
  const filtrer = <T,>(regler: (valeur: T) => void) => (valeur: T): void => { regler(valeur); setPages(1); };

  const parType = TYPES.map((t) => ({ type: t, nombre: deck.filter((c) => c.type === t).length })).filter((t) => t.nombre > 0);
  const factionsDuDeck = [...new Set(deck.map((c) => c.faction))].map((nom) => ({ nom, nombre: deck.filter((c) => c.faction === nom).length })).filter((f) => f.nombre >= 2);
  const factionsPossedees = [...new Set(possedees.map((c) => c.faction))].sort((a, b) => a.localeCompare(b, 'fr'));

  return (
    <main className="ecran ecran--large atelier-deck">
      <Entete titre="Ton deck">
        {deck.length} / {REGLES.tailleDuDeck} timbres{possedees.length >= REGLES.tailleDuDeck && ". Touche un timbre pour l'ajouter ou le retirer."}
      </Entete>

      {possedees.length < REGLES.tailleDuDeck ? (
        <section className="rubrique">
          <p>Encore {REGLES.tailleDuDeck - possedees.length} timbre{REGLES.tailleDuDeck - possedees.length > 1 ? 's' : ''} à collectionner pour composer ton deck.</p>
          <a className="bouton" href={lien({ ecran: 'paquet' })}>Ouvrir des paquets</a>
        </section>
      ) : (
        <>
          <section className="rubrique atelier-deck__selection" aria-label="Timbres sélectionnés">
            <div className="deck">
              {deck.map((carte) => (
                <CarteLegendee key={carte.id} carte={carte} finition={meilleureFinition(sauvegarde.cartes[carte.id])} maitriseeLe={sauvegarde.cartes[carte.id].maitriseeLe} onChoisir={() => retirer(carte)} action="retirer du deck" />
              ))}
              {Array.from({ length: REGLES.tailleDuDeck - deck.length }, (_, i) => <div key={i} className="deck__vide" aria-hidden="true" />)}
            </div>

            {deck.length > 0 && (
              <p className="texte-doux petit">
                {parType.map((t) => `${t.nombre} ${t.type.toLowerCase()}${t.nombre > 1 ? 's' : ''}`).join(' · ')}
                {factionsDuDeck.length > 0 && <> — à enchaîner : {factionsDuDeck.map((f) => `${f.nombre} ${f.nom} (+${(tailles.get(f.nom) ?? Infinity) <= REGLES.petiteFactionJusquA ? REGLES.bonusDePetiteFaction : REGLES.bonusDeFaction})`).join(', ')}</>}
              </p>
            )}

            <div className="rangee-de-boutons">
              {complet
                ? <a className="bouton" href={lien({ ecran: 'duel' })}>Lancer un duel</a>
                : <span className="bouton bouton--inactif">Encore {REGLES.tailleDuDeck - deck.length} carte{REGLES.tailleDuDeck - deck.length > 1 ? 's' : ''}</span>}
              <button type="button" className="bouton bouton--discret" onClick={() => changerLeDeck(meilleurDeck(possedees, REGLES).map((c) => c.id))}>Composer pour moi</button>
              {deck.length > 0 && <button type="button" className="bouton bouton--discret" onClick={() => changerLeDeck([])}>Vider le deck</button>}
            </div>
          </section>

          <details className="rubrique repliable">
            <summary><h2>Conseils de composition</h2></summary>
            <ul className="regles">
              <li><strong>Valeurs du timbre :</strong> attaque à gauche, défense à droite.</li>
              <li><strong>Rareté :</strong> les mots rares frappent plus fort et sont moins souvent parés. À l'entraînement, ils rendent aussi le deck adverse plus rare.</li>
              <li><strong>Types :</strong> +{REGLES.bonusDeType} dégâts selon le cycle nom &gt; adjectif &gt; verbe &gt; nom. Les adverbes sont neutres.</li>
              <li><strong>Origine :</strong> deux mots de même origine joués à la suite donnent +{REGLES.bonusDeFaction} dégât, ou +{REGLES.bonusDePetiteFaction} pour une petite langue.</li>
              <li><strong>Définitions :</strong> retrouve celle de ton mot pour attaquer, celle du mot adverse pour parer.</li>
            </ul>
          </details>

          {!complet && (
            <>
              <section className="filtres" aria-label="Filtres">
                <input type="search" placeholder="Chercher un mot…" value={recherche} onChange={(e) => filtrer(setRecherche)(e.target.value)} aria-label="Chercher un mot" />
                <select value={type} onChange={(e) => filtrer(setType)(e.target.value as Nature | '')} aria-label="Type de mot">
                  <option value="">Tous les types</option>
                  {TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <select value={faction} onChange={(e) => filtrer(setFaction)(e.target.value)} aria-label="Faction">
                  <option value="">Toutes les factions</option>
                  {factionsPossedees.map((nom) => <option key={nom}>{nom}</option>)}
                </select>
                <select value={tri} onChange={(e) => filtrer(setTri)(e.target.value as Tri)} aria-label="Tri">
                  {Object.entries(TRIS).map(([cle, nom]) => <option key={cle} value={cle}>{nom}</option>)}
                </select>
              </section>

              <p className="texte-doux petit" aria-live="polite">{disponibles.length.toLocaleString('fr-FR')} timbre{disponibles.length > 1 ? 's' : ''} à ajouter</p>
              <div className="rangee-de-cartes">
                {disponibles.slice(0, pages * PAR_PAGE).map((carte) => (
                  <Carte key={carte.id} carte={carte} finition={meilleureFinition(sauvegarde.cartes[carte.id])} maitriseeLe={sauvegarde.cartes[carte.id].maitriseeLe} onChoisir={() => ajouter(carte)} action="ajouter au deck" />
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
