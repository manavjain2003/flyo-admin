import axios from "axios";
import api from "./api";
import { encryptAES } from "../utils/crypto";
import type {
  ApiEnvelope,
  BookingSummary,
  BookingHistoryRequest,
  BookingHistoryResponse,
  CustomerStatsResponse,
  ErrorPostRequest,
  GetLoginOtpResponse,
  LoginResponse,
  ProfileResponse,
  RoleAddRequest,
  RoleGetResponse,
  RoleUpdateRequest,
  SearchTransactionRequest,
  SearchTransactionResponse,
  StatsPeriod,
  TransactionLeg,
  GroupedBooking,
  SimpleMessageResponse,
  UserAddRequest,
  UserGetResponse,
  UserUpdateRequest,
  ViewsGetResponse,
  ViewsUpdatePermissionRequest,
  BookingStatusResponse,
  BookingStatusRequest,
} from "../types";

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const serviceMessage = (
      error.response?.data as { ServiceResponse?: { Message?: string } }
    )?.ServiceResponse?.Message;
    return (
      serviceMessage ||
      error.response?.data?.Message ||
      error.message ||
      "Network request failed."
    );
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

function handleApiError(path: string, error: unknown): never {
  const message = extractErrorMessage(error);
  reportError({ Path: path, ErrorMessage: message });
  throw new Error(message);
}

export async function getLoginOtp(mobile: string): Promise<GetLoginOtpResponse> {
  try {
    const { data } = await api.post<ApiEnvelope<GetLoginOtpResponse>>(
      "/Auth/GetLoginOTP",
      { Mobile: mobile }
    );
    return data.ServiceResponse;
  } catch (error) {
    handleApiError("/Auth/GetLoginOTP", error);
  }
}

export async function login(mobile: string, userKey: string, otp: string): Promise<LoginResponse> {
  try {
    const { data } = await api.post<ApiEnvelope<LoginResponse>>(
      "/Auth/Login",
      {
        Mobile: mobile,
        UserKey: userKey,
        OTP: encryptAES(otp),
      }
    );
    return data.ServiceResponse;
  } catch (error) {
    handleApiError("/Auth/Login", error);
  }
}

export async function getProfileDetails(signal?: AbortSignal): Promise<ProfileResponse> {
  try {
    const { data } = await api.get<ApiEnvelope<ProfileResponse>>(
      "/Admin/GetProfileDetails",
      { signal }
    );
    return data.ServiceResponse;
  } catch (error) {
    if (signal?.aborted) throw error;
    handleApiError("/Admin/GetProfileDetails", error);
  }
}

export async function getRoles(signal?: AbortSignal): Promise<RoleGetResponse> {
  try {
    const { data } = await api.get<ApiEnvelope<RoleGetResponse>>(
      "/Role/Get",
      { signal }
    );
    return data.ServiceResponse;
  } catch (error) {
    if (signal?.aborted) throw error;
    handleApiError("/Role/Get", error);
  }
}

export async function addRole(payload: RoleAddRequest): Promise<SimpleMessageResponse> {
  try {
    const { data } = await api.post<ApiEnvelope<SimpleMessageResponse>>(
      "/Role/Add",
      payload
    );
    return data.ServiceResponse;
  } catch (error) {
    handleApiError("/Role/Add", error);
  }
}

export async function updateRole(payload: RoleUpdateRequest): Promise<SimpleMessageResponse> {
  try {
    const { data } = await api.post<ApiEnvelope<SimpleMessageResponse>>(
      "/Role/Update",
      payload
    );
    return data.ServiceResponse;
  } catch (error) {
    handleApiError("/Role/Update", error);
  }
}

export async function getUsers(signal?: AbortSignal): Promise<UserGetResponse> {
  try {
    const { data } = await api.get<ApiEnvelope<UserGetResponse>>(
      "/User/Get",
      { signal }
    );
    return data.ServiceResponse;
  } catch (error) {
    if (signal?.aborted) throw error;
    handleApiError("/User/Get", error);
  }
}

export async function addUser(payload: UserAddRequest): Promise<SimpleMessageResponse> {
  try {
    const { data } = await api.post<ApiEnvelope<SimpleMessageResponse>>(
      "/User/Add",
      payload
    );
    return data.ServiceResponse;
  } catch (error) {
    handleApiError("/User/Add", error);
  }
}

