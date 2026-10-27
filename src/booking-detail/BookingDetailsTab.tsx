import type { ReactNode } from "react";
import { Plane } from "lucide-react";
import type {
  BookingInfoFareDetails,
  BookingInfoJourney,
  BookingInfoPassenger,
  BookingInfoSSR,
  SearchTransactionBillingInfo,
  SearchTransactionBookingInfo,
  SearchTransactionGSTInfo,
  SearchTransactionPaymentInfo,
  TransactionContactInfo,
} from "../types";
import { Badge, SectionCard, fmt, fmtCurrency } from "./shared";
import DocumentsCard, { type DocumentParams } from "./DocumentsCard";
import EditPendingBooking from "./EditPendingBooking";
import { useAuth } from "../context/AuthContext";

interface Props {
  info: SearchTransactionBookingInfo;
  contact?: TransactionContactInfo | null;
  billing?: SearchTransactionBillingInfo | null;
  payment?: SearchTransactionPaymentInfo | null;
  onUpdated?: () => void;
  gst?: SearchTransactionGSTInfo | null;
  documentParams?: DocumentParams;
}

function Item({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-[var(--color-text-muted)] mb-1.5">{label}</p>
      <div className="text-sm font-medium min-h-[1.5rem] break-words">{value ?? ""}</div>
    </div>
  );
}

function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--color-border-soft)] p-5">
      {title && <p className="text-sm font-semibold mb-5">{title}</p>}
      {children}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value?: ReactNode; strong?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between py-3 text-sm border-b border-[var(--color-border-soft)] last:border-0 ${
        strong ? "font-semibold" : ""
      }`}
    >
      <span className={strong ? "" : "text-[var(--color-text-secondary)]"}>{label}</span>
      <span className="min-h-[1.25rem]">{value ?? ""}</span>
    </div>
  );
}

const CABIN_LABEL: Record<string, string> = {
  E: "Economy",
  PE: "Premium Economy",
  B: "Business",
  F: "First",
};

const PAX_META: Record<string, { label: string; code: string }> = {
  A: { label: "Adult", code: "ADT" },
  C: { label: "Child", code: "CHD" },
  I: { label: "Infant", code: "INF" },
};

const PAYMENT_MODE_LABEL: Record<string, string> = {
  CC: "Credit Card",
  DC: "Debit Card",
  NB: "Net Banking",
  UPI: "UPI",
  WALLET: "Wallet",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dash(v?: string | null) {
  const s = (v ?? "").toString().trim();
  return s || "—";
}

function cityLabel(code?: string, city?: string | null) {
  const c = (code ?? "").trim().toUpperCase();
  const n = (city ?? "").trim().toUpperCase();
  if (!c && !n) return "—";
  if (!c) return n;
  if (!n) return c;
  return `${c} - ${n}`;
}

function fmtUsDate(v?: string | null) {
  const m = (v ?? "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return "";
  const [, mo, d, y] = m;
  if (Number(y) <= 1) return "";
  return `${d.padStart(2, "0")} ${MONTHS[Number(mo) - 1] ?? ""} ${y}`;
}

function paxFare(p: BookingInfoPassenger, fd?: BookingInfoFareDetails | null) {
  if (!fd) return { base: 0, tax: 0, total: 0 };
  if (p.PaxType === "C") return { base: fd.ChildBaseFare, tax: fd.ChildTax, total: fd.ChildTotalFare };
  if (p.PaxType === "I") return { base: fd.InfantBaseFare, tax: fd.InfantTax, total: fd.InfantTotalFare };
  return { base: fd.AdultBaseFare, tax: fd.AdultTax, total: fd.AdultTotalFare };
}

function tripTypeLabel(searchType?: string) {
  if (searchType === "ON") return "One Way";
  if (searchType === "RT") return "Round Trip";
  if (searchType === "RS") return "Round Trip (Special)";
  return searchType?.trim() ? searchType : "—";
}

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m} Min`;
  return `${h} Hr ${m} Min`;
}

function connectionTimes(prevArrival?: string, nextDeparture?: string) {
  if (!prevArrival || !nextDeparture) return null;
  const a = new Date(prevArrival).getTime();
  const b = new Date(nextDeparture).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return null;
  const label = formatDurationMs(b - a);
  return label ? { layover: label, turnover: label } : null;
}

function yn(v?: string) {
  if (!v?.trim()) return "—";
  const u = v.toUpperCase();
  if (u === "YES" || u === "Y" || u === "TRUE") return "Yes";
  if (u === "NO" || u === "N" || u === "FALSE") return "No";
  return v;
}

