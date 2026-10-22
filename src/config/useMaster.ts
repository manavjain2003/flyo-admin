import { useEffect, useMemo, useState } from "react";
import {
  getAirlines,
  getAirports,
  getFareDisplayModes,
  getProductClassRows,
  type ProductClassRow,
} from "../api/endpoints";
import type { MasterOption } from "../api/masterParse";

export type { MasterOption };

export interface MasterState {
  options: MasterOption[] | null;
  loading: boolean;
  failed: boolean;
}

function useMasterList(load: (signal: AbortSignal) => Promise<MasterOption[]>): MasterState {
  const [options, setOptions] = useState<MasterOption[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setFailed(false);
    load(ac.signal)
      .then((list) => setOptions(list))
      .catch(() => {
        if (!ac.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [load]);

  return { options, loading, failed };
}

export const useAirlines = () => useMasterList(getAirlines);
export const useAirports = () => useMasterList(getAirports);
export const useFareModes = () => useMasterList(getFareDisplayModes);

/**
 * Product classes for the selected airline.
 * - Refetches whenever `airlineCode` changes (null = "*" / no airline -> fetch without a code).
 * - Only `ProductCode` is shown in the dropdown.
 * - Filtered by `sectorType` (D / I) on the UI, then de-duplicated by ProductCode.
 */
export function useProductClasses(airlineCode: string | null, sectorType: string): MasterState {
  const [rows, setRows] = useState<ProductClassRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setFailed(false);
    setRows(null);
    getProductClassRows(airlineCode, ac.signal)
      .then((r) => setRows(r))
      .catch(() => {
        if (!ac.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [airlineCode]);

  const options = useMemo<MasterOption[] | null>(() => {
    if (!rows) return null;
    const sector = sectorType?.trim().toUpperCase();
    const seen = new Set<string>();
    const out: MasterOption[] = [];
    for (const r of rows) {
      if (sector && r.SectorType && r.SectorType.toUpperCase() !== sector) continue;
      const key = r.ProductCode.toUpperCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ value: r.ProductCode, label: r.ProductCode });
    }
    return out;
  }, [rows, sectorType]);

  return { options, loading, failed };
}