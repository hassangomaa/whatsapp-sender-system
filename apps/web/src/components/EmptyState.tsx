import { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card p-10 text-center">
      <h3 className="font-semibold text-lg">{title}</h3>
      {description && <p className="text-sm text-[var(--muted)] mt-2 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
