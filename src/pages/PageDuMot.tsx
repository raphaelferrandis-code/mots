// Les pages par mot et la liste de tous les mots, fabriquées d'avance en HTML (scripts/fabriquer-les-pages.ts) :
// Google les lit sans lancer le jeu. Aucun code ne tourne dans le navigateur ; les liens mènent au jeu.
// Chemins relatifs : une page vit dans mot/<adresse>/, la liste dans mots/, le jeu deux niveaux plus haut.

import { Fragment } from 'react';
import { NIVEAU } from '../composants/carte/decor.ts';
import { Timbre } from '../composants/timbre/Timbre.tsx';
import { attaqueEnJeu, defenseEnJeu } from '../config/equilibrage.ts';
import type { TexteDUnePage } from '../partage/pagesDesMots.ts';
import type { CarteDetails, CarteIndex } from '../partage/types.ts';
import { attestationEnClair, avecLesRenvois } from './assemblage.ts';
import { Bandeau, Pied } from './Cadre.tsx';

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

export type Voisin = { carte: CarteIndex; adresse: string };

// Un texte du Wiktionnaire, dont les renvois (« → voir babiller ») mènent aux pages des mots qui en ont une — sauf à
// la page même (« soi »).
function Texte({ texte, liens, soi }: { texte: string; liens: ReadonlyMap<string, string>; soi: string }) {
  return <>{avecLesRenvois(texte, liens).map((m, i) => m.adresse && m.adresse !== soi ? <a key={i} href={`../${m.adresse}/`}>{m.texte}</a> : <Fragment key={i}>{m.texte}</Fragment>)}</>;
}

// adresse : celle de la page ; homographes : les autres pages du même mot, ou d'un mot qui s'écrit pareil sans accent
// (« beau » nom et adjectif, « sale » et « salé ») ; liens : un mot → l'adresse de sa page, pour les renvois.
export function PageDuMot({ carte, details, texte, voisins, adresse = '', homographes = [], liens = new Map() }: {
  carte: CarteIndex; details: CarteDetails; texte: TexteDUnePage | undefined; voisins: Voisin[]; adresse?: string; homographes?: Voisin[]; liens?: ReadonlyMap<string, string>;
}) {
  const racine = '../../';
  const definitions = texte?.definitions ?? details.definitions;
  const etymologies = texte?.etymologies.length ? texte.etymologies : details.etymologie ? [details.etymologie] : [];
  const wiktionnaire = `https://fr.wiktionary.org/wiki/${encodeURIComponent(carte.mot)}`;
  const attestation = attestationEnClair(details.attestation);
  return (
    <div className="page-mot">
      <Bandeau racine={racine} />
      <main className="page-mot__corps">
        <article className="page-mot__article">
          <div className="page-mot__timbre"><Timbre carte={carte} cliquable={false} reagir={false} /></div>

          <div className="page-mot__texte">
            <h1>{carte.mot}</h1>
            <p className="page-mot__nature">
              {NATURE[carte.type]}{details.langueOrigine ? ` · ${details.langueOrigine}` : ''}{attestation ? ` · ${attestation}` : ''}
            </p>
            {homographes.length > 0 && <p className="page-mot__aussi">
              Voir aussi : {homographes.map((h, i) => <Fragment key={h.carte.id}>{i > 0 ? ', ' : ''}<a href={`../${h.adresse}/`}>{h.carte.mot}</a> ({NATURE[h.carte.type]})</Fragment>)}
            </p>}
            <p className="page-mot__jeu">Un timbre de <a href={racine}>Philamots</a>, le jeu gratuit des mots à collectionner.</p>

            <h2>Définition{definitions.length > 1 ? 's' : ''}</h2>
            <ol className="page-mot__definitions">
              {definitions.map((d, i) => <li key={i}>
                {d.registre?.length ? <span className="page-mot__registre">{d.registre.join(', ')}. </span> : null}<Texte texte={d.texte} liens={liens} soi={adresse} />
              </li>)}
            </ol>
            {texte && texte.sens > definitions.length && <p className="page-mot__suite">
              <a href={wiktionnaire}>Les {texte.sens} sens sur le Wiktionnaire</a>
            </p>}

            {etymologies.length > 0 && <>
              <h2>Origine</h2>
              {etymologies.map((e, i) => <p key={i} className="page-mot__origine"><Texte texte={e} liens={liens} soi={adresse} /></p>)}
            </>}

            <dl className="page-mot__releve">
              {details.prevalence !== null && <div>
                <dt>Connu de</dt>
                <dd>{details.prevalence} % des gens interrogés</dd>
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
                <p>Attaque {attaqueEnJeu(carte.attaque, carte.rarete)} · Défense {defenseEnJeu(carte.defense, carte.rarete)} en duel</p>
              </div>
            </dl>
          </div>
        </article>

        <section className="page-mot__appel">
          <div className="page-mot__eventail" aria-hidden="true">
            {voisins.slice(0, 2).map((v) => <span key={v.carte.id} className="page-mot__vignette"><Timbre carte={v.carte} cliquable={false} reagir={false} /></span>)}
            <span className="page-mot__vignette"><Timbre carte={carte} cliquable={false} reagir={false} /></span>
          </div>
          <div className="page-mot__invitation">
            <p className="page-mot__accroche">Ce mot est un timbre à collectionner.</p>
            <p>
              Philamots est un jeu gratuit, sans inscription : plus de 3 000 vrais mots de la langue française, imprimés comme
              des timbres. Ouvre des paquets, complète ton album et défie d’autres joueurs en duels de définitions.
            </p>
          </div>
          <a className="btn-primary" href={`${racine}#/paquet`}>Ouvrir un paquet</a>
        </section>

        {voisins.length > 0 && <section className="page-mot__voisins">
          <h2>D’autres timbres « {carte.faction} »</h2>
          <ul>
            {voisins.map((v) => <li key={v.carte.id}>
              <a href={`../${v.adresse}/`}>
                {/* La légende nomme le timbre : le dessin, que les lecteurs d'écran liraient en double, se tait. */}
                <span className="page-mot__vignette" aria-hidden="true"><Timbre carte={v.carte} cliquable={false} reagir={false} /></span>
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
      <Pied racine={racine} actuelle="mots" />
    </div>
  );
}
