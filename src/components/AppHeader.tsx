import { Link } from 'react-router-dom';

const LINKS = {
  history: { to: '/history', label: 'Histórico', icon: 'M8 4.5V8l2.2 1.4 M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0Z' },
  home: { to: '/', label: 'Novo teste', icon: 'M13 8H3 M7 4 3 8l4 4' },
};

export function AppHeader({ link }: { link: keyof typeof LINKS }) {
  const target = LINKS[link];
  return (
    <header className="flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
        <svg viewBox="0 0 24 24" className="size-6 text-accent" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" aria-hidden="true">
          <path d="M13 2 5 13h6l-2 9 9-12h-6z" />
        </svg>
        <span className="text-lg font-semibold tracking-tight sm:text-xl">Speed Test</span>
      </Link>
      <Link
        to={target.to}
        className="flex min-h-11 items-center gap-2 rounded-md px-1 text-[15px] font-medium text-text-2 transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={target.icon} />
        </svg>
        {target.label}
      </Link>
    </header>
  );
}
