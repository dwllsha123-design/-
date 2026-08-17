import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { CartProvider } from './cart/CartContext';
import { StoreLayout } from './layouts/StoreLayout';
import { HomePage } from './pages/HomePage';
import { CatalogPage, CategoriesPage } from './pages/CatalogPage';
import { ProductPage } from './pages/ProductPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { LoginPage, RegisterPage, ForgotPasswordPage } from './pages/AuthPages';
import {
  AccountPage,
  AccountOrderPage,
  OrderSuccessPage,
  TrackPage,
  WishlistPage,
  SearchPage,
  ContentPage,
} from './pages/AccountPages';
import { captureAttributionFromUrl } from './api/client';
import { ThemeProvider } from './theme/ThemeContext';

function AttributionCapture() {
  const location = useLocation();
  useEffect(() => {
    captureAttributionFromUrl();
  }, [location.search]);
  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <AttributionCapture />
          <Routes>
            <Route element={<StoreLayout />}>
            <Route index element={<HomePage />} />
            <Route path="products" element={<CatalogPage mode="all" />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="category/:slug" element={<CatalogPage mode="category" />} />
            <Route path="offers" element={<CatalogPage mode="collection" />} />
            <Route path="new" element={<CatalogPage mode="collection" />} />
            <Route path="bestseller" element={<CatalogPage mode="collection" />} />
            <Route path="search" element={<CatalogPage mode="search" />} />
            <Route path="search-box" element={<SearchPage />} />
            <Route path="product/:id" element={<ProductPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="account/orders/:id" element={<AccountOrderPage />} />
            <Route path="order-success/:orderNumber" element={<OrderSuccessPage />} />
            <Route path="track" element={<TrackPage />} />
            <Route path="wishlist" element={<WishlistPage />} />
            <Route
              path="about"
              element={
                <ContentPage
                  title="من نحن"
                  body={[
                    'دار الأنوثة — عنوان الأناقة والجاذبية في طرابلس.',
                    'نُقدم لكِ أرقى تشكيلة من اللانجري، الملابس النسائية، الأرواب، والباروكات.',
                    'التوصيل متوفر لجميع مناطق ليبيا.',
                    'للتواصل: 0911820999 · 0924443839',
                  ]}
                />
              }
            />
            <Route
              path="contact"
              element={
                <ContentPage
                  title="تواصل معنا"
                  body={[
                    'طرابلس — ليبيا',
                    'الهاتف: 0911820999',
                    'الهاتف: 0924443839',
                    'يسعدنا خدمتكِ يومياً لاستفسارات الطلبات والمنتجات.',
                  ]}
                />
              }
            />
            <Route
              path="policies/returns"
              element={
                <ContentPage
                  title="سياسة الاستبدال والاسترجاع"
                  body={[
                    'يمكن مراجعة طلب الاستبدال أو الاسترجاع خلال مدة يتم الاتفاق عليها مع خدمة العملاء.',
                    'يشترط أن يكون المنتج بحالته الأصلية مع الحفاظ على الملصقات إن وجدت.',
                    'للتواصل بخصوص المرتجعات: 0911820999 / 0924443839',
                  ]}
                />
              }
            />
            <Route
              path="policies/privacy"
              element={
                <ContentPage
                  title="سياسة الخصوصية"
                  body={[
                    'نستخدم بياناتكِ فقط لإتمام الطلبات وتحسين الخدمة.',
                    'لا نشارك بياناتكِ مع أطراف ثالثة إلا لأغراض التوصيل والتشغيل الضروري.',
                  ]}
                />
              }
            />
            <Route
              path="policies/terms"
              element={
                <ContentPage
                  title="شروط الاستخدام"
                  body={[
                    'باستخدام موقع دار الأنوثة فإنكِ توافقين على شروط الطلب والدفع والتوصيل المعتمدة.',
                    'الأسعار بالدينار الليبي (LYD) وقابلة للتحديث حسب العروض والتوفر.',
                  ]}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </CartProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
