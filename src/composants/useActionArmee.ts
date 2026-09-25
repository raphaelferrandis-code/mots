import { useEffect, useRef, useState } from 'react';

// Une action destructive en deux temps (« Abandonner », « Vider le deck ») : le premier clic l'arme,
// le second l'exécute. Sans second clic, elle se désarme seule au bout de quelques secondes.
export function useActionArmee(executer: () => void, delai = 3000): { arme: boolean; cliquer: () => void; desarmer: () => void } {
  const [arme, setArme] = useState(false);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const action = useRef(executer);
  action.current = executer;

  const desarmer = (): void => {
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = null;
    setArme(false);
  };
  useEffect(() => () => { if (minuterie.current) clearTimeout(minuterie.current); }, []);

  const cliquer = (): void => {
    if (arme) { desarmer(); action.current(); return; }
    setArme(true);
    minuterie.current = setTimeout(() => { minuterie.current = null; setArme(false); }, delai);
  };
  return { arme, cliquer, desarmer };
}
