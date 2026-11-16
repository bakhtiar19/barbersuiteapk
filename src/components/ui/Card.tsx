import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

export function Card({ children, padded = true, className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-stone-200/80 bg-surface shadow-[0_1px_2px_rgba(17,24,39,0.04)] ${
        padded ? 'p-4' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
