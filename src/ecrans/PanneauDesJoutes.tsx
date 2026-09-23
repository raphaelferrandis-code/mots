// Les joutes classées, avant le duel : le pseudonyme et le rang du joueur, les adversaires qu'on lui propose,
// le classement. Tout passe par src/services/joutes.ts (avec ou sans serveur : l'écran ne fait pas la différence).

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { BadgeJoueurSimule } from '../composants/BadgeJoueurSimule.tsx';
import { useChargement } from '../composants/useChargement.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { PSEUDOS_INTERDITS } from '../config/pseudos-interdits.ts';
import { coteApres, ligueDe } from '../jeu/joute.ts';
import type { ProfilDeJoute } from '../jeu/joute.ts';
import { LONGUEUR_DU_PSEUDO, examinerLePseudo } from '../jeu/pseudo.ts';
import type { Sauvegarde } from '../jeu/sauvegarde.ts';
import { lien } from '../navigation/routes.ts';
import { RARETES } from '../partage/types.ts';
import type { CarteIndex } from '../partage/types.ts';
import { chargerEdition } from '../services/cartes.ts';
import { serveurDeJoutes, tirerUnPseudonyme } from '../services/joutes.ts';
import { publierMonIdentite, rejoindreLesJoutes } from '../services/partie.ts';
import { pseudoDuJoueur } from '../services/identite.ts';

const REGLES = EQUILIBRAGE.joute;
const signe = (n: number): string => (n > 0 ? `+${n}` : `${n}`);
const messageDe = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));

// « 4 communes, 3 peu communes, 2 rares, 1 épique » : on montre la force d'un deck, pas ses mots.
function raretesDuDeck(deck: readonly string[], cartes: ReadonlyMap<string, CarteIndex>): string {
  return [...RARETES].reverse()
    .map((rarete) => ({ rarete, nombre: deck.filter((id) => cartes.get(id)?.rarete === rarete).length }))
    .filter((r) => r.nombre > 0)
    .map((r) => `${r.nombre} ${r.rarete.toLowerCase()}${r.nombre > 1 && r.rarete !== 'Hors-série' ? 's' : ''}`)
    .join(', ');
}

