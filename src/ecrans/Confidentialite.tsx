// La page Confidentialité : ce que le jeu garde, où, et comment tout effacer. Elle décrit ce que font réellement
// src/services/stockage.ts (l'appareil) et les scripts de serveur/ (le serveur du jeu) : la tenir à jour avec eux.

import { useState } from 'react';
import { Entete } from '../composants/Entete.tsx';
import { usePartie } from '../composants/usePartie.ts';
import { SERVEUR } from '../config/serveur.ts';
import { lien } from '../navigation/routes.ts';
import { serveurDesCollections } from '../services/collections.ts';
import { supprimerMonProfilDeJoute } from '../services/joutes.ts';
import { demanderConfirmation } from '../composants/Confirmation.tsx';
import { messageDe } from '../partage/messages.ts';

type Suppression = { etat: 'repos' } | { etat: 'en cours' } | { etat: 'faite' } | { etat: 'erreur'; message: string };

export function Confidentialite() {
  const partie = usePartie();
  const [suppression, setSuppression] = useState<Suppression>({ etat: 'repos' });

  if (partie.etat !== 'prete') return <main className="ecran"><h1 className="visuellement-cache">Confidentialité</h1><p className="texte-doux">Chargement…</p></main>;
  const aUnPseudonyme = partie.sauvegarde.joutes.pseudo !== '';
  const collectionSurLeServeur = serveurDesCollections.actif;

  const supprimer = async (): Promise<void> => {
    if (!(await demanderConfirmation({
      titre: 'Supprimer ton pseudonyme public ?',
      message: 'Ton pseudonyme, tes joutes, tes amis et tes propositions d’échange seront effacés du serveur. Ta cote reste attachée à ton compte, sans être visible : tu la retrouveras si tu choisis à nouveau un pseudonyme.',
      confirmer: 'Supprimer mon pseudonyme', danger: true,
    }))) return;
    setSuppression({ etat: 'en cours' });
    try {
      await supprimerMonProfilDeJoute();
      setSuppression({ etat: 'faite' });
    } catch (erreur) {
      setSuppression({ etat: 'erreur', message: messageDe(erreur) });
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
            : <><li>Ta partie reste sur ton appareil.</li><li>Rien n’est envoyé à un serveur tant que tu n’as pas choisi de pseudonyme.</li></>}
          <li>Pas de publicité, pas de mesure d’audience, pas de pistage.</li>
          <li>{collectionSurLeServeur ? 'Tu peux supprimer ton pseudonyme ici, et tout ton compte depuis Mon compte, à tout moment.' : 'Tu peux tout effacer à tout moment, depuis les réglages.'}</li>
        </ul>
      </section>

      <section className="rubrique">
        <h2>Sur ton appareil</h2>
        {collectionSurLeServeur ? (
          <p>
            Tes réglages, tes résultats en duel (les mots que tu as retrouvés, ceux que tu as maîtrisés) et une copie de ta
            collection sont enregistrés dans le navigateur de cet appareil. La copie que tu télécharges depuis les réglages
            est à toi : le jeu ne la reçoit pas.
          </p>
        ) : (
          <p>
            Ta collection, ton Encre, tes paquets, ton carnet, tes réglages et tes résultats en duel sont enregistrés dans le
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
            <li>ton carnet (les dix timbres que tu emmènes en duel) ;</li>
            <li>ton apparence : l’avatar, le cadre, le titre, le dos des timbres, la couleur et le paquet que tu as choisis, pour la retrouver sur tous tes appareils ;</li>
            <li>ton expérience, tes réponses réussies, tes parades et ta maîtrise des mots, même après la vente d’un timbre ;</li>
            <li>le déroulement de tes duels : timbres, questions, réponses, horaires, résultat et gains, pour les vérifier et les reprendre. Au lancement d’un nouveau duel, les duels archivés depuis plus de 30 jours sont supprimés ; les totaux de progression restent dans ton compte ;</li>
            <li>l’empreinte de ton code de secours, si tu en as créé un — jamais le code lui-même.</li>
          </ul>
          <p>
            Tout cela est attaché à ton compte : invité, ou relié à Google ou à ton adresse e-mail. La collection est
            synchronisée depuis le serveur. Une ancienne collection locale peut être transférée après validation ; ensuite,
            c’est le serveur qui fait foi.
          </p>
        </section>
      )}

      <section className="rubrique">
        <h2>Ton pseudonyme public</h2>
        <p>Dès que tu choisis un pseudonyme, il est public. Pour les joutes classées, et pour que tes amis puissent affronter ton double, le serveur du jeu garde alors :</p>
        <ul className="regles">
          <li>ton pseudonyme ;</li>
          <li>ta cote, et le nombre de joutes jouées et gagnées ;</li>
          <li>les dix mots de ton carnet ;</li>
          <li>pour ces mots, combien de fois tu as retrouvé leur définition, et tes parades réussies par rareté : c’est ce qui permet à ton double de jouer comme toi ;</li>
          <li>la date et le résultat de chacune de tes joutes.</li>
        </ul>
        <p>
          Ces données sont attachées à ton compte. En mode invité, il s’agit d’un simple numéro, sans adresse e-mail.
          Google, un code de connexion envoyé par e-mail ou ton code de secours permettent de retrouver ta collection sur un autre appareil.
        </p>
        <p>
          <strong>Ce que voient les autres joueurs :</strong> ton pseudonyme, ta cote, ta ligue et les raretés de ton carnet.
          En joute, ton adversaire voit les mots que tu poses. Quand un ami défie ton double, le serveur fait jouer ce double
          avec les mots de ton carnet et tes résultats : ton ami découvre ces mots au fil du défi.
        </p>
        <p>
          <strong>Le fil d’activité de l’accueil</strong> montre à tous les visiteurs, pendant sept jours au plus, quelques
          événements des joueurs qui ont choisi un pseudonyme : ton arrivée, tes victoires en joute classée avec ta nouvelle
          cote, et tes trouvailles remarquables (un timbre Légendaire, Hors-série ou holographique). Il n’affiche rien d’autre
          que ton pseudonyme et le mot concerné.
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
        <p>Ton équipe conserve son nom, son emblème et ses deux membres. Ces informations et les invitations sont visibles uniquement par les joueurs concernés. Supprimer ton pseudonyme public te retire de l’équipe : ton partenaire en devient capitaine, ou l’équipe disparaît si elle est vide.</p>
        <p>Les propositions expirent après sept jours. Retirer un ami annule vos propositions en attente et ferme l’accès à ta collection. Les défis amicaux affrontent son double automatisé, sans changer vos cotes.</p>
      </section>}

      {collectionSurLeServeur && SERVEUR.secoursEtParrainage && <section className="rubrique">
        <h2>Parrainage</h2>
        <p>Si tu arrives par le lien d’invitation d’un ami, le serveur retient qui t’a invité, pour vous offrir des paquets quand tu termines ton premier duel. Ton ami voit alors ton pseudonyme, si tu en as choisi un. Ton propre lien contient un code tiré au hasard, qui ne révèle rien de ton compte.</p>
      </section>}

      <section className="rubrique">
        <h2>Qui héberge quoi</h2>
        <p>
          Le site est servi par GitHub Pages ; le serveur du jeu est hébergé par Supabase. Comme pour tout site web,
          ces hébergeurs voient passer l’adresse internet (IP) de ton appareil, et peuvent la conserver un temps limité
          dans leurs journaux techniques. Le jeu, lui, ne s’en sert pas.
        </p>
        {SERVEUR.cleAntiRobot && <p>
          Avant d’ouvrir un compte ou d’envoyer un code de connexion, un contrôle anti-robot de Cloudflare (Turnstile)
          vérifie que tu n’es pas un programme qui fabrique des comptes en série. Cloudflare reçoit pour cela l’adresse IP
          et des informations techniques sur ton navigateur. Ce contrôle ne sert ni à la publicité ni au pistage, et
          n’est chargé que lorsqu’il est nécessaire.
        </p>}
      </section>

      <section className="rubrique">
        <h2>Tout effacer</h2>
        <p>
          Ton pseudonyme public est conservé tant que tu ne le supprimes pas. Le supprimer retire du serveur ton pseudonyme,
          ton carnet public, tes résultats publics, tes joutes, tes événements du fil d’activité, tes relations d’amitié et tes propositions d’échange. C’est immédiat et définitif.
          Ta cote et ton nombre de joutes restent attachés à ton compte, sans être visibles, pour que tu les retrouves si tu choisis à nouveau un pseudonyme (on n’efface pas ses défaites en recommençant) ; ils s’effacent avec ton compte.
          Ton compte, ta collection, tes droits et tes engagements au marché sont conservés.
        </p>
        {suppression.etat === 'faite'
          ? <p role="status"><strong>Pseudonyme public supprimé.</strong> Ta collection et ton compte sont conservés.</p>
          : aUnPseudonyme
            ? <button type="button" className="bouton bouton--danger" disabled={suppression.etat === 'en cours'} onClick={() => void supprimer()}>{suppression.etat === 'en cours' ? 'Suppression…' : 'Supprimer mon pseudonyme public'}</button>
            : <p className="texte-doux">Tu n’as pas de pseudonyme public : rien n’est publié à ton nom.</p>}
        {suppression.etat === 'erreur' && <p className="joute__refus" role="alert">{suppression.message} Rien n’a été effacé : réessaie dans un instant.</p>}
        <p className="texte-doux petit">
          {collectionSurLeServeur
            ? <>Pour supprimer tout ton compte, collection comprise, utilise « Supprimer mon compte » dans <a href={lien({ ecran: 'compte' })}>Mon compte</a> : tout ce que garde le serveur est alors effacé, sur tous tes appareils.</>
            : <>Pour effacer ta partie sur cet appareil, utilise « Effacer ma partie » dans les <a href={lien({ ecran: 'reglages' })}>réglages</a>.</>}
        </p>
      </section>

      <section className="rubrique">
        <h2>Une question ?</h2>
        <p>Écris à <a href="mailto:contact@philamots.fr">contact@philamots.fr</a>.</p>
      </section>
    </main>
  );
}
