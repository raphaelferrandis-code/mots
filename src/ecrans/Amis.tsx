import { useEffect, useRef, useState } from 'react';
import { CarteLegendee } from '../composants/carte/CarteLegendee.tsx';
import { ChoixDuPseudonyme } from '../composants/ChoixDuPseudonyme.tsx';
import { useChargement } from '../composants/useChargement.ts';
import { usePartie } from '../composants/usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { registresMasques } from '../jeu/partie.ts';
import { lien } from '../navigation/routes.ts';
import { FINITIONS } from '../partage/types.ts';
import type { CarteIndex } from '../partage/types.ts';
import { amisDisponibles } from '../services/amis.ts';
import { serveurEquipes } from '../services/equipes.ts';
import type { AlbumAmi, CarnetAmis, Relation, TimbreEchange } from '../services/amis.ts';
import { chargerEdition } from '../services/cartes.ts';
import { commanderCombat, demanderUnAmi, lireAlbumAmi, lireMesAmis, proposerUnEchange, repondreAUnAmi, repondreAUnEchange } from '../services/partie.ts';
import './amis.css';

type Agir = (action: () => Promise<void>, message: string) => Promise<boolean>;
const STATUTS = { attente: 'En attente', accepte: 'Échange effectué', refuse: 'Refusé', annule: 'Annulé', expire: 'Expiré' };

