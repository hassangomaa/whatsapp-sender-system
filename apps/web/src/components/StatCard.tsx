import Link from 'next/link';
import { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  href,
  footer,
}: {
  label: string;
  value: ReactNode;
  href?: string;
  footer?: ReactNode;
}) {
  const inner = (
    <>
      <div className="text-sm text-[var(--muted)]">{label}</div>
      <div className="text-2xl sm:text-3xl font-bold mt-2">{value}</div>
      {footer && <div className="text-xs text-[var(--muted)] mt-2">{footer}</div>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="stat-card block">
        {inner}
      </Link>
    );
  }

  return <div className="stat-card">{inner}</div>;
}
