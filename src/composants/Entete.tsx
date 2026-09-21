import type { ReactNode } from 'react';

export function Entete({ surtitre, titre, children }: { surtitre?: string; titre: string; children?: ReactNode }) {
  return (
    <header className="entete">
      {surtitre && <span className="entete__surtitre">{surtitre}</span>}
      <h1>{titre}</h1>
      {children && <p className="texte-doux">{children}</p>}
    </header>
  );
}

// Encadré provisoire : dit ce que l'écran contiendra, et à quelle phase du projet.
export function AVenir({ phase, children }: { phase: string; children: ReactNode }) {
  return (
    <section className="bloc bloc--a-venir" aria-label="Fonction à venir">
      <span className="entete__surtitre">À venir — {phase}</span>
      <div className="texte-doux">{children}</div>
    </section>
  );
}
