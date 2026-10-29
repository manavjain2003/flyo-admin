import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ProtectedRoute } from "./components/common/ProtectedRoute";
import { RequirePermission } from "./components/common/RequirePermission";
import { MainLayout } from "./components/layout/MainLayout";

import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Dashboard from "./pages/dashboard/Dashboard";
import Admins from "./pages/admins/Admins";
import Roles from "./pages/roles/Roles";
import Permissions from "./pages/permissions/Permissions";
import FareTypeMaster from "./pages/master/FareTypeMaster";
import DiscountMaster, { DISCOUNT_VIEW_ID } from "./pages/master/DiscountMaster";
import FareRuleMaster, { FARERULE_VIEW_ID } from "./pages/master/FareRuleMaster";
import MarkupMaster, { MARKUP_VIEW_ID } from "./pages/master/MarkupMaster";
import AmenityMaster, { AMENITY_VIEW_ID } from "./pages/master/AmenityMaster";
import Bookings from "./pages/bookings/Bookings";
import BookingDetail from "./booking-detail/BookingDetail";
import ComingSoon from "./pages/misc/ComingSoon";
import ConfigPage from "./config/ConfigPage";
import NotFound from "./pages/misc/NotFound";
import ConfirmedBookings from "./pages/bookings/ConfirmedBookings";
import PendingBookings from "./pages/bookings/PendingBookings";

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
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
                <Route path="/admins" element={<RequirePermission viewId="user"><Admins /></RequirePermission>} />
                <Route path="/roles" element={<RequirePermission viewId="role"><Roles /></RequirePermission>} />
                <Route path="/permissions" element={<RequirePermission viewId="permission"><Permissions /></RequirePermission>} />
                <Route path="/confirm-bookings" element={<RequirePermission viewId="cnfbkg"><ConfirmedBookings /></RequirePermission>} />
                <Route path="/pending-bookings" element={<RequirePermission viewId="pndbkg"><PendingBookings /></RequirePermission>} />
                <Route path="/content" element={<ComingSoon title="Content" />} />
                <Route path="/locations" element={<ComingSoon title="Locations" />} />
                <Route path="/aviation" element={<ComingSoon title="Aviation" />} />
                <Route path="/travelers" element={<ComingSoon title="Travelers" />} />
                <Route path="/bookings" element={<RequirePermission viewId="searchtxn"><Bookings /></RequirePermission>} />
                <Route path="/bookings/:reference" element={<RequirePermission viewId="searchtxn"><BookingDetail /></RequirePermission>} />
                <Route path="/configuration" element={<RequirePermission viewId="marginconfig"><ConfigPage /></RequirePermission>} />
                <Route path="/advanced" element={<ComingSoon title="Advanced" />} />
                <Route path="/master/fare-type" element={<RequirePermission viewId="faretypem"><FareTypeMaster /></RequirePermission>} />
                <Route path="/master/discount" element={<RequirePermission viewId={DISCOUNT_VIEW_ID}><DiscountMaster /></RequirePermission>} />
                <Route path="/master/fare-rule" element={<RequirePermission viewId={FARERULE_VIEW_ID}><FareRuleMaster /></RequirePermission>} />
                <Route path="/master/markup" element={<RequirePermission viewId={MARKUP_VIEW_ID}><MarkupMaster /></RequirePermission>} />
                <Route path="/master/amenity" element={<RequirePermission viewId={AMENITY_VIEW_ID}><AmenityMaster /></RequirePermission>} />
              </Route>

              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}