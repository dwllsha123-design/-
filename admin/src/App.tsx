import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { OrdersPage } from './pages/OrdersPage';
import { NewFacebookOrderPage } from './pages/NewFacebookOrderPage';
import { ProductsPage } from './pages/ProductsPage';
import { CustomersPage } from './pages/CustomersPage';
import { InventoryPage } from './pages/InventoryPage';
import { FacebookPagesPage } from './pages/FacebookPagesPage';
import { DeliveryPage } from './pages/DeliveryPage';
import { DeliveryPrintPage } from './pages/DeliveryPrintPage';
import { PosPage } from './pages/PosPage';
import { PosInvoicePage } from './pages/PosInvoicePage';
import { ReturnsPage } from './pages/ReturnsPage';
import { ReservationsPage } from './pages/ReservationsPage';
import { CommissionsPage } from './pages/CommissionsPage';
import { PromosPage } from './pages/PromosPage';
import { BannersPage } from './pages/BannersPage';
import { UsersPage } from './pages/UsersPage';
import { AuditPage } from './pages/AuditPage';
import { RegisterMarketerPage } from './pages/RegisterMarketerPage';

function Protected({ children }: { children: ReactNode }) {
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
            <Protected>
              <PosInvoicePage />
            </Protected>
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
          <Route path="reservations" element={<ReservationsPage />} />
          <Route path="returns" element={<ReturnsPage />} />
          <Route path="commissions" element={<CommissionsPage />} />
          <Route path="facebook-pages" element={<FacebookPagesPage />} />
          <Route path="delivery" element={<DeliveryPage />} />
          <Route path="pos" element={<PosPage />} />
          <Route path="promos" element={<PromosPage />} />
          <Route path="banners" element={<BannersPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="audit" element={<AuditPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
