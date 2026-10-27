import { useEffect, useRef, useState } from "react";

type Meridiem = "AM" | "PM";

export function to12h(value: string): { hour: string; minute: string; meridiem: Meridiem } {
  const [hh = "0", mm = "0"] = value.split(":");
  const h24 = Math.min(23, Math.max(0, Number(hh) || 0));
  const m = Math.min(59, Math.max(0, Number(mm) || 0));
  const meridiem: Meridiem = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour: String(h12).padStart(2, "0"), minute: String(m).padStart(2, "0"), meridiem };
}

export function to24h(hour: string, minute: string, meridiem: Meridiem): string | null {
  if (!/^\d{1,2}$/.test(hour) || !/^\d{1,2}$/.test(minute)) return null;
  const h = Number(hour);
  const m = Number(minute);
  if (h < 1 || h > 12 || m > 59) return null;
  let h24 = h % 12;
  if (meridiem === "PM") h24 += 12;
  return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function format12h(value: string): string {
  const t = to12h(value);
  return `${t.hour}:${t.minute} ${t.meridiem}`;
}

interface TimeInput12Props {
  value: string; // "HH:mm" 24h
  onChange: (value: string) => void;
  ariaLabel?: string;
}

export default function TimeInput12({ value, onChange, ariaLabel = "Time" }: TimeInput12Props) {
  const parsed = to12h(value);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [meridiem, setMeridiem] = useState<Meridiem>(parsed.meridiem);
  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);
  const meridiemRef = useRef<Meridiem>(parsed.meridiem);
  meridiemRef.current = meridiem;

  useEffect(() => {
    const t = to12h(value);
    setHour(t.hour);
    setMinute(t.minute);
    setMeridiem(t.meridiem);
  }, [value]);

  function commit(ap: Meridiem = meridiemRef.current) {
    let h = Number(hourRef.current?.value ?? "");
    const mRaw = minuteRef.current?.value ?? "";
    let mer = ap;

    if (h >= 13 && h <= 23) {
      h -= 12;
      mer = "PM";
    } else if (h === 0 && (hourRef.current?.value ?? "") !== "") {
      h = 12;
    }

    const next = to24h(String(h), mRaw === "" ? "0" : mRaw, mer);
    const t = to12h(next ?? value);
    setHour(t.hour);
    setMinute(t.minute);
    setMeridiem(t.meridiem);
    if (next && next !== value) onChange(next);
  }

  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 2);

  const field =
    "w-7 bg-transparent text-center text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none py-2.5";

  return (
    <div
      className="input-base flex items-center gap-1 !py-0 !pl-2 !pr-1 focus-within:!border-[var(--color-brand)] focus-within:!ring-1 focus-within:!ring-[var(--color-brand)]"
      role="group"
      aria-label={ariaLabel}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        commit();
      }}
    >
      <input
        ref={hourRef}
        type="text"
        inputMode="numeric"
        aria-label={`${ariaLabel} hour`}
        placeholder="hh"
        maxLength={2}
        autoComplete="off"
        className={field}
        value={hour}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const v = digits(e.target.value);
          setHour(v);
          if (v.length === 2 || (v.length === 1 && Number(v) > 1)) {
            setTimeout(() => minuteRef.current?.focus(), 0);
          }
        }}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
      <span className="text-[var(--color-text-muted)]">:</span>
      <input
        ref={minuteRef}
        type="text"
        inputMode="numeric"
        aria-label={`${ariaLabel} minute`}
        placeholder="mm"
        maxLength={2}
        autoComplete="off"
        className={field}
        value={minute}
        onFocus={(e) => e.target.select()}
        onChange={(e) => setMinute(digits(e.target.value))}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
      <div className="ml-auto flex overflow-hidden rounded-md border border-[var(--color-border)]" role="radiogroup" aria-label={`${ariaLabel} AM or PM`}>
        {(["AM", "PM"] as Meridiem[]).map((ap) => {
          const active = meridiem === ap;
          return (
            <button
              key={ap}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                setMeridiem(ap);
                commit(ap);
              }}
              className={`px-1.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? "bg-[var(--color-brand)] text-white"
                  : "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)]"
              }`}
            >
              {ap}
            </button>
          );
        })}
      </div>
    </div>
  );
}