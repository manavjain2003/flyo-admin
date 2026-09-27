import axios from "axios";
import api from "./api";
import { encryptAES } from "../utils/crypto";
import type {
  ApiEnvelope,
  BookingSummary,
  BookingHistoryRequest,
  BookingHistoryResponse,
  ErrorPostRequest,
  GetLoginOtpResponse,
  LoginResponse,
  ProfileResponse,
  RoleAddRequest,
  RoleGetResponse,
  RoleUpdateRequest,
  SearchTransactionRequest,
  SearchTransactionResponse,
  TransactionLeg,
  GroupedBooking,
  SimpleMessageResponse,
  UserAddRequest,
  UserGetResponse,
  UserUpdateRequest,
  ViewsGetResponse,
  ViewsUpdatePermissionRequest,
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
        Amount: 0,                         // not in this endpoint
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


