// La page Confidentialité : ce que le jeu garde, où, et comment tout effacer. Elle décrit ce que font réellement
// src/services/stockage.ts (l'appareil) et serveur/1-structure.sql (le serveur des joutes) : la tenir à jour avec eux.

import { useState } from 'react';
import { Entete } from '../composants/Entete.tsx';
import { usePartie } from '../composants/usePartie.ts';
import { SERVEUR } from '../config/serveur.ts';
import { SITE } from '../config/site.ts';
import { lien } from '../navigation/routes.ts';
import { serveurDesCollections } from '../services/collections.ts';
import { supprimerMonProfilDeJoute } from '../services/joutes.ts';

type Suppression = { etat: 'repos' } | { etat: 'en cours' } | { etat: 'faite' } | { etat: 'erreur'; message: string };

export function Confidentialite() {
  const partie = usePartie();
  const [suppression, setSuppression] = useState<Suppression>({ etat: 'repos' });

  if (partie.etat !== 'prete') return <main className="ecran"><p className="texte-doux">Chargement…</p></main>;
  const aUnProfil = partie.sauvegarde.joutes.pseudo !== '';
  const collectionSurLeServeur = serveurDesCollections.actif;

  const supprimer = async (): Promise<void> => {
    if (!window.confirm('Supprimer ton profil de joute ? Ton pseudonyme, ta cote, tes joutes, tes amis et tes propositions d’échange seront effacés du serveur. Cette action est définitive.')) return;
    setSuppression({ etat: 'en cours' });
    try {
      await supprimerMonProfilDeJoute();
      setSuppression({ etat: 'faite' });
    } catch (erreur) {
      setSuppression({ etat: 'erreur', message: erreur instanceof Error ? erreur.message : String(erreur) });
    }
  };

  return (
    <main className="ecran confidentialite">
      <Entete titre="Confidentialité" actions={<a className="bouton outil" href={lien({ ecran: 'reglages' })}>Retour aux réglages</a>} />

      <section className="rubrique">
        <h2>En bref</h2>
        <ul className="regles">
          {collectionSurLeServeur
            ? <><li>Ta collection et ta progression sont gardées par le serveur du jeu. Tu peux jouer en invité ou créer un compte avec Google ou ton adresse e-mail.</li><li>Tes réglages restent sur ton appareil. Le serveur vérifie tes duels et permet de les reprendre.</li></>
            : <><li>Ta partie reste sur ton appareil.</li><li>Rien n'est envoyé à un serveur tant que tu n'as pas rejoint les joutes classées.</li></>}
          <li>Pas de publicité, pas de mesure d'audience, pas de pistage.</li>
          <li>Tu peux tout effacer à tout moment, ici même.</li>
        </ul>
      </section>

      <section className="rubrique">
        <h2>Sur ton appareil</h2>
        {collectionSurLeServeur ? (
          <p>
            Tes réglages, tes résultats en duel (les mots que tu as retrouvés, ceux que tu as maîtrisés) et une copie de ta
            collection sont enregistrés dans le navigateur de cet appareil. Le fichier que tu exportes depuis les réglages
            est à toi : le jeu ne le reçoit pas.
          </p>
        ) : (
          <p>
            Ta collection, ton Encre, tes paquets, ton deck, tes réglages et tes résultats en duel sont enregistrés dans le
            navigateur de cet appareil, et nulle part ailleurs. Le fichier que tu exportes depuis les réglages est à toi :
            le jeu ne le reçoit pas.
          </p>
        )}
      </section>

      {collectionSurLeServeur && (
        <section className="rubrique">
          <h2>Sur le serveur du jeu : ta collection</h2>
          <p>Pour gérer ta collection et tes échanges, le serveur du jeu garde :</p>
          <ul className="regles">
            <li>tes timbres, avec leurs finitions, leurs doublons et la date où tu les as obtenus ;</li>
            <li>ton Encre, ta réserve de paquets et le nombre de paquets ouverts ;</li>
            <li>ton deck ;</li>
            <li>ton expérience, tes réponses réussies, tes parades et ta maîtrise des mots, même après la vente d'un timbre ;</li>
            <li>le déroulement de tes duels : cartes, questions, réponses, horaires, résultat et gains, pour les vérifier et les reprendre. Au lancement d'un nouveau duel, les parties archivées depuis plus de 30 jours sont supprimées ; les totaux de progression restent dans ton compte ;</li>
            <li>l'empreinte de ton code de secours, si tu en as créé un — jamais le code lui-même.</li>
          </ul>
          <p>
            Tout cela est attaché au même compte que les joutes : invité, ou relié à Google ou à ton adresse e-mail. La
            collection est synchronisée depuis le serveur. Une ancienne collection locale peut être transférée après
            validation ; ensuite, c'est le serveur qui fait foi.
          </p>
        </section>
      )}

      <section className="rubrique">
        <h2>Sur le serveur des joutes classées</h2>
        <p>Pour que d'autres joueurs puissent te trouver et affronter ton double, le jeu envoie à son serveur, dès que tu choisis ton pseudonyme :</p>
        <ul className="regles">
          <li>ton pseudonyme ;</li>
          <li>ta cote, et le nombre de joutes jouées et gagnées ;</li>
          <li>les dix mots de ton deck ;</li>
          <li>pour ces mots, combien de fois tu as retrouvé leur définition, et tes parades réussies par rareté : c'est ce qui permet à ton double de jouer comme toi ;</li>
          <li>la date et le résultat de chacune de tes joutes.</li>
        </ul>
        <p>
          Ces données sont attachées à ton compte. En mode invité, il s’agit d’un simple numéro, sans adresse e-mail.
          Google, un code de connexion envoyé par e-mail ou ton code de secours permettent de retrouver ta collection sur un autre appareil.
        </p>
        <p>
          <strong>Ce que voient les autres joueurs :</strong> ton pseudonyme, ta cote, ta ligue et les raretés de ton deck.
          Les mots de ton deck et tes résultats sont transmis au jeu de ton adversaire le temps de la joute, pour faire
          jouer ton double ; ils ne sont pas affichés.
        </p>
        <p className="texte-doux petit">Un conseil : ne mets pas ton vrai nom dans ton pseudonyme.</p>
      </section>

      <section className="rubrique">
        <h2>Connexion avec Google ou par e-mail</h2>
        <p>Si tu crées un compte, Supabase conserve ton adresse e-mail et les informations nécessaires à la connexion. Avec Google, il reçoit aussi l’identifiant et les informations de profil autorisées par Google. Le jeu ne reçoit jamais ton mot de passe Google. La connexion par e-mail utilise un code à usage unique.</p>
        <p>Ces informations servent à retrouver ton compte et ne sont pas affichées aux autres joueurs. Une session est conservée dans ton navigateur jusqu’à sa déconnexion ou son expiration.</p>
      </section>

      {collectionSurLeServeur && <section className="rubrique">
        <h2>Amis et échanges</h2>
        <p>Le serveur conserve tes demandes d’amitié, ta liste d’amis et vos propositions d’échange. Seuls les deux joueurs concernés peuvent les consulter. Accepter une amitié permet à cet ami de voir les mots et finitions de ta collection pour proposer un échange, sans lui donner accès à ton compte ni à tes réponses.</p>
        <p>Ton équipe conserve son nom, son emblème et ses deux membres. Ces informations et les invitations sont visibles uniquement par les joueurs concernés. Supprimer ton profil te retire de l’équipe : ton partenaire en devient capitaine, ou l’équipe disparaît si elle est vide.</p>
        <p>Les propositions expirent après sept jours. Retirer un ami annule vos propositions en attente et ferme l’accès à ta collection. Les défis amicaux affrontent son double automatisé, sans changer vos cotes.</p>
      </section>}

      <section className="rubrique">
        <h2>Qui héberge quoi</h2>
        <p>
          Le site est servi par GitHub Pages ; le serveur des joutes est hébergé par Supabase. Comme pour tout site web,
          ces hébergeurs voient passer l'adresse internet (IP) de ton appareil, et peuvent la conserver un temps limité
          dans leurs journaux techniques. Le jeu, lui, ne s'en sert pas.
        </p>
        {SERVEUR.cleAntiRobot && <p>
          Avant d'ouvrir un compte ou d'envoyer un code de connexion, un contrôle anti-robot de Cloudflare (Turnstile)
          vérifie que tu n'es pas un programme qui fabrique des comptes en série. Cloudflare reçoit pour cela l'adresse IP
          et des informations techniques sur ton navigateur. Ce contrôle ne sert ni à la publicité ni au pistage, et
          n'est chargé que lorsqu'il est nécessaire.
        </p>}
      </section>

      <section className="rubrique">
        <h2>Tout effacer</h2>
        <p>
          Ton profil de joute est conservé tant que tu ne le supprimes pas. Le supprimer retire du serveur ton pseudonyme,
          ta cote, ton deck public, tes résultats publics, tes joutes, tes relations d’amitié et tes propositions d’échange. C'est immédiat et définitif.
          Ton compte, ta collection, tes droits et tes engagements au marché sont conservés.
        </p>
        {suppression.etat === 'faite'
          ? <p role="status"><strong>Profil de joute supprimé.</strong> Ta collection et ton compte sont conservés.</p>
          : aUnProfil
            ? <button type="button" className="bouton bouton--danger" disabled={suppression.etat === 'en cours'} onClick={() => void supprimer()}>{suppression.etat === 'en cours' ? 'Suppression…' : 'Supprimer mon profil de joute'}</button>
            : <p className="texte-doux">Tu n'as pas de profil de joute : rien n'a été envoyé au serveur.</p>}
        {suppression.etat === 'erreur' && <p className="joute__refus" role="alert">{suppression.message} Rien n'a été effacé : réessaie dans un moment.</p>}
        <p className="texte-doux petit">
          Pour effacer aussi ta partie sur cet appareil, utilise « Effacer ma partie » dans les <a href={lien({ ecran: 'reglages' })}>réglages</a> :
          ton profil de joute{collectionSurLeServeur && ', ta collection'} et ton compte sont alors supprimés en même temps.
        </p>
      </section>

      <section className="rubrique">
        <h2>Une question ?</h2>
        <p>
          Écris à l'auteur du jeu depuis la <a href={SITE.pageDuProjet} target="_blank" rel="noreferrer">page du projet</a>.
        </p>
      </section>
    </main>
  );
}
