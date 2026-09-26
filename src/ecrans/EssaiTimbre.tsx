// Page d'essai du timbre de la refonte (n'existe que pendant le développement, à l'adresse #/timbres).
// Lot 1 du brief de la cérémonie : les quatre aspects à trois tailles, puis raretés, natures, verso et cas limites.

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Carte } from '../composants/carte/Carte.tsx';
import { Ceremonie } from '../composants/ceremonie/Ceremonie.tsx';
import { Feuille, useEcranEtroit } from '../composants/ceremonie/Feuille.tsx';
import type { FaceDeLaFeuille } from '../composants/ceremonie/Feuille.tsx';
import { melanger } from '../composants/ceremonie/feuille.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { ouvrirPaquet, preparerReserve } from '../jeu/paquets.ts';
import { FilDActivite } from '../composants/accueil/FilDActivite.tsx';
import '../composants/accueil/refonte.css';
import type { CarteObtenue } from '../jeu/partie.ts';
import { Entete } from '../composants/Entete.tsx';
import { Timbre } from '../composants/timbre/Timbre.tsx';
import { useChargement } from '../composants/useChargement.ts';
import type { CarteIndex, Finition, Nature } from '../partage/types.ts';
import { FINITIONS, RARETES } from '../partage/types.ts';
import { chargerEdition } from '../services/cartes.ts';
import './essaiTimbre.css';

const TAILLES = [{ nom: 'Cérémonie', largeur: 300 }, { nom: 'Deck', largeur: 160 }, { nom: 'Plateau', largeur: 56 }];
const NATURES: Nature[] = ['Nom', 'Verbe', 'Adjectif', 'Adverbe'];
const MAITRISE = new Date(2026, 8, 21).getTime();

