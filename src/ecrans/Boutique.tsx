// La boutique de l'Encre (décision de Raphaël du 26/09/2026) : ce qui s'achète avec l'Encre gagnée en jouant.
// Des pièces qu'on ne gagne pas autrement (cadres, avatars, dos, emballages, couleurs), et un Hors-série au choix parmi
// ceux qui manquent à l'album. L'écran ne contient aucune règle : le serveur débite et range (serveur/boutique.ts).

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Carte, DosDeCarte } from '../composants/carte/Carte.tsx';
import { demanderConfirmation } from '../composants/Confirmation.tsx';
import { Entete } from '../composants/Entete.tsx';
import { Icone } from '../composants/Icone.tsx';
import { Portrait } from '../composants/Identite.tsx';
import { PaquetScelle } from '../composants/paquet/PaquetScelle.tsx';
import { useChargement } from '../composants/useChargement.ts';
import { usePartie } from '../composants/usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { ARTICLES_DE_LA_BOUTIQUE, ornement, refusDAchat } from '../jeu/personnalisation.ts';
import type { ArticleDeLaBoutique } from '../jeu/personnalisation.ts';
import { lien } from '../navigation/routes.ts';
import { messageDe } from '../partage/messages.ts';
import type { CarteIndex } from '../partage/types.ts';
import { chargerEdition } from '../services/cartes.ts';
import { acheterALaBoutique, commanderUnHorsSerie, personnaliser } from '../services/partie.ts';

const PRIX_DU_HORS_SERIE = EQUILIBRAGE.boutique.prixDuHorsSerie;
const enEncre = (n: number): string => `${n.toLocaleString('fr-FR')} Encre`;
const GENRES: Record<ArticleDeLaBoutique['categorie'], string> = { cadre: 'Cadre', avatar: 'Avatar', dos: 'Dos de timbre', paquet: 'Emballage de paquet', couleur: 'Couleur', titre: 'Titre' };

type Message = { texte: string; erreur: boolean };

