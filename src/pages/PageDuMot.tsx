// Les pages par mot et la liste de tous les mots, fabriquées d'avance en HTML (scripts/fabriquer-les-pages.ts) :
// Google les lit sans lancer le jeu. Aucun code ne tourne dans le navigateur ; les liens mènent au jeu.
// Chemins relatifs : une page vit dans mot/<adresse>/, la liste dans mots/, le jeu deux niveaux plus haut.

import { NIVEAU } from '../composants/carte/decor.ts';
import { Timbre } from '../composants/timbre/Timbre.tsx';
import { attaqueEnJeu, defenseEnJeu } from '../config/equilibrage.ts';
import type { TexteDUnePage } from '../partage/pagesDesMots.ts';
import type { CarteDetails, CarteIndex } from '../partage/types.ts';

const NATURE: Record<CarteIndex['type'], string> = { Nom: 'nom', Verbe: 'verbe', Adjectif: 'adjectif', Adverbe: 'adverbe' };

function usage(frequence: number): string {
  if (frequence < 1) return 'Très rare à l’écrit';
  if (frequence < 10) return 'Rare à l’écrit';
  if (frequence < 100) return 'Courant';
  return 'Très courant';
}

// Dix segments, comme la jauge des duels de l'accueil.
function Jauge({ allumes }: { allumes: number }) {
  const n = Math.max(1, Math.min(10, Math.round(allumes)));
  return <span className="page-mot__jauge" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < n ? 'allume' : undefined} />)}</span>;
}

function Bandeau({ racine }: { racine: string }) {
  return (
    <header className="page-mot__bandeau">
      <a className="page-mot__marque" href={racine}><img src={`${racine}identite/philamots-clair.svg`} alt="Philamots" width="150" height="36" /></a>
      <a className="btn-secondary page-mot__jouer" href={racine}>Jouer</a>
    </header>
  );
}

