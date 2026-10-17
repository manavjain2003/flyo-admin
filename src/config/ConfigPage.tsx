import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  ConfigItem,
  FareTypeConfig,
  HandBagConfig,
  ProductClassDisplayDetail,
} from "../types";
import { getConfigs } from "../api/endpoints";

const SECTOR_LABEL: Record<string, string> = {
  D: "Domestic",
  I: "International",
};

const KEY_LABEL: Record<string, string> = {
  Display_HandBag: "Display Hand Bag",
  IsSeparateNode_HandBag: "Separate Node",
  Priority_HandBag: "Priority",
  FareDisplayMode: "Fare Display Mode",
  ProductName: "Product Name",
  IsMarginLogic: "Margin Logic",
  Display_Fare: "Display Fare",
  IsSeparateNode: "Separate Node",
  ProductClass: "Product Class",
  Priority_Fare: "Priority",
  Priority: "Priority",
  SeparateNode: "Separate Node",
  MarginProductClass: "Margin Product Class",
  MarginRestrictedProductClass: "Margin Restricted Product Class",
  MarginPriority: "Margin Priority",
  ValidateRefundStatus: "Validate Refund Status",
  ValidateCheckBag: "Validate Check Bag",
  IsFixedProductClass: "Fixed Product Class",
  IsFixedMarginProductClass: "Fixed Margin Product Class",
};

function labelFor(key: string) {
  return KEY_LABEL[key] ?? key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
}

function scopeLabel(v?: string | null) {
  const s = (v ?? "").trim();
  return s === "*" || !s ? "All" : s;
}

function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "yes" | "no" }) {
  const toneClass =
    tone === "yes"
      ? "border-emerald-500/40 text-emerald-600"
      : tone === "no"
      ? "border-[var(--color-border)] text-[var(--color-text-muted)]"
      : "border-[var(--color-border)] bg-[var(--color-surface-2)]";
  return (
    <span className={`inline-block text-[11px] rounded border px-2 py-0.5 ${toneClass}`}>
      {children}
    </span>
  );
}

function ValueView({ value }: { value: unknown }) {
  if (typeof value === "boolean") {
    return <Chip tone={value ? "yes" : "no"}>{value ? "Yes" : "No"}</Chip>;
  }
  if (Array.isArray(value)) {
    if (!value.length) return <span className="text-[var(--color-text-muted)]">—</span>;
    return (
      <span className="flex flex-wrap justify-end gap-1">
        {value.map((v, i) => (
          <Chip key={i}>{String(v)}</Chip>
        ))}
      </span>
    );
  }
  if (value === null || value === undefined || value === "") {
    return <span className="text-[var(--color-text-muted)]">—</span>;
  }
  return <span>{String(value)}</span>;
}

