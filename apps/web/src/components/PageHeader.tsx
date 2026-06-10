import { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-[var(--muted)] max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
