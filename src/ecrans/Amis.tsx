import { useEffect, useRef, useState } from 'react';
import { CarteLegendee } from '../composants/carte/CarteLegendee.tsx';
import { ChoixDuPseudonyme } from '../composants/ChoixDuPseudonyme.tsx';
import { Cachet, EnteteCorrespondance, LIEN_EQUIPE_2V2, PortraitAmi, Presence, TimbreEmbleme, Vitrine, signeGrave } from '../composants/correspondance/Correspondance.tsx';
import { InviterDesAmis } from '../composants/InviterDesAmis.tsx';
import { Timbre } from '../composants/timbre/Timbre.tsx';
import { secoursEtParrainage } from '../services/compte.ts';
import { useChargement } from '../composants/useChargement.ts';
import { usePartie } from '../composants/usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { profilVisible } from '../jeu/personnalisation.ts';
import { registresMasques } from '../jeu/partie.ts';
import { lien } from '../navigation/routes.ts';
import { FINITIONS } from '../partage/types.ts';
import type { CarteIndex } from '../partage/types.ts';
import { amisDisponibles } from '../services/amis.ts';
import { serveurEquipes } from '../services/equipes.ts';
import type { Equipe } from '../services/equipes.ts';
import type { AlbumAmi, CarnetAmis, Echange, Relation, TimbreEchange } from '../services/amis.ts';
import { chargerEdition } from '../services/cartes.ts';
import { commanderCombat, demanderUnAmi, lireAlbumAmi, lireMesAmis, proposerUnEchange, repondreAUnAmi, repondreAUnEchange } from '../services/partie.ts';
import { messageDe } from '../partage/messages.ts';
import './amis.css';

