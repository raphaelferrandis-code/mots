import { Carte } from '../composants/carte/Carte.tsx';
import { usePartie } from '../composants/usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { meilleureFinition } from '../jeu/sauvegarde.ts';
import { FINITIONS } from '../partage/types.ts';
import { Entete } from '../composants/Entete.tsx';
import { useChargement } from '../composants/useChargement.ts';
import { lien } from '../navigation/routes.ts';
import { chargerCarte, chargerDetails } from '../services/cartes.ts';

async function chargerFiche(id: string) {
  const [carte, details] = await Promise.all([chargerCarte(id), chargerDetails(id)]);
  return carte && details ? { carte, details } : null;
}

const enToutesLettres = (date: number): string => new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const pageDuWiktionnaire = (mot: string): string => `https://fr.wiktionary.org/wiki/${encodeURIComponent(mot)}`;

export function FicheCarte({ id }: { id: string }) {
  const fiche = useChargement(() => chargerFiche(id), id);
  const partie = usePartie();

  if (fiche.etat === 'en cours') return <main className="ecran"><p className="texte-doux">Chargement de la fiche…</p></main>;
  if (fiche.etat === 'erreur') return <main className="ecran"><p role="alert">La fiche n'a pas pu être chargée. {fiche.message}</p></main>;
  if (!fiche.donnees) {
    return (
      <main className="ecran">
        <Entete titre="Carte introuvable">Cette carte ne fait pas partie de l'édition en cours.</Entete>
        <a className="bouton" href={lien({ ecran: 'accueil' })}>Retour à l'accueil</a>
      </main>
    );
  }

  const { carte, details } = fiche.donnees;
  const possedee = partie.etat === 'prete' ? partie.sauvegarde.cartes[carte.id] : undefined;
  return (
    <main className="ecran">
      <article className="fiche">
        <Entete surtitre={`${carte.type} · ${carte.faction}`} titre={carte.mot} />
        <div className="fiche__carte"><Carte carte={carte} finition={possedee ? meilleureFinition(possedee) : 'Normale'} maitriseeLe={possedee?.maitriseeLe ?? null} cliquable={false} /></div>
        {carte.record && <p className="fiche__record"><strong>Hors-série.</strong> {carte.record}.</p>}

        <section className="bloc">
          <h2>Dans ton album</h2>
          {possedee ? (
            <p>
              Obtenu le {enToutesLettres(possedee.obtenueLe)}.{' '}
              {carte.rarete === 'Hors-série'
                ? 'Hors-série : finition unique.'
                : <>Finitions : {FINITIONS.map((f) => `${f.toLowerCase()} ${(possedee.finitions[f] ?? 0) > 0 ? '✓' : '—'}`).join(' · ')}.</>}
            </p>
          ) : <p className="texte-doux">Tu ne possèdes pas encore ce timbre.</p>}
          {possedee && (
            <p>
              {possedee.maitriseeLe !== null
                ? <><strong>Mot maîtrisé</strong> le {enToutesLettres(possedee.maitriseeLe)} : {possedee.reussites} bonnes réponses en duel.</>
                : <>Maîtrise : {possedee.reussites} / {EQUILIBRAGE.duel.reussitesPourLaMaitrise} bonnes réponses en duel.</>}
            </p>
          )}
        </section>

        <section className="bloc">
          <h2>{details.definitions.length > 1 ? 'Définitions' : 'Définition'}</h2>
          <ol className="definitions">
            {details.definitions.map((definition) => (
              <li key={definition.texte}>
                {definition.registre?.map((r) => <em key={r} className="texte-doux">({r.toLowerCase()}) </em>)}
                {definition.texte}
              </li>
            ))}
          </ol>
        </section>

        <section className="bloc">
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
      </article>
    </main>
  );
}
