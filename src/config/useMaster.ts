import { useEffect, useRef, useState } from "react";
import {
  getAirlines,
  getAirports,
  getFareDisplayModes,
  getProductClasses,
} from "../api/endpoints";
import type { MasterOption } from "../api/masterParse";

export type { MasterOption };

export interface MasterState {
  options: MasterOption[] | null;
  loading: boolean;
  failed: boolean;
}

const cache = new Map<string, Promise<MasterOption[]>>();

function useMaster(key: string | null, fetcher: () => Promise<MasterOption[]>): MasterState {
  const [state, setState] = useState<MasterState>({ options: null, loading: !!key, failed: false });
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;

  useEffect(() => {
    if (!key) {
      setState({ options: null, loading: false, failed: false });
      return;
    }
    let cancelled = false;
    setState({ options: null, loading: true, failed: false });

    let promise = cache.get(key);
    if (!promise) {
      promise = fetchRef.current();
      cache.set(key, promise);
      promise.catch(() => cache.delete(key)); 
    }
    promise
      .then((options) => !cancelled && setState({ options, loading: false, failed: false }))
      .catch(() => !cancelled && setState({ options: null, loading: false, failed: true }));

    return () => {
      cancelled = true;
    };
  }, [key]);

  return state;
}

export const useAirlines = () => useMaster("airlines", () => getAirlines());
export const useAirports = () => useMaster("airports", () => getAirports());
export const useFareModes = () => useMaster("faredisplaymodes", () => getFareDisplayModes());
export const useProductClasses = (airline: string | null) =>
  useMaster(airline ? `productclass:${airline}` : null, () => getProductClasses(airline!));
