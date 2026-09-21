import type { SVGProps } from 'react';

const DESSINS = {
  encre: <><path d="M9 3h6v4H9zM8 10h8l3 4v6H5v-6z" /><path d="M8 15h8" /></>,
  album: <><path d="M12 5v15M12 5C9 3 5 3 2 4v14c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1Z" /></>,
  fleche: <><path d="M4 12h16m-6-6 6 6-6 6" /></>,
} as const;

export function Icone({ nom, ...props }: SVGProps<SVGSVGElement> & { nom: keyof typeof DESSINS }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{DESSINS[nom]}</svg>;
}