export function Boutique() {
  const partie = usePartie();
  const edition = useChargement(chargerEdition, 'edition');
  const [occupe, setOccupe] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  if (partie.etat !== 'prete') return <main className="ecran"><p className="texte-doux">Chargement…</p></main>;
  const { sauvegarde } = partie;
  const encre = sauvegarde.encre;
  const profil = sauvegarde.profil;
  const disponible = partie.serveur.etat !== 'appareil';
  const possede = (carte: string): boolean => Object.values(sauvegarde.cartes[carte]?.finitions ?? {}).some((n) => (n ?? 0) > 0);
  const horsSerie = edition.etat === 'pret' ? edition.donnees.cartes.filter((c) => c.rarete === 'Hors-série').sort((a, b) => a.mot.localeCompare(b.mot, 'fr')) : [];
  const manquants = horsSerie.filter((c) => !possede(c.id)).length;

  // Une action à la fois ; son résultat (ou le refus du serveur) s'affiche en haut de la page.
  const agir = async (cle: string, action: () => Promise<string>): Promise<void> => {
    setOccupe(cle); setMessage(null);
    try { setMessage({ texte: await action(), erreur: false }); }
    catch (erreur) { setMessage({ texte: messageDe(erreur), erreur: true }); }
    finally { setOccupe(null); }
  };

  const acheter = async (article: ArticleDeLaBoutique): Promise<void> => {
    const oui = await demanderConfirmation({
      titre: `Acheter « ${article.nom} » ?`,
      message: `${enEncre(article.prix)} quittent ta réserve : il t’en restera ${(encre - article.prix).toLocaleString('fr-FR')}. La pièce reste à toi pour toujours.`,
      confirmer: `Acheter pour ${enEncre(article.prix)}`,
    });
    if (oui) await agir(article.id, async () => { await acheterALaBoutique(article.id); return `« ${article.nom} » est à toi. Tu peux l’équiper tout de suite.`; });
  };

  const commander = async (carte: CarteIndex): Promise<void> => {
    const oui = await demanderConfirmation({
      titre: `Commander « ${carte.mot} » ?`,
      message: `${enEncre(PRIX_DU_HORS_SERIE)} quittent ta réserve : il t’en restera ${(encre - PRIX_DU_HORS_SERIE).toLocaleString('fr-FR')}. Le Hors-série entre aussitôt dans ton album.`,
      confirmer: `Commander pour ${enEncre(PRIX_DU_HORS_SERIE)}`,
    });
    if (oui) await agir(carte.id, async () => { await commanderUnHorsSerie(carte.id); return `« ${carte.mot} » vient d’entrer dans ton album.`; });
  };

  const equiper = (article: ArticleDeLaBoutique): void => {
    personnaliser(article.categorie, article.id);
    setMessage({ texte: `« ${article.nom} » équipé.`, erreur: false });
  };

  return (
    <main className="ecran ecran--large boutique">
      <Entete surtitre="L’Encre" titre="La boutique" actions={<p className="boutique__reserve"><Icone nom="encre" /><span><small>Ta réserve</small><b><strong>{encre.toLocaleString('fr-FR')}</strong> Encre</b></span></p>}>
        Ce qui ne se gagne pas en jouant s’achète ici, avec l’Encre gagnée en jouant : les duels et les doublons des paquets la remplissent.
      </Entete>

      {!disponible ? (
        <section className="etat-vide"><h2>Boutique indisponible</h2><p>La boutique nécessite une connexion au serveur du jeu.</p><a className="bouton" href={lien({ ecran: 'collection' })}>Ouvrir mon album</a></section>
      ) : <>
        {message && <p role={message.erreur ? 'alert' : 'status'} className={`boutique__message${message.erreur ? ' boutique__message--refus' : ''}`}>{message.texte}</p>}

        <section className="rubrique" aria-labelledby="boutique-atelier">
          <header className="boutique__rubrique">
            <h2 id="boutique-atelier">L’atelier d’encre</h2>
            <p className="texte-doux">Quinze pièces qu’on ne trouve qu’ici. Une fois achetées, elles rejoignent ta collection et s’équipent aussi depuis ton profil.</p>
          </header>
          <ul className="liste-nue boutique__articles">
            {ARTICLES_DE_LA_BOUTIQUE.map((article) => {
              const refus = refusDAchat(profil, encre, article.id);
              const achete = profil.achats.includes(article.id);
              const equipe = profil[article.categorie] === article.id;
              const teinte = ornement(article.id)?.teinte;
              return <li key={article.id} className="article" data-achete={achete} style={teinte ? { '--article': teinte } as CSSProperties : undefined}>
                <div className={`article__visuel article__visuel--${article.categorie}`}><Apercu article={article} avatar={profil.avatar} /></div>
                <div className="article__texte">
                  <span className="article__genre">{GENRES[article.categorie]}</span>
                  <h3>{article.nom}</h3>
                  {ornement(article.id)?.description && <p className="texte-doux petit">{ornement(article.id)!.description}</p>}
                </div>
                <div className="article__achat">
                  {achete ? <>
                    <span className="article__prix article__prix--acquis">Dans ta collection</span>
                    {equipe ? <span className="bouton bouton--discret article__equipe">✓ Équipé</span>
                      : <button type="button" className="bouton bouton--discret" onClick={() => equiper(article)}>Équiper</button>}
                  </> : <>
                    <span className="article__prix"><Icone nom="encre" />{article.prix.toLocaleString('fr-FR')}</span>
                    <button type="button" className="bouton" disabled={refus !== null || occupe !== null} onClick={() => void acheter(article)}>{occupe === article.id ? 'Achat…' : 'Acheter'}</button>
                    {refus && <span className="article__manque">{refus}</span>}
                  </>}
                </div>
              </li>;
            })}
          </ul>
        </section>

        <section className="rubrique boutique__commande" aria-labelledby="boutique-hors-serie">
          <header className="boutique__rubrique">
            <h2 id="boutique-hors-serie">Hors-série sur commande</h2>
            <p className="texte-doux">Les seize Hors-série ne tombent qu’un paquet sur mille. Ici, tu choisis celui qui manque à ton album : il y entre aussitôt, pour {enEncre(PRIX_DU_HORS_SERIE)}.</p>
            <div className="boutique__epargne">
              <span className="boutique__jauge" role="progressbar" aria-label="Ta réserve, vers le prix d’un Hors-série" aria-valuemin={0} aria-valuemax={PRIX_DU_HORS_SERIE} aria-valuenow={Math.min(encre, PRIX_DU_HORS_SERIE)}><span style={{ width: `${Math.min(100, (100 * encre) / PRIX_DU_HORS_SERIE)}%` }} /></span>
              <span className="petit texte-doux">{encre >= PRIX_DU_HORS_SERIE ? 'Ta réserve suffit pour un Hors-série.' : `${encre.toLocaleString('fr-FR')} / ${enEncre(PRIX_DU_HORS_SERIE)}`}{edition.etat === 'pret' && ` · ${manquants === 0 ? 'Tu les as tous.' : `${manquants} te manque${manquants > 1 ? 'nt' : ''}`}`}</span>
            </div>
          </header>
          {edition.etat === 'erreur' && <p role="alert" className="texte-doux">{edition.message}</p>}
          {edition.etat === 'en cours' && <p className="texte-doux">Ouverture de la vitrine…</p>}
          <ul className="liste-nue boutique__hors-serie">
            {horsSerie.map((carte) => {
              const dejaLa = possede(carte.id);
              const manque = PRIX_DU_HORS_SERIE - encre;
              return <li key={carte.id} className="commande" data-possede={dejaLa}>
                <div className="commande__timbre">{dejaLa
                  ? <Carte carte={carte} obtenuLe={sauvegarde.cartes[carte.id]?.obtenueLe ?? null} />
                  : <Carte carte={carte} cliquable={false} />}</div>
                {dejaLa ? <span className="commande__etat">Dans ton album</span>
                  : <button type="button" className="bouton bouton--discret commande__bouton" disabled={manque > 0 || occupe !== null} onClick={() => void commander(carte)}
                    aria-label={`Commander « ${carte.mot} » pour ${enEncre(PRIX_DU_HORS_SERIE)}`}>{occupe === carte.id ? 'Commande…' : 'Commander'}</button>}
              </li>;
            })}
          </ul>
        </section>

        <p className="boutique__pied petit texte-doux">Seule l’Encre gagnée en jouant sert à la boutique. Pour échanger des timbres avec les autres joueurs, direction <a href={lien({ ecran: 'marche' })}>le marché</a>.</p>
      </>}
    </main>
  );
}

// L'aperçu d'une pièce, comme dans le vestiaire du profil : un cadre autour de l'avatar du joueur, un avatar seul…
function Apercu({ article, avatar }: { article: ArticleDeLaBoutique; avatar: string }) {
  switch (article.categorie) {
    case 'cadre': return <Portrait avatar={avatar} cadre={article.id} anime={false} />;
    case 'avatar': return <Portrait avatar={article.id} cadre="" anime={false} />;
    case 'dos': return <DosDeCarte modele={article.id} etiquette={article.nom} />;
    case 'paquet': return <PaquetScelle modele={article.id} />;
    default: return <span className="article__encrier" style={{ color: ornement(article.id)?.teinte }}><svg viewBox="0 0 100 100" fill="none" stroke="currentColor" aria-hidden="true"><path d="m30 27-8 19v35q28 13 56 0V46l-8-19ZM30 16h40v11H30Z" strokeWidth="2" /><path d="M24 51q28 10 52 0v29q-26 10-52 0Z" fill="currentColor" fillOpacity=".5" /><path d="M31 45v28" strokeWidth="4" opacity=".6" /><path d="m50 37 8 12-8 12-8-12Z" fill="currentColor" /></svg></span>;
  }
}
