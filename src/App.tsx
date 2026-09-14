import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { AccountLayout } from "@/layouts/AccountLayout";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { RequireAdmin } from "@/features/admin/RequireAdmin";

import { HomePage } from "@/pages/HomePage";
import { ShopPage } from "@/pages/ShopPage";
import { ProductPage } from "@/pages/ProductPage";
import { CartPage } from "@/pages/CartPage";
import { CategoriesPage } from "@/pages/CategoriesPage";
import { CategoryRedirectPage } from "@/pages/CategoryRedirectPage";
import { PromotionsRedirectPage } from "@/pages/PromotionsRedirectPage";
import { NewArrivalsRedirectPage } from "@/pages/NewArrivalsRedirectPage";
import { ContactPage } from "@/pages/ContactPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { ComingSoonPage } from "@/pages/ComingSoonPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

import { AccountOverviewPage } from "@/pages/account/AccountOverviewPage";
import { AccountOrdersPage } from "@/pages/account/AccountOrdersPage";
import { AccountOrderDetailPage } from "@/pages/account/AccountOrderDetailPage";
import { AccountFavoritesPage } from "@/pages/account/AccountFavoritesPage";
import { AccountProfilePage } from "@/pages/account/AccountProfilePage";
import { AccountAddressesPage } from "@/pages/account/AccountAddressesPage";

// L'espace administrateur est chargé à la demande (code-splitting) : il ne
// pèse pas sur le temps de chargement initial de la boutique cliente.
const AdminLayout = lazy(() => import("@/layouts/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const AdminLoginPage = lazy(() => import("@/pages/admin/AdminLoginPage").then((m) => ({ default: m.AdminLoginPage })));
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage })));
const AdminProductsPage = lazy(() => import("@/pages/admin/AdminProductsPage").then((m) => ({ default: m.AdminProductsPage })));
const AdminCategoriesPage = lazy(() => import("@/pages/admin/AdminCategoriesPage").then((m) => ({ default: m.AdminCategoriesPage })));
const AdminOrdersPage = lazy(() => import("@/pages/admin/AdminOrdersPage").then((m) => ({ default: m.AdminOrdersPage })));
const AdminInventoryPage = lazy(() => import("@/pages/admin/AdminInventoryPage").then((m) => ({ default: m.AdminInventoryPage })));
const AdminCustomersPage = lazy(() => import("@/pages/admin/AdminCustomersPage").then((m) => ({ default: m.AdminCustomersPage })));
const AdminMessagesPage = lazy(() => import("@/pages/admin/AdminMessagesPage").then((m) => ({ default: m.AdminMessagesPage })));
const AdminSettingsPage = lazy(() => import("@/pages/admin/AdminSettingsPage").then((m) => ({ default: m.AdminSettingsPage })));

function AdminFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-fitora-black text-fitora-gray">
      Chargement de l'espace administrateur...
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Espace public + client */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/boutique" element={<ShopPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/categorie/:slug" element={<CategoryRedirectPage />} />
          <Route path="/promotions" element={<PromotionsRedirectPage />} />
          <Route path="/nouveautes" element={<NewArrivalsRedirectPage />} />
          <Route path="/produit/:slug" element={<ProductPage />} />
          <Route path="/panier" element={<CartPage />} />
          <Route path="/contact" element={<ContactPage />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Routes nécessitant un compte client */}
          <Route element={<RequireAuth />}>
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route element={<AccountLayout />}>
              <Route path="/compte" element={<AccountOverviewPage />} />
              <Route path="/compte/commandes" element={<AccountOrdersPage />} />
              <Route path="/compte/commandes/:id" element={<AccountOrderDetailPage />} />
              <Route path="/compte/favoris" element={<AccountFavoritesPage />} />
              <Route path="/compte/profil" element={<AccountProfilePage />} />
              <Route path="/compte/adresses" element={<AccountAddressesPage />} />
            </Route>
          </Route>

          <Route path="/aide/livraison" element={<ComingSoonPage title="Livraison" />} />
          <Route path="/aide/paiement" element={<ComingSoonPage title="Paiement" />} />
          <Route path="/aide/conditions" element={<ComingSoonPage title="Conditions générales" />} />
          <Route path="/aide/confidentialite" element={<ComingSoonPage title="Politique de confidentialité" />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Espace administrateur (chargé à la demande) */}
        <Route
          path="/admin/login"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AdminLoginPage />
            </Suspense>
          }
        />
        <Route element={<RequireAdmin />}>
          <Route
            element={
              <Suspense fallback={<AdminFallback />}>
                <AdminLayout />
              </Suspense>
            }
          >
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/products" element={<AdminProductsPage />} />
            <Route path="/admin/categories" element={<AdminCategoriesPage />} />
            <Route path="/admin/orders" element={<AdminOrdersPage />} />
            <Route path="/admin/inventory" element={<AdminInventoryPage />} />
            <Route path="/admin/customers" element={<AdminCustomersPage />} />
            <Route path="/admin/messages" element={<AdminMessagesPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
