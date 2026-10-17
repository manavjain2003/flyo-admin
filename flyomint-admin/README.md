# Flyomint Admin

React (TypeScript) admin panel for the **B2C Admin API**, built with Vite,
Tailwind CSS v4, React Router and Axios.

## Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- React Router v6
- Axios
- crypto-js (AES for OTP encryption)
- lucide-react (icons)

## Project structure

```
src/
  api/
    api.ts           # Axios instance: base URL, auth header interceptor, 401 handling
    endpoints.ts      # One function per documented API endpoint (used by pages)
  utils/
    crypto.ts         # AES encrypt/decrypt helper (matches API's OTP encryption scheme)
  types/
    index.ts          # TypeScript interfaces for every request/response shape
  context/
    AuthContext.tsx   # Session (UniqueKey) + profile + permission helpers
    ToastContext.tsx  # Lightweight toast notifications
  components/
    layout/            # Sidebar, Header, MainLayout (sidebar + content on the right)
    common/             # Modal, FormField, ProtectedRoute, shared UI primitives
  pages/
    auth/                # Login (Mobile + OTP), Signup
    dashboard/            # Dashboard (profile overview)
    admins/                # Admins CRUD (User/Get, User/Add)
    roles/                  # Roles CRUD (Role/Get, Role/Add, Role/Update)
    permissions/             # Permissions matrix (Views/Get, Views/UpdatePermission)
    misc/                     # ComingSoon + 404
```

## API integration

Every call to `https://b2cadminapi.travelsuperhub.com` goes through
`src/api/api.ts`, which:

- sets the base URL,
- attaches the `UniqueKey` header (issued at login) to every request,
- redirects to `/login` on a `401`.

`src/api/endpoints.ts` wraps each documented endpoint in a typed function
(`getLoginOtp`, `login`, `getProfileDetails`, `getRoles`, `addRole`,
`updateRole`, `getUsers`, `addUser`, `getViews`, `updateViewsPermission`,
`reportError`). Pages only ever import from `endpoints.ts` — never from
`api.ts` directly.

### Auth flow

The API authenticates via **Mobile + OTP**, not email/password:

1. `Auth/GetLoginOTP` — send a 10-digit mobile number, get back an
   (encrypted) `UserKey` and, in non-prod, an encrypted OTP for convenience.
2. `Auth/Login` — send the mobile number, the `UserKey` from step 1, and the
   OTP the user typed **encrypted with AES** (see `src/utils/crypto.ts`,
   key `8080808080808080`, ECB/PKCS7 — matches the API doc's cipher format).
3. The response's `UniqueKey` is stored and sent as a header on every
   subsequent request.

### Sign up

The API has no public self-registration endpoint — every request requires
an authenticated `UniqueKey`. The Signup page calls `User/Add` and, if that
fails (expected when unauthenticated), shows a message pointing the user to
an existing admin who can add them from the **Admins** page.

## Getting started

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Environment

The API base URL is currently hardcoded in `src/api/api.ts`
(`API_BASE_URL`). Swap it for a Vite env var (`import.meta.env.VITE_API_URL`)
if you need per-environment base URLs.
