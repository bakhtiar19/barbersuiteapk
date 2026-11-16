import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm disabled:bg-brand-600/50',
  secondary:
    'bg-brand-900 text-white hover:bg-stone-800 active:bg-stone-950 shadow-sm disabled:bg-stone-400',
  outline:
    'bg-white text-ink border border-stone-300 hover:bg-stone-50 active:bg-stone-100 disabled:text-stone-400',
  ghost: 'bg-transparent text-ink hover:bg-stone-100 active:bg-stone-200 disabled:text-stone-400',
  danger: 'bg-danger text-white hover:bg-red-700 active:bg-red-800 shadow-sm disabled:bg-red-300',
  success:
    'bg-success text-white hover:bg-green-700 active:bg-green-800 shadow-sm disabled:bg-green-300',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-[38px] px-3 py-1.5 text-sm rounded-xl',
  md: 'min-h-[44px] px-4 py-2.5 text-sm font-semibold rounded-xl',
  lg: 'min-h-[50px] px-5 py-3 text-base font-semibold rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  );
}

