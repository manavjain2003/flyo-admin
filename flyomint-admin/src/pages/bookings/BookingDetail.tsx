import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Search, ChevronLeft, Plane, Clock, X, Tag, CreditCard, User } from "lucide-react";
import { LoadingState, ErrorBanner, EmptyState } from "../../components/common/UI";
import { searchTransaction, groupTransactionsByBooking } from "../../api/endpoints";
import type {
  SearchType,
  SearchTransactionResponse,
  SearchTransactionBookingInfo,
  SearchTransactionBillingInfo,
  SearchTransactionPaymentInfo,
  TransactionContactInfo,
  GroupedBooking,
  BookingSummary,
  TransactionLeg,
} from "../../types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(raw: string | null | undefined): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtCurrency(n: number | null | undefined): string {
  if (!n && n !== 0) return "—";
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

const SEARCH_TABS: { type: SearchType; label: string }[] = [
  { type: "BID", label: "Booking ID" },
  { type: "MON", label: "Mobile Number" },
  { type: "EID", label: "Email ID" },
  { type: "UID", label: "User ID" },
  { type: "PNR", label: "Flight PNR" },
];

// ── Shared UI atoms ───────────────────────────────────────────────────────────

function Field({ label, value, mono }: { label: string; value?: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className={`text-sm font-medium text-[var(--color-text-primary)] ${mono ? "font-mono" : ""}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}

type Tone = "neutral" | "success" | "brand" | "warning" | "danger";
function pill(s: string): Tone {
  const u = s.toUpperCase();
  if (u.includes("CONFIRM") || u.includes("COLLECTED")) return "success";
  if (u.includes("PROGRESS") || u.includes("INITIAT") && !u.includes("NOT")) return "brand";
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

function Badge({ label }: { label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLS[pill(label)]}`}>
      {label || "—"}
    </span>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-base p-5 mb-4">
      <h3 className="text-sm font-semibold mb-4 pb-3 border-b border-[var(--color-border-soft)]">{title}</h3>
      {children}
    </div>
  );
}


type Tab = "booking" | "transactions" | "customer" | "audit";
const TABS: { id: Tab; label: string }[] = [
  { id: "booking",      label: "Booking Details" },
  { id: "transactions", label: "Transaction Details" },
  { id: "customer",     label: "Customer Detail" },
];