function Pied({ racine, wiktionnaire }: { racine: string; wiktionnaire?: string }) {
  return (
    <footer className="page-mot__pied">
      <p>
        Définitions et étymologies adaptées du{' '}
        <a href={wiktionnaire ?? 'https://fr.wiktionary.org/'}>Wiktionnaire</a>{' '}
        (<a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr">CC BY-SA 4.0</a>) · fréquences de Lexique 4
      </p>
      <p><a href={`${racine}mots/`}>Tous les mots</a></p>
    </footer>
  );
}

export type Voisin = { carte: CarteIndex; adresse: string };

export function PageDuMot({ carte, details, texte, voisins }: { carte: CarteIndex; details: CarteDetails; texte: TexteDUnePage | undefined; voisins: Voisin[] }) {
  const racine = '../../';
  const definitions = texte?.definitions ?? details.definitions;
  const etymologies = texte?.etymologies.length ? texte.etymologies : details.etymologie ? [details.etymologie] : [];
  const wiktionnaire = `https://fr.wiktionary.org/wiki/${encodeURIComponent(carte.mot)}`;
  return (
    <div className="page-mot">
      <Bandeau racine={racine} />
      <main className="page-mot__corps">
        <article className="page-mot__article">
          <div className="page-mot__timbre"><Timbre carte={carte} cliquable={false} reagir={false} /></div>

          <div className="page-mot__texte">
            <h1>{carte.mot}</h1>
            <p className="page-mot__nature">
              {NATURE[carte.type]}{details.langueOrigine ? ` · ${details.langueOrigine}` : ''}{details.attestation ? ` · ${details.attestation}` : ''}
            </p>

            <h2>Définition{definitions.length > 1 ? 's' : ''}</h2>
            <ol className="page-mot__definitions">
              {definitions.map((d, i) => <li key={i}>
                {d.registre?.length ? <span className="page-mot__registre">{d.registre.join(', ')}. </span> : null}{d.texte}
              </li>)}
            </ol>
            {texte && texte.sens > definitions.length && <p className="page-mot__suite">
              <a href={wiktionnaire}>Les {texte.sens} sens sur le Wiktionnaire</a>
            </p>}

            {etymologies.length > 0 && <>
              <h2>Origine</h2>
              {etymologies.map((e, i) => <p key={i} className="page-mot__origine">{e}</p>)}
            </>}

            <dl className="page-mot__releve">
              {details.prevalence !== null && <div>
                <dt>Connu de</dt>
                <dd>{details.prevalence} % des francophones</dd>
                <Jauge allumes={details.prevalence / 10} />
              </div>}
              <div>
                <dt>Usage</dt>
                <dd>{usage(details.frequence)}</dd>
                <Jauge allumes={(Math.log10(Math.max(details.frequence, 0.1)) + 1) * 2.5} />
              </div>
              <div>
                <dt>Timbre</dt>
                <dd><span className="page-mot__rang" aria-hidden="true">{carte.rarete === 'Hors-série' ? '✦' : '◆'.repeat(NIVEAU[carte.rarete])}</span> {carte.rarete}</dd>
                <p>Att. {attaqueEnJeu(carte.attaque, carte.rarete)} · Déf. {defenseEnJeu(carte.defense, carte.rarete)}</p>
              </div>
            </dl>
          </div>
        </article>

        <section className="page-mot__appel">
          <div className="page-mot__eventail" aria-hidden="true">
            {voisins.slice(0, 2).map((v) => <span key={v.carte.id} className="page-mot__vignette"><Timbre carte={v.carte} cliquable={false} reagir={false} /></span>)}
            <span className="page-mot__vignette"><Timbre carte={carte} cliquable={false} reagir={false} /></span>
          </div>
          <p>Ce mot est un timbre à collectionner.</p>
          <a className="btn-primary" href={`${racine}#/paquet`}>Ouvrir un paquet</a>
        </section>

        {voisins.length > 0 && <section className="page-mot__voisins">
          <h2>D’autres timbres « {carte.faction} »</h2>
          <ul>
            {voisins.map((v) => <li key={v.carte.id}>
              <a href={`../${v.adresse}/`}>
                <span className="page-mot__vignette"><Timbre carte={v.carte} cliquable={false} reagir={false} /></span>
                <span className="page-mot__legende">{v.carte.mot}</span>
              </a>
            </li>)}
          </ul>
        </section>}
      </main>
      <Pied racine={racine} wiktionnaire={wiktionnaire} />
    </div>
  );
}

// La liste de tous les mots, par lettre : un chemin vers chaque page, pour les lecteurs comme pour Google.
export function ListeDesMots({ mots }: { mots: { mot: string; adresse: string; type: CarteIndex['type'] }[] }) {
  const racine = '../';
  const parLettre = new Map<string, typeof mots>();
  for (const m of mots) {
    const lettre = m.adresse[0]?.toUpperCase() ?? '#';
    parLettre.set(lettre, [...(parLettre.get(lettre) ?? []), m]);
  }
  const lettres = [...parLettre.keys()].sort();
  const compte = new Map<string, number>();
  for (const m of mots) compte.set(m.mot, (compte.get(m.mot) ?? 0) + 1);
  return (
    <div className="page-mot">
      <Bandeau racine={racine} />
      <main className="page-mot__corps">
        <h1 className="page-mots__titre">Tous les mots</h1>
        <nav className="page-mots__lettres" aria-label="Lettres">
          {lettres.map((l) => <a key={l} href={`#${l}`}>{l}</a>)}
        </nav>
        {lettres.map((l) => <section key={l} className="page-mots__section" id={l}>
          <h2>{l}</h2>
          <ul>
            {parLettre.get(l)!.map((m) => <li key={m.adresse}>
              <a href={`${racine}mot/${m.adresse}/`}>{m.mot}</a>{compte.get(m.mot)! > 1 ? <span className="page-mots__nature"> ({NATURE[m.type]})</span> : null}
            </li>)}
          </ul>
        </section>)}
      </main>
      <Pied racine={racine} />
    </div>
  );
}
