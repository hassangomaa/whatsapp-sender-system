import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
};

const variants: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition',
  ghost: 'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition',
};

export function Button({ variant = 'primary', loading, children, disabled, className = '', ...props }: Props) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`${variants[variant]} disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {loading ? 'Please wait...' : children}
    </button>
  );
}
