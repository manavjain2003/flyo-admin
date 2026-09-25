import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Eye, Pencil, ChevronDown, FileText } from "lucide-react";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ErrorBanner,
} from "../../components/common/UI";
import { getBookingHistory } from "../../api/endpoints";
import type { BookingSummary } from "../../types";

const SEARCH_FIELDS = [
  { value: "Reference", label: "Reference" },
  { value: "PNR", label: "PNR" },
] as const;

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "CN", label: "Confirmed" },
  { value: "PN", label: "Pending" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "All Payments" },
  { value: "PC", label: "Payment Collected" },
  { value: "PF", label: "Payment Failed" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function statusBadgeClasses(status: string) {
  const s = status.toUpperCase();
  if (s.includes("FAIL") || s.includes("CANCEL")) {
    return "bg-[var(--color-danger-soft)] text-[var(--color-danger)]";
  }
  if (s.includes("PEND") || s === "PN") {
    return "bg-[var(--color-warning)]/15 text-[var(--color-warning)]";
  }
  return "bg-[var(--color-success-soft)] text-[var(--color-success)]";
}

export default function Bookings() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchField, setSearchField] = useState<string>("Reference");
  const [searchValue, setSearchValue] = useState("");

  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [startDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return toDateInput(d);
  });
  const [endDate] = useState(() => toDateInput(new Date()));

  async function loadData(signal?: AbortSignal) {
    setLoading(true);
    setError(null);
    try {
      const res = await getBookingHistory(
        {
          PageNumber: pageNumber,
          PageSize: pageSize,
          StartDate: startDate,
          EndDate: endDate,
          CurrentStatus: status,
          PaymentStatus: paymentStatus,
        },
        signal
      );
      if (signal?.aborted) return;
      setBookings(res?.Bookings ?? []);
      setTotalCount(res?.TotalCount ?? res?.Bookings?.length ?? 0);
    } catch (err: unknown) {
      const isCanceled =
        (err as { name?: string; code?: string })?.name === "CanceledError" ||
        (err as { name?: string; code?: string })?.code === "ERR_CANCELED";
      if (isCanceled) return;
      setError("Failed to load bookings. Please try again.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [pageNumber, pageSize, status, paymentStatus]);

  const filtered = useMemo(() => {
    if (!searchValue.trim()) return bookings;
    const needle = searchValue.trim().toLowerCase();
    return bookings.filter((b) =>
      searchField === "PNR"
        ? b.PNR.toLowerCase().includes(needle)
        : b.Reference.toLowerCase().includes(needle)
    );
  }, [bookings, searchField, searchValue]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  function goToDetail(b: BookingSummary) {
    navigate(`/bookings/${encodeURIComponent(b.Reference)}`);
  }

  return (
    <div>
      <PageHeader
        title="Bookings"
        description="Manage your bookings, synced with the Report API."
        action={
          <button className="btn-primary" disabled title="Bookings are created via the booking flow, not from Admin.">
            <Plus size={16} /> Add New Booking
          </button>
        }
      />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] overflow-hidden">
          <select
            className="bg-transparent text-sm px-3 py-2.5 outline-none text-[var(--color-text-secondary)] cursor-pointer"
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
          >
            {SEARCH_FIELDS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
          <input
            className="input-base pl-9"
            placeholder="Search bookings..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>

        <select
          className="input-base w-auto"
          value={status}
          onChange={(e) => {
            setPageNumber(1);
            setStatus(e.target.value);
          }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          className="input-base w-auto"
          value={paymentStatus}
          onChange={(e) => {
            setPageNumber(1);
            setPaymentStatus(e.target.value);
          }}
        >
          {PAYMENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <button className="btn-secondary">
          <FileText size={15} /> Export <ChevronDown size={14} />
        </button>

        <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] ml-auto">
          Rows per page
          <select
            className="input-base w-auto py-1.5"
            value={pageSize}
            onChange={(e) => {
              setPageNumber(1);
              setPageSize(Number(e.target.value));
            }}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card-base overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <div className="p-5">
            <ErrorBanner message={error} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState label="No bookings found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-soft)] text-left text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">Reference</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Trip</th>
                  <th className="px-5 py-3 font-medium">From</th>
                  <th className="px-5 py-3 font-medium">To</th>
                  <th className="px-5 py-3 font-medium">Provider</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">PNR</th>
                  <th className="px-5 py-3 font-medium">Booked At</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr
                    key={b.Id}
                    className="border-b border-[var(--color-border-soft)] last:border-0 hover:bg-[var(--color-surface-2)]/50 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium">{b.Reference}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClasses(
                          b.Status
                        )}`}
                      >
                        {b.Status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[var(--color-text-secondary)] capitalize">
                      {b.TripType}
                    </td>
                    <td className="px-5 py-3 text-[var(--color-text-secondary)]">{b.Source}</td>
                    <td className="px-5 py-3 text-[var(--color-text-secondary)]">{b.Destination}</td>
                    <td className="px-5 py-3 text-[var(--color-text-secondary)]">{b.Provider}</td>
                    <td className="px-5 py-3">{b.Amount}</td>
                    <td className="px-5 py-3 text-[var(--color-text-secondary)]">{b.PNR || "—"}</td>
                    <td className="px-5 py-3 text-[var(--color-text-muted)]">{b.BookedAt}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button className="btn-icon" onClick={() => goToDetail(b)}>
                          <Eye size={15} />
                        </button>
                        <button className="btn-icon" onClick={() => goToDetail(b)}>
                          <Pencil size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border-soft)] text-sm text-[var(--color-text-muted)]">
            <span>
              Page {pageNumber} of {totalPages} · {totalCount} total
            </span>
            <div className="flex gap-2">
              <button
                className="btn-secondary py-1.5 px-3"
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                className="btn-secondary py-1.5 px-3"
                disabled={pageNumber >= totalPages}
                onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
