import type { ReactNode } from "react";

export function fmt(raw: string | null | undefined): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function fmtCurrency(n: number | null | undefined): string {
  if (!n && n !== 0) return "—";
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export function maskMiddle(s: string | null | undefined, visibleStart = 2, visibleEnd = 2): string {
  if (!s) return "—";
  if (s.length <= visibleStart + visibleEnd) return s;
  return `${s.slice(0, visibleStart)}${"•".repeat(Math.max(4, s.length - visibleStart - visibleEnd))}${s.slice(-visibleEnd)}`;
}

export function Field({ label, value, mono }: { label: string; value?: ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className={`text-sm font-medium text-[var(--color-text-primary)] ${mono ? "font-mono" : ""}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}

export type Tone = "neutral" | "success" | "brand" | "warning" | "danger";

export function pill(s: string): Tone {
  const u = s.toUpperCase();
  if (u.includes("CONFIRM") || u.includes("COLLECTED")) return "success";
  if (u.includes("PROGRESS") || (u.includes("INITIAT") && !u.includes("NOT"))) return "brand";
  if (u.includes("CANCEL") || u.includes("FAIL")) return "danger";
  if (u.includes("PEND") || u.includes("NOT INIT")) return "warning";
  return "neutral";
}

const TONE_CLS: Record<Tone, string> = {
  neutral: "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] border border-[var(--color-border)]",
  success: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
  brand:   "bg-[var(--color-brand-soft)] text-[var(--color-brand)]",
  warning: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  danger:  "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
};

export function Badge({ label }: { label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLS[pill(label)]}`}>
      {label || "—"}
    </span>
  );
}

export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card-base p-5 mb-4">
      <h3 className="text-sm font-semibold mb-4 pb-3 border-b border-[var(--color-border-soft)]">{title}</h3>
      {children}
    </div>
  );
}