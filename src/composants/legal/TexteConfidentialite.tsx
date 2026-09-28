// Le texte de la Confidentialité, un seul pour deux endroits : l'écran du jeu (ecrans/Confidentialite.tsx, avec ses
// boutons) et la page fixe /confidentialite/ (pages/PageLegale.tsx), lisible sans lancer le jeu (audit de finition du
// 26/09/2026, E17 et E19). Il décrit ce que font réellement src/services/stockage.ts (l'appareil) et les scripts de
// serveur/ (le serveur du jeu) : le tenir à jour avec eux, et changer SITE.textesLegauxDu à chaque modification.
// À faire relire par un juriste (voir A-FAIRE-RAPHAEL.md).

import type { ReactNode } from 'react';
import { SITE } from '../../config/site.ts';

type Props = {
  enLigne: boolean; // la collection est gardée par le serveur du jeu (le cas du site en ligne)
  antiRobot: boolean; // le contrôle anti-robot de Cloudflare est allumé
  parrainage: boolean; // le parrainage est ouvert
  liens: { compte: string; reglages: string }; // les écrans du jeu : « #/compte » dans le jeu, « ../#/compte » depuis une page fixe
  effacer: ReactNode; // dans « Tout effacer » : le bouton du jeu, ou ce qu'il faut faire, sur la page fixe
};

const { inviteMois, relieAns } = SITE.conservation;

