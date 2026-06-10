export function WorkspaceCard() {
  return (
    <div className="mx-3 mb-4 rounded-xl border border-[var(--border)] bg-[var(--callout-blue)] px-3 py-3">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted)]">Workspace</p>
      <p className="font-semibold text-sm mt-0.5">Control center</p>
      <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
        Sessions, messages, campaigns, and packages in one sidebar.
      </p>
    </div>
  );
}
