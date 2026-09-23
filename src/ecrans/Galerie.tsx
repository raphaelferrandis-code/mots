// Galerie de contrôle (n'existe que pendant le développement, à l'adresse #/galerie) : tous les timbres
// Hors-série et un échantillon de timbres ordinaires, pour juger les illustrations et les motifs d'un coup d'œil.

import { useState } from 'react';
import { CarteRecompense, GainDuDuel, Recompenses, useRecompensesSuspendues } from '../composants/Recompenses.tsx';
import { SUCCES } from '../jeu/catalogueSucces.ts';
import { Carte, DosDeCarte } from '../composants/carte/Carte.tsx';
import { nouveauProfil, ORNEMENTS } from '../jeu/personnalisation.ts';
import { TimbreAReveler } from '../composants/paquet/TimbreAReveler.tsx';
import { ChoixFinition } from '../composants/carte/ChoixFinition.tsx';
import { TimbreManipulable } from '../composants/carte/TimbreManipulable.tsx';
import type { Finition } from '../partage/types.ts';
import { Entete } from '../composants/Entete.tsx';
import { useChargement } from '../composants/useChargement.ts';
import { FINITIONS, RARETES_ORDINAIRES } from '../partage/types.ts';
import { chargerEdition } from '../services/cartes.ts';

// Quelques timbres portent le cachet « Maîtrisé », pour le juger sur tous les papiers.
const MAITRISE = new Date(2026, 8, 21).getTime();

