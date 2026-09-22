import api from "./api";
import { encryptAES } from "../utils/crypto";
import type {
  ApiEnvelope,
  ErrorPostRequest,
  GetLoginOtpResponse,
  LoginResponse,
  ProfileResponse,
  RoleAddRequest,
  RoleGetResponse,
  RoleUpdateRequest,
  SimpleMessageResponse,
  UserAddRequest,
  UserGetResponse,
  ViewsGetResponse,
  ViewsUpdatePermissionRequest,
} from "../types";

export async function getLoginOtp(mobile: string) {
  const { data } = await api.post<ApiEnvelope<GetLoginOtpResponse>>(
    "/Auth/GetLoginOTP",
    { Mobile: mobile }
  );
  return data.ServiceResponse;
}

export async function login(mobile: string, userKey: string, otp: string) {
  const { data } = await api.post<ApiEnvelope<LoginResponse>>("/Auth/Login", {
    Mobile: mobile,
    UserKey: userKey,
    OTP: encryptAES(otp),
  });
  return data.ServiceResponse;
}

export async function getProfileDetails(signal?: AbortSignal) {
  const { data } = await api.get<ApiEnvelope<ProfileResponse>>(
    "/Admin/GetProfileDetails",
    { signal }
  );
  return data.ServiceResponse;
}

export async function getRoles(signal?: AbortSignal) {
  const { data } = await api.get<ApiEnvelope<RoleGetResponse>>("/Role/Get", {
    signal,
  });
  return data.ServiceResponse;
}

export async function addRole(payload: RoleAddRequest) {
  const { data } = await api.post<ApiEnvelope<SimpleMessageResponse>>(
    "/Role/Add",
    payload
  );
  return data.ServiceResponse;
}

export async function updateRole(payload: RoleUpdateRequest) {
  const { data } = await api.post<ApiEnvelope<SimpleMessageResponse>>(
    "/Role/Update",
    payload
  );
  return data.ServiceResponse;
}

export async function getUsers(signal?: AbortSignal) {
  const { data } = await api.get<ApiEnvelope<UserGetResponse>>("/User/Get", {
    signal,
  });
  return data.ServiceResponse;
}

export async function addUser(payload: UserAddRequest) {
  const { data } = await api.post<ApiEnvelope<SimpleMessageResponse>>(
    "/User/Add",
    payload
  );
  return data.ServiceResponse;
}

export async function getViews(roleId?: number | string, signal?: AbortSignal) {
  const url = roleId ? `/Views/Get/${roleId}` : "/Views/Get";
  const { data } = await api.get<ApiEnvelope<ViewsGetResponse>>(url, {
    signal,
  });
  return data.ServiceResponse;
}

export async function updateViewsPermission(
  payload: ViewsUpdatePermissionRequest
) {
  const { data } = await api.post<ApiEnvelope<SimpleMessageResponse>>(
    "/Views/UpdatePermission",
    payload
  );
  return data.ServiceResponse;
}

export function reportError(payload: ErrorPostRequest): void {
  api.post("/Error/Post", payload).catch(() => {
    /* intentionally ignored - logging endpoint must never block the UI */
  });
}