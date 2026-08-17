import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, isBranchUser, isDriverOnly, useAuth } from './auth/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DriverPortalPage } from './pages/DriverPortalPage';
import { BranchPosPage } from './pages/BranchPosPage';
import { BranchesPage } from './pages/BranchesPage';
import { TripoliDriversPage } from './pages/TripoliDriversPage';
import { CompanyOrdersPage } from './pages/CompanyOrdersPage';
import { DashboardPage } from './pages/DashboardPage';
import { OrdersPage } from './pages/OrdersPage';
import { NewFacebookOrderPage } from './pages/NewFacebookOrderPage';
import { ProductsPage } from './pages/ProductsPage';
import { CustomersPage } from './pages/CustomersPage';
import { InventoryPage } from './pages/InventoryPage';
import { FacebookPagesPage } from './pages/FacebookPagesPage';
import { DeliveryPage } from './pages/DeliveryPage';
import { DeliveryPrintPage } from './pages/DeliveryPrintPage';
import { PosInvoicePage } from './pages/PosInvoicePage';
import { ReturnsPage } from './pages/ReturnsPage';
import { ReservationsPage } from './pages/ReservationsPage';
import { CommissionsPage } from './pages/CommissionsPage';
import { BannersPage } from './pages/BannersPage';
import { UsersPage } from './pages/UsersPage';
import { AuditPage } from './pages/AuditPage';
import { RegisterMarketerPage } from './pages/RegisterMarketerPage';
import { DeliveryZonesPage } from './pages/DeliveryZonesPage';

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="login-page">جارٍ التحميل...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isDriverOnly(user)) return <Navigate to="/driver" replace />;
  if (isBranchUser(user)) return <Navigate to="/branch" replace />;
  return <>{children}</>;
}

function DriverGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="login-page">جارٍ التحميل...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function BranchGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="login-page">جارٍ التحميل...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isBranchUser(user)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AuthOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="login-page">جارٍ التحميل...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/driver/login" element={<Navigate to="/login" replace />} />
        <Route
          path="/driver"
          element={
            <DriverGate>
              <DriverPortalPage />
            </DriverGate>
          }
        />
        <Route
          path="/branch"
          element={
            <BranchGate>
              <BranchPosPage />
            </BranchGate>
          }
        />
        <Route path="/register-marketer" element={<RegisterMarketerPage />} />
        <Route
          path="/delivery/print"
          element={
            <Protected>
              <DeliveryPrintPage />
            </Protected>
          }
        />
        <Route
          path="/pos/invoice/:orderId"
          element={
            <AuthOnly>
              <PosInvoicePage />
            </AuthOnly>
          }
        />
        <Route
          path="/"
          element={
            <Protected>
              <AppLayout />
            </Protected>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/new" element={<NewFacebookOrderPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="branches" element={<BranchesPage />} />
          <Route path="reservations" element={<ReservationsPage />} />
          <Route path="returns" element={<ReturnsPage />} />
          <Route path="pos" element={<Navigate to="/branches" replace />} />
          <Route path="commissions" element={<CommissionsPage />} />
          <Route path="facebook-pages" element={<FacebookPagesPage />} />
          <Route path="delivery" element={<DeliveryPage />} />
          <Route path="delivery/company" element={<CompanyOrdersPage />} />
          <Route path="tripoli-drivers" element={<TripoliDriversPage />} />
          <Route path="delivery/zones" element={<DeliveryZonesPage />} />
          <Route path="banners" element={<BannersPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="audit" element={<AuditPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
