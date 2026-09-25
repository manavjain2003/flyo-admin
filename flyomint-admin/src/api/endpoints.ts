import axios from "axios";
import api from "./api";
import { encryptAES } from "../utils/crypto";
import type {
  ApiEnvelope,
  BookingHistoryRequest,
  BookingHistoryResponse,
  BookingDetail,
  ErrorPostRequest,
  GetLoginOtpResponse,
  LoginResponse,
  ProfileResponse,
  RoleAddRequest,
  RoleGetResponse,
  RoleUpdateRequest,
  SearchTransactionRequest,
  SimpleMessageResponse,
  UserAddRequest,
  UserGetResponse,
  UserUpdateRequest,
  ViewsGetResponse,
  ViewsUpdatePermissionRequest,
} from "../types";

/**
 * Every endpoint below wraps its request in a try/catch:
 *  - On failure it fires-and-forgets a report to Error/Post (per the API
 *    doc, this call is async / not awaited and must never block the UI).
 *  - It then re-throws a clean, human-readable Error so calling UI
 *    components can keep using simple try/catch + `catch { setError(...) }`
 *    without needing to know about axios internals.
 */
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

export async function getLoginOtp(mobile: string) {
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

export async function login(mobile: string, userKey: string, otp: string) {
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

export async function getProfileDetails(signal?: AbortSignal) {
  try {
    const { data } = await api.get<ApiEnvelope<ProfileResponse>>(
      "/Admin/GetProfileDetails",
      { signal }
    );
    return data.ServiceResponse;
  } catch (error) {
    handleApiError("/Admin/GetProfileDetails", error);
  }
}

export async function getRoles(signal?: AbortSignal) {
  try {
    const { data } = await api.get<ApiEnvelope<RoleGetResponse>>(
      "/Role/Get",
      { signal }
    );
    return data.ServiceResponse;
  } catch (error) {
    handleApiError("/Role/Get", error);
  }
}

export async function addRole(payload: RoleAddRequest) {
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

export async function updateRole(payload: RoleUpdateRequest) {
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

export async function getUsers(signal?: AbortSignal) {
  try {
    const { data } = await api.get<ApiEnvelope<UserGetResponse>>(
      "/User/Get",
      { signal }
    );
    return data.ServiceResponse;
  } catch (error) {
    handleApiError("/User/Get", error);
  }
}

export async function addUser(payload: UserAddRequest) {
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

export async function updateUser(payload: UserUpdateRequest) {
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
) {
  try {
    const url = roleId ? `/Views/Get/${roleId}` : "/Views/Get";
    const { data } = await api.get<ApiEnvelope<ViewsGetResponse>>(url, {
      signal,
    });
    return data.ServiceResponse;
  } catch (error) {
    handleApiError("/Views/Get", error);
  }
}

export async function updateViewsPermission(
  payload: ViewsUpdatePermissionRequest
) {
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
) {
  try {
    const { data } = await api.post<ApiEnvelope<BookingHistoryResponse>>(
      "/Report/GetBookingHistory",
      payload,
      { signal }
    );
    return data.ServiceResponse;
  } catch (error) {
    if (signal?.aborted) throw error; 
    handleApiError("/Report/GetBookingHistory", error);
  }
}

export async function searchTransaction(
  payload: SearchTransactionRequest,
  signal?: AbortSignal
) {
  try {
    const { data } = await api.post<ApiEnvelope<BookingDetail>>(
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

export function reportError(payload: ErrorPostRequest): void {
  try {
    void api.post("/Error/Post", payload).catch(() => {
    });
  } catch {
    /* intentionally ignored */
  }
}
