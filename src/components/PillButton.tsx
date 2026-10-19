import type { ButtonHTMLAttributes } from 'react';

type Icon = 'play' | 'stop' | 'retry';

const ICONS: Record<Icon, string> = {
  play: 'M6.5 4.5v7l6-3.5z',
  stop: 'M5 5h6v6H5z',
  retry: 'M12.5 6.5A4.75 4.75 0 1 0 13 9 M13 3.5v3h-3',
};

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'secondary';
  icon: Icon;
}

export function PillButton({ variant, icon, children, className = '', ...rest }: PillButtonProps) {
  const primary = variant === 'primary';
  return (
    <button
      type="button"
      className={`group flex h-14 w-full cursor-pointer items-center justify-between rounded-full pr-1.5 pl-7 text-[17px] font-semibold
        transition-[transform,background-color,border-color] duration-300 ease-instrument active:scale-[0.98]
        focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:h-16
        ${primary ? 'bg-accent text-bg hover:bg-[#d3f584]' : 'border border-hairline text-text hover:border-text-2/40 hover:bg-white/3'}
        ${className}`}
      {...rest}
    >
      {children}
      <span
        className={`flex size-11 items-center justify-center rounded-full transition-transform duration-300 ease-instrument
          group-hover:scale-105 sm:size-[52px] ${primary ? 'bg-bg/12' : 'bg-white/8'}`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 16 16" className="size-4" fill={icon === 'retry' ? 'none' : 'currentColor'} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d={ICONS[icon]} />
        </svg>
      </span>
    </button>
  );
}
