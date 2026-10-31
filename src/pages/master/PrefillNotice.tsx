import { Info } from "lucide-react";

export function PrefillNotice({ source }: { source: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-brand-soft)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
      <Info size={14} className="mt-0.5 shrink-0 text-[var(--color-brand)]" />
      <span>
        Pre-filled from {source}. Review and edit the values, then save to create a new entry - the original is not changed.
      </span>
    </div>
  );
}