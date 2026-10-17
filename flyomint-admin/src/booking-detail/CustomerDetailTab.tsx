import { useMemo, useState } from "react";
import {
  Clock, Phone, Mail, Copy, CheckCircle2, XCircle, MapPin,
} from "lucide-react";
import { EmptyState } from "../components/common/UI";
import { groupTransactionsByBooking } from "../api/endpoints";
import type { TransactionContactInfo, TransactionLeg } from "../types";
import { SectionCard, fmt, maskMiddle, pill, type Tone } from "./shared";

function ScoreGauge({ value, max = 100, size = 88 }: { value: number; max?: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value / max));
  const offset = circumference * (1 - pct);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--color-border-soft)" strokeWidth="8" fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke="var(--color-success)" strokeWidth="8" fill="none"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        className="fill-[var(--color-text-primary)] font-semibold" style={{ fontSize: size * 0.2 }}>
        {value.toFixed(0)}%
      </text>
    </svg>
  );
}

function ContactRow({ icon, value, mono, onCopy }: { icon: React.ReactNode; value: string; mono?: boolean; onCopy?: () => void }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-[var(--color-text-muted)]">{icon}</span>
      <span className={mono ? "font-mono" : ""}>{value || "—"}</span>
      {value && value !== "—" && (
        <button type="button" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          onClick={onCopy} title="Copy">
          <Copy size={12} />
        </button>
      )}
    </div>
  );
}

type Period = "3m" | "12m" | "lifetime";

const PERIOD_OPTIONS: [Period, string][] = [
  ["3m", "Last 3 months"],
  ["12m", "Last 12 months"],
  ["lifetime", "Lifetime"],
];

