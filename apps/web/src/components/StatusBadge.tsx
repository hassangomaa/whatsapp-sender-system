type Tone = 'green' | 'gray' | 'blue' | 'red' | 'amber';

const tones: Record<Tone, string> = {
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  gray: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  blue: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

export function StatusBadge({ children, tone = 'gray' }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
