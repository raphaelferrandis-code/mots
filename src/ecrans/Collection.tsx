import { useMemo, useState } from 'react';
import { Carte } from '../composants/Carte.tsx';
import { Entete } from '../composants/Entete.tsx';
import { useChargement } from '../composants/useChargement.ts';
import { usePartie } from '../composants/usePartie.ts';
import { defenseEnJeu } from '../config/equilibrage.ts';
import { registresMasques } from '../jeu/partie.ts';
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

export function Collection() {
  const partie = usePartie();
  const edition = useChargement(chargerEdition, 'edition');
  const [rarete, setRarete] = useState<Rarete | ''>('');
  const [type, setType] = useState<Nature | ''>('');
  const [faction, setFaction] = useState('');
  const [recherche, setRecherche] = useState('');
  const [tri, setTri] = useState<Tri>('recentes');
  const [pages, setPages] = useState(1);

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

  const factions = useMemo(() => {
    const table = new Map<string, { total: number; possedees: number }>();
    for (const c of visibles) {
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
      attaque: (a, b) => b.attaque - a.attaque,
      defense: (a, b) => defenseEnJeu(b.defense, b.rarete) - defenseEnJeu(a.defense, a.rarete),
    };
    return filtrees.sort((a, b) => ordres[tri](a, b) || a.mot.localeCompare(b.mot, 'fr'));
  }, [possedees, sauvegarde, rarete, type, faction, recherche, tri]);

  if (!pret) return <main className="ecran"><p className="texte-doux">Chargement…</p></main>;

  const filtrer = <T,>(regler: (valeur: T) => void) => (valeur: T): void => { regler(valeur); setPages(1); };

  return (
    <main className="ecran ecran--large">
      <Entete surtitre="Collection" titre="Tes cartes">
        {possedees.length.toLocaleString('fr-FR')} cartes sur {visibles.length.toLocaleString('fr-FR')}. Les cartes que tu n'as pas encore restent secrètes.
      </Entete>

      {possedees.length === 0 ? (
        <section className="bloc">
          <p>Ta collection est vide pour l'instant.</p>
          <a className="bouton" href={lien({ ecran: 'paquet' })}>Ouvrir mon premier paquet</a>
        </section>
      ) : (
        <>
          <details className="bloc repliable">
            <summary><h2>Progression par faction</h2></summary>
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
          </details>

          <section className="filtres" aria-label="Filtres">
            <input type="search" placeholder="Chercher un mot…" value={recherche} onChange={(e) => filtrer(setRecherche)(e.target.value)} aria-label="Chercher un mot" />
            <select value={rarete} onChange={(e) => filtrer(setRarete)(e.target.value as Rarete | '')} aria-label="Rareté">
              <option value="">Toutes les raretés</option>
              {[...RARETES].reverse().map((r) => <option key={r}>{r}</option>)}
            </select>
            <select value={type} onChange={(e) => filtrer(setType)(e.target.value as Nature | '')} aria-label="Type de mot">
              <option value="">Tous les types</option>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select value={faction} onChange={(e) => filtrer(setFaction)(e.target.value)} aria-label="Faction">
              <option value="">Toutes les factions</option>
              {factions.map(([nom]) => <option key={nom}>{nom}</option>)}
            </select>
            <select value={tri} onChange={(e) => filtrer(setTri)(e.target.value as Tri)} aria-label="Tri">
              {Object.entries(TRIS).map(([cle, nom]) => <option key={cle} value={cle}>{nom}</option>)}
            </select>
          </section>

          <p className="texte-doux petit" aria-live="polite">{affichees.length.toLocaleString('fr-FR')} carte{affichees.length > 1 ? 's' : ''}</p>
          <div className="rangee-de-cartes">
            {affichees.slice(0, pages * PAR_PAGE).map((carte) => <Carte key={carte.id} carte={carte} />)}
          </div>
          {affichees.length > pages * PAR_PAGE && (
            <button type="button" className="bouton bouton--discret" onClick={() => setPages((p) => p + 1)}>Afficher plus de cartes</button>
          )}
        </>
      )}
    </main>
  );
}
