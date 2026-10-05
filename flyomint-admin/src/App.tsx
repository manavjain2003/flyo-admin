import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ProtectedRoute } from "./components/common/ProtectedRoute";
import { MainLayout } from "./components/layout/MainLayout";

import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Dashboard from "./pages/dashboard/Dashboard";
import Admins from "./pages/admins/Admins";
import Roles from "./pages/roles/Roles";
import Permissions from "./pages/permissions/Permissions";
import Bookings from "./pages/bookings/Bookings";
import BookingDetail from "./booking-detail/BookingDetail";
import ComingSoon from "./pages/misc/ComingSoon";
import NotFound from "./pages/misc/NotFound";
import ConfirmedBookings from "./pages/bookings/ConfirmedBookings";
import PendingBookings from "./pages/bookings/PendingBookings";

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/admins" element={<Admins />} />
              <Route path="/roles" element={<Roles />} />
              <Route path="/permissions" element={<Permissions />} />
        <Route path="/confirm-bookings" element={<ConfirmedBookings/>}/>
        <Route path="/pending-bookings" element={<PendingBookings/>}/>
              <Route path="/content" element={<ComingSoon title="Content" />} />
              <Route path="/locations" element={<ComingSoon title="Locations" />} />
              <Route path="/aviation" element={<ComingSoon title="Aviation" />} />
              <Route path="/travelers" element={<ComingSoon title="Travelers" />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/bookings/:reference" element={<BookingDetail />} />
              <Route path="/configuration" element={<ComingSoon title="Configuration" />} />
              <Route path="/advanced" element={<ComingSoon title="Advanced" />} />
            </Route>

            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
