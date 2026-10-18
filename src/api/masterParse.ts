
export interface MasterOption {
  value: string;
  label: string;
}

const VALUE_KEYS = [
  "code", "value", "id", "key",
  "airlinecode", "airportcode", "iatacode", "productclass", "productclasscode",
  "faredisplaymode", "faredisplaymodeid", "modeid", "mode",
];
const LABEL_KEYS = [
  "name", "label", "text", "title", "description", "displayname",
  "airlinename", "airportname", "productclassname", "faredisplaymodename", "modename",
];
const SKIP_KEYS = new Set(["errorcode", "message"]);

function lowerKeys(o: Record<string, unknown>): Map<string, unknown> {
  const m = new Map<string, unknown>();
  for (const [k, v] of Object.entries(o)) m.set(k.toLowerCase(), v);
  return m;
}

function isScalar(v: unknown): v is string | number {
  return (typeof v === "string" && v.trim() !== "") || typeof v === "number";
}

function findArray(node: unknown, depth = 0): unknown[] | null {
  if (Array.isArray(node)) return node;
  if (!node || typeof node !== "object" || depth > 2) return null;
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (SKIP_KEYS.has(k.toLowerCase())) continue;
    const found = findArray(v, depth + 1);
    if (found) return found;
  }
  return null;
}

function toOption(item: unknown): MasterOption | null {
  if (isScalar(item)) {
    const v = String(item).trim();
    return { value: v, label: v };
  }
  if (!item || typeof item !== "object") return null;

  const map = lowerKeys(item as Record<string, unknown>);
  let value: string | null = null;
  let label: string | null = null;

  for (const k of VALUE_KEYS) {
    const v = map.get(k);
    if (isScalar(v)) {
      value = String(v).trim();
      break;
    }
  }
  for (const k of LABEL_KEYS) {
    const v = map.get(k);
    if (isScalar(v) && String(v).trim() !== value) {
      label = String(v).trim();
      break;
    }
  }

  if (value === null) {
    const scalars = [...map.entries()].filter(([k, v]) => !SKIP_KEYS.has(k) && isScalar(v));
    if (!scalars.length) return null;
    value = String(scalars[0][1]).trim();
    if (!label && scalars[1]) label = String(scalars[1][1]).trim();
  }

  return { value, label: label && label !== value ? `${value} - ${label}` : value };
}

export function parseMasterList(serviceResponse: unknown): MasterOption[] {
  const list = findArray(serviceResponse) ?? [];
  const seen = new Set<string>();
  const out: MasterOption[] = [];
  for (const item of list) {
    const opt = toOption(item);
    if (!opt || !opt.value || seen.has(opt.value)) continue;
    seen.add(opt.value);
    out.push(opt);
  }
  return out;
}
