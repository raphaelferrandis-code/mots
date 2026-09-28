// Le marché : les enchères entre joueurs (docs/BRIEF-marche.md). Il dit ce qu'il est et comment il marche, montre d'abord
// « Tes enchères » (dépassées, en tête, vendues…), permet de vendre un timbre sans passer par sa fiche, puis la salle des
// ventes en tuiles (audit de finition du 26/09/2026, chantier 7).
// L'écran ne contient aucune règle : tout passe par src/services/partie.ts, et le serveur a le dernier mot.

import { useEffect, useRef, useState } from 'react';
import { Entete } from '../composants/Entete.tsx';
import { useChargement } from '../composants/useChargement.ts';
import { useMaintenant, usePartie } from '../composants/usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import type { Enchere } from '../jeu/marche.ts';
import { lien } from '../navigation/routes.ts';
import { chargerEdition } from '../services/cartes.ts';
import { marquerLeCourrierLu } from '../services/courrier.ts';
import type { PageDuMarche } from '../services/marche.ts';
import { decalageDuServeur, lireLeMarche, lireMesEncheres } from '../services/partie.ts';
import { MesEncheres } from './marche/MesEncheres.tsx';
import { TuileDEnchere } from './marche/TuileDEnchere.tsx';
import { VendreUnTimbre } from './marche/VendreUnTimbre.tsx';
import './marche.css';

const REGLES = EQUILIBRAGE.marche;
const enToutesLettres = (date: number): string => new Date(date).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

