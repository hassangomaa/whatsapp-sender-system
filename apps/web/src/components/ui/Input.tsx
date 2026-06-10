import { InputHTMLAttributes, forwardRef } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, className = '', ...props },
  ref,
) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="text-sm font-medium">{label}</span>}
      <input
        ref={ref}
        className={`w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
});
