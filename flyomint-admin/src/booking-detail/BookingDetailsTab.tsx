import type { ReactNode } from "react";
import { Plane } from "lucide-react";
import type {
  BookingInfoFareDetails,
  BookingInfoJourney,
  BookingInfoPassenger,
  SearchTransactionBillingInfo,
  SearchTransactionBookingInfo,
  TransactionContactInfo,
} from "../types";
import { Badge, SectionCard, fmt, fmtCurrency } from "./shared";
import DocumentsCard, { type DocumentParams } from "./DocumentsCard";

interface Props {
  info: SearchTransactionBookingInfo;
  contact?: TransactionContactInfo | null;
  billing?: SearchTransactionBillingInfo | null;
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

function paxFare(p: BookingInfoPassenger, fd: BookingInfoFareDetails) {
  if (p.PaxType === "C") return { base: fd.ChildBaseFare, tax: fd.ChildTax, total: fd.ChildTotalFare };
  if (p.PaxType === "I") return { base: fd.InfantBaseFare, tax: fd.InfantTax, total: fd.InfantTotalFare };
  return { base: fd.AdultBaseFare, tax: fd.AdultTax, total: fd.AdultTotalFare };
}


export default function BookingDetailsTab({ info, contact, billing, documentParams }: Props) {
  const journeys = [info.OnwardJourneyDetail, info.ReturnJourneyDetail].filter(
    (j): j is BookingInfoJourney => !!j
  );
  const first = journeys[0];

  let baseSum = 0;
  let taxSum = 0;
  journeys.forEach((j) =>
    j.PassengerDetails.forEach((p) => {
      const f = paxFare(p, j.FareDetails);
      baseSum += f.base ?? 0;
      taxSum += f.tax ?? 0;
    })
  );

  const totalFareAmount = billing
    ? (billing.TotalItineraryFare ?? 0) + (billing.ConvenienceFee ?? 0)
    : undefined;

  return (
    <div className="space-y-6">
      <SectionCard title="Booking Info">
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-7">
            <Item label="Last updated" value="" />
            <Item label="Coupon Code" value="" />
            <Item label="International" value="" />
            <Item label="Cashback Amount" value="" />
            <Item label="Earn Status" value="" />
            <Item label="Refunded" value="" />
            <Item label="Availing Free Cancellation" value="" />
            <Item label="Insurance Provider" value="" />
            <Item label="Special Inventory" value="" />
            <Item label="Special Fare" value="" />
            <Item label="Published Fare Identifier" value="" />
            <Item label="Fare Type" value="" />
          </div>

          <Panel>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-7">
              <Item label="Order ID" value={first?.OrderDetails} />
              <Item
                label="Trip Type"
                value={info.SearchType === "ON" ? "One Way" : info.SearchType === "RT" ? "Round Trip" : info.SearchType}
              />
              <Item label="Invoice No." value={info.InvoiceNumber} />
              <Item label="Payment" value={info.PaymentStatus ? <Badge label={info.PaymentStatus} /> : ""} />
            </div>
          </Panel>

          <Panel title="Refund Block Status">
            <Item label="Refund Status" value="" />
          </Panel>
        </div>
      </SectionCard>

      {journeys.map((j, idx) => {
        const ssr = Array.isArray(j.SSRDetails) ? j.SSRDetails : [];
        const baggage = ssr.filter((s) => s.SSRCode === "BAG");
        const journeyTotal = j.PassengerDetails.reduce(
          (sum, p) => sum + (paxFare(p, j.FareDetails).total ?? 0),
          0
        );

        return (
          <SectionCard key={idx} title={idx === 0 ? "Traveller Info" : "Traveller Info (Return)"}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-7">
                <Item label="Partner Name" value="" />
                <Item label="Provider Ref No." value={j.ProviderRefId} />
                <Item label="Booking PCC" value="" />
                <Item label="Provider Code" value={j.ProviderCode} />
              </div>

              {j.FlightDetails.map((f, fi) => (
                <Panel key={fi}>
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <span className="text-sm font-semibold">
                      {f.AirlineName} {f.AirlineCode}-{f.FlightNumber}
                    </span>
                    <span className="text-xs bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-2 py-1">
                      {CABIN_LABEL[f.CabinClass] ?? f.CabinClass}
                      {f.BookingClass ? ` · ${f.BookingClass}` : ""}
                    </span>
                  </div>

                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
                    <div className="min-w-0">
                      <p className="text-2xl font-semibold leading-none">{f.DepartureAirportCode}</p>
                      <p className="text-sm mt-2 break-words">{f.DepartureAirportName}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-2">{fmt(f.DepartureDateTime)}</p>
                    </div>

                    <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
                      <span className="text-xs border border-[var(--color-border)] rounded-full px-3 py-1 whitespace-nowrap">
                        {f.Duration}
                      </span>
                      <div className="flex items-center gap-1">
                        <div className="h-px w-10 bg-current" />
                        <Plane size={14} />
                        <div className="h-px w-10 bg-current" />
                      </div>
                    </div>

                    <div className="min-w-0 text-right">
                      <p className="text-2xl font-semibold leading-none">{f.ArrivalAirportCode}</p>
                      <p className="text-sm mt-2 break-words">{f.ArrivalAirportName}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-2">{fmt(f.ArrivalDateTime)}</p>
                    </div>
                  </div>
                </Panel>
              ))}

              {j.PassengerDetails.length > 0 && (
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
                        {j.PassengerDetails.map((p, pi) => {
                          const meta = PAX_META[p.PaxType];
                          const paxSsr = ssr.filter((s) => s.PassengerId === p.PassengerId);
                          return (
                            <tr key={p.PassengerId} className="border-b border-[var(--color-border-soft)] last:border-0 align-top">
                              <td className="py-4 px-3">{pi + 1}</td>
                              <td className="py-4 px-3">
                                <p className="font-medium">
                                  {p.Title} {p.FirstName} {p.LastName}
                                  {meta ? ` (${meta.code})` : ""}
                                </p>
                                {paxSsr.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {paxSsr.map((s, si) => (
                                      <span
                                        key={si}
                                        className="text-[11px] bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-2 py-0.5"
                                      >
                                        {s.SSRCode}{s.SSRDesc ? `: ${s.SSRDesc}` : ""}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="py-4 px-3 font-mono">{j.AirlinePNR}</td>
                              <td className="py-4 px-3 font-mono">{j.GDSPNR}</td>
                              <td className="py-4 px-3 font-mono">{p.TicketNumber || ""}</td>
                              <td className="py-4 px-3">{fmtCurrency(paxFare(p, j.FareDetails).total)}</td>
                              <td className="py-4 px-3">{j.CurrentStatus ? <Badge label={j.CurrentStatus} /> : ""}</td>
                              <td className="py-4 px-3"></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end mt-4 pt-4 border-t border-[var(--color-border-soft)] text-sm font-semibold">
                    Total Fare - {fmtCurrency(journeyTotal)}
                  </div>
                </Panel>
              )}

              <Panel title="Baggage Information">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead>
                      <tr className="text-left text-[var(--color-text-muted)] text-xs uppercase tracking-wider bg-[var(--color-surface-2)]">
                        <th className="py-3 px-3 font-medium">Type</th>
                        <th className="py-3 px-3 font-medium">Sector</th>
                        <th className="py-3 px-3 font-medium">Check-in Baggage</th>
                        <th className="py-3 px-3 font-medium">Cabin Baggage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(baggage.length ? baggage : [null]).map((b, bi) => {
                        const [checkIn = "", cabin = ""] = (b?.SSRDesc ?? "").split(",").map((s) => s.trim());
                        const pax = b ? j.PassengerDetails.find((p) => p.PassengerId === b.PassengerId) : undefined;
                        return (
                          <tr key={bi} className="border-b border-[var(--color-border-soft)] last:border-0">
                            <td className="py-3 px-3">{pax ? PAX_META[pax.PaxType]?.label : ""}</td>
                            <td className="py-3 px-3">{j.Source} - {j.Destination}</td>
                            <td className="py-3 px-3">{checkIn}</td>
                            <td className="py-3 px-3">{cabin}</td>
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
                  <Item label="Sector" value={`${j.Source} to ${j.Destination}`} />
                  <Item label="Status" value="" />
                  <Item label="Boarding Pass" value="" />
                </div>
              </Panel>
            </div>
          </SectionCard>
        );
      })}

      <DocumentsCard invoiceNumber={info.InvoiceNumber} params={documentParams} />

      <SectionCard title="Contact Details">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-6">
          <Item label="Name" value={contact?.Name} />
          <Item label="Email" value={contact?.Email} />
          <Item label="Phone" value={contact?.Mobile} />
        </div>
      </SectionCard>

      <SectionCard title="Billing Summary">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Panel>
            <Row label="Original" value={billing ? fmtCurrency(baseSum) : ""} />
            <Row label="Assured/Flex" value="" />
            <Row label="Convenience" value={billing ? fmtCurrency(billing.ConvenienceFee) : ""} />
            <Row label="Tax" value={billing ? fmtCurrency(taxSum) : ""} />
            <Row label="Seat Amount" value="" />
            <Row
              label="Total Fare Amount"
              value={totalFareAmount !== undefined ? fmtCurrency(totalFareAmount) : ""}
              strong
            />
          </Panel>
          <Panel>
            <Row label="Instant Discount" value={billing ? `- ${fmtCurrency(billing.InstantDiscount)}` : ""} />
            <Row label="Total Amount Paid" value={billing ? fmtCurrency(billing.TotalAmountPaid) : ""} strong />
          </Panel>
        </div>
      </SectionCard>

      <SectionCard title="Refund Summary">
        <div className="min-h-[3rem]" />
      </SectionCard>
    </div>
  );
}