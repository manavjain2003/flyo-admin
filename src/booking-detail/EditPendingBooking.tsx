import { useState } from "react";
import type {
  BookingInfoJourney,
  PendingStatusCode,
  UpdatePendingBookingRequest,
  UpdatePendingSegment,
} from "../types";
import { updatePendingBooking } from "../api/endpoints";

interface Props {
  bookingId: string;
  searchType: string;
  journey: BookingInfoJourney;
  leg: "onward" | "return";
  mirrorJourney?: BookingInfoJourney | null;
  onUpdated?: () => void;
}

const STATUS_OPTIONS: { code: PendingStatusCode; label: string }[] = [
  { code: "CN", label: "Confirmed" },
  { code: "FL", label: "Failed" },
];

const fieldClass =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-text-secondary)] disabled:opacity-60";

function buildSegment(
  j: BookingInfoJourney,
  status: PendingStatusCode,
  crsPnr: string,
  airlinePnr: string,
  tickets: Record<number, string>
): UpdatePendingSegment {
  const confirmed = status === "CN";
  return {
    CurrentStatusCode: status,
    CRSPNR: confirmed ? crsPnr.trim() : "",
    AirlinePNR: confirmed ? airlinePnr.trim() : "",
    Source: j.Source,
    Destination: j.Destination,
    TicketDetails: confirmed
      ? (j.PassengerDetails ?? []).map((p) => ({
          PassengerId: String(p.PassengerId),
          TicketNumber: (tickets[p.PassengerId] ?? "").trim(),
        }))
      : [],
  };
}

export default function EditPendingBooking({
  bookingId,
  searchType,
  journey,
  leg,
  mirrorJourney,
  onUpdated,
}: Props) {
  const passengers = journey.PassengerDetails ?? [];

  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<PendingStatusCode | "">("");
  const [crsPnr, setCrsPnr] = useState(journey.CRSPNR ?? "");
  const [airlinePnr, setAirlinePnr] = useState(journey.AirlinePNR ?? "");
  const [tickets, setTickets] = useState<Record<number, string>>(() =>
    Object.fromEntries(passengers.map((p) => [p.PassengerId, p.TicketNumber ?? ""]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmed = status === "CN";
  const missingDetails =
    confirmed &&
    (!crsPnr.trim() ||
      !airlinePnr.trim() ||
      passengers.some((p) => !(tickets[p.PassengerId] ?? "").trim()));
  const canSubmit = !!status && !missingDetails && !submitting;

  function close() {
    setEditing(false);
    setStatus("");
    setError(null);
  }

  async function submit() {
    if (!status) return;
    setSubmitting(true);
    setError(null);

    const seg = buildSegment(journey, status, crsPnr, airlinePnr, tickets);

    let onward: UpdatePendingSegment | null = null;
    let ret: UpdatePendingSegment | null = null;

    if (searchType === "RT") {
      if (leg === "return") ret = seg;
      else onward = seg;
    } else {
      onward = seg;
      if (searchType === "RS") {
        ret = buildSegment(mirrorJourney ?? journey, status, crsPnr, airlinePnr, tickets);
      }
    }

    const body: UpdatePendingBookingRequest = {
      SearchType: searchType,
      BookingId: bookingId,
      OnwardSegmentDetail: onward,
      ReturnSegmentDetail: ret,
    };

    try {
      const data = await updatePendingBooking(body);
      if (data?.ErrorCode) {
        throw new Error(data.Message || "Could not update the booking.");
      }
      close();
      onUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the booking.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm font-medium rounded-md border border-[var(--color-border)] px-4 py-1.5 hover:bg-[var(--color-surface-2)]"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--color-border-soft)] p-5 space-y-5">
      <p className="text-sm font-semibold">
        Update booking status
        {searchType === "RT" ? (leg === "return" ? " (Return)" : " (Onward)") : ""}
      </p>

      <div className="max-w-xs">
        <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">Status</label>
        <select
          className={fieldClass}
          value={status}
          disabled={submitting}
          onChange={(e) => setStatus(e.target.value as PendingStatusCode | "")}
        >
          <option value="">Select status</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.code} value={o.code}>
              {o.label} - {o.code}
            </option>
          ))}
        </select>
      </div>

      {confirmed && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                CRS PNR
              </label>
              <input
                className={`${fieldClass} font-mono`}
                value={crsPnr}
                disabled={submitting}
                onChange={(e) => setCrsPnr(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                Airline PNR
              </label>
              <input
                className={`${fieldClass} font-mono`}
                value={airlinePnr}
                disabled={submitting}
                onChange={(e) => setAirlinePnr(e.target.value)}
              />
            </div>
          </div>

          <div>
            <p className="text-xs text-[var(--color-text-muted)] mb-2">Ticket numbers</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              {passengers.map((p) => (
                <div key={p.PassengerId}>
                  <label className="block text-sm mb-1.5">
                    {[p.Title, p.FirstName, p.LastName].filter(Boolean).join(" ")}
                  </label>
                  <input
                    className={`${fieldClass} font-mono`}
                    value={tickets[p.PassengerId] ?? ""}
                    disabled={submitting}
                    onChange={(e) =>
                      setTickets((t) => ({ ...t, [p.PassengerId]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={close}
          disabled={submitting}
          className="text-sm rounded-md border border-[var(--color-border)] px-4 py-1.5 hover:bg-[var(--color-surface-2)] disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="text-sm font-medium rounded-md bg-[var(--color-text-primary,#111)] text-[var(--color-surface,#fff)] px-4 py-1.5 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Submit"}
        </button>
      </div>
    </div>
  );
}