export function Galerie() {
  const [retournees, setRetournees] = useState<string[]>([]);
  const [revelations, setRevelations] = useState<string[]>([]);
  const [essai, setEssai] = useState(0);
  const [recompenseEssai, setRecompenseEssai] = useState(0);
  const [finitionComparee, setFinitionComparee] = useState<Finition>('Normale');
  const edition = useChargement(chargerEdition, 'edition');
  if (edition.etat !== 'pret') return <main className="ecran"><p className="texte-doux">Chargement…</p></main>;

  const { cartes } = edition.donnees;
  const horsSerie = cartes.filter((c) => c.rarete === 'Hors-série');
  // Toujours les mêmes timbres d'une visite à l'autre : un sur quatre-vingt-dix-sept, dans chaque rareté.
  const ordinaires = RARETES_ORDINAIRES.flatMap((rarete) => cartes.filter((c) => c.rarete === rarete).filter((_, i) => i % 97 === 5).slice(0, 6));

  return (
    <main className="ecran ecran--large">
      <Entete surtitre="Développement" titre="Galerie de contrôle">Les {horsSerie.length} timbres Hors-série, puis un échantillon de timbres ordinaires.</Entete>
      <h2>Récompenses · spécimens</h2>
      <button className="bouton" onClick={() => setRecompenseEssai(n => n + 1)}>Rejouer les récompenses</button>
      <EssaiRecompenses key={`file-${recompenseEssai}`} />
      <div className="galerie" key={`recompenses-${recompenseEssai}`} style={{ marginTop: 24 }}>
        <div className="bloc"><GainDuDuel resultat="victoire" encre={30} xp={75} /></div>
        <div className="bloc"><CarteRecompense recompense={{ type: 'niveau', avant: 2, niveau: 3 }} pseudo="Collectionneur" /></div>
        <div className="bloc"><CarteRecompense recompense={{ type: 'titre', succes: SUCCES[1] }} pseudo="Collectionneur" /></div>
      </div>
      <h2>Choix de finition · spécimen</h2>
      <div style={{ width: 'min(100%, 340px)', margin: '0 auto 24px' }}>
        <TimbreManipulable carte={ordinaires[0]} finition={finitionComparee} maitriseeLe={null} />
        <ChoixFinition finitions={{ Normale: 2, Brillante: 1, Holographique: 1 }} choisie={finitionComparee} onChoisir={setFinitionComparee} />
      </div>
      <h2>Révélation du paquet</h2>
      <div className="rangee-de-boutons"><button className="bouton" onClick={() => setRevelations([...FINITIONS, 'Légendaire', 'Hors-série'])}>Tout révéler</button><button className="bouton" onClick={() => { setRevelations([]); setEssai((n) => n + 1); }}>Rejouer la révélation</button></div>
      <ul className="paquet" aria-label="Essai de révélation">
        {[...FINITIONS, 'Légendaire', 'Hors-série'].map((nom) => <li key={`${essai}-${nom}`} className="paquet__place">
          <TimbreAReveler carte={nom === 'Hors-série' ? horsSerie[0] : nom === 'Légendaire' ? ordinaires.find((c) => c.rarete === 'Légendaire')! : ordinaires[0]} finition={nom === 'Brillante' || nom === 'Holographique' ? nom : 'Normale'} retournee={revelations.includes(nom)} onRetourner={() => setRevelations((r) => [...r, nom])} etiquette={`Révéler ${nom}`} />
          <span className="paquet__etiquette">{nom}</span>
        </li>)}
      </ul>
      <h2>Matières d’impression</h2>
      <p className="texte-doux">Même timbre, cinq matières. Déplacez le pointeur sur les gravures. Nacrée et Encre latente sont des spécimens hors tirage.</p>
      <div className="galerie galerie--matieres">
        {FINITIONS.map((finition) => <figure key={finition}><Carte carte={ordinaires[0]} finition={finition} cliquable={false} /><figcaption>{finition}</figcaption></figure>)}
        {(['Nacrée', 'Encre latente'] as const).map((specimen) => <figure key={specimen}><Carte carte={ordinaires[0]} specimen={specimen} cliquable={false} /><figcaption>{specimen} · Spécimen</figcaption></figure>)}
      </div>
      <h2>Dos et retournement en paquet</h2>
      <ul className="paquet" aria-label="Contrôle des dos en paquet">
        <li className="paquet__place"><Carte carte={ordinaires[0]} /></li>
        {ORNEMENTS.filter((o) => o.categorie === 'dos').map((dos) => (
          <li className="paquet__place" key={dos.id}>
            {retournees.includes(dos.id)
              ? <Carte carte={ordinaires[0]} />
              : <DosDeCarte modele={dos.id} etiquette={`Retourner ${dos.nom}`} onRetourner={() => setRetournees((precedentes) => [...precedentes, dos.id])} />}
            <span className="paquet__etiquette">{dos.nom}</span>
          </li>
        ))}
      </ul>
      <div className="galerie">{horsSerie.map((carte, i) => <Carte key={carte.id} carte={carte} maitriseeLe={i % 5 === 1 ? MAITRISE : null} />)}</div>
      <div className="galerie">{ordinaires.map((carte, i) => <Carte key={carte.id} carte={carte} finition={FINITIONS[i % 7 === 3 ? 2 : i % 5 === 2 ? 1 : 0]} maitriseeLe={i % 3 === 0 ? MAITRISE : null} />)}</div>
    </main>
  );
}

// Le vrai conducteur d'annonces, alimenté par un profil jetable : aucun accès à la sauvegarde.
function EssaiRecompenses() {
  const [profil, setProfil] = useState(() => ({ ...nouveauProfil(), pseudo: 'Collectionneur', xp: 90 }));
  const [pause, setPause] = useState(false);
  return <Recompenses profil={profil} onEquiper={titre => setProfil(p => ({ ...p, titre }))}>
    <SuspensionEssai active={pause} />
    <div className="rangee-de-boutons" style={{ marginTop: 12 }}>
      <button className="bouton" disabled={profil.xp > 90} onClick={() => setProfil(p => ({ ...p, xp: 260, succes: [SUCCES[1].id] }))}>Simuler les déblocages</button>
      <button className="bouton" aria-pressed={pause} onClick={() => setPause(p => !p)}>{pause ? 'Libérer les annonces' : 'Simuler une épreuve en cours'}</button>
    </div>
  </Recompenses>;
}
function SuspensionEssai({ active }: { active: boolean }) { useRecompensesSuspendues(active); return null; }
