// Generic envelope every B2C Admin API response is wrapped in.
export interface ApiEnvelope<T> {
  ServiceResponse: T;
  ServiceStatus: string;
}

// ---------- Auth ----------
export interface GetLoginOtpRequest {
  Mobile: string;
}

export interface GetLoginOtpResponse {
  OTP: string; // AES encrypted (only returned in non-prod / for dev convenience)
  UserKey: string; // AES encrypted, must be echoed back on Login
  ErrorCode: string | null;
  Message: string | null;
}

export interface LoginRequest {
  Mobile: string;
  UserKey: string;
  OTP: string; // AES encrypted OTP entered by the user
}

export interface LoginResponse {
  UniqueKey: string; // JWT-like token, must be sent on every subsequent request
  Validity: string; // ISO date string
  ErrorCode: string | null;
  Message: string | null;
}

// ---------- Profile ----------
export interface ProfileView {
  ViewName: string;
  ViewId: string;
  Permission: string[]; // e.g. ["R", "W"]
}

export interface ProfileResponse {
  Title: string;
  Name: string;
  Email: string;
  Phone: string;
  Views: ProfileView[];
  RoleName: string;
  ErrorCode: string | null;
  Message: string | null;
}

// ---------- Roles ----------
export interface RoleDetail {
  RoleId: number;
  RoleName: string;
  IsActive?: boolean;
}

export interface RoleGetResponse {
  RoleDetails: RoleDetail[];
  ErrorCode: string | null;
  Message: string | null;
}

export interface RoleAddRequest {
  RoleName: string;
}

export interface RoleUpdateRequest {
  RoleId: number;
  RoleName: string;
  IsActive: boolean;
}

export interface SimpleMessageResponse {
  ErrorCode: string | null;
  Message: string | null;
}

// ---------- Users / Admins ----------
export interface UserDetail {
  StaffId: number;
  Title: string;
  Name: string;
  Email: string;
  Phone: string;
  RoleName: string;
  RoleId: string;
  IsActive: boolean;
}

export interface UserGetResponse {
  UserDetails: UserDetail[];
  ErrorCode: string | null;
  Message: string | null;
}

export interface UserAddRequest {
  Title: string;
  Name: string;
  Email: string;
  Phone: string;
  RoleId: number;
  IsActive: boolean;
}

// ---------- Views / Permissions ----------
export interface ViewDetail {
  Id: number;
  ViewName: string;
  Permission: string[]; // e.g. ["R", "W"]
}

export interface ViewsGetResponse {
  Views: ViewDetail[];
  ErrorCode: string | null;
  Message: string | null;
}

export interface ViewsUpdatePermissionRequest {
  RoleId: string;
  Views: {
    Id: number;
    ViewName: string;
    Permission: string[];
  }[];
}

// ---------- Error logging ----------
export interface ErrorPostRequest {
  Path: string;
  ErrorMessage: string;
}