type Agir = (action: () => Promise<void>, message: string) => Promise<boolean>;
const STATUTS = { attente: 'En attente', accepte: 'Échange effectué', refuse: 'Refusé', annule: 'Annulé', expire: 'Expiré' };
const jourCourt = (le: number) => new Date(le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const trait = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const ICONE_ECHANGE = <svg viewBox="0 0 24 24" aria-hidden="true" {...trait}><path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" /></svg>;
const ICONE_DEFI = <svg viewBox="0 0 24 24" aria-hidden="true" {...trait}><path d="m5 5 14 14M19 5 5 19" /></svg>;
const ICONE_PLUS = <svg viewBox="0 0 24 24" aria-hidden="true" {...trait}><path d="M12 5v14M5 12h14" /></svg>;
const ICONE_LOUPE = <svg viewBox="0 0 24 24" aria-hidden="true" {...trait}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>;

export function Amis() {
  const partie = usePartie();
  const disponible = amisDisponibles && partie.etat === 'prete';
  const [tour, setTour] = useState(0);
  const [occupe, setOccupe] = useState(false);
  const verrou = useRef(false);
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [amiChoisi, setAmiChoisi] = useState<Relation | null>(null);
  const carnet = useChargement(() => disponible ? lireMesAmis() : Promise.resolve(null), `amis:${disponible}:${tour}`);
  const equipe = useChargement(() => disponible ? serveurEquipes().lire() : Promise.resolve(null), `equipe:${disponible}:${tour}`);
  const monEquipe = equipe.etat === 'pret' ? equipe.donnees : null;
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
  // L'onglet Échanges mène ici (#/amis/echanges) : on descend jusqu'à la section une fois le carnet lu.
  const carnetLu = donnees !== null;
  useEffect(() => {
    const aller = () => { if (window.location.hash.endsWith('/echanges')) requestAnimationFrame(() => document.getElementById('echanges')?.scrollIntoView({ block: 'start' })); };
    aller();
    window.addEventListener('hashchange', aller);
    return () => window.removeEventListener('hashchange', aller);
  }, [carnetLu]);

  const agir: Agir = async (action, succes) => {
    if (verrou.current) return false;
    verrou.current = true; setOccupe(true); setErreur(''); setMessage('');
    try { await action(); setMessage(succes); setTour(t => t + 1); return true; }
    catch (e) { setErreur(messageDe(e)); return false; }
    finally { verrou.current = false; setOccupe(false); }
  };
  const amis = donnees?.relations.filter(a => a.etat === 'ami') ?? [];
  const demandes = donnees?.relations.filter(a => a.etat !== 'ami').sort((a, b) => Number(b.etat === 'recue') - Number(a.etat === 'recue')) ?? [];
  const echangesEnCours = donnees?.echanges.filter(e => e.etat === 'attente') ?? [];
  const carnetVide = amis.length === 0 && demandes.length === 0;
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
  const choisir = (a: Relation) => { setAmiChoisi(a); setMessage(''); setErreur(''); };

  return <main className="ecran amis correspondance" aria-busy={occupe}>
    <h1 className="visuellement-cache">Amis</h1>
    <EnteteCorrespondance actif="amis" pseudo={donnees?.moi?.pseudo ?? null} amis={donnees?.moi ? amis.length : undefined} echanges={echangesEnCours.length}
      invitations={monEquipe?.invitations.length ?? 0} signe={monEquipe?.equipe ? signeGrave(monEquipe.equipe.embleme) : undefined}
      occupe={occupe} actualiser={disponible ? () => setTour(t => t + 1) : undefined} />
    {message && <p className="bloc" role="status">{message}</p>}
    {erreur && <p className="bloc bloc--alerte" role="alert">{erreur}</p>}
    {!amisDisponibles ? <section className="etat-vide"><h2>Retrouvons-nous en ligne</h2><p>Les amis, échanges et défis nécessitent une connexion au serveur du jeu.</p></section>
      : partie.etat !== 'prete' ? <p role="status">{partie.etat === 'erreur' ? partie.message : 'Chargement du compte…'}</p>
      : <>
        {carnet.etat === 'erreur' && <section className="bloc bloc--alerte" role="alert"><p>{carnet.message}</p><button className="bouton" onClick={() => setTour(t => t + 1)}>Réessayer</button></section>}
        {carnet.etat === 'en cours' && !donnees && <p role="status">Chargement du carnet…</p>}
        {donnees && !donnees.moi && <>
          {secoursEtParrainage && <InviterDesAmis grand />}
          <section className="rubrique"><ChoixDuPseudonyme onValide={() => { setMessage('Ton pseudonyme est enregistré.'); setTour(t => t + 1); }} /></section>
        </>}
        {donnees?.moi && (carnetVide
          ? <PremierPas pseudo={donnees.moi.pseudo} occupe={occupe} agir={agir} />
          : <div className="amis__disposition">
            <div className="amis__colonne">
              {demandes.length > 0 && <section className="amis__section" aria-labelledby="titre-demandes">
                <div className="amis__titre"><h2 id="titre-demandes">Demandes</h2><span className={`compte${demandes.some(d => d.etat === 'recue') ? ' compte--vif' : ''}`}>{demandes.length}</span></div>
                <ul className="liste-nue demandes">
                  {demandes.map(a => <li key={a.id} className={a.etat === 'recue' ? 'demande demande--recue' : 'demande'}>
                    <PortraitAmi apparence={a} taille={44} />
                    <p className="demande__texte">{a.etat === 'recue' ? <><strong>{a.pseudo}</strong> souhaite t’ajouter à ses amis</> : <>Demande envoyée à <strong>{a.pseudo}</strong><span>En attente de sa réponse</span></>}</p>
                    <div className="rangee-de-boutons">
                      {a.etat === 'recue' && <button className="bouton bouton--accent" disabled={occupe} onClick={() => void agir(() => repondreAUnAmi(a.id, 'accepter'), `${a.pseudo} fait maintenant partie de tes amis.`)}>Accepter</button>}
                      <button className="bouton bouton--discret" disabled={occupe} onClick={() => void agir(() => repondreAUnAmi(a.id, a.etat === 'recue' ? 'refuser' : 'annuler'), 'Demande retirée.')}>{a.etat === 'recue' ? 'Refuser' : 'Annuler'}</button>
                    </div>
                  </li>)}
                </ul>
              </section>}
              <section className="amis__section" aria-labelledby="titre-amis">
                <div className="amis__entete-liste">
                  <div className="amis__titre"><h2 id="titre-amis">Amis</h2><span className="compte">{amis.length}</span></div>
                  <FormulaireAmi occupe={occupe} agir={agir} compact />
                </div>
                {!pret && <p className="petit"><a href={lien({ ecran: 'deck' })}>Compose un deck de {EQUILIBRAGE.duel.tailleDuDeck} timbres pour lancer un défi.</a></p>}
                <ul className="liste-nue fiches-amis">
                  {amis.map(a => <FicheAmi key={a.id} ami={a} cartes={cartes} pret={pret} occupe={occupe} agir={agir}
                    equipier={!!monEquipe?.equipe?.membres.some(m => m.id === a.id)} echanger={() => choisir(a)} defier={() => void defier(a)}
                    retire={() => { if (amiChoisi?.id === a.id) setAmiChoisi(null); }} />)}
                  {secoursEtParrainage && <li><a className="fiche-ami fiche-ami--place" href="#inviter" onClick={e => { e.preventDefault(); document.getElementById('inviter')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>
                    <span className="fiche-ami__plus">{ICONE_PLUS}</span><strong>Une place à prendre</strong>
                    <span>Envoie ton lien d’invitation : à son premier duel, vous recevez chacun {EQUILIBRAGE.parrainage.paquetsOfferts} paquets.</span>
                  </a></li>}
                </ul>
              </section>
            </div>
            <aside className="amis__cote">
              {secoursEtParrainage && <InviterDesAmis />}
              <MiniEquipe equipe={monEquipe?.equipe ?? null} />
            </aside>
          </div>)}
        {amiChoisi && <ComposerEchange key={amiChoisi.id} ami={amiChoisi} cartes={cartes} monAlbum={Object.entries(partie.sauvegarde.cartes).map(([carte, p]) => ({ carte, finitions: p.finitions }))} occupe={occupe} agir={agir} fermer={() => setAmiChoisi(null)} />}
        {donnees?.moi && (!carnetVide || donnees.echanges.length > 0) && <section id="echanges" className="amis__section echanges" aria-labelledby="titre-echanges">
          <div className="amis__titre"><h2 id="titre-echanges">Échanges</h2>{echangesEnCours.length > 0 && <span className="compte">{echangesEnCours.length}</span>}</div>
          {edition.etat === 'erreur' && <p role="alert">{edition.message}</p>}
          {echangesEnCours.length === 0 && <p className="texte-doux">Aucun échange en cours. Un timbre contre un timbre, sans frais : choisis un ami et propose.</p>}
          {echangesEnCours.length > 0 && <ul className="liste-nue echanges__liste">
            {echangesEnCours.map(e => <CarteEchange key={e.id} e={e} ami={amis.find(a => a.pseudo === e.pseudo)} cartes={cartes} occupe={occupe} agir={agir} editionPrete={edition.etat === 'pret'} />)}
          </ul>}
          {donnees.echanges.length > echangesEnCours.length && <details className="echanges__termines">
            <summary>Échanges terminés ({donnees.echanges.length - echangesEnCours.length})</summary>
            <ul className="liste-nue echanges__liste">
              {donnees.echanges.filter(e => e.etat !== 'attente').map(e => <CarteEchange key={e.id} e={e} ami={amis.find(a => a.pseudo === e.pseudo)} cartes={cartes} occupe={occupe} agir={agir} editionPrete={edition.etat === 'pret'} />)}
            </ul>
          </details>}
        </section>}
      </>}
  </main>;
}

function FormulaireAmi({ occupe, agir, compact = false }: { occupe: boolean; agir: Agir; compact?: boolean }) {
  const [pseudo, setPseudo] = useState('');
  return <form className={compact ? 'ajout-ami ajout-ami--compact' : 'ajout-ami'} onSubmit={e => { e.preventDefault(); void agir(() => demanderUnAmi(pseudo), 'Demande envoyée.').then(ok => { if (ok) setPseudo(''); }); }}>
    <label>{compact ? <span className="mention">Ajouter un ami</span> : <span className="visuellement-cache">Pseudonyme de ton ami</span>}
      <span className="champ-correspondance">{ICONE_LOUPE}<input required maxLength={24} placeholder="Son pseudonyme exact" value={pseudo} onChange={e => setPseudo(e.target.value)} /></span>
    </label>
    <button className="bouton" disabled={occupe || !pseudo.trim()}>{compact ? 'Envoyer' : 'Envoyer une demande'}</button>
  </form>;
}

function FicheAmi({ ami, cartes, pret, occupe, agir, equipier, echanger, defier, retire }: {
  ami: Relation; cartes: Map<string, CarteIndex>; pret: boolean; occupe: boolean; agir: Agir; equipier: boolean; echanger: () => void; defier: () => void; retire: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const raison = !ami.defiable ? 'Son deck n’est pas encore prêt.' : !pret ? 'Ton deck n’est pas encore prêt.' : '';
  return <li className="fiche-ami">
    <div className="fiche-ami__tete">
      <PortraitAmi apparence={ami} />
      <div className="fiche-ami__nom"><strong>{ami.pseudo}</strong>
        {(ami.vu_le || equipier) && <span className="texte-doux"><Presence vuLe={ami.vu_le} />{ami.vu_le && equipier && ' · '}{equipier && 'dans ton équipe'}</span>}
      </div>
      <div className="fiche-ami__menu">
        <button type="button" className="bouton bouton--discret bouton--icone" aria-label={`Plus d’actions pour ${ami.pseudo}`} aria-expanded={menu} onClick={() => setMenu(!menu)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
        </button>
        {menu && <div className="fiche-ami__options"><button type="button" className="outil" onClick={() => { setMenu(false); setConfirmer(true); }}>Retirer de mes amis</button></div>}
      </div>
    </div>
    {ami.vitrine && <Vitrine timbres={ami.vitrine} nombre={ami.timbres ?? 0} cartes={cartes} />}
    <div className="fiche-ami__actions">
      <button className="bouton bouton--accent" disabled={occupe} onClick={echanger}>{ICONE_ECHANGE}Échanger</button>
      <button className="bouton" disabled={occupe || !!raison} title={raison || undefined} onClick={defier}>{ICONE_DEFI}Défier son double</button>
    </div>
    {raison && <p className="visuellement-cache">{raison}</p>}
    {confirmer && <div className="fiche-ami__confirmation" role="group" aria-label={`Retirer ${ami.pseudo}`}><p>Retirer {ami.pseudo} annulera aussi vos échanges en attente.</p><div className="rangee-de-boutons">
      <button className="bouton" disabled={occupe} onClick={() => void agir(() => repondreAUnAmi(ami.id, 'retirer'), 'Ami retiré.').then(ok => { if (ok) { setConfirmer(false); retire(); } })}>Confirmer le retrait</button>
      <button className="bouton bouton--discret" disabled={occupe} onClick={() => setConfirmer(false)}>Garder cet ami</button>
    </div></div>}
  </li>;
}

function MiniEquipe({ equipe }: { equipe: Equipe | null }) {
  if (!equipe) return <section className="mini-equipe" aria-labelledby="titre-mini-equipe">
    <span id="titre-mini-equipe" className="mention">Mon équipe</span>
    <p className="texte-doux">Forme un duo avec un ami pour les joutes à deux.</p>
    <a className="bouton" href={lien({ ecran: 'equipe' })}>Former une équipe</a>
  </section>;
  return <section className="mini-equipe" aria-labelledby="titre-mini-equipe">
    <span id="titre-mini-equipe" className="mention">Mon équipe</span>
    <div className="mini-equipe__identite">
      <TimbreEmbleme embleme={equipe.embleme} />
      <div className="mini-equipe__nom"><strong>{equipe.nom}</strong>
        <span className="mini-equipe__duo">{equipe.membres.map(m => <PortraitAmi key={m.id} apparence={m} taille={28} sansNiveau />)}<span className="texte-doux">{equipe.membres.map(m => m.pseudo).join(' & ')}</span></span>
      </div>
    </div>
    <div className="mini-equipe__actions">
      {equipe.membres.length === 2 ? <a className="bouton" href={LIEN_EQUIPE_2V2}>Jouer en 2 contre 2</a> : <a className="bouton" href={lien({ ecran: 'equipe' })}>Inviter un partenaire</a>}
      <a className="bouton bouton--discret bouton--icone" href={lien({ ecran: 'equipe' })} aria-label="Gérer l’équipe"><svg viewBox="0 0 24 24" aria-hidden="true" {...trait}><path d="M5 12h14M13 6l6 6-6 6" /></svg></a>
    </div>
  </section>;
}

function PremierPas({ pseudo, occupe, agir }: { pseudo: string; occupe: boolean; agir: Agir }) {
  const partie = usePartie();
  const profil = partie.etat === 'prete' ? profilVisible(partie.sauvegarde.profil, partie.compte?.formule ?? null) : null;
  const [copie, setCopie] = useState(false);
  const copier = async () => { try { await navigator.clipboard.writeText(pseudo); setCopie(true); window.setTimeout(() => setCopie(false), 2500); } catch { /* reste lisible */ } };
  return <div className="premier-pas">
    <div className="premier-pas__accroche">
      <p>Avec un ami, tu peux échanger des timbres, défier son double et former une équipe pour les joutes à deux.</p>
      <div className="premier-pas__album" aria-hidden="true">
        <span className="timbre-papier premier-pas__moi">{profil && <PortraitAmi apparence={{ avatar: profil.avatar, cadre: profil.cadre }} taille={46} sansNiveau />}<em>{pseudo}</em></span>
        <span className="premier-pas__case premier-pas__case--1">?</span><span className="premier-pas__case premier-pas__case--2" /><span className="premier-pas__case premier-pas__case--3" />
      </div>
    </div>
    <div className="premier-pas__voies">
      {secoursEtParrainage && <InviterDesAmis grand />}
      <section className="voie-pseudo" aria-labelledby="titre-voie-pseudo">
        <h2 id="titre-voie-pseudo">Échanger vos pseudonymes</h2>
        <p className="texte-doux">Ton ami joue déjà ? Entre son pseudonyme exact. Une fois la demande acceptée, vos collections deviennent visibles l’une pour l’autre.</p>
        <FormulaireAmi occupe={occupe} agir={agir} />
        <div className="voie-pseudo__le-tien">
          <span className="timbre-papier timbre-papier--initiale" aria-hidden="true">{pseudo.charAt(0).toUpperCase()}</span>
          <div><span className="mention">Et le tien, à donner</span><strong>{pseudo}</strong></div>
          <button type="button" className="bouton bouton--discret bouton--petit" onClick={() => void copier()}>{copie ? 'Copié' : 'Copier'}</button>
        </div>
      </section>
    </div>
    <section className="ensemble" aria-labelledby="titre-ensemble">
      <h2 id="titre-ensemble">Ce que vous ferez ensemble</h2>
      <ul className="liste-nue ensemble__liste">
        <li><span className="ensemble__dessin ensemble__dessin--echange" aria-hidden="true"><i className="timbre-papier" /><i className="timbre-papier timbre-papier--holo" /><b>{ICONE_ECHANGE}</b></span><div><strong>Échanger</strong><span>Un timbre contre un timbre, sans frais.</span></div></li>
        <li><span className="ensemble__dessin" aria-hidden="true"><Cachet haut="Défi" bas="amical" incline={-12} /></span><div><strong>Défier son double</strong><span>Un duel contre son deck, sans effet sur le classement.</span></div></li>
        <li><span className="ensemble__dessin ensemble__dessin--duo" aria-hidden="true"><i className="ensemble__place" /><em>&amp;</em><i className="ensemble__place ensemble__place--vide" /></span><div><strong>Former une équipe</strong><span>Un duo et une cote commune pour les joutes à deux.</span></div></li>
      </ul>
    </section>
  </div>;
}

function TimbreDEchange({ titre, timbre, cartes }: { titre: string; timbre: TimbreEchange; cartes: Map<string, CarteIndex> }) {
  const carte = cartes.get(timbre.carte);
  return <div className="echange__timbre">
    <span className="echange__vignette">{carte && <Timbre carte={carte} finition={timbre.finition} cliquable={false} reagir={false} />}</span>
    <div><span className="mention">{titre}</span><strong lang="fr">{carte?.mot ?? timbre.carte}</strong><span className="texte-doux">{timbre.finition}{carte && ` · ${carte.rarete}`}</span></div>
  </div>;
}

function CarteEchange({ e, ami, cartes, occupe, agir, editionPrete }: { e: Echange; ami?: Relation; cartes: Map<string, CarteIndex>; occupe: boolean; agir: Agir; editionPrete: boolean }) {
  const [examiner, setExaminer] = useState(false);
  const recu = !e.envoye;
  const donne = { carte: e.envoye ? e.offerte : e.demandee, finition: e.envoye ? e.finition_offerte : e.finition_demandee };
  const recoit = { carte: e.envoye ? e.demandee : e.offerte, finition: e.envoye ? e.finition_demandee : e.finition_offerte };
  const enAttente = e.etat === 'attente';
  return <li className={`echange${enAttente && recu ? ' echange--recu' : ''}${enAttente ? '' : ' echange--termine'}`}>
    <div className="echange__qui">
      <PortraitAmi apparence={ami ?? {}} taille={46} sansNiveau />
      <div><span className="mention">{recu ? 'Reçue' : 'Envoyée'}</span><span>{recu ? 'De' : 'À'} <strong>{e.pseudo}</strong></span></div>
    </div>
    <div className="echange__timbres">
      <TimbreDEchange titre="Tu donnes" timbre={donne} cartes={cartes} />
      <span className="echange__fleche">{ICONE_ECHANGE}</span>
      <TimbreDEchange titre="Tu reçois" timbre={recoit} cartes={cartes} />
    </div>
    <div className="echange__suite">
      {enAttente ? <Cachet haut="Expire" bas={jourCourt(e.expire_le)} ton={recu ? 'accent' : 'doux'} incline={recu ? -9 : 7} /> : <Cachet haut={STATUTS[e.etat].split(' ')[0]} bas={STATUTS[e.etat].split(' ').slice(1).join(' ') || ' '} ton="doux" incline={6} />}
      <span className="visuellement-cache">{enAttente ? `Expire le ${new Date(e.expire_le).toLocaleDateString('fr-FR')}` : STATUTS[e.etat]}</span>
      {enAttente && <div className="echange__actions">
        {recu ? <button className="bouton bouton--accent" disabled={occupe || !editionPrete} onClick={() => setExaminer(true)}>Examiner et accepter</button> : <span className="texte-doux petit">En attente de sa réponse</span>}
        <button className="bouton bouton--discret" disabled={occupe} onClick={() => void agir(() => repondreAUnEchange(e.id, e.envoye ? 'annuler' : 'refuser'), 'Échange retiré.')}>{e.envoye ? 'Annuler' : 'Refuser'}</button>
      </div>}
    </div>
    {examiner && enAttente && recu && <div className="echange__confirmation">
      <p>Tu donnes <strong>{cartes.get(donne.carte)?.mot ?? donne.carte}</strong> ({donne.finition.toLowerCase()}) et tu reçois <strong>{cartes.get(recoit.carte)?.mot ?? recoit.carte}</strong> ({recoit.finition.toLowerCase()}). Les deux timbres sont transférés ensemble. Si tu donnes ton dernier exemplaire d’un mot, il sera aussi retiré de ton deck.</p>
      <div className="rangee-de-boutons"><button className="bouton bouton--accent" disabled={occupe} onClick={() => void agir(() => repondreAUnEchange(e.id, 'accepter'), 'Échange effectué. Ta collection est à jour.').then(ok => { if (ok) setExaminer(false); })}>Confirmer l’échange</button><button className="bouton bouton--discret" disabled={occupe} onClick={() => setExaminer(false)}>Fermer</button></div>
    </div>}
  </li>;
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
  return <section className="amis__composition" ref={panneau} tabIndex={-1} aria-label={`Échange avec ${ami.pseudo}`}>
    <div className="amis__composition-tete"><PortraitAmi apparence={ami} taille={46} sansNiveau /><div><h2>Échanger avec {ami.pseudo}</h2><p className="texte-doux">Choisis les deux timbres. Proposition valable 7 jours.</p></div></div>
    {album.etat === 'en cours' && <p role="status">Lecture de sa collection…</p>}
    {album.etat === 'erreur' && <p role="alert">{album.message} <button className="bouton" onClick={() => setTour(t => t + 1)}>Réessayer</button></p>}
    {album.etat === 'pret' && <form onSubmit={e => { e.preventDefault(); if (!offerte || !demandee) return;
      const signature = JSON.stringify([ami.id, offerte, demandee]);
      if (requete.current.signature !== signature) requete.current = { signature, id: crypto.randomUUID() };
      void agir(() => proposerUnEchange(requete.current.id, ami.id, offerte, demandee), 'Proposition envoyée. Tes timbres restent dans ta collection jusqu’à l’acceptation.').then(ok => { if (ok) fermer(); });
    }}><fieldset disabled={occupe}><div className="amis__timbres"><ChoixTimbre titre="Tu donnes" album={monAlbum} cartes={cartes} choix={offerte} choisir={setOfferte} /><span className="echange__fleche amis__fleche">{ICONE_ECHANGE}</span><ChoixTimbre titre="Tu reçois" album={album.donnees} cartes={cartes} choix={demandee} choisir={setDemandee} /></div>
      {album.donnees.length === 0 && <p>Ton ami ne possède pas encore de timbres.</p>}
      <p className="texte-doux petit">Si tu échanges ton dernier exemplaire d’un mot, il sera retiré de ton deck à l’acceptation. Tes apprentissages restent acquis.</p>
      <div className="rangee-de-boutons"><button className="bouton bouton--accent" disabled={!offerte || !demandee || JSON.stringify(offerte) === JSON.stringify(demandee)}>Envoyer la proposition</button>
        <button type="button" className="bouton bouton--discret" disabled={occupe} onClick={fermer}>Fermer</button></div></fieldset></form>}
    {album.etat !== 'pret' && <button className="bouton bouton--discret" disabled={occupe} onClick={fermer}>Fermer la proposition</button>}
  </section>;
}
