// La version payante (décision n° 34, offre arrêtée le 22 septembre 2026) : ce que donne chaque formule.
// Les achats sont fermés par défaut ; chaque environnement utilise sa propre fonction de paiement.

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Carte } from '../composants/carte/Carte.tsx';
import { PaquetScelle } from '../composants/paquet/PaquetScelle.tsx';
import { useChargement } from '../composants/useChargement.ts';
import { chargerEdition } from '../services/cartes.ts';
import './formules.css';
import { usePartie } from '../composants/usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { ETAGES, abonnementActif, nomDeLaFormule, peutPayer, prixEnClair } from '../jeu/formule.ts';
import type { Etage, Formule } from '../jeu/formule.ts';
import { lien } from '../navigation/routes.ts';
import { declarerMaNaissance } from '../services/partie.ts';
import { PaiementsTest } from '../composants/PaiementsTest.tsx';
import { paiement, paiementsDeTest, paiementsDisponibles } from '../services/paiements.ts';
import { useAchatsOuverts } from '../composants/useAchatsOuverts.ts';
import { messageDe } from '../partage/messages.ts';

const AGE = EQUILIBRAGE.payant.ageMinimumPourPayer;
const anneeActuelle = (): number => new Date().getFullYear();

export function Formules() {
  const achatsOuverts = useAchatsOuverts();
  const partie = usePartie();
  const [achat, setAchat] = useState<Etage | null>(null);
  const edition = useChargement(chargerEdition, 'edition');
  const specimens = edition.etat === 'pret' ? ['oiseau-nom', 'amour-nom', 'hapax-nom'].flatMap(id => edition.donnees.cartes.filter(c => c.id === id)) : [];
  const formule: Formule | null = partie.etat === 'prete' ? partie.compte?.formule ?? null : null;
  const enCours = formule ? nomDeLaFormule(formule) : null;

  return (
    <main className="ecran formules">
      <header className="offres-intro">
        <h1>Un peu plus de <em>merveille.</em></h1>
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
            </div>
            <div className="offre-contenu">
              <p className="offres-kicker">{album ? 'À garder pour toujours' : 'Le plaisir, chaque semaine'}</p>
              <div className="offre-titre"><h2>{etage.nom}</h2>{active && <span className="offre-active">Activé</span>}</div>
              <p className="offre-promesse">{album ? 'Un album qui te ressemble. Une rareté à découvrir.' : 'Ouvre plus souvent. Collectionne plus loin.'}</p>
              <div className="offre-details">
                <ul className="offre-avantages">{etage.avantages.map(avantage => <li key={avantage}><span aria-hidden="true">✧</span><span>{avantage}</span></li>)}</ul>
                <a className="offre-decouvrir" href={lien({ ecran: album ? 'profil' : 'paquet' })}>{album ? 'Découvrir les cosmétiques' : 'Retrouver mes paquets'} <span aria-hidden="true">↗</span></a>
                <p className="offre-note">{album ? 'Cartes illustrées à titre d’exemple, une seule reçue. Finition non garantie.' : 'L’abonnement seul ne débloque pas les cosmétiques premium.'}</p>
              </div>
              <div className="offre-achat">
                <p className="offre-prix">{prixEnClair(etage)}<small>{achatsOuverts && !paiementsDeTest ? (album ? 'Paiement unique' : 'Abonnement mensuel') : 'Tarif envisagé'}</small></p>
                <button type="button" className="offre-acheter" disabled={active} aria-label={`${achatsOuverts ? 'Acheter' : 'Découvrir'} ${etage.nom}`} onClick={() => setAchat(etage)}>
                  {!active && <span className="offre-acheter__eclat" aria-hidden="true">✧</span>}
                  <span>{active ? 'Déjà activé' : achatsOuverts ? 'Acheter' : 'Bientôt disponible'}</span>
                  {!active && <span className="offre-acheter__fleche" aria-hidden="true">↗</span>}
                </button>
              </div>
            </div>
          </article>;
        })}
      </section>
      <section className="offres-questions" aria-label="Les détails des offres">
        <details>
          <summary>La surprise, en toute clarté</summary>
          <div className="offres-transparence">
            <div><h2>De belles cartes.<br />Des règles transparentes.</h2><p>Deux offres indépendantes, qui peuvent se cumuler.{!achatsOuverts && ' Aucun achat possible pour le moment.'}</p></div>
            <div className="offres-probabilites"><h3>La dernière carte du paquet hebdomadaire</h3><div className="offres-chances">{Object.entries(EQUILIBRAGE.payant.dernierEmplacementHebdomadaire).map(([rarete, chance]) => <div key={rarete}><strong>{chance}<small> %</small></strong><span>{rarete}</span></div>)}</div><p>Les quatre premières cartes suivent les probabilités habituelles. La garantie de Légendaire des paquets ordinaires reste séparée.</p></div>
          </div>
        </details>
        <details><summary>Et si je possède déjà la carte ?</summary><p>Le tirage peut donner un doublon, converti en Encre selon les règles habituelles. L’Encre est réservée aux enchères.</p></details>
        <details><summary>Que reste-t-il à la fin de l’abonnement ?</summary><p>Tes cartes, ton XP, les paquets en réserve et les droits hebdomadaires déjà acquis sont conservés. Le rythme et le plafond de recharge redeviennent ceux du jeu gratuit.</p></details>
        <details><summary>Quel avantage en duel ?</summary><p>Les offres accélèrent la collection et peuvent donner un avantage en duel, particulièrement au début. Répondre correctement reste nécessaire. Tout le jeu reste accessible gratuitement, sans publicité.</p></details>
      </section>
      {paiementsDisponibles && <PaiementsTest />}
      {achat && <ConfirmationAchat offre={achat} achatsOuverts={achatsOuverts} fermer={() => setAchat(null)} />}
      <footer className="offres-pied"><span>Sans publicité. Le jeu reste ouvert à tous.</span><a href="mailto:contact@philamots.fr">Une question ? Écris-nous ↗</a></footer>
    </main>
  );
}

