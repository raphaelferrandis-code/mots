// Une liste par thème (/mots/<adresse>/, src/pages/themes.ts), fabriquée d'avance en HTML comme les pages des mots :
// chaque mot avec son sens et la part des gens qui le connaissent, par paliers, puis l'appel à jouer et les autres
// listes. Chemins relatifs : la page vit dans mots/<adresse>/, le jeu deux niveaux plus haut.

import type { CarteIndex } from '../partage/types.ts';
import { Bandeau, Pied } from './Cadre.tsx';
import { Appel } from './PageDuMot.tsx';
import { timbresDuTheme } from './themes.ts';
import type { Liste, MotDuTheme, Theme } from './themes.ts';

const NATURE: Record<CarteIndex['type'], string> = { Nom: 'nom', Verbe: 'verbe', Adjectif: 'adjectif', Adverbe: 'adverbe' };

function Mot({ mot, adresse, racine, theme }: { mot: MotDuTheme; adresse: string; racine: string; theme: Theme }) {
  const { carte } = mot;
  return (
    <li>
      {theme.genre === 'records' && carte.record && <p className="page-theme__record">{carte.record}</p>}
      <a href={`${racine}mot/${adresse}/`}>{carte.mot}</a>{' '}
      <span className="page-theme__nature">{NATURE[carte.type]}{theme.montrerLangue ? ` · ${mot.langue.charAt(0).toLowerCase()}${mot.langue.slice(1)}` : ''}</span>
      {mot.prevalence !== null && theme.genre !== 'records' && <span className="page-theme__connu">connu de {mot.prevalence} %</span>}
      <p className="page-theme__sens">{carte.definition}</p>
    </li>
  );
}

// adresses : l'adresse de la page de chaque timbre ; autres : les autres listes, pour passer de l'une à l'autre.
export function PageDuTheme({ theme, adresses, autres }: { theme: Theme; adresses: ReadonlyMap<string, string>; autres: Liste[] }) {
  const racine = '../../';
  return (
    <div className="page-mot">
      <Bandeau racine={racine} />
      <main className="page-mot__corps">
        <header className="page-theme__tete">
          <h1 className="page-mots__titre">{theme.titre}</h1>
          <p className="page-theme__chapeau">{theme.chapeau}</p>
        </header>

        {theme.paliers.map((palier) => <section key={palier.titre || 'liste'} className="page-theme__palier">
          {palier.titre && <h2>{palier.titre}</h2>}
          <ul className="page-theme__liste">
            {palier.mots.map((m) => <Mot key={m.carte.id} mot={m} adresse={adresses.get(m.carte.id)!} racine={racine} theme={theme} />)}
          </ul>
        </section>)}
        {theme.genre !== 'records' && <p className="page-theme__legende">
          « Connu de » : la part des gens interrogés qui connaissent le mot, mesurée par <a href="http://www.lexique.org">Lexique 4</a>.
        </p>}

        <Appel racine={racine} accroche="Ces mots sont des timbres à collectionner." timbres={timbresDuTheme(theme)} />

        <nav className="page-theme__autres" aria-label="Les autres listes">
          <h2>Les autres listes</h2>
          <ul>
            {autres.map((l) => <li key={l.adresse}><a href={`../${l.adresse}/`}>{l.titre}</a></li>)}
            <li><a href="../">Tous les mots, de A à Z</a></li>
          </ul>
        </nav>
      </main>
      <Pied racine={racine} />
    </div>
  );
}
