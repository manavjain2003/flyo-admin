import type { ConfigItem } from "../types";

export type Draft = Omit<ConfigItem, "ConfigId"> & { ConfigId?: number };

export type Errors = Record<string, string>;

export const WILDCARD = "*";

export const CHANNEL_OPTIONS = [{ value: "TJ", label: "Tripjack (TJ)" }];

export const CABIN_OPTIONS = [
  { value: "E", label: "Economy (E)" },
  { value: "PE", label: "Premium Economy (PE)" },
  { value: "B", label: "Business (B)" },
  { value: "F", label: "First (F)" },
];

export const SECTOR_OPTIONS = [
  { value: "D", label: "Domestic" },
  { value: "I", label: "International" },
];

export const PRIORITY_OPTIONS = ["MIN", "MAX"];

export interface Lookups {
  channels: string[];
  cabins: string[];
  priorities: string[];
  airlines: string[] | null;
  airports: string[] | null;
  fareModes: number[] | null;
  productClasses: string[] | null; 
}

export const BASE_LOOKUPS: Lookups = {
  channels: CHANNEL_OPTIONS.map((o) => o.value),
  cabins: CABIN_OPTIONS.map((o) => o.value),
  priorities: PRIORITY_OPTIONS,
  airlines: null,
  airports: null,
  fareModes: null,
  productClasses: null,
};

export function lookupsFor(
  item: ConfigItem | null,
  loaded: Pick<Lookups, "airlines" | "airports" | "fareModes" | "productClasses">
): Lookups {
  const add = (base: string[], extra: (string | null | undefined)[]) => {
    const out = [...base];
    for (const v of extra) if (v && !out.includes(v)) out.push(v);
    return out;
  };
  const existing = item;
  return {
    ...loaded,
    channels: add(BASE_LOOKUPS.channels, [existing?.ChannelCode, WILDCARD]),
    cabins: add(BASE_LOOKUPS.cabins, [existing?.Cabin, WILDCARD]),
    priorities: add(BASE_LOOKUPS.priorities, [
      existing?.HandBag_Config?.Priority_HandBag,
      existing?.Student_Config?.Priority_Fare,
      existing?.SrCitizen_Config?.Priority_Fare,
      ...(existing?.ProductClassDisplayDetails ?? []).flatMap((x) => [x.Priority, x.MarginPriority]),
    ]),
  };
}

const SCOPE_RE = /^(\*|[A-Za-z0-9]{1,10})$/;
const TOKEN_RE = /^[A-Za-z0-9_]+$/;
const NAME_MAX = 100;

export function normaliseScope(v: string): string {
  const t = v.trim();
  return t === WILDCARD ? t : t.toUpperCase();
}

