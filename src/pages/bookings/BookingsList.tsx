import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Eye, Pencil, ChevronDown, FileText, Clock } from "lucide-react";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ErrorBanner,
} from "../../components/common/UI";
import {
  getBookingHistory,
  searchTransaction,
  groupTransactionsByBooking,
} from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import type { BookingSummary, GroupedBooking, SearchType } from "../../types";


type SearchFieldKey = "Reference" | "Mobile" | "EMail" | "UserKey" | "PNR";

const SEARCH_FIELDS: { value: SearchFieldKey; label: string }[] = [
  { value: "Reference", label: "Booking ID" },
  { value: "Mobile", label: "Mobile Number" },
  { value: "EMail", label: "Email ID" },
  { value: "UserKey", label: "User ID" },
  { value: "PNR", label: "Flight PNR" },
];

const SIMPLE_SEARCH_FIELDS: { value: SearchFieldKey; label: string }[] = [
  { value: "Reference", label: "Reference" },
  { value: "PNR", label: "PNR" },
];

const SEARCH_TYPE_BY_FIELD: Record<SearchFieldKey, SearchType> = {
  Reference: "BID",
  Mobile: "MON",
  EMail: "EID",
  UserKey: "UID",
  PNR: "PNR",
};

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

type Mode = "none" | "search" | "history";

function toDateInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateShort(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function groupToSummaries(g: GroupedBooking): BookingSummary[] {
  return g.Legs.map((leg, i) => {
    const parts = (leg.Sector ?? "").split("/").filter(Boolean);
    const pnr = leg.CRSPNR || leg.AirlinePNR || "";
    return {
      Id: `${leg.TransactionId}-${leg.OnwardDate}-${i}`,
      Reference: leg.BookingId || g.BookingId,
      Status: leg.CurrentStatus || leg.BookingStatus || "",
      PaymentStatus: leg.PaymentStatus ?? "",
      TripType: g.Legs.length > 1 ? "Round Trip" : "One Way",
      Source: parts[0] ?? "",
      Destination: parts[parts.length - 1] ?? "",
      Provider: pnr,
      Amount: 0,
      PNR: pnr,
      BookedAt: formatDateShort(leg.BookingDate),
    };
  });
}

function statusBadgeClasses(status: string) {
  const s = (status ?? "").toUpperCase();
  if (s.includes("FAIL") || s.includes("CANCEL")) {
    return "bg-[var(--color-danger-soft)] text-[var(--color-danger)]";
  }
  if (s.includes("PEND") || s.includes("PROGRESS") || s.includes("INITIAT") || s === "PN") {
    return "bg-[var(--color-warning)]/15 text-[var(--color-warning)]";
  }
  if (s.includes("NOT INITIATED")) {
    return "bg-[var(--color-border-soft)] text-[var(--color-text-muted)]";
  }
  return "bg-[var(--color-success-soft)] text-[var(--color-success)]";
}

function isCanceled(err: unknown) {
  return (
    (err as { name?: string })?.name === "CanceledError" ||
    (err as { code?: string })?.code === "ERR_CANCELED"
  );
}

interface BookingsListProps {
  title: string;
  description: string;
  viewId: string;
  lockedStatus?: string;
}

export default function BookingsList({ title, description, viewId, lockedStatus }: BookingsListProps) {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canRead = hasPermission(viewId, "R");
  const canWrite = hasPermission(viewId, "W");

  const useSearchCard = !lockedStatus;

  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(!useSearchCard);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [searchField, setSearchField] = useState<SearchFieldKey>("Reference");
  const [searchValue, setSearchValue] = useState("");

  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedField, setAppliedField] = useState<SearchFieldKey>("Reference");

  const [mode, setMode] = useState<Mode>("none");
  const effectiveMode: Mode = useSearchCard ? mode : "history";
  const showHistory = useSearchCard && mode === "history";

  const [status, setStatus] = useState(lockedStatus ?? "");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [startDate, setStartDate] = useState(() => toDateInput(new Date()));
  const [endDate, setEndDate] = useState(() => toDateInput(new Date()));

  function handleStartDateChange(v: string) {
    if (!v) return;
    setPageNumber(1);
    setStartDate(v);
    if (v > endDate) setEndDate(v); 
  }

  function handleEndDateChange(v: string) {
    if (!v) return;
    setPageNumber(1);
    setEndDate(v);
    if (v < startDate) setStartDate(v);
  }

  function resetToToday() {
    const t = toDateInput(new Date());
    setPageNumber(1);
    setStartDate(t);
    setEndDate(t);
  }

  function applySearch() {
    const value = searchValue.trim();
    if (!value) return;
    setAppliedSearch(value);
    setAppliedField(searchField);
    setPageNumber(1);
    setMode("search");
  }

  function toggleHistory() {
    setPageNumber(1);
    setMode((m) => (m === "history" ? "none" : "history"));
  }

  function selectField(f: SearchFieldKey) {
    setSearchField(f);
    setSearchValue("");
    setAppliedSearch("");
    setMode((m) => (m === "search" ? "none" : m));
  }

  async function loadHistory(signal?: AbortSignal) {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await getBookingHistory(
        {
          PageNumber: pageNumber,
          PageSize: pageSize,
          StartDate: startDate,
          EndDate: endDate,
          CurrentStatus: lockedStatus ?? status,
          PaymentStatus: paymentStatus,
        },
        signal
      );
      if (signal?.aborted) return;
      setBookings(res?.Bookings ?? []);
      setTotalCount(res?.TotalCount ?? res?.Bookings?.length ?? 0);
    } catch (err: unknown) {
      if (isCanceled(err)) return;
      setError("Failed to load bookings. Please try again.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  async function loadSearch(signal?: AbortSignal) {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await searchTransaction(
        { SearchType: SEARCH_TYPE_BY_FIELD[appliedField], SearchValue: appliedSearch },
        signal
      );
      if (signal?.aborted) return;

      const legs = res?.Transactions ?? [];
      const info = res?.BookingInfo ?? null;

      if (!res || (legs.length === 0 && !info)) {
        setBookings([]);
        setTotalCount(0);
        setNotice(res?.ErrorCode ? res.Message || null : null);
        return;
      }

      const rows =
        legs.length > 0
          ? groupTransactionsByBooking(legs).flatMap(groupToSummaries)
          : info
          ? [
              {
                Id: info.BookingId,
                Reference: info.BookingId,
                Status:
                  info.OnwardJourneyDetail?.CurrentStatus ||
                  info.OnwardJourneyDetail?.BookingStatus ||
                  "",
                PaymentStatus: info.PaymentStatus ?? "",
                TripType: info.SearchType === "RT" ? "Round Trip" : "One Way",
                Source: info.OnwardJourneyDetail?.Source ?? "",
                Destination: info.OnwardJourneyDetail?.Destination ?? "",
                Provider:
                  info.OnwardJourneyDetail?.CRSPNR || info.OnwardJourneyDetail?.AirlinePNR || "",
                Amount: info.TotalFare ?? 0,
                PNR:
                  info.OnwardJourneyDetail?.CRSPNR || info.OnwardJourneyDetail?.AirlinePNR || "",
                BookedAt: formatDateShort(info.OnwardJourneyDetail?.DepartureDate ?? ""),
              } as BookingSummary,
            ]
          : [];
      setBookings(rows);
      setTotalCount(rows.length);
    } catch (err: unknown) {
      if (isCanceled(err)) return;
      setError(err instanceof Error ? err.message : "Failed to search bookings. Please try again.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    if (effectiveMode !== "history") return;
    const controller = new AbortController();
    loadHistory(controller.signal);
    return () => controller.abort();
  }, [effectiveMode, pageNumber, pageSize, status, paymentStatus, lockedStatus, startDate, endDate]);

  useEffect(() => {
    if (!useSearchCard) return;
    if (mode === "none") {
      setBookings([]);
      setTotalCount(0);
      setLoading(false);
      setError(null);
      setNotice(null);
      return;
    }
    if (mode !== "search") return;
    const controller = new AbortController();
    loadSearch(controller.signal);
    return () => controller.abort();
  }, [mode, appliedSearch, appliedField]);

  const activeQuery = useSearchCard ? "" : searchValue.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!activeQuery) return bookings;
    return bookings.filter((b) =>
      String((b as unknown as Record<string, unknown>)[searchField] ?? "")
        .toLowerCase()
        .includes(activeQuery)
    );
  }, [bookings, searchField, activeQuery]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const showActions = canRead || canWrite;

  const rows =
    effectiveMode === "search"
      ? filtered.slice((pageNumber - 1) * pageSize, pageNumber * pageSize)
      : filtered;

  const counterLabel =
    effectiveMode === "search"
      ? `Transactions found for "${appliedSearch}"`
      : effectiveMode === "none"
      ? "Search to view bookings"
      : startDate === endDate
      ? `Total bookings on ${startDate}`
      : `Total bookings ${startDate} to ${endDate}`;

  function goToDetail(b: BookingSummary) {
    navigate(`/bookings/${encodeURIComponent(b.Reference)}`);
  }

  const rowsPerPage = (
    <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] whitespace-nowrap shrink-0">
      <span>Rows per page</span>
      <div className="w-20">
        <select
          className="input-base py-1.5"
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
  );

  const counterCard = (
    <div className="card-base px-4 py-2" aria-live="polite">
      <p className="text-xs text-[var(--color-text-muted)]">{counterLabel}</p>
      <p className="text-2xl font-semibold leading-tight">
        {loading || effectiveMode === "none" ? "–" : totalCount}
      </p>
    </div>
  );

  const emptyLabel =
    effectiveMode === "none"
      ? "Search by Booking ID, Mobile, Email, User ID or PNR to view bookings."
      : effectiveMode === "search"
      ? notice ||
        `No bookings found for ${SEARCH_FIELDS.find((f) => f.value === appliedField)?.label} "${appliedSearch}".`
      : "No bookings found for the selected dates.";

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        action={
          canWrite ? (
            <button className="btn-primary" disabled title="Bookings are created via the booking flow, not from Admin.">
              <Plus size={16} /> Add New Booking
            </button>
          ) : undefined
        }
      />

      {useSearchCard ? (
        <>
          <div className="card-base p-5 mb-4">
            <div className="flex items-stretch gap-3 flex-wrap">
              <div className="relative w-full sm:w-[264px] shrink-0">
                <select
                  className="input-base appearance-none pr-10 h-full"
                  value={searchField}
                  onChange={(e) => selectField(e.target.value as SearchFieldKey)}
                >
                  {SEARCH_FIELDS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                />
              </div>

              <input
                className="input-base flex-1 min-w-[220px]"
                placeholder={`Enter ${SEARCH_FIELDS.find((f) => f.value === searchField)?.label}`}
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  if (!e.target.value) {
                    setAppliedSearch("");
                    setMode((m) => (m === "search" ? "none" : m));
                  }
                }}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
              />

              <button
                type="button"
                className="btn-primary px-6 shrink-0"
                onClick={applySearch}
                disabled={!searchValue.trim() || (loading && mode === "search")}
              >
                Search
              </button>

              <button
                type="button"
                className="btn-secondary shrink-0"
                onClick={toggleHistory}
                aria-expanded={showHistory}
              >
                <Clock size={16} /> History
              </button>
            </div>

            <div className="flex items-center gap-2 mt-4 flex-wrap text-sm">
              <span className="text-[var(--color-text-muted)]">Quick search:</span>
              {SEARCH_FIELDS.map((f) => {
                const active = f.value === searchField;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => selectField(f.value)}
                    className={`rounded-full border px-3.5 py-1 text-sm transition-colors ${
                      active
                        ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10"
                        : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {showHistory && (
              <div className="mt-5 pt-5 border-t border-[var(--color-border-soft)] flex items-end gap-3 flex-wrap">
                <label className="flex w-40 flex-col gap-1 text-xs text-[var(--color-text-muted)]">
                  From
                  <input
                    type="date"
                    className="input-base"
                    value={startDate}
                    max={endDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                  />
                </label>
                <label className="flex w-40 flex-col gap-1 text-xs text-[var(--color-text-muted)]">
                  To
                  <input
                    type="date"
                    className="input-base"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={resetToToday}
                  disabled={startDate === toDateInput(new Date()) && endDate === startDate}
                >
                  Today
                </button>

                <div className="w-40 shrink-0">
                  <select
                    className="input-base"
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
                </div>

                <div className="w-48 shrink-0">
                  <select
                    className="input-base"
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
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            {counterCard}
            <div className="flex items-center gap-3">
              <button className="btn-secondary shrink-0">
                <FileText size={15} /> Export <ChevronDown size={14} />
              </button>
              {rowsPerPage}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-end justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-end gap-3 flex-wrap">
              <label className="flex w-40 flex-col gap-1 text-xs text-[var(--color-text-muted)]">
                From
                <input
                  type="date"
                  className="input-base"
                  value={startDate}
                  max={endDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                />
              </label>
              <label className="flex w-40 flex-col gap-1 text-xs text-[var(--color-text-muted)]">
                To
                <input
                  type="date"
                  className="input-base"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn-secondary"
                onClick={resetToToday}
                disabled={startDate === toDateInput(new Date()) && endDate === startDate}
              >
                Today
              </button>
            </div>

            <div className="text-right">{counterCard}</div>
          </div>

          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="shrink-0 flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] overflow-hidden">
              <select
                className="bg-transparent text-sm px-3 py-2.5 outline-none text-[var(--color-text-secondary)] cursor-pointer"
                value={searchField}
                onChange={(e) => setSearchField(e.target.value as SearchFieldKey)}
              >
                {SIMPLE_SEARCH_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <input
                className="input-base pl-9"
                placeholder="Search bookings..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </div>


            <div className="w-48 shrink-0">
              <select
                className="input-base"
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
            </div>

            <button className="btn-secondary shrink-0">
              <FileText size={15} /> Export <ChevronDown size={14} />
            </button>

            <div className="ml-auto">{rowsPerPage}</div>
          </div>
        </>
      )}

      <div className="card-base overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <div className="p-5">
            <ErrorBanner message={error} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState label={emptyLabel} />
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
                  {showActions && <th className="px-5 py-3 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr
                    key={b.Id}
                    className="border-b border-[var(--color-border-soft)] last:border-0 hover:bg-[var(--color-surface-2)]/50 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium">
                      {b.Reference || (
                        <span className="text-[var(--color-text-muted)] italic text-xs">No reference</span>
                      )}
                    </td>

                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClasses(b.Status)}`}
                      >
                        {b.Status}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-[var(--color-text-secondary)]">{b.TripType || "—"}</td>
                    <td className="px-5 py-3 text-[var(--color-text-secondary)]">{b.Source || "—"}</td>
                    <td className="px-5 py-3 text-[var(--color-text-secondary)]">{b.Destination || "—"}</td>
                    <td className="px-5 py-3 text-[var(--color-text-secondary)]">{b.Provider || "—"}</td>

                    <td className="px-5 py-3 text-[var(--color-text-muted)]">
                      {b.Amount > 0 ? `₹${b.Amount.toLocaleString("en-IN")}` : "—"}
                    </td>

                    <td className="px-5 py-3 text-[var(--color-text-secondary)]">{b.PNR || "—"}</td>
                    <td className="px-5 py-3 text-[var(--color-text-muted)]">{b.BookedAt || "—"}</td>

                    {showActions && (
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          {canRead && (
                            <button
                              className="btn-icon"
                              onClick={() => b.Reference && goToDetail(b)}
                              disabled={!b.Reference}
                              title={b.Reference ? "View booking" : "No booking reference available"}
                            >
                              <Eye size={15} />
                            </button>
                          )}
                          {canWrite && (
                            <button
                              className="btn-icon"
                              onClick={() => b.Reference && goToDetail(b)}
                              disabled={!b.Reference}
                              title={b.Reference ? "Edit booking" : "No booking reference available"}
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
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