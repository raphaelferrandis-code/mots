// Le marché : les enchères entre joueurs (BRIEF-marche.md). On y mise, on y achète tout de suite, on y suit ses
// ventes et ses mises. Pour vendre un timbre, on passe par sa fiche (bouton « Vendre ce timbre »).
// L'écran ne contient aucune règle : tout passe par src/services/partie.ts, et le serveur a le dernier mot.

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Carte } from '../composants/carte/Carte.tsx';
import { Entete } from '../composants/Entete.tsx';
import { lien } from '../navigation/routes.ts';
import { useChargement } from '../composants/useChargement.ts';
import { useMaintenant, usePartie } from '../composants/usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { miseMinimale, prixActuel, tempsRestant, vendeurRecoit } from '../jeu/marche.ts';
import type { Enchere } from '../jeu/marche.ts';
import type { CarteIndex } from '../partage/types.ts';
import { chargerEdition } from '../services/cartes.ts';
import { decalageDuServeur, encherir, lireLeMarche, lireMesEncheres, retirerDeLaVente } from '../services/partie.ts';

const REGLES = EQUILIBRAGE.marche;
const messageDe = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));
const enToutesLettres = (date: number): string => new Date(date).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

export function Marche() {
  const partie = usePartie();
  const edition = useChargement(chargerEdition, 'edition');
  const maintenant = useMaintenant(30_000) + decalageDuServeur();
  const [recherche, setRecherche] = useState('');
  const [page, setPage] = useState(0);
  const [tour, setTour] = useState(0); // rechargé après chaque action
  const [message, setMessage] = useState<string | null>(null);

  const disponible = partie.etat === 'prete' && partie.serveur.etat !== 'appareil';
  const marche = useChargement(async () => (disponible ? lireLeMarche(recherche.trim().toLowerCase(), page) : null), `marche:${disponible}:${recherche}:${page}:${tour}`);
  const miennes = useChargement(async () => (disponible ? lireMesEncheres() : null), `miennes:${disponible}:${tour}`);
  const cartes = edition.etat === 'pret' ? new Map(edition.donnees.cartes.map((c) => [c.id, c])) : null;

  if (partie.etat !== 'prete') return <main className="ecran"><p className="texte-doux">Chargement…</p></main>;

  const rafraichir = (texte: string | null = null): void => { setMessage(texte); setTour((t) => t + 1); };
  const agir = async (action: () => Promise<string>): Promise<void> => {
    try { rafraichir(await action()); } catch (erreur) { setMessage(messageDe(erreur)); }
  };

  return (
    <main className="ecran ecran--large marche">
      <Entete titre="Le marché" />

      {!disponible ? (
        <section className="etat-vide"><h2>Marché indisponible</h2><p>Le marché nécessite une connexion au serveur du jeu.</p><a className="bouton" href={lien({ ecran: 'collection' })}>Voir ma collection</a></section>
      ) : (
        <>
          <section className="outils-album" aria-label="Chercher un timbre en vente">
            <input type="search" placeholder="Chercher un mot…" value={recherche} onChange={(e) => { setRecherche(e.target.value); setPage(0); }} aria-label="Chercher un mot" />
            <button type="button" className="bouton outil" onClick={() => rafraichir()}>Actualiser</button>
          </section>
          {message && <p role="status" className="petit marche__message">{message}</p>}

          {marche.etat === 'erreur' && <p className="joute__refus" role="alert">{marche.message}</p>}
          {marche.etat === 'en cours' && <p className="texte-doux">Ouverture du marché…</p>}
          {marche.etat === 'pret' && marche.donnees && (
            <section className="rubrique" aria-label="Enchères en cours">
              {marche.donnees.total === 0 ? <div className="etat-vide"><h2>{recherche.trim() ? 'Aucun timbre trouvé' : 'Aucune enchère en cours'}</h2>{recherche.trim() && <button className="bouton" onClick={() => { setRecherche(''); setPage(0); }}>Effacer la recherche</button>}</div> : <p className="texte-doux petit">{marche.donnees.total} enchère{marche.donnees.total > 1 ? 's' : ''} en cours.</p>}
              <ul className="liste-nue marche__encheres">
                {marche.donnees.encheres.map((enchere) => (
                  <LigneDEnchere key={enchere.id} enchere={enchere} carte={cartes?.get(enchere.carte)} maintenant={maintenant} encre={partie.sauvegarde.encre + (partie.compte?.formule.encreAchetee ?? 0)} onAgir={agir} />
                ))}
              </ul>
              {marche.donnees.total > (page + 1) * REGLES.encheresParPage && <button type="button" className="bouton bouton--discret" onClick={() => setPage((p) => p + 1)}>Enchères suivantes</button>}
              {page > 0 && <button type="button" className="bouton bouton--discret" onClick={() => setPage((p) => p - 1)}>Enchères précédentes</button>}
            </section>
          )}

          {miennes.etat === 'pret' && miennes.donnees && (miennes.donnees.ventes.length > 0 || miennes.donnees.mises.length > 0) && (
            <section className="rubrique" aria-label="Mes ventes et mes mises">
              <h2>Mes ventes et mes mises</h2>
              <ul className="liste-nue marche__encheres">
                {miennes.donnees.ventes.map((enchere) => <LigneDEnchere key={`v${enchere.id}`} enchere={enchere} carte={cartes?.get(enchere.carte)} maintenant={maintenant} encre={partie.sauvegarde.encre + (partie.compte?.formule.encreAchetee ?? 0)} onAgir={agir} />)}
                {miennes.donnees.mises.filter((m) => !miennes.donnees!.ventes.some((v) => v.id === m.id)).map((enchere) => <LigneDEnchere key={`m${enchere.id}`} enchere={enchere} carte={cartes?.get(enchere.carte)} maintenant={maintenant} encre={partie.sauvegarde.encre + (partie.compte?.formule.encreAchetee ?? 0)} onAgir={agir} />)}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}

// Une enchère : le timbre, son prix, le temps qui reste, et ce que l'on peut y faire.
function LigneDEnchere({ enchere, carte, maintenant, encre, onAgir }: { enchere: Enchere; carte: CarteIndex | undefined; maintenant: number; encre: number; onAgir: (action: () => Promise<string>) => Promise<void> }) {
  const [montant, setMontant] = useState<string>(String(miseMinimale(enchere, REGLES)));
  const [ouvert, setOuvert] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const minimum = miseMinimale(enchere, REGLES);
  const enCours = enchere.etat === 'ouverte' && enchere.fermeLe > maintenant;

  const lancer = (action: () => Promise<string>): void => {
    setOccupe(true);
    void onAgir(action).finally(() => setOccupe(false));
  };
  const miser = (evenement: FormEvent): void => {
    evenement.preventDefault();
    const valeur = Math.floor(Number(montant));
    if (!Number.isFinite(valeur) || valeur < minimum) { void onAgir(async () => { throw new Error(`La mise doit être d'au moins ${minimum} Encre.`); }); return; }
    const disponible = encre + (enchere.enTete ? enchere.meilleureMise ?? 0 : 0);
    if (valeur > disponible) { void onAgir(async () => { throw new Error(`Il te manque ${valeur - disponible} Encre pour cette mise.`); }); return; }
    lancer(async () => { const e = await encherir(enchere.id, valeur); return e.etat === 'vendue' ? `« ${carte?.mot ?? enchere.carte} » est à toi pour ${e.prixFinal} Encre.` : `Mise de ${valeur} Encre enregistrée : tu es en tête.`; });
  };
  const acheter = (): void => {
    if (enchere.achatImmediat === null) return;
    if (!window.confirm(`Acheter « ${carte?.mot ?? enchere.carte} » tout de suite pour ${enchere.achatImmediat} Encre ?`)) return;
    lancer(async () => { await encherir(enchere.id, enchere.achatImmediat!); return `« ${carte?.mot ?? enchere.carte} » est à toi pour ${enchere.achatImmediat} Encre.`; });
  };
  const retirer = (): void => {
    if (!window.confirm('Retirer cette vente ? Le timbre revient dans ton album.')) return;
    lancer(async () => { await retirerDeLaVente(enchere.id); return 'Vente retirée : le timbre est revenu dans ton album.'; });
  };

  // Ce qu'est devenue une enchère terminée, vu de moi.
  const bilan = enchere.etat === 'vendue'
    ? (enchere.mienne ? `Vendue à ${enchere.acheteur ?? 'un collectionneur'} pour ${enchere.prixFinal} Encre (tu as reçu ${vendeurRecoit(enchere.prixFinal ?? 0, REGLES)}).` : enchere.remportee ? `Remportée pour ${enchere.prixFinal} Encre.` : `Vendue à ${enchere.acheteur ?? 'un autre collectionneur'} pour ${enchere.prixFinal} Encre.`)
    : enchere.etat === 'invendue' ? 'Invendue : le timbre est revenu dans l’album.' : enchere.etat === 'retiree' ? 'Retirée.' : null;

  return (
    <li className="enchere" data-etat={enchere.etat}>
      <div className="enchere__timbre">{carte ? <Carte carte={carte} finition={enchere.finition} /> : <div className="deck__vide" aria-hidden="true" />}</div>
      <div className="enchere__corps">
        <p className="enchere__titre"><strong>{carte?.mot ?? enchere.carte}</strong>{carte && <span className="texte-doux petit"> · {carte.rarete}{enchere.finition !== 'Normale' && ` · ${enchere.finition.toLowerCase()}`}</span>}</p>
        <p className="texte-doux petit">{enchere.mienne ? 'Ta vente' : `Vendu par ${enchere.vendeur}`}{enchere.etat === 'ouverte' && ` · ${tempsRestant(enchere.fermeLe, maintenant)}`}{enCours && ` (fin le ${enToutesLettres(enchere.fermeLe)})`}</p>
        {bilan ? <p className="petit">{bilan}</p> : (
          <p className="enchere__prix">
            {enchere.meilleureMise === null ? <>Mise de départ <strong>{enchere.miseDeDepart}</strong> Encre</> : <>Meilleure mise <strong>{prixActuel(enchere)}</strong> Encre{enchere.enTete && <span className="enchere__tete"> · tu es en tête</span>}</>}
            {enchere.achatImmediat !== null && <span className="texte-doux petit"> · achat immédiat {enchere.achatImmediat} Encre</span>}
            {enchere.cote !== null && <span className="texte-doux petit"> · cote {enchere.cote} Encre</span>}
          </p>
        )}
        {enCours && !enchere.mienne && (
          <div className="enchere__actions">
            {!ouvert
              ? <div className="rangee-de-boutons">
                  {!enchere.enTete && <button type="button" className="bouton" disabled={occupe} onClick={() => { setMontant(String(minimum)); setOuvert(true); }}>Miser</button>}
                  {enchere.achatImmediat !== null && <button type="button" className="bouton bouton--discret" disabled={occupe} onClick={acheter}>Acheter {enchere.achatImmediat} Encre</button>}
                </div>
              : <form className="enchere__mise" onSubmit={miser}>
                  <label htmlFor={`mise-${enchere.id}`} className="petit">Ta mise (au moins {minimum} Encre)</label>
                  <input id={`mise-${enchere.id}`} type="number" inputMode="numeric" min={minimum} step={1} value={montant} onChange={(e) => setMontant(e.target.value)} />
                  <div className="rangee-de-boutons">
                    <button type="submit" className="bouton" disabled={occupe}>{occupe ? 'Envoi…' : 'Confirmer la mise'}</button>
                    <button type="button" className="bouton bouton--discret" disabled={occupe} onClick={() => setOuvert(false)}>Annuler</button>
                  </div>
                </form>}
          </div>
        )}
        {enCours && enchere.mienne && enchere.meilleureMise === null && <div className="rangee-de-boutons"><button type="button" className="bouton bouton--discret" disabled={occupe} onClick={retirer}>Retirer de la vente</button></div>}
      </div>
    </li>
  );
}
