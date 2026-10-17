import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Plane, Clock, X, RefreshCw, Download } from "lucide-react";
import { LoadingState, ErrorBanner, EmptyState } from "../components/common/UI";
import {
  searchTransaction,
  groupTransactionsByBooking,
  checkBookingStatus,
  updateBookingStatus,
} from "../api/endpoints";
import type {
  SearchType,
  SearchTransactionResponse,
  BookingSummary,
  TransactionLeg,
} from "../types";

import BookingDetailsTab from "./BookingDetailsTab";
import TransactionDetailsTab from "./TransactionDetailsTab";
import CustomerDetailTab from "./CustomerDetailTab";
import { Badge, fmt } from "./shared";

const SEARCH_TABS: { type: SearchType; label: string }[] = [
  { type: "BID", label: "Booking ID" },
  { type: "MON", label: "Mobile Number" },
  { type: "EID", label: "Email ID" },
  { type: "UID", label: "User ID" },
  { type: "PNR", label: "Flight PNR" },
];

type Tab = "booking" | "transactions" | "customer";
const TABS: { id: Tab; label: string }[] = [
  { id: "booking",      label: "Booking Details" },
  { id: "transactions", label: "Transaction Details" },
  { id: "customer",     label: "Customer Detail" },
];

function HistoryPanel({
  legs,
  onClose,
  onSelect,
}: {
  legs: TransactionLeg[];
  onClose: () => void;
  onSelect: (bookingId: string) => void;
}) {
  const groups = groupTransactionsByBooking(legs);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[var(--color-surface)] h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-[var(--color-brand)]" />
            <h2 className="text-sm font-semibold">Booking History</h2>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {groups.length === 0 ? (
            <EmptyState label="No history available." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-text-muted)] text-xs uppercase tracking-wider border-b border-[var(--color-border-soft)]">
                  <th className="py-2 pr-4 font-medium">Booking ID</th>
                  <th className="py-2 pr-4 font-medium">Booked On</th>
                  <th className="py-2 pr-4 font-medium">Sectors</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium" />
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.BookingId}
                    className="border-b border-[var(--color-border-soft)] last:border-0 hover:bg-[var(--color-surface-2)] cursor-pointer"
                    onClick={() => { onSelect(g.BookingId); onClose(); }}>
                    <td className="py-2.5 pr-4 font-medium">{g.BookingId || "—"}</td>
                    <td className="py-2.5 pr-4 text-[var(--color-text-muted)]">{fmt(g.BookingDate)}</td>
                    <td className="py-2.5 pr-4 text-[var(--color-text-secondary)]">
                      {g.Legs.map((l) => l.Sector).filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="py-2.5 pr-4"><Badge label={g.Legs[0]?.CurrentStatus ?? ""} /></td>
                    <td className="py-2.5 pr-4 text-[var(--color-brand)] text-xs">View →</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BookingDetail() {
  const { reference } = useParams<{ reference: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const passedBooking = (location.state as { booking?: BookingSummary } | null)?.booking ?? null;

  const [searchType, setSearchType]   = useState<SearchType>("BID");
  const [searchValue, setSearchValue] = useState(reference ?? "");
  const [loading, setLoading]         = useState(!!reference);
  const [error, setError]             = useState<string | null>(null);
  const [response, setResponse]       = useState<SearchTransactionResponse | null>(null);
  const [activeTab, setActiveTab]     = useState<Tab>("booking");
  const [historyOpen, setHistoryOpen] = useState(false);

  const [statusBusy, setStatusBusy] = useState<"check" | "update" | null>(null);
  const [statusResult, setStatusResult] = useState<
    { kind: "check" | "update"; status: string } | null
  >(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  async function runSearch(
    type: SearchType,
    value: string,
    signal?: AbortSignal,
    silent = false
  ) {
    if (!value.trim()) return;
    if (!silent) {
      setLoading(true);
      setResponse(null);
    }
    setError(null);
    try {
      const res = await searchTransaction({ SearchType: type, SearchValue: value.trim() }, signal);
      if (signal?.aborted) return;
      if (!res || (res.ErrorCode && res.ErrorCode !== "")) {
        setError(res?.Message || "No results found.");
        return;
      }
      if (!res.Transactions?.length && !res.BookingInfo) {
        setError("No matching booking found.");
        return;
      }
      setResponse(res);
      if (!silent) setActiveTab("booking");
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to fetch booking.");
    } finally {
      if (!silent && !signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const ctrl = new AbortController();
    if (reference) runSearch("BID", reference, ctrl.signal);
    return () => ctrl.abort();
  }, [reference]);

  useEffect(() => {
    setStatusResult(null);
    setStatusError(null);
  }, [reference]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchValue.trim()) return;
    if (searchType === "BID") {
      navigate(`/bookings/${encodeURIComponent(searchValue.trim())}`);
    } else {
      runSearch(searchType, searchValue);
    }
  }

  const info    = response?.BookingInfo ?? null;
  const contact = response?.ContactInfo ?? null;
  const legs    = response?.Transactions ?? [];

  const airlinePNR = info?.OnwardJourneyDetail?.AirlinePNR
    || info?.ReturnJourneyDetail?.AirlinePNR
    || legs.find(l => l.AirlinePNR)?.AirlinePNR
    || passedBooking?.PNR
    || "";

  const gdsPNR = info?.OnwardJourneyDetail?.GDSPNR
    || info?.ReturnJourneyDetail?.GDSPNR
    || legs.find(l => l.GDSPNR)?.GDSPNR
    || "";

  const bookingStatus = info?.OnwardJourneyDetail?.BookingStatus
    || legs[0]?.BookingStatus
    || passedBooking?.Status
    || "";

  const providerCode = info?.OnwardJourneyDetail?.ProviderCode ?? "";
  const airline = info?.OnwardJourneyDetail?.FlightDetails[0]?.AirlineName ?? "";
  const bookedAt = legs[0]?.BookingDate ?? passedBooking?.BookedAt ?? "";

  const orderDetail: string =
    (legs.find((l) => (l as any).OrderDetail) as any)?.OrderDetail ||
    (info as any)?.OrderDetail ||
    "";

  const referenceNo = info?.BookingId || reference || "";
  const canCallStatus = !!orderDetail && !!referenceNo;

  const transactionId =
    legs[0]?.TransactionId != null
      ? String(legs[0].TransactionId)
      : passedBooking?.Id ?? "";

  const documentParams = {
    TransactionID: transactionId,
    PNR: airlinePNR,
    ReferenceNo: referenceNo,
  };

  async function handleCheckStatus() {
    if (!canCallStatus) return;
    setStatusBusy("check");
    setStatusError(null);
    try {
      const res = await checkBookingStatus({ OrderDetail: orderDetail, ReferenceNo: referenceNo });
      if (res?.ErrorCode) throw new Error(res.Message || "Status check failed.");
      setStatusResult({ kind: "check", status: res?.Status ?? res?.BookingStatus ?? "Unknown" });
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Status check failed.");
    } finally {
      setStatusBusy(null);
    }
  }

  async function handleUpdateStatus() {
    if (!canCallStatus) return;
    if (!window.confirm("This will update the booking status in the database. Continue?")) return;
    setStatusBusy("update");
    setStatusError(null);
    try {
      const res = await updateBookingStatus({ OrderDetail: orderDetail, ReferenceNo: referenceNo });
      if (res?.ErrorCode) throw new Error(res.Message || "Status update failed.");
      setStatusResult({ kind: "update", status: res?.Status ?? res?.BookingStatus ?? "Unknown" });
      await runSearch("BID", referenceNo, undefined, true);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Status update failed.");
    } finally {
      setStatusBusy(null);
    }
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="card-base p-4 mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-44 shrink-0">
            <select
              className="input-base"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as SearchType)}
            >
              {SEARCH_TABS.map((t) => (
                <option key={t.type} value={t.type}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 min-w-[240px]">
            <input
              className="input-base pl-9"
              placeholder={`Search by ${SEARCH_TABS.find((t) => t.type === searchType)?.label.toLowerCase()}...`}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>

          <button className="btn-primary shrink-0" type="submit" disabled={loading}>
            {loading ? "Searching…" : "Search"}
          </button>

          {response && legs.length > 0 && (
            <button
              type="button"
              className="btn-secondary flex items-center gap-1.5 shrink-0"
              onClick={() => setHistoryOpen(true)}
            >
              <Clock size={14} /> History
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-[var(--color-text-muted)]">
          Quick search:
          {SEARCH_TABS.map((t) => (
            <button type="button" key={t.type} onClick={() => setSearchType(t.type)}
              className={`rounded-full px-2.5 py-1 border transition-colors ${
                searchType === t.type
                  ? "border-[var(--color-brand)] text-[var(--color-brand)] bg-[var(--color-brand-soft)]"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </form>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !response ? (
        <EmptyState label="Search for a booking to see its details." />
      ) : (
        <>
          <div className="card-base p-5 mb-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Plane size={16} className="text-[var(--color-brand)]" />
                  <h1 className="text-lg font-semibold">
                    Booking ID — {info?.BookingId || reference || "—"}
                  </h1>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                  <span>Booked on {fmt(bookedAt)}</span>
                </p>
                {bookingStatus && (
                  <div className="mt-2">
                    <span className="text-xs text-[var(--color-text-muted)] mr-2">Booking status:</span>
                    <Badge label={bookingStatus} />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {airline && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-[var(--color-brand)] text-[var(--color-brand)] text-xs font-semibold px-3 py-1.5">
                    <Plane size={11} /> Airline ({airline})
                  </span>
                )}
                <button
                  type="button"
                  className="btn-secondary flex items-center gap-1.5 !py-1.5 text-xs"
                  onClick={handleCheckStatus}
                  disabled={!canCallStatus || statusBusy !== null}
                  title={canCallStatus ? "Fetch the live status (read-only)" : "OrderDetail not available"}
                >
                  <RefreshCw size={13} className={statusBusy === "check" ? "animate-spin" : ""} />
                  {statusBusy === "check" ? "Checking…" : "Check Status"}
                </button>
                <button
                  type="button"
                  className="btn-primary flex items-center gap-1.5 !py-1.5 text-xs"
                  onClick={handleUpdateStatus}
                  disabled={!canCallStatus || statusBusy !== null}
                  title={canCallStatus ? "Fetch the live status and save it to the DB" : "OrderDetail not available"}
                >
                  <Download size={13} />
                  {statusBusy === "update" ? "Updating…" : "Update Status"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-5 mt-4 pt-4 border-t border-[var(--color-border-soft)]">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">Airline PNR</p>
                <p className={`text-sm font-semibold font-mono ${airlinePNR ? "text-[var(--color-warning)]" : "text-[var(--color-text-muted)]"}`}>
                  {airlinePNR || "Pending"}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">GDS / Provider Ref</p>
                <p className={`text-sm font-semibold font-mono ${gdsPNR ? "text-[var(--color-brand)]" : "text-[var(--color-text-muted)]"}`}>
                  {gdsPNR || "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">Invoice</p>
                <p className="text-sm font-mono text-[var(--color-text-secondary)]">
                  {info?.InvoiceNumber || "—"}
                </p>
              </div>
            </div>

            {(statusResult || statusError) && (
              <div className="mt-4 pt-4 border-t border-[var(--color-border-soft)] flex items-center gap-2 text-sm">
                {statusError ? (
                  <ErrorBanner message={statusError} />
                ) : (
                  statusResult && (
                    <>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {statusResult.kind === "check" ? "Live status:" : "Status updated to:"}
                      </span>
                      <Badge label={statusResult.status} />
                      {statusResult.kind === "check" && statusResult.status !== bookingStatus && (
                        <span className="text-xs text-[var(--color-warning)]">
                          Differs from the current status ({bookingStatus || "—"}). Use "Update Status" to sync.
                        </span>
                      )}
                    </>
                  )
                )}
              </div>
            )}
          </div>

          <div className="flex gap-0 border-b border-[var(--color-border-soft)] mb-4">
            {TABS.map((t) => (
              <button key={t.id} type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === t.id
                    ? "border-[var(--color-brand)] text-[var(--color-brand)]"
                    : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "booking" && (
            info ? (
              <BookingDetailsTab
                info={info}
                contact={contact}
                billing={response.BillingInfo}
                documentParams={documentParams}
              />
            ) : (
              <EmptyState label="Detailed booking info not available for this record." />
            )
          )}
          {activeTab === "transactions" && (
            <TransactionDetailsTab
              legs={legs}
              payment={response.PaymentInfo}
              billing={response.BillingInfo}
            />
          )}
          {activeTab === "customer" && (
            <CustomerDetailTab contact={contact} legs={legs} />
          )}
        </>
      )}

      {historyOpen && (
        <HistoryPanel
          legs={legs}
          onClose={() => setHistoryOpen(false)}
          onSelect={(bookingId) => {
            navigate(`/bookings/${encodeURIComponent(bookingId)}`);
          }}
        />
      )}
    </div>
  );
}