export function Amis() {
  const partie = usePartie();
  const disponible = amisDisponibles && partie.etat === 'prete';
  const [tour, setTour] = useState(0);
  const [pseudo, setPseudo] = useState('');
  const [occupe, setOccupe] = useState(false);
  const verrou = useRef(false);
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [amiChoisi, setAmiChoisi] = useState<Relation | null>(null);
  const [aRetirer, setARetirer] = useState<string | null>(null);
  const [aAccepter, setAAccepter] = useState<string | null>(null);
  const carnet = useChargement(() => disponible ? lireMesAmis() : Promise.resolve(null), `amis:${disponible}:${tour}`);
  const equipe = useChargement(() => disponible ? serveurEquipes().lire() : Promise.resolve(null), `equipe:${disponible}:${tour}`);
  const invitationsEquipe = equipe.etat === 'pret' ? equipe.donnees?.invitations.length ?? 0 : 0;
  const [dernierCarnet, setDernierCarnet] = useState<CarnetAmis | null>(null);
  useEffect(() => { if (carnet.etat === 'pret') setDernierCarnet(carnet.donnees); }, [carnet]);
  const edition = useChargement(chargerEdition, 'edition');
  // Une actualisation en arrière-plan ne ferme pas les confirmations et ne vole pas le focus du formulaire.
  const donnees = carnet.etat === 'pret' ? carnet.donnees : dernierCarnet;
  const cartes = edition.etat === 'pret' ? new Map(edition.donnees.cartes.map(c => [c.id, c])) : new Map<string, CarteIndex>();
  // Les demandes reçues et échanges conclus ailleurs apparaissent au retour sur l'onglet et toutes les 30 s.
  useEffect(() => {
    if (!disponible) return;
    const rafraichir = () => { if (!verrou.current && document.visibilityState === 'visible') setTour(t => t + 1); };
    window.addEventListener('focus', rafraichir);
    const minuterie = window.setInterval(rafraichir, 30_000);
    return () => { window.removeEventListener('focus', rafraichir); window.clearInterval(minuterie); };
  }, [disponible]);

  const agir: Agir = async (action, succes) => {
    if (verrou.current) return false;
    verrou.current = true; setOccupe(true); setErreur(''); setMessage('');
    try { await action(); setMessage(succes); setTour(t => t + 1); return true; }
    catch (e) { setErreur(e instanceof Error ? e.message : String(e)); return false; }
    finally { verrou.current = false; setOccupe(false); }
  };
  const nomTimbre = (id: string, finition: string) => `${cartes.get(id)?.mot ?? id} · ${finition}`;
  const amis = donnees?.relations.filter(a => a.etat === 'ami') ?? [];
  const demandes = donnees?.relations.filter(a => a.etat !== 'ami') ?? [];
  const pret = partie.etat === 'prete' && partie.sauvegarde.deck.length === EQUILIBRAGE.duel.tailleDuDeck;
  const defier = async (ami: Relation) => {
    if (partie.etat !== 'prete') return;
    await agir(async () => {
      await commanderCombat({ type: 'commencer', requete: crypto.randomUUID(), choix: {
        mode: 'amical', adversaire: ami.id, masques: registresMasques(partie.sauvegarde), temps: partie.sauvegarde.reglages.tempsDeReponse,
      } });
      window.location.hash = lien({ ecran: 'duel' });
    }, '');
  };

  return <main className="ecran amis" aria-busy={occupe}>
    <h1 className="visuellement-cache">Amis</h1>
    <div className="amis__outils"><a className="bouton bouton--discret" href={lien({ ecran: 'equipe' })}>Mon équipe{invitationsEquipe > 0 && ` · ${invitationsEquipe} invitation${invitationsEquipe > 1 ? 's' : ''}`}</a>{disponible && <button className="bouton outil" disabled={occupe} onClick={() => setTour(t => t + 1)}>Actualiser</button>}</div>
    {message && <p className="bloc" role="status">{message}</p>}
    {erreur && <p className="bloc bloc--alerte" role="alert">{erreur}</p>}
    {!amisDisponibles ? <section className="etat-vide"><h2>Retrouvons-nous en ligne</h2><p>Les amis, échanges et défis nécessitent une connexion au serveur du jeu.</p></section>
      : partie.etat !== 'prete' ? <p role="status">{partie.etat === 'erreur' ? partie.message : 'Chargement du compte…'}</p>
      : <>
        {carnet.etat === 'erreur' && <section className="bloc bloc--alerte" role="alert"><p>{carnet.message}</p><button className="bouton" onClick={() => setTour(t => t + 1)}>Réessayer</button></section>}
        {carnet.etat === 'en cours' && !donnees && <p role="status">Chargement du carnet…</p>}
        {donnees && !donnees.moi && <section className="rubrique"><ChoixDuPseudonyme onValide={() => { setMessage('Ton pseudonyme est enregistré.'); setTour(t => t + 1); }} /></section>}
        {donnees?.moi && <>
          <section className="rubrique amis__invitation"><h2>Ajouter un ami</h2>
            <p>Ton pseudonyme : <strong>{donnees.moi.pseudo}</strong></p>
            <form className="amis__recherche" onSubmit={e => { e.preventDefault(); void agir(() => demanderUnAmi(pseudo), 'Demande envoyée.').then(ok => { if (ok) setPseudo(''); }); }}>
              <label>Pseudonyme de ton ami<input required maxLength={24} placeholder="Son pseudonyme exact" value={pseudo} onChange={e => setPseudo(e.target.value)} /></label>
              <button className="bouton" disabled={occupe || !pseudo.trim()}>Envoyer une demande</button>
            </form>
            <p className="texte-doux petit">Vos collections seront visibles l’une pour l’autre.</p>
          </section>
          {demandes.length > 0 && <section className="rubrique"><h2>Demandes d’amitié <small>({demandes.length})</small></h2><ul className="liste-nue amis__liste">
            {demandes.map(a => <li key={a.id} className="amis__ligne"><div><strong>{a.pseudo}</strong><p className="texte-doux">{a.etat === 'recue' ? 'Souhaite t’ajouter à ses amis' : 'Demande envoyée'}</p></div><div className="rangee-de-boutons">
              {a.etat === 'recue' && <button className="bouton" disabled={occupe} onClick={() => void agir(() => repondreAUnAmi(a.id, 'accepter'), `${a.pseudo} fait maintenant partie de tes amis.`)}>Accepter</button>}
              <button className="bouton bouton--discret" disabled={occupe} onClick={() => void agir(() => repondreAUnAmi(a.id, a.etat === 'recue' ? 'refuser' : 'annuler'), 'Demande retirée.')}>{a.etat === 'recue' ? 'Refuser' : 'Annuler'}</button>
            </div></li>)}
          </ul></section>}
          <section className="rubrique"><h2>Amis <small>({amis.length})</small></h2>
            {amis.length > 0 && <p className="texte-doux">Défie leur double, sans effet sur le classement.</p>}
            {!pret && <p><a href={lien({ ecran: 'deck' })}>Compose un deck de {EQUILIBRAGE.duel.tailleDuDeck} timbres pour lancer un défi.</a></p>}
            {amis.length === 0 ? <p className="etat-vide">Aucun ami pour le moment.</p> : <ul className="liste-nue amis__liste">
              {amis.map(a => <li key={a.id} className="amis__ligne"><div><strong>{a.pseudo}</strong>{!a.defiable && <p className="texte-doux petit">Son deck n’est pas encore prêt.</p>}</div>
                <div className="rangee-de-boutons"><button className="bouton" disabled={occupe} onClick={() => { setAmiChoisi(a); setMessage(''); setErreur(''); }}>Échanger</button>
                  <button className="bouton bouton--discret" disabled={occupe || !pret || !a.defiable} onClick={() => void defier(a)}>Défier son double</button>
                  <button className="bouton bouton--discret" disabled={occupe} onClick={() => setARetirer(a.id)}>Retirer</button>
                </div>
                {aRetirer === a.id && <div className="amis__confirmation"><p>Retirer {a.pseudo} annulera aussi vos échanges en attente.</p><div className="rangee-de-boutons"><button className="bouton" disabled={occupe} onClick={() => void agir(() => repondreAUnAmi(a.id, 'retirer'), 'Ami retiré.').then(ok => { if (ok) { setARetirer(null); setAmiChoisi(null); } })}>Confirmer le retrait</button><button className="bouton bouton--discret" disabled={occupe} onClick={() => setARetirer(null)}>Garder cet ami</button></div></div>}
              </li>)}
            </ul>}
          </section>
        </>}
        {amiChoisi && <ComposerEchange key={amiChoisi.id} ami={amiChoisi} cartes={cartes} monAlbum={Object.entries(partie.sauvegarde.cartes).map(([carte, p]) => ({ carte, finitions: p.finitions }))} occupe={occupe} agir={agir} fermer={() => setAmiChoisi(null)} />}
        {donnees?.moi && <section className="rubrique"><h2>Échanges</h2>
          <p className="texte-doux">Un timbre contre un timbre, sans frais.</p>
          {edition.etat === 'erreur' && <p role="alert">{edition.message}</p>}
          {donnees.echanges.length === 0 ? <p className="etat-vide">Aucun échange pour le moment.</p> : <ul className="liste-nue amis__liste">
            {donnees.echanges.map(e => <li key={e.id} className="amis__echange"><div className="amis__ligne"><strong>{e.envoye ? 'Proposé à' : 'Proposé par'} {e.pseudo}</strong><span>{STATUTS[e.etat]}</span></div>
              <p>Tu donnes <strong>{nomTimbre(e.envoye ? e.offerte : e.demandee, e.envoye ? e.finition_offerte : e.finition_demandee)}</strong><br />Tu reçois <strong>{nomTimbre(e.envoye ? e.demandee : e.offerte, e.envoye ? e.finition_demandee : e.finition_offerte)}</strong></p>
              {e.etat === 'attente' && <><p className="texte-doux petit">Expire le {new Date(e.expire_le).toLocaleDateString('fr-FR')}</p><div className="rangee-de-boutons">
                {!e.envoye && <button className="bouton" disabled={occupe || edition.etat !== 'pret'} onClick={() => setAAccepter(e.id)}>Examiner et accepter</button>}
                <button className="bouton bouton--discret" disabled={occupe} onClick={() => void agir(() => repondreAUnEchange(e.id, e.envoye ? 'annuler' : 'refuser'), 'Échange retiré.')}>{e.envoye ? 'Annuler' : 'Refuser'}</button>
              </div></>}
              {aAccepter === e.id && e.etat === 'attente' && !e.envoye && <div className="amis__confirmation">
                <div className="amis__timbres"><ApercuTimbre titre="Tu donnes" timbre={{ carte: e.demandee, finition: e.finition_demandee }} cartes={cartes} /><ApercuTimbre titre="Tu reçois" timbre={{ carte: e.offerte, finition: e.finition_offerte }} cartes={cartes} /></div>
                <p>Les deux timbres seront transférés ensemble. Si tu donnes ton dernier exemplaire d’un mot, il sera aussi retiré de ton deck.</p>
                <div className="rangee-de-boutons"><button className="bouton" disabled={occupe} onClick={() => void agir(() => repondreAUnEchange(e.id, 'accepter'), 'Échange effectué. Ta collection est à jour.').then(ok => { if (ok) setAAccepter(null); })}>Confirmer l’échange</button><button className="bouton bouton--discret" disabled={occupe} onClick={() => setAAccepter(null)}>Fermer</button></div>
              </div>}
            </li>)}
          </ul>}
        </section>}
      </>}
  </main>;
}

