// La devinette du jour, sur l'accueil : la même que sur les réseaux sociaux, mais la réponse vient tout de suite, et
// les bonnes réponses d'affilée font une série. Rien ne s'affiche tant que le calendrier n'a pas de premier jour
// (npm run motdujour:dater), sauf en développement.

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ESSAIS_POUR_LE_MOT, bonMot, jourAParis, rangDuJour, repondre, serieEnCours, venuDe } from '../../jeu/devinette.ts';
import type { Devinette, Serie } from '../../jeu/devinette.ts';
import { chargerLesDevinettes, pageDuTimbre } from '../../services/cartes.ts';
import { ecrireLaSerie, lireLaSerie } from '../../services/devinette.ts';
import { useChargement } from '../useChargement.ts';

const LETTRES = ['A', 'B', 'C', 'D'];
const NATURE: Record<string, string> = { Nom: 'nom', Verbe: 'verbe', Adjectif: 'adjectif', Adverbe: 'adverbe' };

export function DevinetteDuJour() {
  const devinettes = useChargement(chargerLesDevinettes, 'devinettes');
  const [serie, setSerie] = useState<Serie>(lireLaSerie);
  const aujourdhui = jourAParis(Date.now());
  if (devinettes.etat !== 'pret') return null;
  // En développement, sans premier jour, la devinette démarre aujourd'hui ; « ?devinette=5 » dans l'adresse montre
  // celle du 6e jour.
  const decalage = import.meta.env.DEV ? Number(new URLSearchParams(location.search).get('devinette') ?? 0) : 0;
  const debut = devinettes.donnees.debut ?? (import.meta.env.DEV ? new Date(Date.parse(`${aujourdhui}T12:00:00Z`) - decalage * 86_400_000).toISOString().slice(0, 10) : null);
  const rang = rangDuJour(debut, aujourdhui, devinettes.donnees.jours.length);
  if (rang === null) return null;
  const devinette = devinettes.donnees.jours[rang];
  const dejaRepondu = serie.jour === aujourdhui;

  const conclure = (juste: boolean, choix: string): void => {
    const suivante = repondre(serie, aujourdhui, juste, choix);
    ecrireLaSerie(suivante);
    setSerie(suivante);
  };
  const enCours = serieEnCours(serie, aujourdhui);

  return (
    <section className="comptoir-bas devinette" aria-labelledby="titre-devinette">
      <div className="devinette__tete">
        <h2 id="titre-devinette">La devinette du jour</h2>
        {enCours > 0 && <p className="devinette__serie">Série <b>{enCours}</b></p>}
      </div>
      {devinette.format === 'definition'
        ? <QuelleDefinition devinette={devinette} choix={dejaRepondu ? serie.choix : null} onRepondre={conclure} />
        : <QuelMot devinette={devinette} trouve={dejaRepondu ? serie.juste : null} onRepondre={conclure} />}
      {dejaRepondu && <Suite id={devinette.id} juste={serie.juste} />}
    </section>
  );
}

function QuelleDefinition({ devinette, choix, onRepondre }: { devinette: Extract<Devinette, { format: 'definition' }>; choix: string | null; onRepondre: (juste: boolean, choix: string) => void }) {
  const repondu = choix !== null;
  return <>
    <p className="devinette__mot">{devinette.mot}</p>
    <p className="devinette__consigne">Que veut dire ce mot ?</p>
    <ol className="devinette__propositions">
      {devinette.propositions.map((p, i) => {
        const etat = !repondu ? '' : i === devinette.bonne ? 'juste' : LETTRES[i] === choix ? 'faux' : 'eteint';
        return <li key={i}>
          <button type="button" className={`devinette__proposition ${etat}`} disabled={repondu} onClick={() => onRepondre(i === devinette.bonne, LETTRES[i])}>
            <b aria-hidden="true">{LETTRES[i]}</b><span>{p}</span>
          </button>
        </li>;
      })}
    </ol>
  </>;
}

function QuelMot({ devinette, trouve, onRepondre }: { devinette: Extract<Devinette, { format: 'mot' }>; trouve: boolean | null; onRepondre: (juste: boolean, choix: string) => void }) {
  const [saisie, setSaisie] = useState('');
  const [essais, setEssais] = useState(0);
  const [rate, setRate] = useState(false);
  useEffect(() => { setRate(false); }, [saisie]);
  const devoile = trouve !== null;
  const lettres = [...devinette.mot.replace(/[-\s']/g, '')];

  const valider = (e: FormEvent): void => {
    e.preventDefault();
    if (!saisie.trim()) return;
    if (bonMot(saisie, devinette.mot)) { onRepondre(true, saisie.trim()); return; }
    const faits = essais + 1;
    setEssais(faits);
    setRate(true);
    if (faits >= ESSAIS_POUR_LE_MOT) onRepondre(false, saisie.trim());
  };

  return <>
    <p className="devinette__cases" aria-hidden="true">
      {lettres.map((l, i) => <i key={i}>{devoile || i === 0 ? l.toUpperCase() : ''}</i>)}
    </p>
    {devoile && <p className="devinette__mot">{devinette.mot}</p>}
    <p className="devinette__indice">« {devinette.definition} »</p>
    <p className="devinette__aide">{NATURE[devinette.nature]} · {devinette.lettres} lettres · commence par {devinette.initiale} · {venuDe(devinette.origine)}</p>
    {!devoile && <form className="devinette__formulaire" onSubmit={valider}>
      <label className="visuellement-cache" htmlFor="devinette-saisie">Ta réponse</label>
      <input id="devinette-saisie" value={saisie} onChange={(e) => setSaisie(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={40} />
      <button type="submit" className="btn-secondary">Valider</button>
      <span className="devinette__essais" role="status">{rate ? `Non. ${ESSAIS_POUR_LE_MOT - essais} essai${ESSAIS_POUR_LE_MOT - essais > 1 ? 's' : ''} restant${ESSAIS_POUR_LE_MOT - essais > 1 ? 's' : ''}.` : ''}</span>
    </form>}
  </>;
}

// Après la réponse : le verdict, la page du mot, et rendez-vous demain.
function Suite({ id, juste }: { id: string; juste: boolean }) {
  const page = useChargement(() => pageDuTimbre(id), `page:${id}`);
  return (
    <p className="devinette__verdict" role="status">
      <span>{juste ? 'Bien vu.' : 'Raté.'} Nouvelle devinette demain.</span>
      {page.etat === 'pret' && page.donnees && <a className="comptoir__lien" href={page.donnees} target="_blank" rel="noreferrer">La page du mot</a>}
    </p>
  );
}
