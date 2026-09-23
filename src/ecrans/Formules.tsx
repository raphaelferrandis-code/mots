// La version payante (décision n° 34, offre arrêtée le 22 septembre 2026) : ce que donne chaque formule.
// Rien ne s'achète encore — aucun prestataire de paiement n'est branché, et plusieurs points doivent être réglés
// avant le premier euro (BRIEF-version-payante.md). L'écran dit donc ce qui viendra, sans faire semblant.

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Carte } from '../composants/carte/Carte.tsx';
import { PaquetScelle } from '../composants/paquet/PaquetScelle.tsx';
import { useChargement } from '../composants/useChargement.ts';
import { chargerEdition } from '../services/cartes.ts';
import './formules.css';
import { usePartie } from '../composants/usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { ETAGES, abonnementActif, nomDeLaFormule, peutPayer, prixEnClair } from '../jeu/formule.ts';
import type { Formule } from '../jeu/formule.ts';
import { lien } from '../navigation/routes.ts';
import { declarerMonAge } from '../services/partie.ts';

const AGE = EQUILIBRAGE.payant.ageMinimumPourPayer;
const anneeActuelle = (): number => new Date().getFullYear();

export function Formules() {
  const partie = usePartie();
  const edition = useChargement(chargerEdition, 'edition');
  const specimens = edition.etat === 'pret' ? ['oiseau-nom', 'amour-nom', 'hapax-nom'].flatMap(id => edition.donnees.cartes.filter(c => c.id === id)) : [];
  const formule: Formule | null = partie.etat === 'prete' ? partie.compte?.formule ?? null : null;
  const enCours = formule ? nomDeLaFormule(formule) : null;
  const surLeServeur = partie.etat === 'prete' && partie.serveur.etat !== 'appareil';

  return (
    <main className="ecran formules">
      <header className="offres-intro">
        <p className="offres-kicker">Le plaisir de collectionner</p>
        <h1>Un peu plus de <em>merveille.</em></h1>
        <p>Des mots rares. Un album à ton image. Et le plaisir de découvrir ce que réserve le prochain paquet.</p>
        <div className="offres-ouverture">✧ Deux offres à venir <span>·</span> Paiement non ouvert</div>
      </header>
      {enCours && <p className="offres-actuelle" role="status">Ta formule en cours : <strong>{enCours}</strong></p>}
      <section className="offres-vitrine" aria-label="Les deux formules">
        {ETAGES.map((etage, index) => {
          const album = index === 0;
          const active = formule !== null && (album ? formule.achatUnique : abonnementActif(formule));
          return <article className="offre-ecrin" data-offre={album ? 'album' : 'collectionneur'} key={etage.cle}>
            <div className="offre-scene" aria-hidden="true">
              <div className="offre-orbite" />
              <div className="offre-paillettes">{Array.from({length: 9}, (_, i) => <i key={i} style={{left: ((i * 37 + 9) % 90) + '%', top: ((i * 23 + 12) % 86) + '%', animationDelay: (i * .37) + 's'}}>✦</i>)}</div>
              {album ? <div className="offre-eventail">{specimens.map(c => <div className="offre-specimen" key={c.id}><Carte carte={c} cliquable={false} /></div>)}</div>
                : <div className="offre-paquet"><div className="offre-paquet__second"><PaquetScelle /></div><div className="offre-paquet__premier"><PaquetScelle /></div><span className="offre-sceau">Épique<small>ou mieux</small><b>✧</b></span></div>}
              <span className="offre-legende">{album ? 'L’éclat des Hors-série' : 'Ton rendez-vous avec la découverte'}</span>
            </div>
            <div className="offre-contenu">
              <p className="offres-kicker">{album ? 'À garder pour toujours' : 'Le plaisir, chaque semaine'}</p>
              <div className="offre-titre"><h2>{etage.nom}</h2>{active && <span className="offre-active">Activé</span>}</div>
              <p className="offre-promesse">{album ? 'Un album qui te ressemble. Une rareté à découvrir.' : 'Ouvre plus souvent. Collectionne plus loin.'}</p>
              <p className="offre-prix">{prixEnClair(etage)}<small>Tarif envisagé</small></p>
              <ul className="offre-avantages">{etage.avantages.map(avantage => <li key={avantage}><span aria-hidden="true">✧</span><span>{avantage}</span></li>)}</ul>
              <a className="offre-decouvrir" href={lien({ ecran: album ? 'profil' : 'paquet' })}>{album ? 'Découvrir les cosmétiques' : 'Retrouver mes paquets'} <span aria-hidden="true">↗</span></a>
              <p className="offre-note">{album ? 'Cartes illustrées à titre d’exemple, une seule reçue. Finition non garantie.' : 'L’abonnement seul ne débloque pas les cosmétiques premium.'}</p>
            </div>
          </article>;
        })}
      </section>
      <section className="offres-transparence" aria-labelledby="offres-details">
        <div><p className="offres-kicker">La surprise, en toute clarté</p><h2 id="offres-details">De belles cartes.<br />Des règles transparentes.</h2><p>Deux offres indépendantes, qui peuvent se cumuler. Aucun achat possible pour le moment.</p></div>
        <div className="offres-probabilites"><h3>La dernière carte du paquet hebdomadaire</h3><div className="offres-chances">{Object.entries(EQUILIBRAGE.payant.dernierEmplacementHebdomadaire).map(([rarete, chance]) => <div key={rarete}><strong>{chance}<small> %</small></strong><span>{rarete}</span></div>)}</div><p>Les quatre premières cartes suivent les probabilités habituelles. La garantie de Légendaire des paquets ordinaires reste séparée.</p></div>
      </section>
      <section className="offres-questions" aria-label="Les détails des offres">
        <details><summary>Et si je possède déjà la carte ?</summary><p>Le tirage peut donner un doublon, converti en Encre selon les règles habituelles. L’Encre est réservée aux enchères.</p></details>
        <details><summary>Que reste-t-il à la fin de l’abonnement ?</summary><p>Tes cartes, ton XP, les paquets en réserve et les droits hebdomadaires déjà acquis sont conservés. Le rythme et le plafond de recharge redeviennent ceux du jeu gratuit.</p></details>
        <details><summary>Quel avantage en duel ?</summary><p>Les offres accélèrent la collection et peuvent donner un avantage en duel, particulièrement au début. Répondre correctement reste nécessaire. Tout le jeu reste accessible gratuitement, sans publicité.</p></details>
      </section>
      {surLeServeur && formule && <details className="offres-age"><summary>Âge et futurs achats</summary><Age formule={formule} /></details>}
      <footer className="offres-pied"><span>Sans publicité. Le jeu reste ouvert à tous.</span><a href="mailto:contact@philamots.fr">Une question ? Écris-nous ↗</a></footer>
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