function periodCutoff(period: Period): Date | null {
  if (period === "lifetime") return null;
  const months = period === "3m" ? 3 : 12;
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

export default function CustomerDetailTab({
  contact,
  legs,
}: {
  contact: TransactionContactInfo | null;
  legs: TransactionLeg[];
}) {
  const [period, setPeriod] = useState<Period>("lifetime");
  const [unmasked, setUnmasked] = useState(false);

  const filteredLegs = useMemo(() => {
    const cutoff = periodCutoff(period);
    if (!cutoff) return legs;
    return legs.filter((l) => {
      const d = new Date(l.BookingDate);
      return !isNaN(d.getTime()) && d >= cutoff;
    });
  }, [legs, period]);

  const groups = useMemo(() => groupTransactionsByBooking(filteredLegs), [filteredLegs]);

  const stats = useMemo(() => {
    const totalBookings = groups.length;
    const statusTally: Record<Tone, number> = { success: 0, danger: 0, warning: 0, brand: 0, neutral: 0 };
    const paymentTally: Record<Tone, number> = { success: 0, danger: 0, warning: 0, brand: 0, neutral: 0 };

    for (const g of groups) {
      const status = g.Legs[0]?.CurrentStatus ?? "";
      statusTally[pill(status)] += 1;
      const paymentStatus = g.Legs[0]?.PaymentStatus ?? "";
      paymentTally[pill(paymentStatus)] += 1;
    }

    const routeCounts = new Map<string, number>();
    for (const l of filteredLegs) {
      if (!l.Sector) continue;
      routeCounts.set(l.Sector, (routeCounts.get(l.Sector) ?? 0) + 1);
    }
    const topRoutes = Array.from(routeCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const dates = filteredLegs
      .map((l) => new Date(l.BookingDate))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    const firstBookingDate = dates[0] ?? null;
    const lastBookingDate = dates[dates.length - 1] ?? null;

    const tenureDays = firstBookingDate
      ? Math.max(0, Math.round((Date.now() - firstBookingDate.getTime()) / 86400000))
      : null;

    const confirmationRate = totalBookings ? (statusTally.success / totalBookings) * 100 : 0;
    const avgLegsPerBooking = totalBookings ? filteredLegs.length / totalBookings : 0;

    return {
      totalBookings,
      statusTally,
      paymentTally,
      topRoutes,
      firstBookingDate,
      lastBookingDate,
      tenureDays,
      confirmationRate,
      avgLegsPerBooking,
      totalLegs: filteredLegs.length,
    };
  }, [groups, filteredLegs]);

  if (!contact) {
    return <EmptyState label="No customer profile linked to this booking." />;
  }

  const copy = (v: string) => navigator.clipboard?.writeText(v);
  const pendingCount = stats.statusTally.warning + stats.statusTally.brand;

  return (
    <>
      <div className="card-base p-5 mb-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center font-semibold text-lg">
              {contact.Name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text-primary)]">{contact.Name || "—"}</p>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-0.5 ${
                contact.LoginStatus
                  ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
                  : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
              }`}>
                {contact.LoginStatus ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
            <span>First booking: {stats.firstBookingDate ? fmt(stats.firstBookingDate.toISOString()) : "—"}</span>
            <span className="flex items-center gap-1"><Clock size={12} /> Last booking: {stats.lastBookingDate ? fmt(stats.lastBookingDate.toISOString()) : "—"}</span>
            <button type="button" onClick={() => setUnmasked((v) => !v)} className="btn-secondary !py-1 !px-3 text-xs">
              {unmasked ? "Mask" : "Unmask"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pt-4 border-t border-[var(--color-border-soft)]">
          <ContactRow icon={<Phone size={13} />} value={unmasked ? contact.Mobile : maskMiddle(contact.Mobile, 2, 2)} onCopy={() => copy(contact.Mobile)} />
          <ContactRow icon={<Mail size={13} />} value={unmasked ? contact.Email : maskMiddle(contact.Email, 2, 4)} onCopy={() => copy(contact.Email)} />
        </div>
      </div>

      <div className="flex items-center justify-end mb-4">
        <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] p-0.5">
          {PERIOD_OPTIONS.map(([value, label]) => (
            <button key={value} type="button" onClick={() => setPeriod(value)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                period === value
                  ? "bg-[var(--color-brand)] text-white"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {stats.totalBookings === 0 ? (
        <EmptyState label="No bookings found for this period." />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="card-base p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Total Bookings</p>
              <p className="text-2xl font-semibold">{stats.totalBookings}</p>
            </div>
            <div className="card-base p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] mb-2 flex items-center gap-1">
                <CheckCircle2 size={13} className="text-[var(--color-success)]" /> Confirmed
              </p>
              <p className="text-2xl font-semibold">{stats.statusTally.success}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {stats.totalBookings ? ((stats.statusTally.success / stats.totalBookings) * 100).toFixed(0) : 0}% of bookings
              </p>
            </div>
            <div className="card-base p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] mb-2 flex items-center gap-1">
                <XCircle size={13} className="text-[var(--color-danger)]" /> Cancelled / Failed
              </p>
              <p className="text-2xl font-semibold">{stats.statusTally.danger}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {stats.totalBookings ? ((stats.statusTally.danger / stats.totalBookings) * 100).toFixed(0) : 0}% of bookings
              </p>
            </div>
            <div className="card-base p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] mb-2 flex items-center gap-1">
                <Clock size={13} className="text-[var(--color-warning)]" /> Pending / In Progress
              </p>
              <p className="text-2xl font-semibold">{pendingCount}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {stats.totalBookings ? ((pendingCount / stats.totalBookings) * 100).toFixed(0) : 0}% of bookings
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="card-base p-5 flex items-center gap-4">
              <ScoreGauge value={stats.confirmationRate} />
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Confirmation Rate</p>
                <p className="text-2xl font-semibold mt-1">{stats.confirmationRate.toFixed(1)}%</p>
              </div>
            </div>
            <div className="card-base p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Tenure</p>
              <p className="text-2xl font-semibold">{stats.tenureDays !== null ? `${stats.tenureDays} days` : "—"}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">since first booking on record</p>
            </div>
            <div className="card-base p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Avg. Legs / Booking</p>
              <p className="text-2xl font-semibold">{stats.avgLegsPerBooking.toFixed(2)}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">{stats.totalLegs} total sectors booked</p>
            </div>
          </div>

          <SectionCard title="Payment Status Breakdown">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              <div>
                <p className="text-lg font-semibold">{stats.paymentTally.success}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Payment Collected</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{stats.paymentTally.brand}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Payment Initiated</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{stats.paymentTally.warning + stats.paymentTally.neutral}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Not Initiated / Other</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{stats.paymentTally.danger}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Failed</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Top Routes">
            {stats.topRoutes.length === 0 ? (
              <EmptyState label="No route data available." />
            ) : (
              <div className="space-y-2">
                {stats.topRoutes.map(([route, count]) => {
                  const max = stats.topRoutes[0][1];
                  const width = max ? (count / max) * 100 : 0;
                  return (
                    <div key={route} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-sm font-mono flex items-center gap-1">
                        <MapPin size={12} className="text-[var(--color-text-muted)]" /> {route}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                        <div className="h-full bg-[var(--color-brand)]" style={{ width: `${width}%` }} />
                      </div>
                      <span className="w-6 text-right text-xs text-[var(--color-text-muted)]">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </>
      )}
    </>
  );
}