export async function updateUser(payload: UserUpdateRequest): Promise<SimpleMessageResponse> {
  try {
    const { data } = await api.post<ApiEnvelope<SimpleMessageResponse>>(
      "/User/Update",
      payload
    );
    return data.ServiceResponse;
  } catch (error) {
    handleApiError("/User/Update", error);
  }
}

export async function getViews(
  roleId?: number | string,
  signal?: AbortSignal
): Promise<ViewsGetResponse> {
  try {
    const url = roleId ? `/Views/Get/${roleId}` : "/Views/Get";
    const { data } = await api.get<ApiEnvelope<ViewsGetResponse>>(url, { signal });
    return data.ServiceResponse;
  } catch (error) {
    if (signal?.aborted) throw error;
    handleApiError("/Views/Get", error);
  }
}

export async function updateViewsPermission(
  payload: ViewsUpdatePermissionRequest
): Promise<SimpleMessageResponse> {
  try {
    const { data } = await api.post<ApiEnvelope<SimpleMessageResponse>>(
      "/Views/UpdatePermission",
      payload
    );
    return data.ServiceResponse;
  } catch (error) {
    handleApiError("/Views/UpdatePermission", error);
  }
}

export async function getBookingHistory(
  payload: BookingHistoryRequest,
  signal?: AbortSignal
): Promise<BookingHistoryResponse | undefined> {
  try {
    const { data } = await api.post<ApiEnvelope<any>>(
      "/Report/GetBookingHistory",
      payload,
      { signal }
    );
    const raw = data.ServiceResponse;
    const items: any[] = raw?.Bookings ?? [];

    const Bookings: BookingSummary[] = items.map((r: any) => {
      const sector: string = r.Sector ?? "";
      const parts = sector.split("/").filter(Boolean);
      const source = parts[0] ?? "";
      const destination = parts[parts.length - 1] ?? "";

      const tripType =
        r.SearchType === "RT" ? "Round Trip"
        : r.SearchType === "RS" ? "Round Trip"
        : r.SearchType === "ON" ? "One Way"
        : r.SearchType ?? "—";

      const pnr = r.CRSPNR || r.AirlinePNR || "";

      return {
        Id: String(r.TransactionId),
        Reference: r.ReferenceNo?.trim() ?? "",
        Status: mapStatus(r.CurrentStatus ?? r.BookingStatus ?? ""),
        PaymentStatus: r.PaymentStatus ?? "",
        TripType: tripType,
        Source: source,
        Destination: destination,
        Provider: pnr,
        Amount: 0,
        PNR: pnr,
        BookedAt: formatDateShort(r.CreatedDate ?? ""),
      };
    });

    return {
      Bookings,
      TotalCount: raw?.TotalCount ?? Bookings.length,
      ErrorCode: raw?.ErrorCode ?? null,
      Message: raw?.Message ?? null,
    };
  } catch (error) {
    if (signal?.aborted) throw error;
    handleApiError("/Report/GetBookingHistory", error);
  }
}

