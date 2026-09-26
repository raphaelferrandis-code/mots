import { useState } from 'react';
import { TimbreManipulable } from '../composants/carte/TimbreManipulable.tsx';
import { ChoixFinition } from '../composants/carte/ChoixFinition.tsx';
import { CoteDuTimbre } from '../composants/CoteDuTimbre.tsx';
import { MiseEnVente } from '../composants/MiseEnVente.tsx';
import { usePartie } from '../composants/usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { histoireDesPrix } from '../jeu/formule.ts';
import type { Enchere } from '../jeu/marche.ts';
import { meilleureFinition } from '../jeu/sauvegarde.ts';
import type { Finition } from '../partage/types.ts';
import { ErreurDeChargement } from '../composants/ErreurDeChargement.tsx';
import { Entete } from '../composants/Entete.tsx';
import { useChargement } from '../composants/useChargement.ts';
import { lien } from '../navigation/routes.ts';
import { chargerCarte, chargerDetails, pageDuTimbre } from '../services/cartes.ts';
import { partagerLeTimbre } from '../services/partage.ts';
import { lireLesCotes } from '../services/partie.ts';
import { messageDe } from '../partage/messages.ts';

async function chargerFiche(id: string) {
  const [carte, details, page] = await Promise.all([chargerCarte(id), chargerDetails(id), pageDuTimbre(id)]);
  return carte && details ? { carte, details, page } : null;
}

const enToutesLettres = (date: number): string => new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const enDateEtHeure = (date: number): string => new Date(date).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const pageDuWiktionnaire = (mot: string): string => `https://fr.wiktionary.org/wiki/${encodeURIComponent(mot)}`;

type Partage = { etat: 'repos' } | { etat: 'en cours' } | { etat: 'fait'; message: string } | { etat: 'erreur'; message: string };

