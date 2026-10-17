import { useState } from "react";
import { Download } from "lucide-react";
import {
  downloadETicket,
  downloadInvoice,
  type DocumentFormat,
  type DocumentRequest,
} from "../api/endpoints";
import { SectionCard } from "./shared";

export type DocumentParams = Omit<DocumentRequest, "Type">;

interface Props {
  invoiceNumber?: string;
  params?: DocumentParams;
}

export default function DocumentsCard({ invoiceNumber, params }: Props) {
  const [eTicket, setETicket] = useState(false);
  const [invoice, setInvoice] = useState(false);
  const [format, setFormat] = useState<DocumentFormat>("P");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasIds = !!params && !!(params.TransactionID || params.PNR || params.ReferenceNo);
  const canDownload = hasIds && (eTicket || invoice) && !busy;

  async function handleDownload() {
    if (!params || !canDownload) return;
    setBusy(true);
    setError(null);

    const jobs: { label: string; run: () => Promise<void> }[] = [];
    if (eTicket) jobs.push({ label: "E-Ticket", run: () => downloadETicket({ ...params, Type: format }) });
    if (invoice) jobs.push({ label: "Invoice", run: () => downloadInvoice({ ...params, Type: format }) });

    const failures: string[] = [];
    for (const job of jobs) {
      try {
        await job.run();
      } catch (err) {
        failures.push(`${job.label}: ${err instanceof Error ? err.message : "download failed"}`);
      }
    }
    if (failures.length) setError(failures.join(" · "));
    setBusy(false);
  }

  return (
    <SectionCard title="Documents">
      <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" checked={eTicket} onChange={(e) => setETicket(e.target.checked)} /> E-Ticket
        </label>
        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" checked={invoice} onChange={(e) => setInvoice(e.target.checked)} /> Invoice
          {invoiceNumber && (
            <span className="text-xs text-[var(--color-text-muted)] font-mono">({invoiceNumber})</span>
          )}
        </label>

        <div className="flex items-center gap-3 ml-auto">
          <select
            className="input-base w-auto py-1.5 text-sm"
            value={format}
            onChange={(e) => setFormat(e.target.value as DocumentFormat)}
            disabled={busy}
          >
            <option value="P">PDF</option>
            <option value="H">HTML</option>
          </select>
          <button
            type="button"
            className="btn-secondary flex items-center gap-1.5 !py-1.5 text-sm"
            onClick={handleDownload}
            disabled={!canDownload}
            title={hasIds ? "Download the selected documents" : "Transaction details not available"}
          >
            <Download size={14} />
            {busy ? "Downloading…" : "Download"}
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-[var(--color-danger)]">{error}</p>}
    </SectionCard>
  );
}