function ApercuTimbre({ titre, timbre, cartes }: { titre: string; timbre: TimbreEchange; cartes: Map<string, CarteIndex> }) {
  const carte = cartes.get(timbre.carte);
  return <div className="amis__apercu"><h3>{titre}</h3>{carte && <CarteLegendee carte={carte} finition={timbre.finition} />}<p>{timbre.finition}</p></div>;
}

function ChoixTimbre({ titre, album, cartes, choix, choisir }: { titre: string; album: AlbumAmi; cartes: Map<string, CarteIndex>; choix: TimbreEchange | null; choisir: (t: TimbreEchange | null) => void }) {
  const [recherche, setRecherche] = useState('');
  const options = album.flatMap(p => FINITIONS.filter(f => (p.finitions[f] ?? 0) > 0).map(finition => ({ carte: p.carte, finition })))
    .filter(t => cartes.has(t.carte) && (cartes.get(t.carte)!.mot.toLocaleLowerCase('fr').includes(recherche.trim().toLocaleLowerCase('fr')) || t.carte === choix?.carte))
    .sort((a, b) => cartes.get(a.carte)!.mot.localeCompare(cartes.get(b.carte)!.mot, 'fr'));
  return <div className="amis__choix"><label>Rechercher — {titre.toLowerCase()}<input type="search" value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Un mot…" /></label>
    <label>{titre}<select required aria-label={titre} value={choix ? JSON.stringify(choix) : ''} onChange={e => choisir(options.find(t => JSON.stringify(t) === e.target.value) ?? null)}><option value="">Choisir un timbre ({options.length})</option>{options.map(t => <option key={JSON.stringify(t)} value={JSON.stringify(t)}>{cartes.get(t.carte)!.mot} · {t.finition} · {cartes.get(t.carte)!.rarete}</option>)}</select></label>
    {choix && <ApercuTimbre titre={titre} timbre={choix} cartes={cartes} />}
  </div>;
}

