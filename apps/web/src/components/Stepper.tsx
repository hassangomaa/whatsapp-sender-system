type Step = { id: number; label: string };

type Props = {
  steps: Step[];
  current: number;
};

export function Stepper({ steps, current }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {steps.map((step) => {
        const active = step.id === current;
        const done = step.id < current;
        return (
          <div
            key={step.id}
            className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
              active
                ? 'border-brand bg-brand/10 text-brand'
                : done
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'border-[var(--border)] text-[var(--muted)]'
            }`}
          >
            {step.id}. {step.label}
          </div>
        );
      })}
    </div>
  );
}
