type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
};

export function Select({ label, hint, className = '', children, ...props }: Props) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="text-sm font-medium">{label}</span>}
      <select className={`input-field ${className}`} {...props}>
        {children}
      </select>
      {hint && <p className="text-xs text-[var(--muted)]">{hint}</p>}
    </label>
  );
}