export function FicheCarte({ id }: { id: string }) {
  const fiche = useChargement(() => chargerFiche(id), id);
  const partie = usePartie();
  const [partage, setPartage] = useState<Partage>({ etat: 'repos' });
  const [exemplaire, setExemplaire] = useState<{ id: string; finition: Finition } | null>(null);
  const [vente, setVente] = useState<Enchere | null>(null); // le timbre vient d'être mis en vente depuis cette fiche
  const marcheOuvert = partie.etat === 'prete' && partie.serveur.etat !== 'appareil';
  const payant = partie.etat === 'prete' && partie.compte !== null && histoireDesPrix(partie.compte.formule);
  // La cote du timbre (décision n° 38), dès que le marché est ouvert et la fiche connue.
  const cotes = useChargement(async () => (marcheOuvert && fiche.etat === 'pret' && fiche.donnees ? lireLesCotes(id) : null), `cotes:${id}:${marcheOuvert}:${fiche.etat}`);

  if (fiche.etat === 'en cours') return <main className="ecran"><p className="texte-doux">Chargement de la fiche…</p></main>;
  if (fiche.etat === 'erreur') return <main className="ecran"><h1 className="visuellement-cache">Fiche du timbre</h1><ErreurDeChargement quoi="La fiche de ce timbre" feminin reessayer={fiche.relancer} /></main>;
  if (!fiche.donnees) {
    return (
      <main className="ecran">
        <Entete titre="Timbre introuvable">Ce timbre ne fait pas partie de l’édition en cours.</Entete>
        <a className="bouton" href={lien({ ecran: 'accueil' })}>Retour à l’accueil</a>
      </main>
    );
  }

  const { carte, details, page } = fiche.donnees;
  const possedee = partie.etat === 'prete' ? partie.sauvegarde.cartes[carte.id] : undefined;
  const finition = possedee && exemplaire?.id === carte.id && (possedee.finitions[exemplaire.finition] ?? 0) > 0
    ? exemplaire.finition : possedee ? meilleureFinition(possedee) : 'Normale';
  const dansLeDeck = partie.etat === 'prete' && partie.sauvegarde.deck.includes(carte.id);

  // L'image du timbre, telle qu'on la voit ici, part vers la feuille de partage du téléphone, ou se télécharge.
  const partager = async (): Promise<void> => {
    setPartage({ etat: 'en cours' });
    try {
      const issue = await partagerLeTimbre(carte, page, { finition, maitriseeLe: possedee?.maitriseeLe ?? null, obtenuLe: possedee?.obtenueLe ?? null });
      setPartage(issue === 'telecharge' ? { etat: 'fait', message: "L'image du timbre est enregistrée sur cet appareil." } : { etat: 'repos' });
    } catch (erreur) {
      setPartage({ etat: 'erreur', message: messageDe(erreur) });
    }
  };

  return (
    <main className="ecran">
      <article className="fiche">
        <Entete surtitre={`${carte.type} · ${carte.faction}`} titre={carte.mot} />
        <div className="fiche__visuel">
          <div className="fiche__carte"><TimbreManipulable key={carte.id} carte={carte} finition={finition} maitriseeLe={possedee?.maitriseeLe ?? null} obtenuLe={possedee?.obtenueLe ?? null} /></div>
          {possedee && carte.rarete !== 'Hors-série' && <ChoixFinition finitions={possedee.finitions} choisie={finition} indisponible={partage.etat === 'en cours'} onChoisir={(f) => { setExemplaire({ id: carte.id, finition: f }); setPartage({ etat: 'repos' }); }} />}
          {carte.record && <p className="fiche__record"><strong>Hors-série.</strong> {carte.record}.</p>}
          {possedee && (
            <div className="fiche__partage">
              <button type="button" className="bouton bouton--discret" disabled={partage.etat === 'en cours'} onClick={() => void partager()}>
                {partage.etat === 'en cours' ? 'Préparation de l’image…' : 'Partager ce timbre'}
              </button>
              {partage.etat === 'fait' && <p className="texte-doux petit" role="status">{partage.message}</p>}
              {partage.etat === 'erreur' && <p className="joute__refus" role="alert">{partage.message}</p>}
            </div>
          )}
        </div>

        <div className="fiche__contenu">
          <section className="rubrique">
            <h2>Dans ton album</h2>
            {possedee ? (
              <p>
                Obtenu le {enToutesLettres(possedee.obtenueLe)}.{' '}
                {carte.rarete === 'Hors-série' && 'Hors-série : finition unique.'}
              </p>
            ) : <p className="texte-doux">{vente ? 'Ton exemplaire est en vente sur le marché.' : 'Tu ne possèdes pas encore ce timbre.'}</p>}
            {possedee && (
              <p>
                {possedee.maitriseeLe !== null
                  ? <><strong>Mot maîtrisé</strong> le {enToutesLettres(possedee.maitriseeLe)} : {possedee.reussites} bonnes réponses en duel.</>
                  : <>Maîtrise : {possedee.reussites} / {EQUILIBRAGE.duel.reussitesPourLaMaitrise} bonnes réponses en duel.</>}
              </p>
            )}
          </section>

          {marcheOuvert && (
            <section className="rubrique">
              <h2>Sur le marché</h2>
              <CoteDuTimbre carte={carte.id} cotes={cotes} payant={payant} />
            </section>
          )}

          {marcheOuvert && (vente || possedee) && (
            <section className="rubrique">
              <h2>{vente ? 'En vente sur le marché' : 'Vendre ce timbre'}</h2>
              {vente && (
                <p role="status">
                  « {carte.mot} » est en vente jusqu'au {enDateEtHeure(vente.fermeLe)}. <a href={lien({ ecran: 'marche' })}>Suivre la vente sur le marché</a>
                </p>
              )}
              {vente && possedee && <div className="rangee-de-boutons"><button type="button" className="bouton bouton--discret" onClick={() => setVente(null)}>Vendre un autre exemplaire</button></div>}
              {!vente && possedee && <MiseEnVente carte={carte} possedee={possedee} dansLeDeck={dansLeDeck} cotes={cotes.etat === 'pret' ? cotes.donnees : null} onVendu={setVente} />}
            </section>
          )}

          <section className="rubrique">
            <h2>{details.definitions.length > 1 ? 'Définitions' : 'Définition'}</h2>
            <ol className="definitions">
              {details.definitions.map((definition) => (
                <li key={definition.texte}>
                  {definition.registre?.map((r) => <em key={r} className="texte-doux">({r.toLowerCase()}) </em>)}
                  {definition.texte}
                </li>
              ))}
            </ol>
            {page && <p className="petit"><a href={page} target="_blank" rel="noreferrer">Toutes les définitions</a></p>}
          </section>

          <section className="rubrique">
            <h2>Origine</h2>
            <p>{details.etymologie || 'Le Wiktionnaire ne donne pas l\'étymologie de ce mot.'}</p>
            <dl className="donnees">
              {details.attestation && (<><dt>Attesté depuis</dt><dd>{details.attestation}</dd></>)}
              {details.prevalence !== null && (<><dt>Connu de</dt><dd>{details.prevalence} % des gens interrogés</dd></>)}
              <dt>Fréquence</dt>
              <dd>{details.frequence.toLocaleString('fr-FR')} fois par million de mots</dd>
            </dl>
          </section>

          <p className="texte-doux petit">
            Définitions et étymologie adaptées du <a href={pageDuWiktionnaire(carte.mot)} target="_blank" rel="noreferrer">Wiktionnaire, page « {carte.mot} »</a> (licence CC BY-SA 4.0).
            Fréquence et prévalence : Lexique 4.
          </p>
        </div>
      </article>
    </main>
  );
}