function BookingDetailsTab({ info }: { info: SearchTransactionBookingInfo }) {
  const journeys = [info.OnwardJourneyDetail, info.ReturnJourneyDetail].filter(Boolean);

  return (
    <>
      <SectionCard title="Booking Info">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          <Field label="Trip Type"
            value={info.SearchType === "ON" ? "One Way" : info.SearchType === "RT" ? "Round Trip" : info.SearchType} />
          <Field label="Total Fare"   value={fmtCurrency(info.TotalFare)} />
          <Field label="Invoice No."  value={info.InvoiceNumber || "—"} />
          <Field label="Adults"       value={info.NumberOfAdult} />
          <Field label="Children"     value={info.NumberOfChild} />
          <Field label="Infants"      value={info.NumberOfInfant} />
          <Field label="Payment"      value={<Badge label={info.PaymentStatus} />} />
        </div>
      </SectionCard>

      {journeys.map((j, idx) => j && (
        <SectionCard key={idx} title={idx === 0 ? "Onward Flight" : "Return Flight"}>
          {j.FlightDetails.map((f, fi) => (
            <div key={fi} className="mb-4 last:mb-0">
              <div className="flex items-center gap-3 mb-3">
                <span className="font-mono text-sm font-semibold">{f.AirlineCode} {f.FlightNumber}</span>
                <span className="text-xs text-[var(--color-text-muted)]">{f.AirlineName}</span>
                <span className="text-xs bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-2 py-0.5">
                  {f.CabinClass} · {f.BookingClass}
                </span>
                <span className="text-xs text-[var(--color-text-muted)] ml-auto">{f.Duration}</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[11px] text-[var(--color-text-muted)] mb-1">Departure</p>
                  <p className="font-semibold text-sm">{f.DepartureAirportCode}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{f.DepartureAirportName}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{fmt(f.DepartureDateTime)}</p>
                </div>
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-1 text-[var(--color-text-muted)]">
                    <div className="h-px w-8 bg-current" />
                    <Plane size={14} />
                    <div className="h-px w-8 bg-current" />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-[var(--color-text-muted)] mb-1">Arrival</p>
                  <p className="font-semibold text-sm">{f.ArrivalAirportCode}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{f.ArrivalAirportName}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{fmt(f.ArrivalDateTime)}</p>
                </div>
              </div>
            </div>
          ))}

          <div className="mt-4 pt-4 border-t border-[var(--color-border-soft)]">
            <p className="text-xs font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wide">Fare Breakdown</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {[
                ["Base Fare (Adult)", fmtCurrency(j.FareDetails.AdultBaseFare)],
                ["Tax (Adult)",       fmtCurrency(j.FareDetails.AdultTax)],
                ["Total (Adult)",     fmtCurrency(j.FareDetails.AdultTotalFare)],
              ].map(([l, v]) => <Field key={l} label={l} value={v} />)}
            </div>
          </div>

          {j.PassengerDetails.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--color-border-soft)]">
              <p className="text-xs font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wide">Passengers</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] text-xs uppercase tracking-wider border-b border-[var(--color-border-soft)]">
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Ticket</th>
                    <th className="py-2 pr-4 font-medium">DOB</th>
                    <th className="py-2 pr-4 font-medium">Nationality</th>
                  </tr>
                </thead>
                <tbody>
                  {j.PassengerDetails.map((p) => (
                    <tr key={p.PassengerId} className="border-b border-[var(--color-border-soft)] last:border-0">
                      <td className="py-2 pr-4 font-medium">{p.Title} {p.FirstName} {p.LastName}</td>
                      <td className="py-2 pr-4 text-[var(--color-text-secondary)]">
                        {p.PaxType === "A" ? "Adult" : p.PaxType === "C" ? "Child" : "Infant"}
                      </td>
                      <td className="py-2 pr-4 font-mono text-[var(--color-text-secondary)]">{p.TicketNumber || "Pending"}</td>
                      <td className="py-2 pr-4 text-[var(--color-text-secondary)]">{fmt(p.DOB)}</td>
                      <td className="py-2 pr-4 text-[var(--color-text-secondary)]">{p.Nationality}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      ))}
    </>
  );
}

function TransactionDetailsTab({
  legs,
  payment,
  billing,
}: {
  legs: TransactionLeg[];
  payment: SearchTransactionPaymentInfo | null;
  billing: SearchTransactionBillingInfo | null;
}) {
  return (
    <>
      {(payment || billing) && (
        <SectionCard title="Payment Details">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {payment && (
              <>
                <Field label="Gateway"     value={payment.PaymentGatewayName} />
                <Field label="Mode"        value={payment.PaymentMode} />
                <Field label="Status"      value={<Badge label={payment.PaymentStatus} />} />
                <Field label="Amount Paid" value={fmtCurrency(payment.AmountPaid)} />
                <Field label="Ref ID"      value={payment.PaymentGatewayRefId} mono />
                <Field label="Paid At"     value={fmt(payment.PaymentDateTime)} />
              </>
            )}
            {billing && (
              <>
                <Field label="Itinerary Fare"   value={fmtCurrency(billing.TotalItineraryFare)} />
                <Field label="SSR Amount"       value={fmtCurrency(billing.TotalSSRAmount)} />
                <Field label="Convenience Fee"  value={fmtCurrency(billing.ConvenienceFee)} />
                <Field label="Instant Discount" value={fmtCurrency(billing.InstantDiscount)} />
                <Field label="Amount Paid"
                  value={<span className="text-[var(--color-success)] font-semibold">{fmtCurrency(billing.TotalAmountPaid)}</span>} />
              </>
            )}
          </div>
        </SectionCard>
      )}

      {/* {legs.length === 0 ? (
        <EmptyState label="No transaction legs found." />
      ) : (
        <SectionCard title="Transaction Legs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-text-muted)] text-xs uppercase tracking-wider border-b border-[var(--color-border-soft)]">
                  <th className="py-2 pr-4 font-medium">Txn ID</th>
                  <th className="py-2 pr-4 font-medium">Sector</th>
                  <th className="py-2 pr-4 font-medium">Travel Date</th>
                  <th className="py-2 pr-4 font-medium">GDS PNR</th>
                  <th className="py-2 pr-4 font-medium">Airline PNR</th>
                  <th className="py-2 pr-4 font-medium">Payment</th>
                  <th className="py-2 pr-4 font-medium">Booking</th>
                </tr>
              </thead>
              <tbody>
                {legs.map((leg, i) => (
                  <tr key={i} className="border-b border-[var(--color-border-soft)] last:border-0">
                    <td className="py-2.5 pr-4 font-mono text-xs text-[var(--color-text-muted)]">{leg.TransactionId}</td>
                    <td className="py-2.5 pr-4 font-semibold">{leg.Sector || "—"}</td>
                    <td className="py-2.5 pr-4 text-[var(--color-text-secondary)]">{leg.OnwardDate || "—"}</td>
                    <td className="py-2.5 pr-4 font-mono">{leg.GDSPNR || "—"}</td>
                    <td className="py-2.5 pr-4 font-mono">{leg.AirlinePNR || "—"}</td>
                    <td className="py-2.5 pr-4"><Badge label={leg.PaymentStatus} /></td>
                    <td className="py-2.5 pr-4"><Badge label={leg.BookingStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )} */}
    </>
  );
}

function CustomerDetailTab({
  contact,
  billing,
  payment,
}: {
  contact: TransactionContactInfo | null;
  billing: SearchTransactionBillingInfo | null;
  payment: SearchTransactionPaymentInfo | null;
}) {
  return (
    <>
      {contact && (
        <SectionCard title="Contact Info">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            <Field label="Name"   value={contact.Name} />
            <Field label="Mobile" value={contact.Mobile} />
            <Field label="Email"  value={contact.Email} />
          </div>
        </SectionCard>
      )}

      {billing && (
        <SectionCard title="Billing Summary">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            <Field label="Itinerary Fare"   value={fmtCurrency(billing.TotalItineraryFare)} />
            <Field label="SSR Amount"       value={fmtCurrency(billing.TotalSSRAmount)} />
            <Field label="Convenience Fee"  value={fmtCurrency(billing.ConvenienceFee)} />
            <Field label="Instant Discount" value={fmtCurrency(billing.InstantDiscount)} />
            <Field label="Amount Paid"
              value={<span className="text-[var(--color-success)] font-semibold">{fmtCurrency(billing.TotalAmountPaid)}</span>} />
          </div>
        </SectionCard>
      )}

      {payment && (
        <SectionCard title="Payment Info">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            <Field label="Gateway"     value={payment.PaymentGatewayName} />
            <Field label="Mode"        value={payment.PaymentMode} />
            <Field label="Status"      value={<Badge label={payment.PaymentStatus} />} />
            <Field label="Amount Paid" value={fmtCurrency(payment.AmountPaid)} />
            <Field label="Ref ID"      value={payment.PaymentGatewayRefId} mono />
            <Field label="Paid At"     value={fmt(payment.PaymentDateTime)} />
          </div>
        </SectionCard>
      )}

      {!contact && !billing && !payment && (
        <EmptyState label="No customer or payment data available." />
      )}
    </>
  );
}

// ── History panel ─────────────────────────────────────────────────────────────

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

// ── Main component ────────────────────────────────────────────────────────────

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

  async function runSearch(type: SearchType, value: string, signal?: AbortSignal) {
    if (!value.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);
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
      setActiveTab("booking");
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to fetch booking.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const ctrl = new AbortController();
    if (reference) runSearch("BID", reference, ctrl.signal);
    return () => ctrl.abort();
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

  return (
    <div>
      {/* Back */}
      <button
        className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] mb-4"
        onClick={() => navigate("/bookings")}
      >
        <ChevronLeft size={15} /> Back to Bookings
      </button>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="card-base p-4 mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <select className="input-base w-auto" value={searchType}
            onChange={(e) => setSearchType(e.target.value as SearchType)}>
            {SEARCH_TABS.map((t) => (
              <option key={t.type} value={t.type}>{t.label}</option>
            ))}
          </select>
          <div className="relative flex-1 min-w-[240px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input className="input-base pl-9"
              placeholder={`Search by ${SEARCH_TABS.find(t => t.type === searchType)?.label.toLowerCase()}...`}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)} />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Searching…" : "Search"}
          </button>
          {/* History button — only shown when we have a result */}
          {response && legs.length > 0 && (
            <button type="button" className="btn-secondary flex items-center gap-1.5"
              onClick={() => setHistoryOpen(true)}>
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
          {/* Header card */}
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

              {/* Provider / airline badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {providerCode && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-[var(--color-warning)] text-[var(--color-warning)] text-xs font-semibold px-3 py-1.5">
                    <Tag size={11} /> Provider: {providerCode}
                  </span>
                )}
                {airline && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-[var(--color-brand)] text-[var(--color-brand)] text-xs font-semibold px-3 py-1.5">
                    <Plane size={11} /> Airline ({airline})
                  </span>
                )}
              </div>
            </div>

            {/* PNR row */}
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
          </div>

          {/* Tabs */}
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

          {/* Tab panels */}
          {activeTab === "booking" && (
            info
              ? <BookingDetailsTab info={info} />
              : <EmptyState label="Detailed booking info not available for this record." />
          )}
        {activeTab === "transactions" && (
  <TransactionDetailsTab
    legs={legs}
    payment={response.PaymentInfo}
    billing={response.BillingInfo}
  />
)}
        {activeTab === "customer" && (
  <CustomerDetailTab
    contact={contact}
    billing={response.BillingInfo}
    payment={response.PaymentInfo}
  />
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