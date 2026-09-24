// Les joutes classées, avant le duel : le pseudonyme et le rang du joueur, les adversaires qu'on lui propose,
// le classement. Tout passe par src/services/joutes.ts (avec ou sans serveur : l'écran ne fait pas la différence).

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { BadgeJoueurSimule } from '../composants/BadgeJoueurSimule.tsx';
import { CadreGrave, Embleme } from '../composants/cosmetiques/Gravures.tsx';
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
import './joutes.css';

const REGLES = EQUILIBRAGE.joute;
const signe = (n: number): string => (n > 0 ? `+${n}` : `${n}`);
const messageDe = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));

function ArmesDeJoute() {
  return <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
    {[-1, 1].map((sens) => <g key={sens} transform={sens === -1 ? 'translate(100 0) scale(-1 1)' : undefined}>
      <path d="m24 79 43-49 12-12-3 18-45 50Z" fill="currentColor" fillOpacity=".08" />
      <path d="m28 82 46-57M19 73l17 16M25 83l-9 10m-3-3 6 6" />
      <path d="m63 36 7 1m-12 5 7 1m-12 5 7 1" strokeOpacity=".5" />
    </g>)}
  </svg>;
}

// Les ligues ont leurs propres insignes. Le laurier du vainqueur reste au podium.
const INSIGNES_DE_LIGUE = [
  { cadre: 'simple', motif: 'plume' },
  { cadre: 'postal', motif: 'feuilles' },
  { cadre: 'vitrail', motif: 'boussole' },
  { cadre: 'cristal', motif: 'oracle' },
  { cadre: 'eclipse', motif: 'cristal' },
  { cadre: 'astral', motif: 'phenix' },
] as const;

function SceauDeJoute({ cote, grand = false }: { cote: number; grand?: boolean }) {
  const insigne = INSIGNES_DE_LIGUE[ligueDe(cote, REGLES).rang] ?? INSIGNES_DE_LIGUE[0];
  return <span className={`sceau-joute${grand ? ' sceau-joute--grand' : ''}`} aria-hidden="true">
    {grand && <span className="sceau-joute__armes"><ArmesDeJoute /></span>}
    <span className="sceau-joute__coeur"><Embleme motif={insigne.motif} /></span>
    <CadreGrave modele={insigne.cadre} />
  </span>;
}

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
    <div className="joutes joutes--arene">
      <section className="joutes__champion" data-ligue={ligue.nom} aria-label="Ton rang dans les joutes">
        <SceauDeJoute cote={cote} grand />
        <p className="joutes__ligue">Ligue {ligue.nom}</p>
        {saisie === null ? (
          <>
            <h2 className="joutes__nom">{pseudo || '…'}</h2>
            <p className="joutes__cote"><strong>{cote.toLocaleString('fr-FR')}</strong><span>Cote</span></p>
            <div className="joutes__bilan">
              {rang && <span><strong>{rang.rang === 1 ? '1ᵉʳ' : `${rang.rang}ᵉ`}</strong> / {rang.joueurs}</span>}
              <span>{jouees === 0 ? 'Première joute' : <><strong>{gagnees}</strong> victoire{gagnees > 1 ? 's' : ''} / {jouees}</>}</span>
            </div>
            {ligue.suivante && <div className="joutes__progression">
              <div><span>{ligue.suivante.nom}</span><span>{cote} / {ligue.suivante.aPartirDe}</span></div>
              <span className="progression__barre" role="progressbar" aria-label={`Progression vers la ligue ${ligue.suivante.nom}`} aria-valuemin={bas} aria-valuemax={ligue.suivante.aPartirDe} aria-valuenow={cote}><span style={{ width: `${Math.min(100, Math.max(0, ((cote - bas) / (ligue.suivante.aPartirDe - bas)) * 100))}%` }} /></span>
            </div>}
            {publication.etat === 'erreur' && <p className="joute__refus" role="alert">{publication.message}</p>}
            <div className="joutes__liens">
              <a href={lien({ ecran: 'classement' })}>Voir le classement</a>
              <button type="button" onClick={() => { setSaisie(pseudo); setRefus(null); }}>Modifier le pseudo</button>
            </div>
          </>
        ) : formulaire}
      </section>

      <div className="joutes__confrontation" aria-hidden="true"><ArmesDeJoute /><span>VS</span></div>

      <section className="joutes__defis" aria-labelledby="titre-adversaires" aria-busy={enPreparation}>
        <header className="joutes__entete"><h2 id="titre-adversaires">Choisis ton adversaire</h2><span aria-hidden="true">✦</span></header>
        {adversaires.etat === 'erreur' && <p className="joute__refus" role="alert">{adversaires.message}</p>}
        {(adversaires.etat === 'en cours' || publication.etat === 'en cours') && <p className="texte-doux">Recherche d'adversaires…</p>}
        {adversaires.etat === 'pret' && publie && adversaires.donnees.length === 0 && <p className="texte-doux">Aucun adversaire disponible pour l'instant.</p>}
        {adversaires.etat === 'pret' && publie && (
          <div className="joutes__adversaires">
            {adversaires.donnees.map((profil) => (
              <button key={profil.id} type="button" className="defi-joute" data-ligue={ligueDe(profil.cote, REGLES).nom} disabled={enPreparation} onClick={() => onDefier(profil)}>
                <SceauDeJoute cote={profil.cote} />
                <span className="defi-joute__identite">
                  <span className="defi-joute__ligue">{ligueDe(profil.cote, REGLES).nom}</span>
                  <strong className="defi-joute__nom">{profil.pseudo}</strong>
                  <BadgeJoueurSimule maison={profil.maison} />
                </span>
                <span className="defi-joute__cote"><strong>{profil.cote.toLocaleString('fr-FR')}</strong><span>Cote</span></span>
                {cartes && <span className="defi-joute__deck">{raretesDuDeck(profil.deck, cartes)}</span>}
                <span className="defi-joute__enjeux">
                  <span>Victoire <b>{signe(coteApres(cote, profil.cote, 'victoire', REGLES) - cote)}</b></span>
                  <span>Défaite <b>{signe(coteApres(cote, profil.cote, 'defaite', REGLES) - cote)}</b></span>
                  <span className="defi-joute__encre">+{REGLES.encreParVictoire} Encre</span>
                </span>
                <span className="defi-joute__action">Défier <span aria-hidden="true">↗</span></span>
              </button>
            ))}
          </div>
        )}
        <button type="button" className="bouton bouton--discret joutes__renouveler" disabled={enPreparation || !publie} onClick={() => setTirage((t) => t + 1)}><span aria-hidden="true">↻</span> {enPreparation ? 'Préparation…' : 'Autres adversaires'}</button>
      </section>


    </div>
  );
}
