import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  clearStoredUniqueKey,
  getStoredUniqueKey,
  setStoredUniqueKey,
} from "../api/api";
import { getProfileDetails } from "../api/endpoints";
import type { ProfileResponse } from "../types";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  profile: ProfileResponse | null;
  setSession: (uniqueKey: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  hasPermission: (viewId: string, permission: "R" | "W") => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [uniqueKey, setUniqueKey] = useState<string | null>(() =>
    getStoredUniqueKey()
  );
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!uniqueKey);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await getProfileDetails();
      setProfile(data);
    } catch {
      setProfile(null);
    }
  }, []);

useEffect(() => {
  if (!uniqueKey) {
    setIsLoading(false);
    return;
  }

  const controller = new AbortController();
  setIsLoading(true);

  getProfileDetails(controller.signal)
    .then((data) => setProfile(data))
    .catch((err) => {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
      setProfile(null);
    })
    .finally(() => {
      if (!controller.signal.aborted) setIsLoading(false);
    });

  return () => controller.abort();
}, []);

  const setSession = useCallback(
    async (key: string) => {
      setStoredUniqueKey(key);
      setUniqueKey(key);
      await refreshProfile();
    },
    [refreshProfile]
  );

  const logout = useCallback(() => {
    clearStoredUniqueKey();
    setUniqueKey(null);
    setProfile(null);
  }, []);

  const hasPermission = useCallback(
    (viewId: string, permission: "R" | "W") => {
      if (!profile) return false;
      const view = profile.Views.find(
        (v) => v.ViewId.toLowerCase() === viewId.toLowerCase()
      );
      return !!view?.Permission.includes(permission);
    },
    [profile]
  );

  const value: AuthContextValue = {
    isAuthenticated: !!uniqueKey,
    isLoading,
    profile,
    setSession,
    logout,
    refreshProfile,
    hasPermission,
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
