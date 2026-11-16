import type { ReactNode } from 'react';

type BadgeVariant = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  neutral: 'bg-stone-100 text-stone-700',
  brand: 'bg-brand-50 text-brand-700 border border-brand-200',
  success: 'bg-green-50 text-green-700 border border-green-200',
  warning: 'bg-amber-50 text-amber-800 border border-amber-200',
  danger: 'bg-red-50 text-red-700 border border-red-200',
};

export function Badge({
  children,
  variant = 'neutral',
  className = '',
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