function KeyValueList({ data }: { data: object }) {
  return (
    <dl className="space-y-2">
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="flex items-start justify-between gap-6 text-xs">
          <dt className="text-[var(--color-text-muted)] whitespace-nowrap">{labelFor(k)}</dt>
          <dd className="font-medium text-right min-w-0 break-words">
            <ValueView value={v} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function HoverCell({
  trigger,
  title,
  wide,
  children,
}: {
  trigger: ReactNode;
  title: string;
  wide?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const width = wide ? 600 : 320;

  function open() {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 16));
    const roomBelow = window.innerHeight - r.bottom;
    if (roomBelow < 280 && r.top > roomBelow) {
      setPos({ left, bottom: window.innerHeight - r.top });
    } else {
      setPos({ left, top: r.bottom });
    }
  }

  return (
    <div onMouseEnter={open} onMouseLeave={() => setPos(null)} onFocus={open} onBlur={() => setPos(null)}>
      <div ref={ref} tabIndex={0} className="inline-block cursor-default outline-none">
        {trigger}
      </div>
      {pos && (
        <div
          className="fixed z-50 py-2"
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: Math.min(width, window.innerWidth - 16) }}
        >
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface,#fff)] shadow-xl p-4 max-h-[70vh] overflow-auto">
            <p className="text-xs font-semibold mb-3">{title}</p>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

function ConfigCell({ cfg, title }: { cfg: HandBagConfig | FareTypeConfig | null | undefined; title: string }) {
  if (!cfg) return <span className="text-[var(--color-text-muted)]">—</span>;
  const enabled = "Display_HandBag" in cfg ? cfg.Display_HandBag : cfg.Display_Fare;
  return (
    <HoverCell
      title={title}
      trigger={
        <span className="inline-flex items-center gap-2 text-xs underline decoration-dotted underline-offset-4">
          {cfg.ProductName || title}
          <Chip tone={enabled ? "yes" : "no"}>{enabled ? "On" : "Off"}</Chip>
        </span>
      }
    >
      <KeyValueList data={cfg} />
    </HoverCell>
  );
}

function ListCell({ values, title }: { values?: string[] | null; title: string }) {
  const list = values ?? [];
  if (!list.length) return <span className="text-[var(--color-text-muted)]">—</span>;
  return (
    <HoverCell
      title={title}
      trigger={
        <span className="inline-flex items-center gap-1.5 text-xs underline decoration-dotted underline-offset-4">
          {list.slice(0, 2).join(", ")}
          {list.length > 2 && <Chip>+{list.length - 2}</Chip>}
        </span>
      }
    >
      <ValueView value={list} />
    </HoverCell>
  );
}

function DetailsCell({ details }: { details?: ProductClassDisplayDetail[] | null }) {
  const list = details ?? [];
  if (!list.length) return <span className="text-[var(--color-text-muted)]">—</span>;
  return (
    <HoverCell
      title="Product Class Display Details"
      wide
      trigger={
        <span className="inline-flex items-center gap-2 text-xs underline decoration-dotted underline-offset-4">
          {list.map((d) => d.ProductName).join(", ")}
          <Chip>{list.length}</Chip>
        </span>
      }
    >
      <div className={`grid gap-4 ${list.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {list.map((d, i) => (
          <div key={i} className="rounded-md border border-[var(--color-border-soft)] p-3">
            <p className="text-xs font-semibold mb-2">{d.ProductName || `Item ${i + 1}`}</p>
            <KeyValueList data={d} />
          </div>
        ))}
      </div>
    </HoverCell>
  );
}

const fieldClass =
  "rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-text-secondary)]";

const HEADERS = [
  "Config Id",
  "Channel",
  "Airline",
  "Cabin",
  "Source",
  "Destination",
  "Sector Type",
  "Hand Bag",
  "Student",
  "Sr. Citizen",
  "Restricted (Display)",
  "Restricted (Margin)",
  "Product Class Display Details",
];

export default function ConfigPage() {
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    getConfigs(ctrl.signal)
      .then((res) => {
        if (res?.ErrorCode) throw new Error(res.Message || "Could not load configuration.");
        setItems(res?.ConfigList ?? []);
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Could not load configuration.");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [reloadKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      if (sector && c.SectorType !== sector) return false;
      if (!q) return true;
      return [c.ConfigId, c.ChannelCode, c.AirlineCode, c.Cabin, c.Source, c.Destination]
        .map((v) => String(v ?? "").toLowerCase())
        .some((v) => v.includes(q));
    });
  }, [items, query, sector]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Fare Configuration</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {loading ? "Loading…" : `${filtered.length} of ${items.length} configurations`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            className={`${fieldClass} w-64`}
            placeholder="Search id, channel, airline, route"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select className={fieldClass} value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="">All sectors</option>
            <option value="D">Domestic</option>
            <option value="I">International</option>
          </select>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={loading}
            className="text-sm rounded-md border border-[var(--color-border)] px-4 py-2 hover:bg-[var(--color-surface-2)] disabled:opacity-60"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 p-4 text-sm text-red-500 flex items-center justify-between gap-4">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="text-sm rounded-md border border-red-500/40 px-3 py-1"
          >
            Retry
          </button>
        </div>
      )}

      <div className="rounded-lg border border-[var(--color-border-soft)] overflow-x-auto">
        <table className="w-full text-sm min-w-[1500px]">
          <thead>
            <tr className="text-left text-[var(--color-text-muted)] text-xs uppercase tracking-wider bg-[var(--color-surface-2)]">
              {HEADERS.map((h) => (
                <th key={h} className="py-3 px-3 font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--color-border-soft)]">
                  <td colSpan={HEADERS.length} className="py-4 px-3">
                    <div className="h-4 rounded bg-[var(--color-surface-2)] animate-pulse" />
                  </td>
                </tr>
              ))}

            {!loading && !filtered.length && (
              <tr>
                <td colSpan={HEADERS.length} className="py-10 text-center text-[var(--color-text-muted)]">
                  {items.length ? "No configurations match your filters." : "No configurations found."}
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((c) => (
                <tr
                  key={c.ConfigId}
                  className="border-b border-[var(--color-border-soft)] last:border-0 align-top"
                >
                  <td className="py-4 px-3 font-mono">{c.ConfigId}</td>
                  <td className="py-4 px-3">{scopeLabel(c.ChannelCode)}</td>
                  <td className="py-4 px-3 font-mono">{scopeLabel(c.AirlineCode)}</td>
                  <td className="py-4 px-3">{scopeLabel(c.Cabin)}</td>
                  <td className="py-4 px-3">{scopeLabel(c.Source)}</td>
                  <td className="py-4 px-3">{scopeLabel(c.Destination)}</td>
                  <td className="py-4 px-3">{SECTOR_LABEL[c.SectorType] ?? scopeLabel(c.SectorType)}</td>
                  <td className="py-4 px-3">
                    <ConfigCell cfg={c.HandBag_Config} title="Hand Bag Config" />
                  </td>
                  <td className="py-4 px-3">
                    <ConfigCell cfg={c.Student_Config} title="Student Config" />
                  </td>
                  <td className="py-4 px-3">
                    <ConfigCell cfg={c.SrCitizen_Config} title="Sr. Citizen Config" />
                  </td>
                  <td className="py-4 px-3">
                    <ListCell values={c.Restricted_ProductClass_Display} title="Restricted Product Class (Display)" />
                  </td>
                  <td className="py-4 px-3">
                    <ListCell values={c.Restricted_ProductClass_Margin} title="Restricted Product Class (Margin)" />
                  </td>
                  <td className="py-4 px-3">
                    <DetailsCell details={c.ProductClassDisplayDetails} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}