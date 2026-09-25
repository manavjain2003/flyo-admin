import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Search,
  Download,
  Send,
  MessageSquare,
  ChevronLeft,
  Plane,
} from "lucide-react";
import { LoadingState, ErrorBanner, EmptyState } from "../../components/common/UI";
import { searchTransaction } from "../../api/endpoints";
import { useToast } from "../../context/ToastContext";
import type { BookingDetail as BookingDetailType, SearchType } from "../../types";

const QUICK_SEARCH_TABS: { type: SearchType; label: string }[] = [
  { type: "BID", label: "Booking ID" },
  { type: "MON", label: "Mobile Number" },
  { type: "EID", label: "Email ID" },
  { type: "UID", label: "User ID" },
  { type: "PNR", label: "Flight PNR" },
];

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "brand" | "warning" }) {
  const tones: Record<string, string> = {
    neutral: "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] border border-[var(--color-border)]",
    success: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
    brand: "bg-[var(--color-brand-soft)] text-[var(--color-brand)]",
    warning: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="card-base p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className="text-sm font-medium text-[var(--color-text-primary)]">{value ?? "—"}</p>
    </div>
  );
}

const TABS = ["Booking Details", "Transaction Details", "Customer Detail", "Activity & Audit Logs"] as const;

export default function BookingDetail() {
  const { reference } = useParams<{ reference: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [searchType, setSearchType] = useState<SearchType>("BID");
  const [searchValue, setSearchValue] = useState(reference ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingDetailType | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Booking Details");

  async function runSearch(type: SearchType, value: string, signal?: AbortSignal) {
    if (!value.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await searchTransaction({ SearchType: type, SearchValue: value.trim() }, signal);
      if (signal?.aborted) return;
      if (!res || res.ErrorCode) {
        setBooking(null);
        setError(res?.Message || "Booking not found.");
        return;
      }
      setBooking(res);
    } catch (err: unknown) {
      const isCanceled =
        (err as { name?: string; code?: string })?.name === "CanceledError" ||
        (err as { name?: string; code?: string })?.code === "ERR_CANCELED";
      if (isCanceled) return;
      setBooking(null);
      setError("Failed to fetch booking details. Please try again.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    if (reference) runSearch("BID", reference, controller.signal);
    return () => controller.abort();
  }, [reference]);

  function handleQuickSearch(e: React.FormEvent) {
    e.preventDefault();
    runSearch(searchType, searchValue);
  }

  async function handleDocumentAction(kind: "download" | "customer" | "support") {
    if (!booking) return;
    const labels = {
      download: "Preparing document for download...",
      customer: "Document sent to customer.",
      support: "Sent to support chat.",
    };
    showToast("success", labels[kind]);
  }

  return (
    <div>
      <button
        className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] mb-4"
        onClick={() => navigate("/bookings")}
      >
        <ChevronLeft size={15} /> Back to Bookings
      </button>

      <form onSubmit={handleQuickSearch} className="card-base p-4 mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="input-base w-auto"
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as SearchType)}
          >
            {QUICK_SEARCH_TABS.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
          <div className="relative flex-1 min-w-[240px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <input
              className="input-base pl-9"
              placeholder={`Search by ${
                QUICK_SEARCH_TABS.find((t) => t.type === searchType)?.label.toLowerCase()
              }...`}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-[var(--color-text-muted)]">
          Quick search:
          {QUICK_SEARCH_TABS.map((t) => (
            <button
              type="button"
              key={t.type}
              onClick={() => setSearchType(t.type)}
              className={`rounded-full px-2.5 py-1 border transition-colors ${
                searchType === t.type
                  ? "border-[var(--color-brand)] text-[var(--color-brand)] bg-[var(--color-brand-soft)]"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </form>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !booking ? (
        <EmptyState label="Search for a booking to see its details." />
      ) : (
        <>
          <div className="card-base p-5 mb-4">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Plane size={16} className="text-[var(--color-brand)]" />
                  <h1 className="text-lg font-semibold">Booking ID — {booking.BookingId}</h1>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Booked on {booking.BookedAt}
                </p>
                <div className="mt-2">
                  <Pill tone="brand">{booking.BookingStatus}</Pill>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Pill>PROVIDER: {booking.Provider?.toUpperCase()}</Pill>
                <Pill>AIRLINE ({booking.Airline})</Pill>
                <Pill tone="success">{booking.TicketIssued ? "Ticket Issued & PNR" : "Issue Ticket & PNR"}</Pill>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-lg bg-[var(--color-surface-2)] px-4 py-3">
              <Field label="Airline PNR" value={booking.AirlinePNR || "Pending"} />
              <Field label="GDS / Provider Ref" value={booking.ProviderRef || "Pending"} />
              <Field label="Ticket Number" value={booking.TicketNumber || "Pending"} />
            </div>
          </div>

          <div className="flex items-center gap-1 border-b border-[var(--color-border-soft)] mb-4 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-[var(--color-brand)] text-[var(--color-brand)]"
                    : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "Booking Details" && (
            <>
              <Section title="Booking Info" action={<Pill tone="warning">Unblock</Pill>}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                  <Field label="Trip Type" value={booking.TripType} />
                  <Field label="Last Updated" value={booking.LastUpdated} />
                  <Field label="Coupon Code" value={booking.CouponCode} />
                  <Field label="International" value={booking.International ? "Yes" : "No"} />
                  <Field label="Cashback Amount" value={booking.CashbackAmount} />
                  <Field label="Earn Status" value={booking.EarnStatus} />
                  <Field label="Refunded" value={booking.Refunded ? "Yes" : "No"} />
                  <Field label="Awaiting Free Cancellation" value={booking.AwaitingFreeCancellation} />
                  <Field label="Insurance Provider" value={booking.InsuranceProvider} />
                  <Field label="Special Inventory" value={booking.SpecialInventory} />
                  <Field label="Published Fare Identifier" value={booking.PublishedFareIdentifier} />
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--color-border-soft)] flex items-center justify-between flex-wrap gap-2">
                  <span className="text-sm text-[var(--color-brand)]">Order ID: {booking.OrderId}</span>
                  <span className="text-sm text-[var(--color-text-muted)]">Fare Type: {booking.FareType}</span>
                </div>
                <div className="mt-3">
                  <Field label="Refund Block Status" value={booking.RefundBlockStatus} />
                </div>
              </Section>

              <Section title="Flight & Traveller Info">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 mb-4">
                  <Field label="Partner Name" value={booking.PartnerName} />
                  <Field label="Provider Ref No." value={booking.ProviderRefNo} />
                  <Field label="Trace ID" value={booking.TraceId} />
                </div>

                {booking.Segments?.map((seg, i) => (
                  <div key={i} className="rounded-lg border border-[var(--color-border-soft)] p-4 mb-3">
                    <Pill tone="brand">
                      Outbound Flight ({seg.Source} → {seg.Destination})
                    </Pill>
                    <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {seg.AirlineCode} {seg.FlightNumber} · {seg.Cabin}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">{seg.Source}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{seg.SourceAirport}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{seg.SourceTime}</p>
                      </div>
                      <div className="flex-1 h-px bg-[var(--color-border)] mx-4 relative">
                        <Plane
                          size={14}
                          className="absolute -top-2 left-1/2 -translate-x-1/2 text-[var(--color-brand)]"
                        />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{seg.Destination}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{seg.DestinationAirport}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{seg.DestinationTime}</p>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[var(--color-text-muted)] text-xs uppercase tracking-wider border-b border-[var(--color-border-soft)]">
                        <th className="py-2 pr-4 font-medium">S.No.</th>
                        <th className="py-2 pr-4 font-medium">Passenger Name</th>
                        <th className="py-2 pr-4 font-medium">Airline PNR</th>
                        <th className="py-2 pr-4 font-medium">GDS PNR</th>
                        <th className="py-2 pr-4 font-medium">Ticket No.</th>
                        <th className="py-2 pr-4 font-medium">Fare</th>
                        <th className="py-2 pr-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {booking.Passengers?.map((p) => (
                        <tr key={p.SNo} className="border-b border-[var(--color-border-soft)] last:border-0">
                          <td className="py-2.5 pr-4">{p.SNo}</td>
                          <td className="py-2.5 pr-4 font-medium">{p.PassengerName}</td>
                          <td className="py-2.5 pr-4">{p.AirlinePNR || "—"}</td>
                          <td className="py-2.5 pr-4">{p.GDSPNR || "—"}</td>
                          <td className="py-2.5 pr-4">{p.TicketNo || "—"}</td>
                          <td className="py-2.5 pr-4">₹{p.Fare}</td>
                          <td className="py-2.5 pr-4">
                            <Pill tone="brand">{p.Status}</Pill>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm font-semibold mt-3">Total Fare — ₹{booking.TotalFare}</p>
              </Section>

              <Section title="Baggage Information">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[var(--color-text-muted)] text-xs uppercase tracking-wider border-b border-[var(--color-border-soft)]">
                        <th className="py-2 pr-4 font-medium">Type</th>
                        <th className="py-2 pr-4 font-medium">Sector</th>
                        <th className="py-2 pr-4 font-medium">Check-In Baggage</th>
                        <th className="py-2 pr-4 font-medium">Cabin Baggage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {booking.Baggage?.map((bg, i) => (
                        <tr key={i} className="border-b border-[var(--color-border-soft)] last:border-0">
                          <td className="py-2.5 pr-4">{bg.Type}</td>
                          <td className="py-2.5 pr-4">{bg.Sector}</td>
                          <td className="py-2.5 pr-4">{bg.CheckInBaggage}</td>
                          <td className="py-2.5 pr-4">{bg.CabinBaggage}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section title="Cancellation & Fare Rules">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div className="rounded-lg bg-[var(--color-surface-2)] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
                      Refundability
                    </p>
                    <Pill tone="success">{booking.FareRules?.Refundability}</Pill>
                  </div>
                  <div className="rounded-lg bg-[var(--color-surface-2)] px-4 py-3">
                    <Field label="Fare Category" value={booking.FareRules?.FareCategory} />
                  </div>
                  <div className="rounded-lg bg-[var(--color-surface-2)] px-4 py-3">
                    <Field label="Date Change Policy" value={booking.FareRules?.DateChangePolicy} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-[var(--color-border-soft)] px-4 py-3">
                    <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">
                      Cancellation Before Departure
                    </p>
                    <p className="text-sm">{booking.FareRules?.CancellationBeforeDeparture}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--color-border-soft)] px-4 py-3">
                    <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">
                      Reschedule & Date Change
                    </p>
                    <p className="text-sm">{booking.FareRules?.RescheduleDateChange}</p>
                  </div>
                </div>
              </Section>

              <Section title="Documents">
                <div className="flex items-center gap-4 mb-4 text-sm text-[var(--color-text-secondary)]">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="accent-[var(--color-brand)]" />
                    E-Ticket
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="accent-[var(--color-brand)]" />
                    Invoice
                  </label>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button className="btn-secondary" onClick={() => handleDocumentAction("download")}>
                    <Download size={15} /> Download
                  </button>
                  <button className="btn-secondary" onClick={() => handleDocumentAction("customer")}>
                    <Send size={15} /> Send to Customer
                  </button>
                  <button className="btn-secondary" onClick={() => handleDocumentAction("support")}>
                    <MessageSquare size={15} /> Send in Support Chat
                  </button>
                </div>
              </Section>
            </>
          )}

          {activeTab !== "Booking Details" && (
            <div className="card-base p-8">
              <EmptyState label={`${activeTab} isn't wired to an API endpoint yet.`} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