export function normaliseList(list: string[]): string[] {
  const out: string[] = [];
  for (const raw of list) {
    const t = raw.trim().toUpperCase();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

function checkOneOf(errors: Errors, key: string, label: string, value: string, allowed: string[]) {
  const v = (value ?? "").trim();
  if (!v) errors[key] = `Select a ${label.toLowerCase()}.`;
  else if (!allowed.includes(v)) errors[key] = `${label} must be one of: ${allowed.join(", ")}.`;
}

function checkCode(
  errors: Errors,
  key: string,
  label: string,
  value: string,
  list: string[] | null,
  what: string
) {
  const v = (value ?? "").trim();
  if (!v) {
    errors[key] = `${label} is required. Use * for all.`;
    return;
  }
  if (v === WILDCARD) return;
  if (list && list.length) {
    if (!list.includes(v.toUpperCase())) errors[key] = `"${v}" is not a valid ${what}. Pick one from the list.`;
  } else if (!SCOPE_RE.test(v)) {
    errors[key] = `${label} must be * or letters/numbers only (max 10).`;
  }
}

function checkName(errors: Errors, key: string, value: string) {
  const v = (value ?? "").trim();
  if (!v) errors[key] = "Product name is required.";
  else if (v.length > NAME_MAX) errors[key] = `Product name must be ${NAME_MAX} characters or fewer.`;
}

function checkPriority(
  errors: Errors,
  key: string,
  label: string,
  value: string,
  allowed: string[],
  required = true
) {
  const v = (value ?? "").trim();
  if (!v) {
    if (required) errors[key] = `Select a ${label.toLowerCase()}.`;
    return;
  }
  if (!allowed.includes(v)) errors[key] = `${label} must be one of: ${allowed.join(", ")}.`;
}

function checkMode(errors: Errors, key: string, value: number, modes: number[] | null) {
  if (modes && modes.length) {
    if (!modes.includes(value)) errors[key] = "Select a fare display mode from the list.";
  } else if (!Number.isInteger(value) || value < 0) {
    errors[key] = "Fare display mode must be a whole number, 0 or higher.";
  }
}

function checkList(
  errors: Errors,
  key: string,
  label: string,
  list: string[],
  allowed: string[] | null,
  required = false
) {
  const items = (list ?? []).map((s) => s.trim()).filter(Boolean);
  if (required && items.length === 0) {
    errors[key] = `${label} is required.`;
    return;
  }
  const upper = items.map((s) => s.toUpperCase());
  const dup = upper.find((s, i) => upper.indexOf(s) !== i);
  if (dup) {
    errors[key] = `"${dup}" is listed more than once.`;
    return;
  }
  if (allowed && allowed.length) {
    const bad = upper.find((s) => !allowed.some((a) => a.toUpperCase() === s));
    if (bad) errors[key] = `"${bad}" is not a product class for this airline.`;
    return;
  }
  const bad = items.find((s) => !TOKEN_RE.test(s));
  if (bad) errors[key] = `"${bad}" is not valid. Use letters, numbers and _ only (e.g. SENIOR_CITIZEN).`;
}

export function validateDraft(d: Draft, lk: Lookups = BASE_LOOKUPS): Errors {
  const e: Errors = {};

  checkOneOf(e, "ChannelCode", "Channel", d.ChannelCode, lk.channels);
  checkCode(e, "AirlineCode", "Airline code", d.AirlineCode, lk.airlines, "airline");
  checkOneOf(e, "Cabin", "Cabin", d.Cabin, lk.cabins);
  checkCode(e, "Source", "Source", d.Source, lk.airports, "airport");
  checkCode(e, "Destination", "Destination", d.Destination, lk.airports, "airport");

  if (
    !e.Source &&
    !e.Destination &&
    d.Source.trim() !== WILDCARD &&
    d.Source.trim().toUpperCase() === d.Destination.trim().toUpperCase()
  ) {
    e.Destination = "Destination must be different from source.";
  }

  checkOneOf(e, "SectorType", "Sector type", d.SectorType, SECTOR_OPTIONS.map((o) => o.value));

  const hb = d.HandBag_Config;
  if (hb) {
    checkName(e, "HandBag.ProductName", hb.ProductName);
    checkPriority(e, "HandBag.Priority", "Priority", hb.Priority_HandBag, lk.priorities);
    checkMode(e, "HandBag.FareDisplayMode", hb.FareDisplayMode, lk.fareModes);
  }

  const fareTypes: [string, ConfigItem["Student_Config"]][] = [
    ["Student", d.Student_Config],
    ["SrCitizen", d.SrCitizen_Config],
  ];
  for (const [prefix, cfg] of fareTypes) {
    if (!cfg) continue;
    checkName(e, `${prefix}.ProductName`, cfg.ProductName);
    checkPriority(e, `${prefix}.Priority`, "Priority", cfg.Priority_Fare, lk.priorities);
    checkMode(e, `${prefix}.FareDisplayMode`, cfg.FareDisplayMode, lk.fareModes);
    checkList(e, `${prefix}.ProductClass`, "Product class", cfg.ProductClass, lk.productClasses, true);
  }

  checkList(e, "RestrictedDisplay", "Restricted (display)", d.Restricted_ProductClass_Display, lk.productClasses);
  checkList(e, "RestrictedMargin", "Restricted (margin)", d.Restricted_ProductClass_Margin, lk.productClasses);

  d.ProductClassDisplayDetails.forEach((x, i) => {
    const p = `Details.${i}`;
    checkName(e, `${p}.ProductName`, x.ProductName);
    checkPriority(e, `${p}.Priority`, "Priority", x.Priority, lk.priorities);
    checkPriority(e, `${p}.MarginPriority`, "Margin priority", x.MarginPriority, lk.priorities, false);
    checkMode(e, `${p}.FareDisplayMode`, x.FareDisplayMode, lk.fareModes);
    checkList(e, `${p}.ProductClass`, "Product class", x.ProductClass, lk.productClasses, true);
    checkList(e, `${p}.MarginProductClass`, "Margin product class", x.MarginProductClass, lk.productClasses);
    checkList(
      e,
      `${p}.MarginRestrictedProductClass`,
      "Margin restricted product class",
      x.MarginRestrictedProductClass,
      lk.productClasses
    );
  });

  return e;
}

export function normaliseDraft(d: Draft): Draft {
  const trimName = <T extends { ProductName: string }>(c: T): T => ({ ...c, ProductName: c.ProductName.trim() });
  return {
    ...d,
    ChannelCode: normaliseScope(d.ChannelCode),
    AirlineCode: normaliseScope(d.AirlineCode),
    Cabin: normaliseScope(d.Cabin),
    Source: normaliseScope(d.Source),
    Destination: normaliseScope(d.Destination),
    HandBag_Config: d.HandBag_Config ? trimName(d.HandBag_Config) : null,
    Student_Config: d.Student_Config
      ? { ...trimName(d.Student_Config), ProductClass: normaliseList(d.Student_Config.ProductClass) }
      : null,
    SrCitizen_Config: d.SrCitizen_Config
      ? { ...trimName(d.SrCitizen_Config), ProductClass: normaliseList(d.SrCitizen_Config.ProductClass) }
      : null,
    Restricted_ProductClass_Display: normaliseList(d.Restricted_ProductClass_Display),
    Restricted_ProductClass_Margin: normaliseList(d.Restricted_ProductClass_Margin),
    ProductClassDisplayDetails: d.ProductClassDisplayDetails.map((x) => ({
      ...trimName(x),
      ProductClass: normaliseList(x.ProductClass),
      MarginProductClass: normaliseList(x.MarginProductClass),
      MarginRestrictedProductClass: normaliseList(x.MarginRestrictedProductClass),
    })),
  };
}
