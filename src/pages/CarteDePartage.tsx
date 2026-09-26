// Les images de la devinette du jour, pour les réseaux sociaux : 1080 × 1350 (format portrait d'Instagram, qui passe
// aussi sur Facebook et Bluesky). Fabriquées en HTML comme les pages par mot (dist/partage/question/<adresse>/ et
// dist/partage/reponse/<adresse>/), puis prises en photo par scripts/photographier-les-cartes.ts.
// Chaque jour, un post : la question du jour, et la réponse de celle de la veille.

import { Timbre } from '../composants/timbre/Timbre.tsx';
import type { Devinette } from '../jeu/devinette.ts';
import { bonneDefinition, venuDe } from '../jeu/devinette.ts';
import type { CarteDetails, CarteIndex } from '../partage/types.ts';

const NATURE: Record<CarteIndex['type'], string> = { Nom: 'nom', Verbe: 'verbe', Adjectif: 'adjectif', Adverbe: 'adverbe' };
const LETTRES = ['A', 'B', 'C', 'D'];
function Pied({ invitation }: { invitation?: boolean }) {
  return <>
    {invitation && <p className="carte-partage__invitation">Ta réponse en commentaire · solution demain, ou tout de suite sur philamots.fr</p>}
    <p className="carte-partage__pied"><img src="../../../identite/philamots-clair.svg" alt="Philamots" width="190" height="45" /><span>philamots.fr</span></p>
  </>;
}

// La réponse : le timbre, le mot, son origine et la définition que la devinette avait retenue.
export function CarteReponse({ carte, details, devinette }: { carte: CarteIndex; details: CarteDetails; devinette: Devinette }) {
  const origine = [NATURE[carte.type], details.langueOrigine, details.attestation].filter(Boolean).join(' · ');
  return (
    <div className="carte-partage">
      <p className="carte-partage__surtitre">La réponse d’hier</p>
      <div className="carte-partage__timbre"><Timbre carte={carte} cliquable={false} reagir={false} /></div>
      <h1 className={`carte-partage__mot ${carte.mot.length > 12 ? 'carte-partage__mot--long' : ''}`}>{carte.mot}</h1>
      <p className="carte-partage__origine">{origine}</p>
      <p className="carte-partage__definition">{bonneDefinition(devinette)}</p>
      <Pied />
    </div>
  );
}

// La question : le mot et quatre définitions, ou la définition et le mot à trouver (timbre face cachée).
export function CarteQuestion({ carte, devinette }: { carte: CarteIndex; devinette: Devinette }) {
  if (devinette.format === 'definition') {
    return (
      <div className="carte-partage carte-partage--question">
        <p className="carte-partage__surtitre">La devinette du jour</p>
        <div className="carte-partage__timbre carte-partage__timbre--petit"><Timbre carte={carte} cliquable={false} reagir={false} /></div>
        <h1 className={`carte-partage__mot ${carte.mot.length > 12 ? 'carte-partage__mot--long' : ''}`}>{carte.mot}</h1>
        <p className="carte-partage__consigne">Que veut dire ce mot ?</p>
        <ol className="carte-partage__propositions">
          {devinette.propositions.map((p, i) => <li key={i}><b>{LETTRES[i]}</b><span>{p}</span></li>)}
        </ol>
        <Pied invitation />
      </div>
    );
  }
  return (
    <div className="carte-partage carte-partage--question">
      <p className="carte-partage__surtitre">La devinette du jour</p>
      <div className="carte-partage__timbre carte-partage__timbre--petit"><Timbre carte={carte} verso montrerVerso dosRenseigne cliquable={false} reagir={false} /></div>
      <p className="carte-partage__consigne">Quel est ce mot ?</p>
      <p className="carte-partage__cases" aria-label={`${devinette.lettres} lettres, commence par ${devinette.initiale}`}>
        {Array.from({ length: devinette.lettres }, (_, i) => <i key={i} className={devinette.lettres > 12 ? 'serre' : undefined}>{i === 0 ? devinette.initiale : ''}</i>)}
      </p>
      <p className="carte-partage__definition carte-partage__definition--indice">« {devinette.definition} »</p>
      <p className="carte-partage__origine">{NATURE[devinette.nature]} · {devinette.lettres} lettres · {venuDe(devinette.origine)}</p>
      <Pied invitation />
    </div>
  );
}
