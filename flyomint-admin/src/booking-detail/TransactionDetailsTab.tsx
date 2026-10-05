import type { ReactNode } from "react";
import type {
  SearchTransactionBillingInfo,
  SearchTransactionPaymentInfo,
  TransactionLeg,
} from "../types";
import { Badge, SectionCard, fmt, fmtCurrency } from "./shared";

interface Props {
  legs?: TransactionLeg[];
  payment: SearchTransactionPaymentInfo | null;
  billing?: SearchTransactionBillingInfo | null; // kept so the parent call doesn't break; billing is shown in Booking Details
}

/* ---------- building blocks ---------- */

// Label above value, with a thin underline so empty slots still look intentional.
function Cell({ label, value, mono }: { label: string; value?: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0 pb-2.5 border-b border-[var(--color-border-soft)]">
      <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">{label}</p>
      <div className={`text-sm font-medium min-h-[1.5rem] break-all ${mono ? "font-mono" : ""}`}>
        {value ?? ""}
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold mb-4">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">{children}</div>
    </div>
  );
}

// One transaction / refund block: header strip, timestamps, then grouped details
function Block({
  idLabel,
  idValue,
  status,
  amount,
  created,
  updated,
  children,
}: {
  idLabel: string;
  idValue?: string;
  status?: string;
  amount?: ReactNode;
  created?: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
      <div className="flex items-center justify-between gap-4 flex-wrap px-6 py-4 bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">{idLabel}</p>
          <p className="text-sm font-semibold font-mono break-all min-h-[1.25rem]">{idValue ?? ""}</p>
        </div>
        <div className="flex items-center gap-4">
          {status ? <Badge label={status} /> : null}
          <span className="text-xl font-semibold min-h-[1.75rem]">{amount ?? ""}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-6 px-6 py-5 border-b border-[var(--color-border-soft)]">
        <Cell label="Creation Timestamp" value={created} />
        <Cell label="Update Timestamp" value={updated} />
      </div>

      <div className="px-6 py-6 space-y-9">{children}</div>
    </div>
  );
}

// Action buttons from the reference UI; no handlers yet, so they are disabled
function SectionActions({ labels }: { labels: string[] }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      {labels.map((l) => (
        <button
          key={l}
          type="button"
          disabled
          className="text-xs font-medium border border-[var(--color-border)] rounded-md px-3.5 py-1.5 opacity-60 cursor-not-allowed"
        >
          {l}
        </button>
      ))}
    </div>
  );
}

/* ---------- main ---------- */

export default function TransactionDetailsTab({ payment }: Props) {
  return (
    <div className="space-y-6">
      {/* ================= Transaction Info ================= */}
      <SectionCard title="Transaction Info">
        <SectionActions labels={["Unmask PII", "Sync Payment"]} />

        <Block
          idLabel="Txn. ID"
          idValue=""
          status={payment?.PaymentStatus}
          amount={payment ? fmtCurrency(payment.AmountPaid) : ""}
          created={payment?.PaymentDateTime ? fmt(payment.PaymentDateTime) : ""}
          updated=""
        >
          <Group title="Transaction Details">
            <Cell label="PG Txn ID" value={payment?.PaymentGatewayRefId} mono />
            <Cell label="Bank Txn ID" value="" />
            <Cell label="Bank" value="" />
            <Cell label="Payment Mode" value={payment?.PaymentMode} />
            <Cell label="Juspay Customer ID" value="" />
            <Cell label="Sync Payment Message" value="" />
          </Group>

          <Group title="Payment Details">
            <Cell label="Payment ID" value="" />
            <Cell label="PG Provider" value="" />
            <Cell label="Payment Gateway" value={payment?.PaymentGatewayName} />
            <Cell label="Payment Status" value={payment?.PaymentStatus} />
            <Cell label="Bank Card Name" value="" />
            <Cell label="Failure Reason" value="" />
          </Group>
        </Block>
      </SectionCard>

      {/* ================= Refund Info ================= */}
      <SectionCard title="Refund Info">
        <SectionActions labels={["Unmask PII", "Sync Refund"]} />

        <Block idLabel="Refund. ID" idValue="" status="" amount="" created="" updated="">
          <Group title="Refund Details">
            <Cell label="Refund Status" value="" />
            <Cell label="Refund Amount" value="" />
            <Cell label="Refund Provider" value="" />
            <Cell label="Refund TAT" value="" />
            <Cell label="Contact ID" value="" />
            <Cell label="Refund Txn Id" value="" mono />
            <Cell label="Failure Reason" value="" />
          </Group>

          <Group title="Block Details">
            <Cell label="Blocked by" value="" />
            <Cell label="Blocked Date" value="" />
            <Cell label="Block Reason" value="" />
            <Cell label="Unblocked by" value="" />
            <Cell label="Unblock Date" value="" />
            <Cell label="Unblock Reason" value="" />
          </Group>

          <Group title="Gateway Details">
            <Cell label="Refund Gateway Name" value="" />
            <Cell label="Refund Gateway Status" value="" />
            <Cell label="Refund Mode" value="" />
            <Cell label="Bank ARN" value="" />
            <Cell label="Payout Link" value="" />
            <Cell label="PG Request ID" value="" mono />
            <Cell label="Sync Refund Message" value="" />
          </Group>
        </Block>
      </SectionCard>
    </div>
  );
}