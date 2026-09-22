import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        active
          ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
          : "bg-[var(--color-danger-soft)] text-[var(--color-danger)]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-[var(--color-success)]" : "bg-[var(--color-danger)]"
        }`}
      />
      {active ? "active" : "inactive"}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-[var(--color-text-secondary)] text-sm">
      <Loader2 size={16} className="animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-[var(--color-text-muted)] text-sm">
      {label}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] text-[var(--color-danger)] text-sm px-4 py-3">
      {message}
    </div>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success-soft)] text-[var(--color-success)] text-sm px-4 py-3">
      {message}
    </div>
  );
}
