import { Info, AlertTriangle, Lightbulb, CheckCircle2 } from 'lucide-react';

type Variant = 'info' | 'warning' | 'success' | 'tip';

const styles: Record<Variant, { bg: string; icon: typeof Info; titleColor: string }> = {
  info: { bg: 'bg-[var(--callout-blue)] border-blue-200/60 dark:border-blue-900/40', icon: Info, titleColor: 'text-blue-800 dark:text-blue-300' },
  warning: { bg: 'bg-[var(--callout-yellow)] border-amber-200/60 dark:border-amber-900/40', icon: AlertTriangle, titleColor: 'text-amber-900 dark:text-amber-300' },
  success: { bg: 'bg-[var(--callout-green)] border-emerald-200/60 dark:border-emerald-900/40', icon: CheckCircle2, titleColor: 'text-emerald-800 dark:text-emerald-300' },
  tip: { bg: 'bg-[var(--callout-blue)] border-blue-200/60 dark:border-blue-900/40', icon: Lightbulb, titleColor: 'text-blue-800 dark:text-blue-300' },
};

type Props = {
  title: string;
  variant?: Variant;
  children: React.ReactNode;
};

export function InfoCallout({ title, variant = 'info', children }: Props) {
  const s = styles[variant];
  const Icon = s.icon;
  return (
    <div className={`rounded-2xl border p-5 ${s.bg}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${s.titleColor}`} />
        <div className="min-w-0 flex-1">
          <h3 className={`font-semibold text-sm ${s.titleColor}`}>{title}</h3>
          <div className="mt-2 text-sm text-[var(--muted)] space-y-1.5">{children}</div>
        </div>
      </div>
    </div>
  );
}
