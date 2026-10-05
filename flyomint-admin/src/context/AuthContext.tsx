import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  clearStoredUniqueKey,
  getStoredUniqueKey,
  getStoredValidity,
  isStoredKeyValid,
  setStoredUniqueKey,
} from "../api/api";
import { getProfileDetails } from "../api/endpoints";
import type { ProfileResponse } from "../types";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  profile: ProfileResponse | null;
  setSession: (uniqueKey: string, validity?: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  hasPermission: (viewId: string, permission: "R" | "W" | "D") => boolean;
  getPermissions: (viewId: string) => string[];
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [uniqueKey, setUniqueKey] = useState<string | null>(() =>
    isStoredKeyValid() ? getStoredUniqueKey() : null
  );
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(!!uniqueKey);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(() => {
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    clearStoredUniqueKey();
    setUniqueKey(null);
    setProfile(null);
    setProfileLoaded(false);
  }, []);

  const scheduleExpiry = useCallback(() => {
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    const validity = getStoredValidity();
    if (validity === null) return;

    const msRemaining = validity - Date.now();
    if (msRemaining <= 0) {
      logout();
      return;
    }
    const delay = Math.min(msRemaining, 2 ** 31 - 1);
    expiryTimer.current = setTimeout(() => {
      logout();
    }, delay);
  }, [logout]);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await getProfileDetails();
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!uniqueKey) {
      setIsLoading(false);
      return;
    }

    if (!isStoredKeyValid()) {
      logout();
      setIsLoading(false);
      return;
    }

    scheduleExpiry();

    const controller = new AbortController();
    setIsLoading(true);

    getProfileDetails(controller.signal)
      .then((data) => setProfile(data))
      .catch((err) => {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
        setProfile(null);
      })
      .finally(() => {
        setProfileLoaded(true);
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => {
      controller.abort();
      if (expiryTimer.current) clearTimeout(expiryTimer.current);
    };
  }, [uniqueKey]);

  const setSession = useCallback(
    async (key: string, validity?: string) => {
      setStoredUniqueKey(key, validity);
      setUniqueKey(key);
      scheduleExpiry();
      await refreshProfile();
    },
    [refreshProfile, scheduleExpiry]
  );

const hasPermission = useCallback(
  (viewId: string, permission: "R" | "W" | "D") => {
    if (!profile) return false;
    const view = profile.Views.find(
      (v) => v.ViewId.toLowerCase() === viewId.toLowerCase()
    );
    return !!view?.Permission.includes(permission);
  },
  [profile]
);

const getPermissions = useCallback(
  (viewId: string): string[] => {
    const view = profile?.Views.find(
      (v) => v.ViewId.toLowerCase() === viewId.toLowerCase()
    );
    return view?.Permission ?? [];
  },
  [profile]
);


  const isAuthenticated =
    !!uniqueKey && isStoredKeyValid() && (!profileLoaded || !!profile);

const value: AuthContextValue = {
  isAuthenticated,
  isLoading,
  profile,
  setSession,
  logout,
  refreshProfile,
  hasPermission,
  getPermissions,
};

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}