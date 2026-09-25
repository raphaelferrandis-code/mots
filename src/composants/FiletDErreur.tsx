// Le filet de sécurité de l'affichage : sans lui, la moindre erreur pendant l'affichage d'un écran démonte toute
// l'application et laisse une page vide. Ici, le joueur lit ce qui arrive et peut recharger.
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

type Etat = { erreur: string | null };

export class FiletDErreur extends Component<{ children: ReactNode }, Etat> {
  state: Etat = { erreur: null };

  static getDerivedStateFromError(erreur: unknown): Etat {
    return { erreur: erreur instanceof Error ? erreur.message : String(erreur) };
  }

  componentDidCatch(erreur: unknown, info: ErrorInfo): void {
    console.error('Erreur d’affichage', erreur, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.erreur === null) return this.props.children;
    return (
      <main className="ecran">
        <h1>Un problème est survenu</h1>
        <section className="bloc bloc--alerte" role="alert">
          <p>Cet écran n'a pas pu s'afficher. Ta collection n'est pas touchée : recharge la page pour reprendre.</p>
          <p className="texte-doux petit">{this.state.erreur}</p>
          <button type="button" className="bouton" onClick={() => window.location.reload()}>Recharger la page</button>
        </section>
      </main>
    );
  }
}
