type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
};

export function Textarea({ label, hint, className = '', ...props }: Props) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="text-sm font-medium">{label}</span>}
      <textarea className={`input-field min-h-[100px] resize-y ${className}`} {...props} />
      {hint && <p className="text-xs text-[var(--muted)]">{hint}</p>}
    </label>
  );
}