export function Marche() {
  const partie = usePartie();
  const edition = useChargement(chargerEdition, 'edition');
  const maintenant = useMaintenant(30_000) + decalageDuServeur();
  const [recherche, setRecherche] = useState('');
  // La recherche part 300 ms après la dernière touche frappée : plus une requête par lettre.
  const [cherche, setCherche] = useState('');
  useEffect(() => {
    const minuterie = window.setTimeout(() => setCherche(recherche.trim().toLowerCase()), 300);
    return () => window.clearTimeout(minuterie);
  }, [recherche]);
  const [page, setPage] = useState(0);
  const [tour, setTour] = useState(0); // rechargé après chaque action
  const [vendre, setVendre] = useState(false);
  const [annonce, setAnnonce] = useState<string | null>(null);

  const disponible = partie.etat === 'prete' && partie.serveur.etat !== 'appareil';
  const marche = useChargement(async () => (disponible ? lireLeMarche(cherche, page) : null), `marche:${disponible}:${cherche}:${page}:${tour}`);
  // Pendant qu'une recherche ou une actualisation charge, la liste précédente reste affichée (estompée), sans clignoter.
  const derniere = useRef<PageDuMarche | null>(null);
  if (marche.etat === 'pret' && marche.donnees) derniere.current = marche.donnees;
  const affichee = marche.etat === 'pret' ? marche.donnees : marche.etat === 'en cours' ? derniere.current : null;
  const miennes = useChargement(async () => (disponible ? lireMesEncheres() : null), `miennes:${disponible}:${tour}`);
  // Mes enchères et mes ventes sont lues ici : leur part du courrier aussi (services/courrier.ts).
  useEffect(() => { if (miennes.etat === 'pret' && miennes.donnees) marquerLeCourrierLu(['enchere', 'vente'], { encheres: miennes.donnees }); }, [miennes]);
  const cartes = edition.etat === 'pret' ? new Map(edition.donnees.cartes.map((c) => [c.id, c])) : null;

  if (partie.etat !== 'prete') return <main className="ecran"><p className="texte-doux">Chargement…</p></main>;

  const reserve = partie.sauvegarde.encre + (partie.compte?.formule.encreAchetee ?? 0);
  // Un compte neuf regarde, mais ne mise ni ne vend avant trois jours (quand le serveur le dit : script 26).
  const ouvertLe = miennes.etat === 'pret' ? miennes.donnees?.ouvertLe ?? null : null;
  const ouvert = ouvertLe === null || ouvertLe <= maintenant;
  const actualiser = (): void => setTour((t) => t + 1);
  const vendu = (enchere: Enchere, mot: string): void => {
    setVendre(false);
    setAnnonce(`« ${mot} » est en vente jusqu’au ${enToutesLettres(enchere.fermeLe)}, à partir de ${enchere.miseDeDepart.toLocaleString('fr-FR')} Encre. Tu la suis dans « Tes enchères ».`);
    actualiser();
  };

  return (
    <main className="ecran ecran--large marche">
      <Entete titre="Le marché" actions={<>
        {disponible && ouvert && <button type="button" className="bouton" aria-expanded={vendre} onClick={() => { setAnnonce(null); setVendre((v) => !v); }}>Vendre un timbre</button>}
        <a className="bouton bouton--discret" href={lien({ ecran: 'amis' })}>Échanger avec un ami</a>
      </>}>
        Les collectionneurs y vendent leurs timbres aux enchères. Ta réserve : <strong>{reserve.toLocaleString('fr-FR')}</strong> Encre.
      </Entete>

      {!disponible ? (
        <section className="etat-vide"><h2>Marché indisponible</h2><p>Le marché nécessite une connexion au serveur du jeu.</p><a className="bouton" href={lien({ ecran: 'collection' })}>Ouvrir mon album</a></section>
      ) : (
        <>
          <details className="marche__regles">
            <summary>Comment ça marche ?</summary>
            <ul>
              <li><strong>Miser</strong> met ton Encre de côté. Si quelqu’un te dépasse, elle te revient aussitôt.</li>
              <li>À la fin de l’enchère, le timbre va au meilleur enchérisseur ; le vendeur reçoit le prix moins {Math.round(REGLES.commission * 100)} % de commission. Une mise dans les {REGLES.prolongationEnMinutes} dernières minutes prolonge l’enchère de {REGLES.prolongationEnMinutes} minutes.</li>
              <li><strong>Vendre</strong> : choisis un timbre de ton album, sa mise de départ et la durée ({REGLES.dureesEnHeures.join(', ')} heures). Il quitte ton album le temps de la vente, et y revient s’il ne trouve pas preneur.</li>
              {affichee?.animation && <li>Des joueurs simulés animent aussi le marché tant qu’il y a peu de monde : ils vendent des timbres neufs, et rachètent parfois une vente restée sans mise. Leurs ventes ne comptent pas dans la cote.</li>}
              <li>Jusqu’à {REGLES.achatsParJourAuPlus} achats par jour et {REGLES.ventesEnCoursAuPlus} ventes en même temps. Un compte arrivé depuis moins de {EQUILIBRAGE.comptesNeufs.joursAvantLesEchanges} jours regarde, sans miser ni vendre.</li>
            </ul>
          </details>
          {!ouvert && ouvertLe !== null && <p className="message message--info">Le marché s’ouvre pour toi le {enToutesLettres(ouvertLe)} : tu pourras alors miser et vendre. En attendant, regarde ce qui s’y vend.</p>}
          {annonce && <p className="message message--succes" role="status">{annonce}</p>}
          {vendre && cartes && <VendreUnTimbre sauvegarde={partie.sauvegarde} cartes={edition.etat === 'pret' ? edition.donnees.cartes : []} onVendu={vendu} onFermer={() => setVendre(false)} />}

          {miennes.etat === 'pret' && miennes.donnees && (
            <MesEncheres ventes={miennes.donnees.ventes} mises={miennes.donnees.mises} cartes={cartes} maintenant={maintenant} encre={reserve} ouvert={ouvert} onChange={actualiser} />
          )}

          <section className="rubrique salle-des-ventes" aria-labelledby="titre-salle">
            <div className="salle-des-ventes__tete">
              <h2 id="titre-salle">En vente</h2>
              <div className="salle-des-ventes__outils">
                <input type="search" placeholder="Chercher un mot…" value={recherche} onChange={(e) => { setRecherche(e.target.value); setPage(0); }} aria-label="Chercher un mot en vente" />
                <button type="button" className="bouton outil" onClick={actualiser}>Actualiser</button>
              </div>
            </div>
            {marche.etat === 'erreur' && <p className="message message--erreur" role="alert">{marche.message}</p>}
            {marche.etat === 'en cours' && !affichee && <p className="texte-doux">Ouverture du marché…</p>}
            {affichee && (
              <div aria-busy={marche.etat === 'en cours'} className="salle-des-ventes__contenu">
                {affichee.total === 0
                  ? <div className="etat-vide"><h3>{cherche ? 'Aucun timbre trouvé' : 'Rien en vente pour l’instant'}</h3>{cherche ? <button className="bouton" onClick={() => { setRecherche(''); setCherche(''); setPage(0); }}>Effacer la recherche</button> : ouvert && <p>Sois le premier : « Vendre un timbre ».</p>}</div>
                  : <p className="texte-doux petit">{affichee.total.toLocaleString('fr-FR')} enchère{affichee.total > 1 ? 's' : ''} en cours, les plus proches de la fin d’abord.</p>}
                <ul className="salle-des-ventes__grille">
                  {affichee.encheres.map((enchere) => (
                    <TuileDEnchere key={enchere.id} enchere={enchere} carte={cartes?.get(enchere.carte)} maintenant={maintenant} encre={reserve} ouvert={ouvert} onChange={actualiser} />
                  ))}
                </ul>
                <div className="rangee-de-boutons">
                  {page > 0 && <button type="button" className="bouton bouton--discret" onClick={() => setPage((p) => p - 1)}>Enchères précédentes</button>}
                  {affichee.total > (page + 1) * REGLES.encheresParPage && <button type="button" className="bouton bouton--discret" onClick={() => setPage((p) => p + 1)}>Enchères suivantes</button>}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