function fareTypeLabel(refundable?: string) {
  if (!refundable?.trim()) return "—";
  const u = refundable.toUpperCase();
  if (u === "NO" || u === "N") return "Non-Refundable";
  if (u === "YES" || u === "Y") return "Refundable";
  return refundable;
}

function bagLabel(v?: string) {
  const s = (v ?? "").trim();
  if (!s || /^0+(\.0+)?\s*(kg)?$/i.test(s)) return "—";
  return s;
}

type SsrKind = "baggage" | "meal" | "seat" | "other";

// Classify an SSR line by its code / type so every add-on lands in exactly one billing row.
function ssrKind(s: BookingInfoSSR): SsrKind {
  const code = (s.SSRCode ?? "").toUpperCase();
  const type = String(s.SSRType ?? "");
  if (code === "BAG" || type === "2") return "baggage";
  if (code === "MEAL" || code === "ML" || type === "1") return "meal";
  if (code.startsWith("SEAT") || type === "3") return "seat";
  return "other";
}

export default function BookingDetailsTab({
  info,
  contact,
  billing,
  payment,
  gst,
  documentParams,
  onUpdated,
}: Props) {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("searchtxn", "W");
  const journeys = [info.OnwardJourneyDetail, info.ReturnJourneyDetail].filter(
    (j): j is BookingInfoJourney => !!j
  );
  const first = journeys[0];

  let baseSum = 0;
  let taxSum = 0;
  let baggageSsrTotal = 0;
  let mealSsrTotal = 0;
  let seatSsrTotal = 0;
  let otherSsrTotal = 0;

  journeys.forEach((j) => {
    (j.PassengerDetails ?? []).forEach((p) => {
      const f = paxFare(p, j.FareDetails);
      baseSum += f.base ?? 0;
      taxSum += f.tax ?? 0;
    });
    (Array.isArray(j.SSRDetails) ? j.SSRDetails : []).forEach((s) => {
      const price = Number(s.SSRPrice) || 0;
      const kind = ssrKind(s);
      if (kind === "baggage") baggageSsrTotal += price;
      else if (kind === "meal") mealSsrTotal += price;
      else if (kind === "seat") seatSsrTotal += price;
      else otherSsrTotal += price;
    });
  });

  // Total Fare = sum of every line shown in the summary (all computed from the booking data),
  // so the column always adds up. Total Amount Paid comes from the billing API.
  const addOnTotal = baggageSsrTotal + mealSsrTotal + seatSsrTotal + otherSsrTotal;
  const totalFareAmount = billing
    ? baseSum + (billing.ConvenienceFee ?? 0) + taxSum + addOnTotal
    : undefined;
  const expectedPaid =
    totalFareAmount !== undefined
      ? totalFareAmount - (billing?.InstantDiscount ?? 0)
      : undefined;
  const paidMismatch =
    expectedPaid !== undefined &&
    billing?.TotalAmountPaid != null &&
    Math.abs(expectedPaid - billing.TotalAmountPaid) > 1;

  const gstNumber = gst?.GSTNumber || info.GSTNumber || first?.GSTNumber || "";
  const gstCompany = gst?.GSTCompanyName || info.GSTCompanyName || first?.GSTCompanyName || "";

const contactName = contact?.Name;
const contactEmail = info.CustomerEmail;
const contactPhone = info.CustomerMobile;

  return (
    <div className="space-y-6">
      <SectionCard title="Booking Info">
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-7">
            <Item label="Last updated" value="—" />
            <Item label="Coupon Code" value={dash(info.CouponCode)} />
            <Item label="International" value={yn(first?.International)} />
            <Item label="Cashback Amount" value="—" />
            <Item label="Earn Status" value="—" />
            <Item label="Refunded" value="—" />
            <Item label="Availing Free Cancellation" value="—" />
            <Item label="Insurance Provider" value="—" />
            <Item label="Special Inventory" value={yn(first?.SpacialInventary)} />
            <Item label="Special Fare" value={dash(first?.SpacialFare)} />
            <Item label="Published Fare Identifier" value={dash(first?.PublishFare)} />
            <Item label="Fare Type" value={fareTypeLabel(first?.Refundable)} />
            <Item label="GST Number" value={dash(gstNumber)} />
            <Item label="GST Company Name" value={dash(gstCompany)} />
          </div>

          <Panel title="Refund Block Status">
            <Item label="Refund Status" value="—" />
          </Panel>
        </div>
      </SectionCard>

      {journeys.map((j, idx) => {
        const flights = j.FlightDetails ?? [];
        const passengers = j.PassengerDetails ?? [];
        const ssr = Array.isArray(j.SSRDetails) ? j.SSRDetails : [];
        const baggage = ssr.filter((s) => (s.SSRCode ?? "").toUpperCase() === "BAG");
        const journeyTotal = passengers.reduce(
          (sum, p) => sum + (paxFare(p, j.FareDetails).total ?? 0),
          0
        );
        const gdsPnr = j.CRSPNR || j.GDSPNR;

        return (
          <SectionCard key={idx} title={idx === 0 ? "Traveller Info" : "Traveller Info (Return)"}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-7">
                <Item label="Partner Name" value={dash(j.ProviderCode)} />
                <Item label="Provider Ref No." value={dash(j.OrderDetails)} />
                <Item label="Booking PCC" value={dash(j.BookingPCC)} />
                <Item label="Trip Type" value={tripTypeLabel(info.SearchType)} />
              </div>

              {canWrite && !!j.IsEditAllowed && (info.SearchType === "RT" || idx === 0) && (
                <EditPendingBooking
                  bookingId={info.BookingId}
                  searchType={info.SearchType}
                  leg={idx === 0 ? "onward" : "return"}
                  journey={j}
                  mirrorJourney={info.SearchType === "RS" ? journeys[1] : undefined}
                  onUpdated={onUpdated}
                />
              )}

              {flights.map((f, fi) => {
                const next = flights[fi + 1];
                const connection = next
                  ? connectionTimes(f.ArrivalDateTime, next.DepartureDateTime)
                  : null;
                const depTerminal = (f.DepartureTerminal ?? "").trim();
                const arrTerminal = (f.ArrivalTerminal ?? "").trim();

                return (
                  <div key={fi} className="space-y-3">
                    <Panel>
                      <div className="flex flex-wrap items-center gap-3 mb-6">
                        <span className="text-sm font-semibold">
                          {dash(f.AirlineName)}{" "}
                          {f.AirlineCode && f.FlightNumber
                            ? `${f.AirlineCode}-${f.FlightNumber}`
                            : dash(f.FlightNumber)}
                        </span>
                        <span className="text-xs bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-2 py-1">
                          {CABIN_LABEL[f.CabinClass] ?? dash(f.CabinClass)}
                          {f.BookingClass ? ` · ${f.BookingClass}` : ""}
                        </span>
                      </div>

                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
                        <div className="min-w-0">
                          <p className="text-2xl font-semibold leading-none">
                            {cityLabel(f.DepartureAirportCode, f.DepartureCity)}
                          </p>
                          <p className="text-sm mt-2 break-words">
                            {dash(f.DepartureAirportName)}
                          </p>
                          {depTerminal && (
                            <p className="text-xs text-[var(--color-text-muted)] mt-1">
                              Terminal {depTerminal}
                            </p>
                          )}
                          <p className="text-xs text-[var(--color-text-muted)] mt-2">
                            {f.DepartureDateTime ? fmt(f.DepartureDateTime) : "—"}
                          </p>
                        </div>

                        <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
                          <span className="text-xs border border-[var(--color-border)] rounded-full px-3 py-1 whitespace-nowrap">
                            {dash(f.Duration)}
                          </span>
                          <div className="flex items-center gap-1">
                            <div className="h-px w-10 bg-current" />
                            <Plane size={14} />
                            <div className="h-px w-10 bg-current" />
                          </div>
                        </div>

                        <div className="min-w-0 text-right">
                          <p className="text-2xl font-semibold leading-none">
                            {cityLabel(f.ArrivalAirportCode, f.ArrivalCity)}
                          </p>
                          <p className="text-sm mt-2 break-words">
                            {dash(f.ArrivalAirportName)}
                          </p>
                          {arrTerminal && (
                            <p className="text-xs text-[var(--color-text-muted)] mt-1">
                              Terminal {arrTerminal}
                            </p>
                          )}
                          <p className="text-xs text-[var(--color-text-muted)] mt-2">
                            {f.ArrivalDateTime ? fmt(f.ArrivalDateTime) : "—"}
                          </p>
                        </div>
                      </div>
                    </Panel>

                    {connection && (
                      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[var(--color-text-muted)] px-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1">
                          Layover:{" "}
                          <strong className="text-[var(--color-text-secondary)]">
                            {dash(f.LayoverTime) !== "—" ? f.LayoverTime : connection.layover}
                          </strong>
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1">
                          Turnover:{" "}
                          <strong className="text-[var(--color-text-secondary)]">
                            {connection.turnover}
                          </strong>
                        </span>
                        <span>
                          {dash(f.ArrivalAirportCode)} → {dash(next?.DepartureAirportCode)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {passengers.length > 0 && (
                <Panel title="Passengers">
                  <div className="overflow-x-auto -mx-1">
                    <table className="w-full text-sm min-w-[820px]">
                      <thead>
                        <tr className="text-left text-[var(--color-text-muted)] text-xs uppercase tracking-wider bg-[var(--color-surface-2)]">
                          <th className="py-3 px-3 font-medium rounded-l">S.No</th>
                          <th className="py-3 px-3 font-medium">Passenger Name</th>
                          <th className="py-3 px-3 font-medium">Airline PNR</th>
                          <th className="py-3 px-3 font-medium">GDS PNR</th>
                          <th className="py-3 px-3 font-medium">Ticket No.</th>
                          <th className="py-3 px-3 font-medium">Fare</th>
                          <th className="py-3 px-3 font-medium">Status</th>
                          <th className="py-3 px-3 font-medium rounded-r">Fraud Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {passengers.map((p, pi) => {
                          const meta = PAX_META[p.PaxType];
                          const paxSsr = ssr.filter((s) => s.PassengerId === p.PassengerId);
                          const dob = fmtUsDate(p.DOB);
                          const passportExpiry = fmtUsDate(p.PDOE);
                          const idBits = [
                            dob && `DOB ${dob}`,
                            p.PassportNo?.trim() &&
                              `Passport ${p.PassportNo.trim()}${
                                passportExpiry ? ` (exp ${passportExpiry})` : ""
                              }`,
                            p.Nationality?.trim() && p.Nationality.trim(),
                          ].filter(Boolean) as string[];

                          return (
                            <tr
                              key={p.PassengerId}
                              className="border-b border-[var(--color-border-soft)] last:border-0 align-top"
                            >
                              <td className="py-4 px-3">{pi + 1}</td>
                              <td className="py-4 px-3">
                                <p className="font-medium">
                                  {dash(
                                    [p.Title, p.FirstName, p.LastName].filter(Boolean).join(" ")
                                  )}
                                  {meta ? ` (${meta.code})` : ""}
                                </p>
                                {idBits.length > 0 && (
                                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                    {idBits.join(" · ")}
                                  </p>
                                )}
                                {paxSsr.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {paxSsr.map((s, si) => (
                                      <span
                                        key={si}
                                        className="text-[11px] bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-2 py-0.5"
                                      >
                                        {s.SSRCode}
                                        {s.SSRDesc ? `: ${s.SSRDesc}` : ""}
                                        {Number(s.SSRPrice) > 0 ? ` · ${fmtCurrency(Number(s.SSRPrice))}` : ""}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="py-4 px-3 font-mono">{dash(j.AirlinePNR)}</td>
                              <td className="py-4 px-3 font-mono">{dash(gdsPnr)}</td>
                              <td className="py-4 px-3 font-mono">{dash(p.TicketNumber)}</td>
                             <td className="py-4 px-3">
  {j.FareDetails ? fmtCurrency(paxFare(p, j.FareDetails).total) : "—"}
</td>
                              <td className="py-4 px-3">
                                {j.CurrentStatus ? <Badge label={j.CurrentStatus} /> : "—"}
                              </td>
                              <td className="py-4 px-3">—</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
          {j.FareDetails && (
  <div className="flex justify-end mt-4 pt-4 border-t border-[var(--color-border-soft)] text-sm font-semibold">
    Total Fare - {fmtCurrency(journeyTotal)}
  </div>
)}
                </Panel>
              )}

              <Panel title="Baggage Information">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead>
                      <tr className="text-left text-[var(--color-text-muted)] text-xs uppercase tracking-wider bg-[var(--color-surface-2)]">
                        <th className="py-3 px-3 font-medium">Passenger</th>
                        <th className="py-3 px-3 font-medium">Type</th>
                        <th className="py-3 px-3 font-medium">Sector</th>
                        <th className="py-3 px-3 font-medium">Check-in Baggage</th>
                        <th className="py-3 px-3 font-medium">Cabin Baggage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(baggage.length ? baggage : [null]).map((b, bi) => {
                        const [checkIn = "", cabin = ""] = (b?.SSRDesc ?? "")
                          .split(",")
                          .map((s) => s.trim());
                        const pax = b
                          ? passengers.find((p) => p.PassengerId === b.PassengerId)
                          : undefined;
                        const seg = b ? flights.find((f) => f.SID === b.SID) : undefined;
                        const sector = seg
                          ? `${dash(seg.DepartureAirportCode)} - ${dash(seg.ArrivalAirportCode)}`
                          : `${dash(j.Source)} - ${dash(j.Destination)}`;

                        return (
                          <tr
                            key={bi}
                            className="border-b border-[var(--color-border-soft)] last:border-0"
                          >
                            <td className="py-3 px-3">
                              {pax
                                ? dash([pax.FirstName, pax.LastName].filter(Boolean).join(" "))
                                : "—"}
                            </td>
                            <td className="py-3 px-3">
                              {pax ? PAX_META[pax.PaxType]?.label ?? "—" : "—"}
                            </td>
                            <td className="py-3 px-3">{sector}</td>
                            <td className="py-3 px-3">{bagLabel(checkIn)}</td>
                            <td className="py-3 px-3">{bagLabel(cabin)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <Panel title="Web-Checkin">
                <p className="text-xs text-[var(--color-text-muted)] mb-4">
                  {idx === 0 ? "Onward Trip" : "Return Trip"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-6">
                  <Item label="Sector" value={`${dash(j.Source)} to ${dash(j.Destination)}`} />
                  <Item label="Status" value="—" />
                  <Item label="Boarding Pass" value="—" />
                </div>
              </Panel>
            </div>
          </SectionCard>
        );
      })}

      <DocumentsCard invoiceNumber={info.InvoiceNumber} params={documentParams} />

      <SectionCard title="Contact Details">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-6">
          <Item label="Name" value={dash(contactName)} />
          <Item label="Email" value={dash(contactEmail)} />
          <Item label="Phone" value={dash(contactPhone)} />
        </div>
      </SectionCard>

      <SectionCard
        title={
          billing?.TotalAmountPaid != null
            ? `Billing Summary · Total ₹${Number(billing.TotalAmountPaid).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}`
            : "Billing Summary"
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Panel>
              <Row label="Original" value={billing ? fmtCurrency(baseSum) : "—"} />
              <Row label="Assured/Flex" value="—" />
              <Row
                label="Convenience"
                value={billing ? fmtCurrency(billing.ConvenienceFee) : "—"}
              />
              <Row label="Tax" value={billing ? fmtCurrency(taxSum) : "—"} />
              <Row label="Seat Amount" value={seatSsrTotal > 0 ? fmtCurrency(seatSsrTotal) : "—"} />
              <Row label="Baggage" value={fmtCurrency(baggageSsrTotal)} />
              <Row label="Meal" value={fmtCurrency(mealSsrTotal)} />
              {otherSsrTotal > 0 && (
                <Row label="Other Add-ons" value={fmtCurrency(otherSsrTotal)} />
              )}
              <Row
                label="Total Fare Amount"
                value={totalFareAmount !== undefined ? fmtCurrency(totalFareAmount) : "—"}
                strong
              />
            </Panel>
            <Panel>
              <Row
                label="Instant Discount"
                value={billing ? `- ${fmtCurrency(billing.InstantDiscount)}` : "—"}
              />
              <Row
                label="Total Amount Paid"
                value={billing ? fmtCurrency(billing.TotalAmountPaid) : "—"}
                strong
              />
            </Panel>
          </div>

          {paidMismatch && expectedPaid !== undefined && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Totals don&apos;t reconcile: Total Fare − Instant Discount is {fmtCurrency(expectedPaid)},
              but the recorded Total Amount Paid is {fmtCurrency(billing?.TotalAmountPaid)}. The
              billing API may not be including add-ons (SSR) in the amount paid.
            </p>
          )}

          {payment && (
            <Panel title="Payment Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                <Item
                  label="Payment Mode"
                  value={PAYMENT_MODE_LABEL[(payment.PaymentMode ?? "").toUpperCase()] ?? dash(payment.PaymentMode)}
                />
                <Item
                  label="Status"
                  value={payment.PaymentStatus ? <Badge label={payment.PaymentStatus} /> : "—"}
                />
                <Item label="Amount Paid" value={fmtCurrency(payment.AmountPaid)} />
                <Item label="Gateway" value={dash(payment.PaymentGatewayName)} />
                <Item
                  label="Gateway Ref ID"
                  value={<span className="font-mono">{dash(payment.PaymentGatewayRefId)}</span>}
                />
                <Item
                  label="Paid On"
                  value={payment.PaymentDateTime ? fmt(payment.PaymentDateTime) : "—"}
                />
              </div>
            </Panel>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Refund Summary">
        <div className="min-h-[3rem]" />
      </SectionCard>
    </div>
  );
}