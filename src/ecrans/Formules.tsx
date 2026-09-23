// La version payante (décision n° 34, offre arrêtée le 22 septembre 2026) : ce que donne chaque formule.
// Rien ne s'achète encore — aucun prestataire de paiement n'est branché, et plusieurs points doivent être réglés
// avant le premier euro (BRIEF-version-payante.md). L'écran dit donc ce qui viendra, sans faire semblant.

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Entete } from '../composants/Entete.tsx';
import { usePartie } from '../composants/usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { ETAGES, nomDeLaFormule, peutPayer, prixEnClair } from '../jeu/formule.ts';
import type { Formule } from '../jeu/formule.ts';
import { lien } from '../navigation/routes.ts';
import { declarerMonAge } from '../services/partie.ts';

const AGE = EQUILIBRAGE.payant.ageMinimumPourPayer;
const anneeActuelle = (): number => new Date().getFullYear();

export function Formules() {
  const partie = usePartie();
  const formule: Formule | null = partie.etat === 'prete' ? partie.compte?.formule ?? null : null;
  const enCours = formule ? nomDeLaFormule(formule) : null;
  const surLeServeur = partie.etat === 'prete' && partie.serveur.etat !== 'appareil';

  return (
    <main className="ecran formules">
      <Entete titre="La version payante" />

      <section className="rubrique">
        <p className="bloc bloc--a-venir">
          <strong>Le paiement n'est pas encore ouvert.</strong>
        </p>
      </section>

      {enCours && (
        <section className="rubrique">
          <p role="status">Ta formule en cours : <strong>{enCours}</strong>.</p>
        </section>
      )}

      <section className="rubrique" aria-label="Les formules">
        <ol className="formules__liste">
          {ETAGES.map((etage, rang) => (
            <li key={etage.cle} className="formule" data-en-cours={formule !== null && formule.niveau === etage.niveau}>
              <div className="formule__entete">
                <h2>{etage.nom}</h2>
                <p className="formule__prix">{prixEnClair(etage)}</p>
              </div>
              {rang > 0 && <p className="texte-doux petit">Tout ce que donne « {ETAGES[rang - 1].nom} », et&nbsp;:</p>}
              <ul className="regles">
                {etage.avantages.map((avantage) => <li key={avantage}>{avantage}</li>)}
              </ul>
            </li>
          ))}
        </ol>
        <p className="texte-doux petit">
          L’Encre sert aux enchères et aux personnalisations. La vente d’Encre n’est pas ouverte.
        </p>
      </section>

      {surLeServeur && formule && <Age formule={formule} />}

      <section className="rubrique">
        <h2>Ce qui ne changera pas</h2>
        <ul className="regles">
          <li>Aucune publicité, dans aucune formule. Le jeu n'en affiche pas et n'en affichera pas.</li>
          <li>Payer n'aide pas à retrouver une définition. Les duels et les joutes se gagnent en connaissant les mots.</li>
          <li>Tout le jeu reste accessible sans payer : les 3 000 timbres, les duels, les joutes, le marché.</li>
        </ul>
        <p className="texte-doux petit">
          <a href={lien({ ecran: 'confidentialite' })}>Confidentialité</a>
        </p>
      </section>
    </main>
  );
}

// L'âge : demandé ici seulement, parce que le paiement sera réservé aux majeurs. On ne garde que l'année.
function Age({ formule }: { formule: Formule }) {
  const [saisie, setSaisie] = useState('');
  const [etat, setEtat] = useState<{ etat: 'repos' | 'en cours' } | { etat: 'erreur'; message: string }>({ etat: 'repos' });
  const annee = anneeActuelle();
  const majeur = peutPayer(formule, annee);

  const envoyer = async (evenement: FormEvent): Promise<void> => {
    evenement.preventDefault();
    const valeur = Number(saisie);
    if (!Number.isInteger(valeur) || valeur < annee - 120 || valeur > annee) {
      setEtat({ etat: 'erreur', message: 'Cette année de naissance n’est pas possible.' });
      return;
    }
    setEtat({ etat: 'en cours' });
    try {
      await declarerMonAge(valeur);
      setEtat({ etat: 'repos' });
    } catch (erreur) {
      setEtat({ etat: 'erreur', message: erreur instanceof Error ? erreur.message : String(erreur) });
    }
  };

  if (formule.anneeDeNaissance !== null) {
    return (
      <section className="rubrique">
        <h2>Ton âge</h2>
        <p className="petit">
          Tu as déclaré être né en {formule.anneeDeNaissance}.{' '}
          {majeur ? 'Tu pourras payer le jour où le paiement ouvrira.' : `Le paiement est réservé aux ${AGE} ans et plus : tout le reste du jeu t'est ouvert.`}
        </p>
      </section>
    );
  }

  return (
    <section className="rubrique">
      <h2>Ton âge</h2>
      <p className="texte-doux petit">
        Le paiement sera réservé aux {AGE} ans et plus. Le jeu ne demande que l'année, et seulement ici : un joueur
        qui ne veut rien payer n'a pas à la donner.
      </p>
      <form className="joute__saisie" onSubmit={(e) => void envoyer(e)}>
        <label htmlFor="annee-de-naissance"><strong>Année de naissance</strong></label>
        <input id="annee-de-naissance" type="number" inputMode="numeric" min={annee - 120} max={annee} value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="1990" />
        {etat.etat === 'erreur' && <p className="joute__refus" role="alert">{etat.message}</p>}
        <div className="rangee-de-boutons">
          <button type="submit" className="bouton" disabled={etat.etat === 'en cours'}>{etat.etat === 'en cours' ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </section>
  );
}
