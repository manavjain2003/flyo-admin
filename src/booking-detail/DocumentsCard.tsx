import { useState } from "react";
import { Download } from "lucide-react";
import {
  downloadETicket,
  downloadInvoice,
  type DocumentRequest,
} from "../api/endpoints";
import { SectionCard } from "./shared";

export type DocumentParams = Omit<DocumentRequest, "Type">;

interface Props {
  invoiceNumber?: string;
  params?: DocumentParams;
}

type DocKind = "eticket" | "invoice";

export default function DocumentsCard({ invoiceNumber, params }: Props) {
  // Only one document can be selected at a time.
  const [selected, setSelected] = useState<DocKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasIds = !!params && !!(params.TransactionID || params.PNR || params.ReferenceNo);
  const canDownload = hasIds && selected !== null && !busy;

  function toggle(kind: DocKind, checked: boolean) {
    setSelected(checked ? kind : null);
  }

  async function handleDownload() {
    if (!params || !canDownload || !selected) return;
    setBusy(true);
    setError(null);
    try {
      const payload: DocumentRequest = { ...params, Type: "P" }; // PDF only
      if (selected === "eticket") await downloadETicket(payload);
      else await downloadInvoice(payload);
    } catch (err) {
      const label = selected === "eticket" ? "E-Ticket" : "Invoice";
      setError(`${label}: ${err instanceof Error ? err.message : "download failed"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard title="Documents">
      <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={selected === "eticket"}
            onChange={(e) => toggle("eticket", e.target.checked)}
            disabled={busy}
          />{" "}
          E-Ticket
        </label>
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={selected === "invoice"}
            onChange={(e) => toggle("invoice", e.target.checked)}
            disabled={busy}
          />{" "}
          Invoice
          {invoiceNumber && (
            <span className="text-xs text-[var(--color-text-muted)] font-mono">({invoiceNumber})</span>
          )}
        </label>

        <div className="flex items-center gap-3 ml-auto">
          <button
            type="button"
            className="btn-secondary flex items-center gap-1.5 !py-1.5 text-sm"
            onClick={handleDownload}
            disabled={!canDownload}
            title={hasIds ? "Download the selected document (PDF)" : "Transaction details not available"}
          >
            <Download size={14} />
            {busy ? "Downloading…" : "Download PDF"}
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-[var(--color-danger)]">{error}</p>}
    </SectionCard>
  );
}