function ConfirmationAchat({ offre, achatsOuverts, fermer }: { offre: Etage; achatsOuverts: boolean; fermer: () => void }) {
  const dialogue = useRef<HTMLDialogElement>(null);
  const partie = usePartie();
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState('');
  const compte = partie.etat === 'prete' ? partie.compte : null;
  const surLeServeur = partie.etat === 'prete' && partie.serveur.etat !== 'appareil';
  const active = compte && (offre.cle === 'necessaire' ? compte.formule.achatUnique : abonnementActif(compte.formule));
  const pret = achatsOuverts && surLeServeur && compte && !!compte.codeDeSecoursLe && peutPayer(compte.formule) && !active;

  useEffect(() => {
    const element = dialogue.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  async function confirmer() {
    if (!pret || occupe) return;
    setOccupe(true);
    setMessage('');
    try { await paiement('achat', offre.cle); }
    catch (erreur) { setMessage(erreur instanceof Error ? erreur.message : 'Paiement indisponible.'); }
    finally { setOccupe(false); }
  }

  return <dialog className="offres-confirmation" ref={dialogue} aria-labelledby="confirmation-achat-titre" onCancel={e => { e.preventDefault(); if (!occupe) fermer(); }}>
    <p className="offres-kicker">{achatsOuverts ? 'Confirmer mon choix' : 'La formule'}</p>
    <h2 id="confirmation-achat-titre">{offre.nom}</h2>
    <p className="offre-prix">{prixEnClair(offre)}</p>
    <p className="petit">{paiementsDeTest ? 'Paiement de test : aucun argent réel ne sera encaissé.' : achatsOuverts ? (offre.cle === 'collectionneur' ? 'Abonnement à 4,99 € par mois, renouvelé automatiquement. Résiliation possible depuis « Gérer mon abonnement ».' : 'Paiement unique de 5,99 €. Le cadeau de bienvenue est attribué une seule fois par compte.') : 'Les achats ne sont pas encore ouverts.'}</p>
    {achatsOuverts && (surLeServeur && compte ? <>
      <Age formule={compte.formule} />
      {!compte.codeDeSecoursLe && <p className="petit">Avant l’achat, <a href={lien({ ecran: 'profil' })}>crée ton code de secours dans le Profil</a> pour protéger ta collection.</p>}
    </> : <p className="petit">Un compte connecté est nécessaire pour confirmer ton âge et accéder au paiement.</p>)}
    {active && <p role="status">Cette formule est déjà activée.</p>}
    {message && <p role="alert">{message}</p>}
    <div className="rangee-de-boutons">
      <button type="button" className="bouton" disabled={!pret || occupe} onClick={() => void confirmer()}>{occupe ? 'Ouverture…' : paiementsDeTest ? 'Confirmer l’achat de test' : achatsOuverts ? 'Continuer vers le paiement' : 'Achats bientôt disponibles'}</button>
      <button type="button" className="bouton" disabled={occupe} onClick={fermer}>Fermer</button>
    </div>
  </dialog>;
}

// L'âge n'est demandé qu'après le clic sur Acheter : le mois et l'année de naissance (décision du 25/09/2026), de quoi
// savoir précisément si le joueur a 18 ans. Rien d'autre n'est conservé, et la déclaration est définitive.
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function Age({ formule }: { formule: Formule }) {
  // Une ancienne déclaration de l'année seule : le serveur accepte qu'on la complète par le mois, avec la même année.
  const [annee, setAnnee] = useState(formule.anneeDeNaissance !== null ? String(formule.anneeDeNaissance) : '');
  const [mois, setMois] = useState('');
  const [etat, setEtat] = useState<{ etat: 'repos' | 'en cours' } | { etat: 'erreur'; message: string }>({ etat: 'repos' });
  const cetteAnnee = anneeActuelle();
  const majeur = peutPayer(formule);

  const envoyer = async (evenement: FormEvent): Promise<void> => {
    evenement.preventDefault();
    const a = Number(annee);
    const m = Number(mois);
    if (!Number.isInteger(a) || a < cetteAnnee - 120 || a > cetteAnnee || !Number.isInteger(m) || m < 1 || m > 12) {
      setEtat({ etat: 'erreur', message: 'Cette date de naissance n’est pas possible.' });
      return;
    }
    setEtat({ etat: 'en cours' });
    try {
      await declarerMaNaissance(a, m);
      setEtat({ etat: 'repos' });
    } catch (erreur) {
      setEtat({ etat: 'erreur', message: messageDe(erreur) });
    }
  };

  if (formule.anneeDeNaissance !== null && formule.moisDeNaissance !== null) {
    return (
      <section className="rubrique">
        <h2>Ton âge</h2>
        <p className="petit">
          Tu as déclaré être né en {MOIS[formule.moisDeNaissance - 1]} {formule.anneeDeNaissance}.{' '}
          {majeur ? 'Ton âge est confirmé pour cet achat.' : `Le paiement est réservé aux ${AGE} ans et plus : tout le reste du jeu t'est ouvert.`}
        </p>
        <p className="texte-doux petit">Une erreur ? Écris à <a href="mailto:contact@philamots.fr">contact@philamots.fr</a>.</p>
      </section>
    );
  }

  return (
    <section className="rubrique">
      <h2>Ton âge</h2>
      <p className="texte-doux petit">
        Pour confirmer ton choix, indique ton mois et ton année de naissance. Le paiement est réservé aux {AGE} ans et plus.
        Seuls le mois et l’année sont conservés, et ils ne pourront plus être changés.
      </p>
      <form className="joute__saisie" onSubmit={(e) => void envoyer(e)}>
        <label htmlFor="mois-de-naissance"><strong>Mois de naissance</strong></label>
        <select id="mois-de-naissance" required disabled={etat.etat === 'en cours'} value={mois} onChange={(e) => setMois(e.target.value)}>
          <option value="" disabled>Choisir…</option>
          {MOIS.map((nom, i) => <option key={nom} value={i + 1}>{nom}</option>)}
        </select>
        <label htmlFor="annee-de-naissance"><strong>Année de naissance</strong></label>
        <input id="annee-de-naissance" type="number" inputMode="numeric" min={cetteAnnee - 120} max={cetteAnnee} required
          disabled={etat.etat === 'en cours' || formule.anneeDeNaissance !== null} value={annee} onChange={(e) => setAnnee(e.target.value)} placeholder="1990" />
        {etat.etat === 'erreur' && <p className="joute__refus" role="alert">{etat.message}</p>}
        <div className="rangee-de-boutons">
          <button type="submit" className="bouton" disabled={etat.etat === 'en cours'}>{etat.etat === 'en cours' ? 'Enregistrement…' : 'Confirmer ma date de naissance'}</button>
        </div>
      </form>
    </section>
  );
}
