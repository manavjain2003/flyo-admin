import type { ReactNode } from "react";
import { FormField, SelectField } from "../../components/common/FormField";
import { useAirlines, useAirports, useProductClasses } from "../../config/useMaster";
import { CABIN_OPTIONS, CHANNEL_OPTIONS, SECTOR_OPTIONS, WILDCARD } from "../../config/configValidation";

export type Errors = Record<string, string>;
export type ModalMode = "view" | "add" | "edit";

export const SECTOR_LABELS: Record<string, string> = { D: "Domestic", I: "International" };
export const CABIN_LABELS: Record<string, string> = {
  E: "Economy",
  PE: "Premium Economy",
  B: "Business",
  F: "First",
};
export const SEARCH_TYPE_OPTIONS = [
  { value: "ON", label: "Onward (ON)" },
  { value: "RT", label: "Separate Return (RT)" },
  { value: "RS", label: "Special Return (RS)" },
];
export const SEARCH_TYPE_LABELS: Record<string, string> = {
  ON: "Onward",
  RT: "Separate Return",
  RS: "Special Return",
};
export const PAX_OPTIONS = [
  { value: "A", label: "Adult (A)" },
  { value: "C", label: "Child (C)" },
  { value: "I", label: "Infant (I)" },
];
export const PAX_LABELS: Record<string, string> = { A: "Adult", C: "Child", I: "Infant" };

/** Display-only: the wildcard "*" is shown as "All". Stored / submitted values stay "*". */
export function showAll(v: unknown): string {
  const t = String(v ?? "").trim();
  return t === WILDCARD ? "All" : t;
}

export const digitsOnly = (v: string) => v.replace(/\D/g, "");

export function isWholeNumber(v: string): boolean {
  return /^\d+$/.test(v.trim());
}

export function ReadOnlyRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</span>
      <span className="text-sm break-words">{value}</span>
    </div>
  );
}

export function OptionSelect({
  id,
  label,
  value,
  options,
  onChange,
  error,
  withAll,
  placeholder,
}: {
  id?: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  error?: string;
  withAll?: boolean;
  placeholder?: string;
}) {
  const all = withAll ? [{ value: WILDCARD, label: "All (*)" }, ...options] : options;
  // Keep a saved value selectable even if it is no longer in the master list.
  const list = value && !all.some((o) => o.value === value) ? [...all, { value, label: value }] : all;
  return (
    <SelectField id={id} label={label} value={value} error={error} onChange={(e) => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {list.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </SelectField>
  );
}

export function IntField({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <FormField
      id={id}
      label={label}
      value={value}
      error={error}
      disabled={disabled}
      inputMode="numeric"
      autoComplete="off"
      onChange={(e) => onChange(digitsOnly(e.target.value))}
    />
  );
}

export function PaxCheckGroup({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  error?: string;
}) {
  const toggle = (v: string, on: boolean) => onChange(on ? [...value, v] : value.filter((x) => x !== v));
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[var(--color-text-secondary)]">Passenger Type</span>
      <div
        className={`flex flex-wrap gap-x-5 gap-y-2 rounded-md border p-2.5 ${
          error ? "border-[var(--color-danger)]" : "border-[var(--color-border)]"
        }`}
      >
        {PAX_OPTIONS.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-[var(--color-brand)] w-4 h-4"
              checked={value.includes(o.value)}
              onChange={(e) => toggle(o.value, e.target.checked)}
            />
            {o.label}
          </label>
        ))}
      </div>
      {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
    </div>
  );
}

/* ───────── Shared "route rule" form (used by Discount and Markup) ───────── */

export interface RuleForm {
  ChannelCode: string;
  AirlineCode: string;
  Source: string;
  Destination: string;
  ProductClass: string;
  RangeStart: string;
  RangeEnd: string;
  SectorType: string;
  SearchType: string;
  Cabin: string;
  PaxType: string[];
}

export const EMPTY_RULE: RuleForm = {
  ChannelCode: CHANNEL_OPTIONS[0].value,
  AirlineCode: WILDCARD,
  Source: WILDCARD,
  Destination: WILDCARD,
  ProductClass: WILDCARD,
  RangeStart: "0",
  RangeEnd: "",
  SectorType: "D",
  SearchType: "ON",
  Cabin: WILDCARD,
  PaxType: ["A"],
};

export function validateRule(f: RuleForm): Errors {
  const e: Errors = {};
  if (!f.ChannelCode) e.ChannelCode = "Select a channel.";
  if (!f.AirlineCode) e.AirlineCode = "Select an airline (or All).";
  if (!f.Source) e.Source = "Select a source (or All).";
  if (!f.Destination) e.Destination = "Select a destination (or All).";
  if (f.Source && f.Source !== WILDCARD && f.Source === f.Destination) {
    e.Destination = "Destination must be different from source.";
  }
  if (!f.ProductClass) e.ProductClass = "Select a product class (or All).";
  if (!f.SectorType) e.SectorType = "Select a sector type.";
  if (!f.SearchType) e.SearchType = "Select a search type.";
  if (!f.Cabin) e.Cabin = "Select a cabin (or All).";
  if (!isWholeNumber(f.RangeStart)) e.RangeStart = "Enter a whole number.";
  if (!isWholeNumber(f.RangeEnd)) e.RangeEnd = "Enter a whole number.";
  if (!e.RangeStart && !e.RangeEnd && Number(f.RangeStart) > Number(f.RangeEnd)) {
    e.RangeEnd = "Range end must be greater than or equal to range start.";
  }
  if (f.PaxType.length === 0) e.PaxType = "Select at least one passenger type.";
  return e;
}