function ComposerEchange({ ami, monAlbum, cartes, occupe, agir, fermer }: { ami: Relation; monAlbum: AlbumAmi; cartes: Map<string, CarteIndex>; occupe: boolean; agir: Agir; fermer: () => void }) {
  const [tour, setTour] = useState(0);
  const album = useChargement(() => lireAlbumAmi(ami.id), `${ami.id}:${tour}`);
  const [offerte, setOfferte] = useState<TimbreEchange | null>(null);
  const [demandee, setDemandee] = useState<TimbreEchange | null>(null);
  const requete = useRef({ signature: '', id: '' });
  const panneau = useRef<HTMLElement>(null);
  useEffect(() => { panneau.current?.scrollIntoView({ block: 'start' }); panneau.current?.focus({ preventScroll: true }); }, []);
  return <section className="rubrique amis__composition" ref={panneau} tabIndex={-1} aria-label={`Échange avec ${ami.pseudo}`}><h2>Échanger avec {ami.pseudo}</h2>
    <p>Choisis les deux timbres. Proposition valable 7 jours.</p>
    {album.etat === 'en cours' && <p role="status">Lecture de sa collection…</p>}
    {album.etat === 'erreur' && <p role="alert">{album.message} <button className="bouton" onClick={() => setTour(t => t + 1)}>Réessayer</button></p>}
    {album.etat === 'pret' && <form onSubmit={e => { e.preventDefault(); if (!offerte || !demandee) return;
      const signature = JSON.stringify([ami.id, offerte, demandee]);
      if (requete.current.signature !== signature) requete.current = { signature, id: crypto.randomUUID() };
      void agir(() => proposerUnEchange(requete.current.id, ami.id, offerte, demandee), 'Proposition envoyée. Tes timbres restent dans ta collection jusqu’à l’acceptation.').then(ok => { if (ok) fermer(); });
    }}><fieldset disabled={occupe}><div className="amis__timbres"><ChoixTimbre titre="Tu donnes" album={monAlbum} cartes={cartes} choix={offerte} choisir={setOfferte} /><ChoixTimbre titre="Tu reçois" album={album.donnees} cartes={cartes} choix={demandee} choisir={setDemandee} /></div>
      {album.donnees.length === 0 && <p>Ton ami ne possède pas encore de timbres.</p>}
      <p className="texte-doux petit">Si tu échanges ton dernier exemplaire d’un mot, il sera retiré de ton deck à l’acceptation. Tes apprentissages restent acquis.</p>
      <button className="bouton" disabled={!offerte || !demandee || JSON.stringify(offerte) === JSON.stringify(demandee)}>Envoyer la proposition</button></fieldset></form>}
    <button className="bouton bouton--discret" disabled={occupe} onClick={fermer}>Fermer la proposition</button>
  </section>;
}