export function EssaiTimbre() {
  const edition = useChargement(chargerEdition, 'edition');
  const [oblitere, setOblitere] = useState(true);
  const [verso, setVerso] = useState(true);
  const [sons, setSons] = useState(true);
  const [essai, setEssai] = useState<Promise<CarteObtenue[]> | null>(null);
  // La feuille : un paquet tiré ici avec les vraies règles et les vraies cartes (rien n'est enregistré).
  const [feuille, setFeuille] = useState<{ numero: number; cartes: CarteObtenue[] } | null>(null);
  const [face, setFace] = useState<FaceDeLaFeuille>('verso');
  const [format, setFormat] = useState<'ecran' | 'ordinateur' | 'telephone'>('ecran');
  const etroitParEcran = useEcranEtroit();
  if (edition.etat !== 'pret') return <main className="ecran"><p className="texte-doux">Chargement…</p></main>;

  const { cartes } = edition.donnees;
  const trouver = (test: (c: CarteIndex) => boolean, rang = 0): CarteIndex => { const liste = cartes.filter(test); return liste[rang % Math.max(1, liste.length)] ?? cartes[0]; };
  const parMot = (mot: string): CarteIndex => trouver((c) => c.mot === mot);
  const aspects: { nom: string; carte: CarteIndex; finition: Finition }[] = [
    { nom: 'Courant', carte: trouver((c) => c.rarete === 'Commune' && c.type === 'Nom', 40), finition: 'Normale' },
    { nom: 'Brillant', carte: trouver((c) => c.rarete === 'Rare' && c.type === 'Adjectif', 12), finition: 'Brillante' },
    { nom: 'Holographique', carte: trouver((c) => c.rarete === 'Épique' && c.type === 'Nom', 7), finition: 'Holographique' },
    { nom: 'Hors-série', carte: parMot('amour'), finition: 'Normale' },
  ];
  const largeur = (px: number): CSSProperties => ({ width: px });
  const paquetDEssai: CarteObtenue[] = [
    { carte: aspects[0].carte, finition: 'Normale', nouvelle: true, nouvelleFinition: true, encre: 0 },
    { carte: aspects[1].carte, finition: 'Brillante', nouvelle: false, nouvelleFinition: false, encre: 6 },
    { carte: aspects[2].carte, finition: 'Holographique', nouvelle: false, nouvelleFinition: true, encre: 0 },
    { carte: trouver((c) => c.rarete === 'Légendaire', 9), finition: 'Normale', nouvelle: true, nouvelleFinition: true, encre: 0 },
    { carte: aspects[3].carte, finition: 'Normale', nouvelle: true, nouvelleFinition: true, encre: 0 },
  ];
  const tirer = (numero: number): void => {
    const tirees = ouvrirPaquet(preparerReserve(cartes), { hasard: Math.random, paquetsSansLegendaire: 0 }, EQUILIBRAGE.paquets, EQUILIBRAGE.finitions);
    const obtenues = tirees.map((t): CarteObtenue => ({ ...t, nouvelle: true, nouvelleFinition: true, encre: 0 }));
    setFeuille({ numero, cartes: melanger(obtenues, obtenues.map((o) => o.carte.id).join('|')) });
  };
  const tousLesEffets: CarteObtenue[] = [{ carte: trouver((c) => c.rarete === 'Commune', 3), finition: 'Normale', nouvelle: true, nouvelleFinition: true, encre: 0 }, ...paquetDEssai];
  const etroite = format === 'ecran' ? etroitParEcran : format === 'telephone';

  return (
    <main className="ecran ecran--large essai-timbre">
      <Entete surtitre="Développement · lot 1" titre="Le timbre de la refonte">Survole ou touche un timbre pour faire jouer les reflets.</Entete>
      <div className="rangee-de-boutons">
        <label className="essai-timbre__option"><input type="checkbox" checked={oblitere} onChange={(e) => setOblitere(e.target.checked)} /> Cachet posé</label>
      </div>

      <h2>Cérémonie d’essai</h2>
      <p className="texte-doux">Un faux paquet de six timbres qui montre chaque effet (courant, doré, holographique, Légendaire, Hors-série). Rien n’est tiré ni enregistré.</p>
      <div className="rangee-de-boutons">
        <button type="button" className="bouton" onClick={() => setEssai(Promise.resolve(tousLesEffets))}>Ouvrir la cérémonie d’essai</button>
        <button type="button" className="bouton" onClick={() => setEssai(Promise.resolve(tousLesEffets.filter((o) => o.carte.rarete === 'Hors-série')))}>Une seule Hors-série</button>
      </div>
      {essai && <Ceremonie premier={essai} tirer={() => essai} continuer={false} numero={142} reserve={0} depuis={null} modelePaquet="original" dos="gomme"
        sons={sons} onSons={setSons} reduire={false} onFermer={() => setEssai(null)} onErreur={() => setEssai(null)} />}

      <h2>La feuille de timbres (lot 1)</h2>
      <p className="texte-doux">Un paquet tiré avec les vraies règles et les vraies cartes ; rien n’est enregistré.</p>
      <div className="rangee-de-boutons">
        <button type="button" className="bouton" onClick={() => tirer((feuille?.numero ?? 141) + 1)}>Tirer un paquet</button>
        <button type="button" className="bouton" onClick={() => setFeuille({ numero: 142, cartes: melanger(tousLesEffets, 'tous-les-effets') })}>Paquet avec tous les halos</button>
        <button type="button" className="bouton" onClick={() => setFace((f) => (f === 'recto' ? 'verso' : 'recto'))}>{face === 'recto' ? 'Voir le verso' : 'Voir le recto'}</button>
        <select value={format} onChange={(e) => setFormat(e.target.value as typeof format)} aria-label="Disposition">
          <option value="ecran">Selon l’écran</option><option value="ordinateur">Ordinateur (3 × 2)</option><option value="telephone">Téléphone (2 × 3)</option>
        </select>
      </div>
      {feuille && <div className="essai-timbre__feuille" data-etroite={etroite || undefined}>
        <Feuille cartes={feuille.cartes} face={face} etroite={etroite} numero={feuille.numero} edition={edition.donnees.meta.edition} />
      </div>}

      <h2>Fil d’activité (exemples)</h2>
      <p className="texte-doux">En local, le serveur n’est pas branché : voici le fil avec des événements d’exemple.</p>
      <FilDActivite evenements={[
        { genre: 'trouvaille', pseudo: 'J.J.', mot: 'palimpseste', rarete: 'Rare', finition: 'Holographique', cote: null, le: 0 },
        { genre: 'victoire', pseudo: 'Faekia', mot: null, rarete: null, finition: null, cote: 1042, le: 0 },
        { genre: 'trouvaille', pseudo: 'Pylum', mot: 'grimoire', rarete: 'Légendaire', finition: 'Normale', cote: null, le: 0 },
        { genre: 'arrivee', pseudo: 'Etiee', mot: null, rarete: null, finition: null, cote: null, le: 0 },
        { genre: 'trouvaille', pseudo: 'Choco', mot: 'amour', rarete: 'Hors-série', finition: 'Normale', cote: null, le: 0 },
      ]} />

      <h2>Les quatre aspects, à trois tailles</h2>
      {TAILLES.map((taille) => <section key={taille.nom} className="essai-timbre__rangee">
        <h3>{taille.nom} · {taille.largeur} px</h3>
        <div className="essai-timbre__timbres">
          {aspects.map((a) => <figure key={a.nom} style={largeur(taille.largeur)}>
            <Timbre carte={a.carte} finition={a.finition} oblitere={oblitere} cliquable={false} />
            {taille.largeur > 100 && <figcaption>{a.nom}</figcaption>}
          </figure>)}
        </div>
      </section>)}

      <h2>Les raretés, dans chaque finition</h2>
      <p className="texte-doux">Même nature partout (Nom) : seule la rareté change d’une colonne à l’autre, seule la finition d’une rangée à l’autre.</p>
      <div id="raretes" className="essai-timbre__matrice">
        {FINITIONS.map((finition) => <div key={finition} className="essai-timbre__timbres">
          {RARETES.map((rarete) => <figure key={rarete} style={largeur(150)}>
            <Timbre carte={rarete === 'Hors-série' ? parMot('amour') : trouver((c) => c.rarete === rarete && c.type === 'Nom' && [...c.mot].length <= 9, 61)} finition={finition} oblitere={oblitere} cliquable={false} />
            <figcaption>{rarete}{finition === 'Normale' ? '' : ` · ${finition.toLowerCase()}`}</figcaption>
          </figure>)}
        </div>)}
      </div>

      <h2>Les raretés en petit (album sur téléphone, plateau du duel)</h2>
      <div id="raretes-petites" className="essai-timbre__timbres">
        {[110, 56].flatMap((taille) => RARETES.map((rarete, i) => <figure key={`${taille}-${rarete}`} style={largeur(taille)}>
          <Timbre carte={rarete === 'Hors-série' ? parMot('amour') : trouver((c) => c.rarete === rarete && c.type === (['Nom', 'Verbe', 'Adjectif', 'Nom', 'Verbe'] as const)[i], 17)} oblitere={oblitere} cliquable={false} />
        </figure>))}
      </div>

      <h2>Un paquet ordinaire</h2>
      <p className="texte-doux">Les cinq timbres de la capture de Raphaël (25 septembre) : trois Communes (dont une brillante), une Peu commune, une Rare.</p>
      <div id="eventail" className="essai-timbre__timbres">
        {([['atmosphère', 'Normale'], ['hoquet', 'Normale'], ['pépère', 'Brillante'], ['écorné', 'Normale'], ['macumba', 'Normale']] as const).map(([mot, finition]) => <figure key={mot} style={largeur(150)}>
          <Timbre carte={parMot(mot)} finition={finition} oblitere={oblitere} cliquable={false} />
          <figcaption>{parMot(mot).rarete}{finition === 'Normale' ? '' : ` · ${finition.toLowerCase()}`}</figcaption>
        </figure>)}
      </div>

      <h2>Les natures</h2>
      <div className="essai-timbre__timbres">
        {NATURES.map((nature) => <figure key={nature} style={largeur(170)}>
          <Timbre carte={trouver((c) => c.type === nature && c.rarete === 'Peu commune', 83)} oblitere={oblitere} cliquable={false} />
          <figcaption>{nature}</figcaption>
        </figure>)}
      </div>

      <h2>Le verso</h2>
      <div className="rangee-de-boutons"><button type="button" className="bouton" onClick={() => setVerso((v) => !v)}>{verso ? 'Montrer le recto' : 'Montrer le verso'}</button></div>
      <div className="essai-timbre__timbres">
        {['gomme', 'entrelacs', 'constellation', 'dragon-dos'].map((dos) => <figure key={dos} style={largeur(200)}>
          <Timbre carte={aspects[1].carte} finition="Brillante" verso montrerVerso={verso} dos={dos} oblitere={oblitere} cliquable={false} reagir />
          <figcaption>Dos « {dos} »</figcaption>
        </figure>)}
      </div>

      <h2>Cas limites</h2>
      <div className="essai-timbre__timbres">
        {['anticonstitutionnellement', 'électro-encéphalogramme', 'dictionnaire'].map((mot) => <figure key={mot} style={largeur(200)}>
          <Timbre carte={parMot(mot)} oblitere={oblitere} cliquable={false} />
          <figcaption>{mot}</figcaption>
        </figure>)}
        <figure style={largeur(200)}>
          <Timbre carte={aspects[0].carte} oblitere={oblitere} maitriseeLe={MAITRISE} cliquable={false} />
          <figcaption>Mot maîtrisé</figcaption>
        </figure>
      </div>

      <h2>Avant / après</h2>
      <div className="essai-timbre__timbres">
        {aspects.map((a) => <figure key={a.nom} style={largeur(200)}>
          <Carte carte={a.carte} finition={a.finition} cliquable={false} />
          <figcaption>Actuel · {a.nom}</figcaption>
        </figure>)}
      </div>
    </main>
  );
}