function formatDateShort(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function mapStatus(code: string): string {
  const map: Record<string, string> = {
    "0": "Pending",
    "2": "Payment Received",
    "3": "Confirmed",
    "5": "Cancelled",
    "6": "Failed",
    "7": "Initiated",
    "8": "Processing",
    "9": "Processing",
    "Confirmed": "Confirmed",
    "Pending": "Pending",
    "Booking Initiate": "In Progress",
    "Booking not initiated": "Not Initiated",
    "Payment Initiated": "Payment Initiated",
    "Payment Collected": "Confirmed",
    "payment not initiated": "Not Initiated",
    "Peyment not initiated": "Not Initiated",
  };
  return map[code] ?? code ?? "Unknown";
}

export async function searchTransaction(
  payload: SearchTransactionRequest,
  signal?: AbortSignal
): Promise<SearchTransactionResponse> {
  try {
    const { data } = await api.post<ApiEnvelope<SearchTransactionResponse>>(
      "/Search/SearchTransaction",
      payload,
      { signal }
    );
    return data.ServiceResponse;
  } catch (error) {
    if (signal?.aborted) throw error;
    handleApiError("/Search/SearchTransaction", error);
  }
}

export function groupTransactionsByBooking(
  transactions: TransactionLeg[]
): GroupedBooking[] {
  const map = new Map<string, TransactionLeg[]>();
  for (const t of transactions) {
    const key = t.BookingId || `unknown-${t.TransactionId}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return Array.from(map.entries()).map(([BookingId, Legs]) => ({
    BookingId,
    BookingDate: Legs[0]?.BookingDate ?? "",
    Legs: Legs.sort((a, b) => (a.OnwardDate || "").localeCompare(b.OnwardDate || "")),
  }));
}

export function reportError(payload: ErrorPostRequest): void {
  try {
    void api.post("/Error/Post", payload).catch(() => {});
  } catch {
  }
}

export async function getCustomerStats(
  userKey: string,
  period: StatsPeriod,
  signal?: AbortSignal
): Promise<CustomerStatsResponse> {
  try {
    const { data } = await api.get<ApiEnvelope<CustomerStatsResponse>>(
      `/Customer/GetStats/${encodeURIComponent(userKey)}`,
      { params: { period }, signal }
    );
    return data.ServiceResponse;
  } catch (error) {
    if (signal?.aborted) throw error;
    handleApiError("/Customer/GetStats", error);
  }
}



export async function checkBookingStatus(
  payload: BookingStatusRequest
): Promise<BookingStatusResponse> {
  try {
    const { data } = await api.post<ApiEnvelope<BookingStatusResponse>>(
      "/Utility/CheckBookingStatus",
      payload
    );
    return data.ServiceResponse;
  } catch (error) {
    handleApiError("/Utility/CheckBookingStatus", error);
  }
}

export async function updateBookingStatus(
  payload: BookingStatusRequest
): Promise<BookingStatusResponse> {
  try {
    const { data } = await api.post<ApiEnvelope<BookingStatusResponse>>(
      "/Utility/UpdateBookingStatus",
      payload
    );
    return data.ServiceResponse;
  } catch (error) {
    handleApiError("/Utility/UpdateBookingStatus", error);
  }
}




export type DocumentFormat = "P" | "H"; // P = PDF, H = HTML
 
export interface DocumentRequest {
  TransactionID: string;
  PNR: string;
  ReferenceNo: string;
  Type: DocumentFormat;
}
 
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
 
function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64.replace(/\s/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
 
function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === "object")
    Object.values(value as Record<string, unknown>).forEach((v) => collectStrings(v, out));
  return out;
}
 
async function downloadDocument(path: string, payload: DocumentRequest, baseName: string): Promise<void> {
  try {
    const mime = payload.Type === "P" ? "application/pdf" : "text/html";
    const ext = payload.Type === "P" ? "pdf" : "html";
    const filename = `${baseName}_${payload.ReferenceNo || payload.TransactionID}.${ext}`;
 
    const res = await api.post(path, payload, { responseType: "blob" });
    const blob: Blob = res.data;
    const contentType = String(res.headers?.["content-type"] ?? blob.type ?? "").toLowerCase();
 
    // 1) Server returned the file itself
    if (!contentType.includes("json")) {
      saveBlob(blob.type ? blob : new Blob([blob], { type: mime }), filename);
      return;
    }
 
    const json = JSON.parse(await blob.text());
    const sr = json?.ServiceResponse ?? json;
    if (sr?.ErrorCode) throw new Error(sr.Message || "Document request failed.");
 
    const strings = collectStrings(sr).map((s) => s.trim());
 
    const dataUri = strings.find((s) => /^data:[^;]+;base64,/i.test(s));
    if (dataUri) {
      const [head, body] = dataUri.split(",");
      saveBlob(base64ToBlob(body, head.slice(5, head.indexOf(";"))), filename);
      return;
    }
    const base64 = strings.find((s) => s.length > 200 && /^[A-Za-z0-9+/=\s]+$/.test(s));
    if (base64) {
      saveBlob(base64ToBlob(base64, mime), filename);
      return;
    }
    const html = strings.find((s) => /^<(!doctype|html)/i.test(s));
    if (html) {
      saveBlob(new Blob([html], { type: "text/html" }), filename);
      return;
    }
    const link = strings.find((s) => /^https?:\/\//i.test(s));
    if (link) {
      window.open(link, "_blank", "noopener");
      return;
    }
    throw new Error(sr?.Message || "No document content found in the response.");
  } catch (error) {
    handleApiError(path, error);
  }
}
 
export function downloadETicket(payload: DocumentRequest): Promise<void> {
  return downloadDocument("/Utility/ETicketCopy", payload, "ETicket");
}
 
export function downloadInvoice(payload: DocumentRequest): Promise<void> {
  return downloadDocument("/Utility/AirlineInvoice", payload, "Invoice");
}
