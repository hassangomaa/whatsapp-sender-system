export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        {label}
      </div>
    </div>
  );
}
