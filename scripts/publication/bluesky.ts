// Le strict nécessaire pour publier sur Bluesky (protocole AT) : se connecter, envoyer une image, publier un post,
// retrouver ses derniers posts. Le mot de passe est un « mot de passe d'application » (Réglages → Confidentialité et
// sécurité → Mots de passe d'application), rangé dans les secrets de GitHub : il n'apparaît jamais ailleurs.

import type { Facette } from '../../src/partage/postsDeLaDevinette.ts';

const SERVEUR = 'https://bsky.social/xrpc';

export type Session = { accessJwt: string; did: string; handle: string };
export type Reference = { uri: string; cid: string };
export type PostDuFil = { uri: string; cid: string; texte: string; creeLe: string; reponseA: string | null };

async function appeler<T>(methode: string, options: { session?: Session; corps?: unknown; octets?: Uint8Array; type?: string; parametres?: Record<string, string> }): Promise<T> {
  const url = `${SERVEUR}/${methode}${options.parametres ? `?${new URLSearchParams(options.parametres)}` : ''}`;
  const entetes: Record<string, string> = {};
  if (options.session) entetes.Authorization = `Bearer ${options.session.accessJwt}`;
  let corps: BodyInit | undefined;
  if (options.octets) { entetes['Content-Type'] = options.type ?? 'application/octet-stream'; corps = options.octets as unknown as BodyInit; }
  else if (options.corps !== undefined) { entetes['Content-Type'] = 'application/json'; corps = JSON.stringify(options.corps); }
  const reponse = await fetch(url, { method: corps ? 'POST' : 'GET', headers: entetes, body: corps });
  if (!reponse.ok) {
    // Le message de Bluesky, sans jamais répéter ce qui a été envoyé (le mot de passe pourrait y être).
    const erreur = await reponse.json().catch(() => ({})) as { error?: string; message?: string };
    throw new Error(`Bluesky refuse ${methode} (${reponse.status}) : ${erreur.error ?? ''} ${erreur.message ?? ''}`.trim());
  }
  return reponse.json() as Promise<T>;
}

export const seConnecter = (identifiant: string, motDePasse: string): Promise<Session> =>
  appeler<Session>('com.atproto.server.createSession', { corps: { identifier: identifiant, password: motDePasse } });

export async function envoyerUneImage(session: Session, jpeg: Uint8Array): Promise<unknown> {
  const { blob } = await appeler<{ blob: unknown }>('com.atproto.repo.uploadBlob', { session, octets: jpeg, type: 'image/jpeg' });
  return blob;
}

export type Image = { blob: unknown; description: string; largeur: number; hauteur: number };

export async function publier(session: Session, texte: string, facettes: Facette[], images: Image[], reponseA?: { racine: Reference; parent: Reference }): Promise<Reference> {
  const post: Record<string, unknown> = {
    $type: 'app.bsky.feed.post',
    text: texte,
    facets: facettes,
    langs: ['fr'],
    createdAt: new Date().toISOString(),
  };
  if (images.length) post.embed = { $type: 'app.bsky.embed.images', images: images.map((i) => ({ image: i.blob, alt: i.description, aspectRatio: { width: i.largeur, height: i.hauteur } })) };
  if (reponseA) post.reply = { root: reponseA.racine, parent: reponseA.parent };
  return appeler<Reference>('com.atproto.repo.createRecord', { session, corps: { repo: session.did, collection: 'app.bsky.feed.post', record: post } });
}

// Les derniers posts du compte (sans les republications), du plus récent au plus ancien.
export async function derniersPosts(session: Session, nombre = 30): Promise<PostDuFil[]> {
  type Fil = { feed: { post: { uri: string; cid: string; author: { did: string }; record: { text?: string; createdAt?: string; reply?: { parent: { uri: string } } } } }[] };
  const { feed } = await appeler<Fil>('app.bsky.feed.getAuthorFeed', { session, parametres: { actor: session.did, limit: String(nombre), filter: 'posts_with_replies' } });
  return feed.filter((f) => f.post.author.did === session.did).map((f) => ({
    uri: f.post.uri, cid: f.post.cid, texte: f.post.record.text ?? '', creeLe: f.post.record.createdAt ?? '', reponseA: f.post.record.reply?.parent.uri ?? null,
  }));
}