export function PanneauDesJoutes({ sauvegarde, enPreparation, onDefier }: { sauvegarde: Sauvegarde; enPreparation: boolean; onDefier: (profil: ProfilDeJoute) => void }) {
  const { jouees, gagnees, recents } = sauvegarde.joutes;
  const pseudo = pseudoDuJoueur(sauvegarde);
  const cote = sauvegarde.joutes.cote ?? REGLES.coteDeDepart;
  const ligue = ligueDe(cote, REGLES);
  // La barre de progression vers la ligue suivante. Dans la première ligue, elle part d'un peu sous la cote de départ
  // (et non de zéro), pour qu'un nouveau joueur ne la trouve pas déjà presque pleine.
  const bas = ligue.rang === 0 ? Math.min(cote, REGLES.coteDeDepart) - 100 : ligue.aPartirDe;
  const [tirage, setTirage] = useState(0);

  // Le pseudonyme : le joueur l'écrit librement ; il est vérifié dans le jeu, puis par le service (mot refusé, déjà pris…).
  const [saisie, setSaisie] = useState<string | null>(null); // null = le joueur n'est pas en train de le modifier
  const [refus, setRefus] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  // Le joueur rejoint les joutes en validant son pseudonyme : avant cela, rien n'est enregistré ni envoyé au serveur
  // (il est prévenu de ce qui sera envoyé : voir la page Confidentialité). Un pseudonyme vide = pas encore inscrit.
  const inscrit = sauvegarde.joutes.pseudo !== '';
  const pseudoValable = inscrit && examinerLePseudo(pseudo, PSEUDOS_INTERDITS).accepte;
  // Le profil fournit le nom proposé, y compris à la première inscription.
  useEffect(() => {
    let actif = true;
    if ((!inscrit || !pseudoValable) && saisie === null) {
      if (pseudo) setSaisie(pseudo);
      else void tirerUnPseudonyme().then(tire => { if (actif) setSaisie(actuelle => actuelle ?? tire); });
    }
    return () => { actif = false; };
  }, [inscrit, pseudoValable, pseudo, saisie]);

  // Le profil est publié à chaque visite et à chaque changement de pseudonyme ou de deck ; le service rend la cote s'il la tient.
  const cleDuProfil = `${pseudo}|${sauvegarde.deck.join(',')}`;
  const publication = useChargement(async () => {
    if (!pseudoValable) return null;
    await publierMonIdentite();
    return true;
  }, `publication:${cleDuProfil}:${pseudoValable}`);
  const publie = publication.etat === 'pret' && publication.donnees === true;

  const validerLePseudo = async (evenement: FormEvent): Promise<void> => {
    evenement.preventDefault();
    const verdict = examinerLePseudo(saisie ?? '', PSEUDOS_INTERDITS);
    if (!verdict.accepte) { setRefus(verdict.raison); return; }
    setEnvoi(true);
    try {
      await rejoindreLesJoutes(verdict.pseudo);
      setSaisie(null);
      setRefus(null);
    } catch (erreur) { setRefus(messageDe(erreur)); } finally { setEnvoi(false); }
  };

  const edition = useChargement(chargerEdition, 'edition');
  const adversaires = useChargement(async () => (publie ? serveurDeJoutes.adversaires(cote, recents) : []), `adversaires:${cote}:${tirage}:${publie}`);
  const classement = useChargement(async () => (publie ? serveurDeJoutes.classement(pseudo, cote) : null), `classement:${pseudo}:${cote}:${publie}`);
  const cartes = edition.etat === 'pret' ? new Map(edition.donnees.cartes.map((c) => [c.id, c])) : null;
  const rang = classement.etat === 'pret' ? classement.donnees : null;

  const formulaire = (
    <form className="joute__saisie" onSubmit={(e) => void validerLePseudo(e)}>
      <label htmlFor="pseudo"><strong>Pseudo public</strong><span className="texte-doux petit">{LONGUEUR_DU_PSEUDO.minimum}–{LONGUEUR_DU_PSEUDO.maximum} caractères : lettres, chiffres, espaces ou tirets.</span></label>
      <p className="texte-doux petit">Le même pseudo est utilisé sur ton profil et dans les joutes.</p>
      <input id="pseudo" type="text" value={saisie ?? ''} maxLength={LONGUEUR_DU_PSEUDO.maximum + 4} autoComplete="off" autoCapitalize="words" spellCheck={false} aria-invalid={refus !== null} aria-describedby={refus ? 'pseudo-refus' : undefined} onChange={(e) => { setSaisie(e.target.value); setRefus(null); }} />
      {refus && <p id="pseudo-refus" className="joute__refus" role="alert">{refus}</p>}
      <div className="rangee-de-boutons">
        <button type="submit" className="bouton" disabled={envoi || saisie === null}>{envoi ? 'Vérification…' : inscrit ? 'Valider' : 'Rejoindre les joutes'}</button>
        <button type="button" className="bouton bouton--discret" disabled={envoi} onClick={() => void tirerUnPseudonyme().then((tire) => { setSaisie(tire); setRefus(null); })}>M'en proposer un</button>
        {pseudoValable && <button type="button" className="bouton bouton--discret" disabled={envoi} onClick={() => { setSaisie(null); setRefus(null); }}>Annuler</button>}
      </div>
    </form>
  );

  if (!inscrit) {
    return (
      <div className="panneaux joutes">
        <section className="rubrique panneaux__large joute__accueil">
          <h2>Rejoindre les joutes classées</h2>
          <p>Affronte le deck d'autres joueurs, joué par l'ordinateur.</p>
          <p className="texte-doux petit">
            En rejoignant les joutes, ton pseudonyme, ta cote et ton deck sont envoyés au serveur du jeu. Les autres joueurs voient ton pseudonyme,
            ta cote et les raretés de ton deck. Tu peux tout supprimer quand tu veux : <a href={lien({ ecran: 'confidentialite' })}>page Confidentialité</a>.
          </p>
          {formulaire}
        </section>
      </div>
    );
  }

  return (
    <div className="panneaux joutes">
      <section className="rubrique">
        <p className="entete__surtitre">Ligue {ligue.nom}</p>
        {saisie === null ? (
          <>
            <h2>{pseudo || '…'} <small className="joute__cote">cote {cote}</small></h2>
            <p className="texte-doux petit">
              {rang && <>{rang.rang === 1 ? '1ᵉʳ' : `${rang.rang}ᵉ`} sur {rang.joueurs} · </>}
              {jouees === 0 ? 'Première joute' : `${gagnees} victoire${gagnees > 1 ? 's' : ''} · ${jouees} joute${jouees > 1 ? 's' : ''}`}
              {ligue.suivante && <> · ligue {ligue.suivante.nom} à {ligue.suivante.aPartirDe}</>}
            </p>
            {ligue.suivante && (
              <span className="progression__barre" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, ((cote - bas) / (ligue.suivante.aPartirDe - bas)) * 100))}%` }} /></span>
            )}
            {publication.etat === 'erreur' && <p className="joute__refus" role="alert">{publication.message}</p>}
            <button type="button" className="bouton bouton--discret joute__pseudo" onClick={() => { setSaisie(pseudo); setRefus(null); }}>Modifier le pseudo</button>
          </>
        ) : formulaire}
      </section>

      <section className="rubrique">
        <h2>Choisis ton adversaire</h2>
        {adversaires.etat === 'erreur' && <p className="joute__refus" role="alert">{adversaires.message}</p>}
        {(adversaires.etat === 'en cours' || publication.etat === 'en cours') && <p className="texte-doux">Recherche d'adversaires…</p>}
        {adversaires.etat === 'pret' && publie && adversaires.donnees.length === 0 && <p className="texte-doux">Aucun adversaire disponible pour l'instant.</p>}
        {adversaires.etat === 'pret' && publie && (
          <div className="niveaux">
            {adversaires.donnees.map((profil) => (
              <button key={profil.id} type="button" className="niveau" disabled={enPreparation} onClick={() => onDefier(profil)}>
                <strong>{profil.pseudo} <small className="joute__cote">cote {profil.cote} · {ligueDe(profil.cote, REGLES).nom}</small></strong>
                <BadgeJoueurSimule maison={profil.maison} />
                {cartes && <span className="texte-doux petit">{raretesDuDeck(profil.deck, cartes)}</span>}
                <span className="niveau__gain">Victoire {signe(coteApres(cote, profil.cote, 'victoire', REGLES) - cote)} · Défaite {signe(coteApres(cote, profil.cote, 'defaite', REGLES) - cote)} · +{REGLES.encreParVictoire} Encre</span>
              </button>
            ))}
          </div>
        )}
        <button type="button" className="bouton bouton--discret" disabled={enPreparation || !publie} onClick={() => setTirage((t) => t + 1)}>{enPreparation ? 'Préparation…' : 'Autres adversaires'}</button>
      </section>


    </div>
  );
}