export function RuleFields({
  form,
  errors,
  onChange,
  idPrefix,
  productClassAfterCabin = false,
}: {
  form: RuleForm;
  errors: Errors;
  onChange: (patch: Partial<RuleForm>) => void;
  idPrefix: string;
  /** Places Product Class after Cabin and filters its list by sector + cabin. */
  productClassAfterCabin?: boolean;
}) {
  const airlines = useAirlines();
  const airports = useAirports();
  // "*" airline -> fetch product classes without an airline code (existing app convention)
  const productClasses = useProductClasses(
    form.AirlineCode === WILDCARD ? null : form.AirlineCode || null,
    form.SectorType,
    productClassAfterCabin ? form.Cabin : undefined
  );

  const sectorField = (
    <OptionSelect
      id={`${idPrefix}-sector`}
      label="Sector Type"
      value={form.SectorType}
      options={SECTOR_OPTIONS}
      error={errors.SectorType}
      onChange={(v) => onChange({ SectorType: v, ProductClass: WILDCARD })}
    />
  );
  const productClassField = (
    <OptionSelect
      id={`${idPrefix}-pc`}
      label="Product Class"
      withAll
      value={form.ProductClass}
      options={productClasses.options ?? []}
      error={errors.ProductClass}
      onChange={(v) => onChange({ ProductClass: v })}
    />
  );
  const rangeFields = (
    <>
      <IntField
        id={`${idPrefix}-rs`}
        label="Range Start"
        value={form.RangeStart}
        error={errors.RangeStart}
        onChange={(v) => onChange({ RangeStart: v })}
      />
      <IntField
        id={`${idPrefix}-re`}
        label="Range End"
        value={form.RangeEnd}
        error={errors.RangeEnd}
        onChange={(v) => onChange({ RangeEnd: v })}
      />
    </>
  );
  const searchField = (
    <OptionSelect
      id={`${idPrefix}-search`}
      label="Search Type"
      value={form.SearchType}
      options={SEARCH_TYPE_OPTIONS}
      error={errors.SearchType}
      onChange={(v) => onChange({ SearchType: v })}
    />
  );
  const cabinField = (
    <OptionSelect
      id={`${idPrefix}-cabin`}
      label="Cabin"
      withAll
      value={form.Cabin}
      options={CABIN_OPTIONS}
      error={errors.Cabin}
      // product class list depends on cabin, so reset it when cabin changes
      onChange={(v) => onChange(productClassAfterCabin ? { Cabin: v, ProductClass: WILDCARD } : { Cabin: v })}
    />
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <OptionSelect
        id={`${idPrefix}-channel`}
        label="Channel"
        value={form.ChannelCode}
        options={CHANNEL_OPTIONS}
        error={errors.ChannelCode}
        onChange={(v) => onChange({ ChannelCode: v })}
      />
      <OptionSelect
        id={`${idPrefix}-airline`}
        label="Airline"
        withAll
        value={form.AirlineCode}
        options={airlines.options ?? []}
        error={errors.AirlineCode}
        // a different airline means a different product class list
        onChange={(v) => onChange({ AirlineCode: v, ProductClass: WILDCARD })}
      />
      <OptionSelect
        id={`${idPrefix}-source`}
        label="Source"
        withAll
        value={form.Source}
        options={airports.options ?? []}
        error={errors.Source}
        onChange={(v) => onChange({ Source: v })}
      />
      <OptionSelect
        id={`${idPrefix}-destination`}
        label="Destination"
        withAll
        value={form.Destination}
        options={airports.options ?? []}
        error={errors.Destination}
        onChange={(v) => onChange({ Destination: v })}
      />
         {productClassAfterCabin ? (
        <>
          {sectorField}
          {cabinField}
          {searchField}
          {productClassField}
          {rangeFields}
        </>
      ) : (
        <>
          {sectorField}
          {productClassField}
          {rangeFields}
          {searchField}
          {cabinField}
        </>
      )}
      <div className="sm:col-span-2">
        <PaxCheckGroup value={form.PaxType} error={errors.PaxType} onChange={(v) => onChange({ PaxType: v })} />
      </div>
    </div>
  );
}

export function PaxBadges({ pax }: { pax: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {(pax ?? []).map((p) => (
        <span key={p} className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-xs">
          {PAX_LABELS[p] ?? p}
        </span>
      ))}
    </div>
  );
}

export function isCanceled(err: unknown) {
  const e = err as { name?: string; code?: string };
  return e?.name === "CanceledError" || e?.code === "ERR_CANCELED";
}