export function TexteConfidentialite({ enLigne, antiRobot, parrainage, liens, effacer }: Props) {
  const contact = <a href={`mailto:${SITE.contact}`}>{SITE.contact}</a>;
  return (
    <>
      <section className="rubrique">
        <h2>En bref</h2>
        <ul className="regles">
          {enLigne
            ? <><li>Ta collection et ta progression sont gardées par le serveur du jeu. Tu peux jouer en invité ou créer un compte avec Google ou ton adresse e-mail.</li><li>Tes réglages restent sur ton appareil. Le serveur vérifie tes duels et permet de les reprendre.</li></>
            : <><li>Ta partie reste sur ton appareil.</li><li>Rien n’est envoyé à un serveur tant que tu n’as pas choisi de pseudonyme.</li></>}
          <li>Pas de publicité, pas de mesure d’audience, pas de pistage.</li>
          <li>{enLigne ? 'Tu peux supprimer ton pseudonyme et tout ton compte, à tout moment.' : 'Tu peux tout effacer à tout moment, depuis les réglages.'}</li>
          {enLigne && <li>Un compte invité sans visite depuis {inviteMois} mois est supprimé ; un compte relié à Google ou à une adresse e-mail, après {relieAns} ans sans visite.</li>}
        </ul>
      </section>

      <section className="rubrique">
        <h2>Sur ton appareil</h2>
        {enLigne ? (
          <p>
            Tes réglages, tes résultats en duel (les mots que tu as retrouvés, ceux que tu as maîtrisés), une copie de ta
            collection, ta session de connexion et, si tu es arrivé par le lien d’un ami, son code d’invitation, sont
            enregistrés dans le navigateur de cet appareil. Ils servent seulement à faire marcher le jeu : aucun n’est un
            traceur publicitaire, et aucun bandeau « cookies » n’est donc nécessaire. La copie que tu télécharges depuis les
            réglages est à toi : le jeu ne la reçoit pas.
          </p>
        ) : (
          <p>
            Ta collection, ton Encre, tes paquets, ton carnet, tes réglages et tes résultats en duel sont enregistrés dans le
            navigateur de cet appareil, et nulle part ailleurs. Le fichier que tu exportes depuis les réglages est à toi :
            le jeu ne le reçoit pas.
          </p>
        )}
      </section>

      {enLigne && (
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
            <li>la date de ton dernier passage, pour savoir quand un compte n’est plus utilisé ;</li>
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
        <p>Si tu crées un compte, Supabase conserve ton adresse e-mail et les informations nécessaires à la connexion. Avec Google, il reçoit aussi l’identifiant et les informations de profil autorisées par Google. Le jeu ne reçoit jamais ton mot de passe Google. La connexion par e-mail utilise un code à usage unique, envoyé par la messagerie d’OVHcloud.</p>
        <p>Ces informations servent à retrouver ton compte et ne sont pas affichées aux autres joueurs. Une session est conservée dans ton navigateur jusqu’à sa déconnexion ou son expiration.</p>
        <p>Tu as moins de 15 ans ? Demande à un parent avant de relier ton adresse e-mail ou ton compte Google.</p>
      </section>

      {enLigne && <section className="rubrique">
        <h2>Amis et échanges</h2>
        <p>Le serveur conserve tes demandes d’amitié, ta liste d’amis et vos propositions d’échange. Seuls les deux joueurs concernés peuvent les consulter. Accepter une amitié permet à cet ami de voir les mots et finitions de ta collection pour proposer un échange, sans lui donner accès à ton compte ni à tes réponses.</p>
        <p>Tes amis voient aussi si tu es en ligne, ou depuis quand tu n’es pas passé : le jeu ouvert le signale au serveur toutes les trois minutes.</p>
        <p>Ton équipe conserve son nom, son emblème et ses deux membres. Ces informations et les invitations sont visibles uniquement par les joueurs concernés. Supprimer ton pseudonyme public te retire de l’équipe : ton partenaire en devient capitaine, ou l’équipe disparaît si elle est vide.</p>
        <p>Les propositions expirent après sept jours. Retirer un ami annule vos propositions en attente et ferme l’accès à ta collection. Les défis amicaux affrontent son double automatisé, sans changer vos cotes.</p>
      </section>}

      {enLigne && parrainage && <section className="rubrique">
        <h2>Parrainage</h2>
        <p>Si tu arrives par le lien d’invitation d’un ami, le serveur retient qui t’a invité, pour vous offrir des paquets quand tu termines ton premier duel. Ton ami voit alors ton pseudonyme, si tu en as choisi un. Ton propre lien contient un code tiré au hasard, qui ne révèle rien de ton compte.</p>
      </section>}

      <section className="rubrique">
        <h2>Qui héberge quoi</h2>
        <p>
          Le site est servi par GitHub Pages ; le serveur du jeu est hébergé par Supabase, sur des serveurs situés à Londres.
          Comme pour tout site web, ces hébergeurs voient passer l’adresse internet (IP) de ton appareil, et peuvent la
          conserver un temps limité dans leurs journaux techniques. Le jeu, lui, ne s’en sert pas.
        </p>
        {antiRobot && <p>
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
        {effacer}
        <p className="texte-doux petit">
          {enLigne
            ? <>Pour supprimer tout ton compte, collection comprise, utilise « Supprimer mon compte » dans <a href={liens.compte}>Mon compte</a> : tout ce que garde le serveur est alors effacé, sur tous tes appareils.</>
            : <>Pour effacer ta partie sur cet appareil, utilise « Effacer ma partie » dans les <a href={liens.reglages}>réglages</a>.</>}
        </p>
      </section>

      {enLigne && <section className="rubrique">
        <h2>L’essentiel juridique</h2>
        <p><strong>Responsable des données :</strong> {SITE.editeur}, éditeur de Philamots, {contact}.</p>
        <h3>Pourquoi, sur quelle base, et combien de temps</h3>
        <dl className="texte-legal__finalites">
          <div>
            <dt>Faire marcher ta partie : collection, paquets, duels, marché</dt>
            <dd>Identifiant du compte et contenu de ta partie. Base : le service que tu utilises (les conditions d’utilisation). Durée : tant que ton compte sert ; il est supprimé après {inviteMois} mois sans visite pour un invité, {relieAns} ans pour un compte relié à Google ou à une adresse e-mail.</dd>
          </div>
          <div>
            <dt>Retrouver ta partie sur un autre appareil</dt>
            <dd>Adresse e-mail, identifiant Google, empreinte du code de secours. Base : le service que tu utilises. Durée : celle du compte.</dd>
          </div>
          <div>
            <dt>Jouer avec les autres : joutes, classement, fil d’activité, amis, équipes, présence</dt>
            <dd>Pseudonyme, cote, carnet public, relations, dernier passage. Base : le service que tu utilises. Durée : 7 jours pour le fil d’activité, 30 jours pour les duels archivés ; le reste jusqu’à la suppression de ton pseudonyme ou de ton compte.</dd>
          </div>
          <div>
            <dt>Protéger la création des comptes (contrôle anti-robot)</dt>
            <dd>Adresse IP et informations techniques du navigateur, reçues par Cloudflare. Base : l’intérêt légitime (la sécurité du jeu). Durée : le jeu ne les garde pas.</dd>
          </div>
          <div>
            <dt>Journaux techniques des hébergeurs</dt>
            <dd>Adresse IP, date, adresse demandée. Base : l’intérêt légitime (la sécurité). Durée : limitée, fixée par GitHub et Supabase.</dd>
          </div>
          <div>
            <dt>Répondre à tes messages</dt>
            <dd>Ton adresse e-mail et ton message. Base : l’intérêt légitime. Durée : 3 ans après le dernier échange.</dd>
          </div>
        </dl>
        <h3>Tes droits</h3>
        <p>
          Tu peux demander à accéder à tes données, à les corriger ou à les effacer, à en limiter l’usage, t’opposer à leur
          traitement, ou les recevoir dans un format réutilisable. Plusieurs se font directement dans le jeu : télécharger une
          copie (réglages), supprimer ton pseudonyme ou ton compte. Pour le reste, écris à {contact} : réponse sous un mois.
          Si la réponse ne te convient pas, tu peux saisir la CNIL (<a href="https://www.cnil.fr">cnil.fr</a>).
        </p>
        <h3>Les prestataires</h3>
        <ul className="regles">
          <li>GitHub (États-Unis) : sert les pages du site.</li>
          <li>Supabase (Singapour) : le serveur du jeu et les comptes, sur des serveurs situés à Londres (Royaume-Uni), pays que l’Union européenne reconnaît comme protégeant les données personnelles.</li>
          {antiRobot && <li>Cloudflare (États-Unis) : le contrôle anti-robot.</li>}
          <li>Google : la connexion avec Google, sous sa propre responsabilité.</li>
          <li>OVHcloud (France) : le nom de domaine, l’envoi des codes de connexion et la boîte de contact.</li>
        </ul>
        <p>Pour les prestataires établis hors de l’Union européenne, les transferts de données sont encadrés par les garanties prévues par le RGPD. Aucun achat n’est ouvert : le jour où il y en aura, le prestataire de paiement s’ajoutera à cette liste.</p>
      </section>}

      <section className="rubrique">
        <h2>Une question ?</h2>
        <p>Écris à {contact}.</p>
      </section>
    </>
  );
}
