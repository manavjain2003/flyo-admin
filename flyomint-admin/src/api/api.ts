import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

export const API_BASE_URL = "https://b2cadminapi.travelsuperhub.com";

export const UNIQUE_KEY_STORAGE_KEY = "flyomint_unique_key";
export const KEY_VALIDITY_STORAGE_KEY = "flyomint_key_validity"; // ISO string


export function getStoredUniqueKey(): string | null {
  return localStorage.getItem(UNIQUE_KEY_STORAGE_KEY);
}

export function getStoredValidity(): number | null {
  const raw = localStorage.getItem(KEY_VALIDITY_STORAGE_KEY);
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? null : t;
}


export function setStoredUniqueKey(key: string, validity?: string): void {
  localStorage.setItem(UNIQUE_KEY_STORAGE_KEY, key);
  const expiry = validity ?? new Date(Date.now() + 15 * 60 * 1000).toISOString();
  localStorage.setItem(KEY_VALIDITY_STORAGE_KEY, expiry);
}

export function clearStoredUniqueKey(): void {
  localStorage.removeItem(UNIQUE_KEY_STORAGE_KEY);
  localStorage.removeItem(KEY_VALIDITY_STORAGE_KEY);
}

export function isStoredKeyValid(): boolean {
  const key = getStoredUniqueKey();
  if (!key) return false;
  const validity = getStoredValidity();
  if (validity === null) return true; 
  return Date.now() < validity;
}


const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const uniqueKey = getStoredUniqueKey();
  if (uniqueKey) {
    config.headers.set("UniqueKey", uniqueKey);
  }
  return config;
});

let sessionInvalidationInFlight = false;

function invalidateSession(reason: string) {
  if (sessionInvalidationInFlight) return;
  sessionInvalidationInFlight = true;

  clearStoredUniqueKey();

  if (window.location.pathname !== "/login") {
    sessionStorage.setItem("flyomint_logout_reason", reason);
    window.location.href = "/login";
  }
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const body = error.response?.data as
        | { ServiceResponse?: { ErrorCode?: string; Message?: string } }
        | undefined;
      const serverErrorCode = body?.ServiceResponse?.ErrorCode;

      const looksLikeExpiredOrInvalidToken =
        !serverErrorCode || // no structured code -> assume it's auth-related, same as before
        serverErrorCode === "INVALID_TOKEN" ||
        serverErrorCode === "TOKEN_EXPIRED";

      if (looksLikeExpiredOrInvalidToken) {
        invalidateSession(
          isStoredKeyValid() ? "invalid-session" : "session-expired"
        );
      }
    }
    return Promise.reject(error);
  }
);

export default api;