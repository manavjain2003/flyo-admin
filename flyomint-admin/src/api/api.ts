import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

export const API_BASE_URL = "https://b2cadminapi.travelsuperhub.com";

export const UNIQUE_KEY_STORAGE_KEY = "flyomint_unique_key";

export function getStoredUniqueKey(): string | null {
  return localStorage.getItem(UNIQUE_KEY_STORAGE_KEY);
}

export function setStoredUniqueKey(key: string): void {
  localStorage.setItem(UNIQUE_KEY_STORAGE_KEY, key);
}

export function clearStoredUniqueKey(): void {
  localStorage.removeItem(UNIQUE_KEY_STORAGE_KEY);
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

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearStoredUniqueKey();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
