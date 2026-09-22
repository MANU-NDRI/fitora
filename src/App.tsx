import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { AccountLayout } from "@/layouts/AccountLayout";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { RequireAdmin } from "@/features/admin/RequireAdmin";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import { useEffect } from "react";
import { captureReferralCodeFromUrl } from "@/services/affiliateService";

// La page d'accueil reste chargée immédiatement : c'est la première page vue
// par la quasi-totalité des visiteurs, inutile de payer un aller-retour réseau
// supplémentaire pour l'afficher.
import { HomePage } from "@/pages/HomePage";

// Toutes les autres pages boutique/compte sont chargées à la demande
// (code-splitting) : elles ne pèsent plus sur le bundle initial téléchargé
// par chaque visiteur, qui ne consulte jamais la totalité des pages.
const ShopPage = lazy(() => import("@/pages/ShopPage").then((m) => ({ default: m.ShopPage })));
const ProductPage = lazy(() => import("@/pages/ProductPage").then((m) => ({ default: m.ProductPage })));
const CartPage = lazy(() => import("@/pages/CartPage").then((m) => ({ default: m.CartPage })));
const CategoriesPage = lazy(() => import("@/pages/CategoriesPage").then((m) => ({ default: m.CategoriesPage })));
const CategoryRedirectPage = lazy(() => import("@/pages/CategoryRedirectPage").then((m) => ({ default: m.CategoryRedirectPage })));
const PromotionsRedirectPage = lazy(() => import("@/pages/PromotionsRedirectPage").then((m) => ({ default: m.PromotionsRedirectPage })));
const NewArrivalsRedirectPage = lazy(() => import("@/pages/NewArrivalsRedirectPage").then((m) => ({ default: m.NewArrivalsRedirectPage })));
const ContactPage = lazy(() => import("@/pages/ContactPage").then((m) => ({ default: m.ContactPage })));
const ReturnPolicyPage = lazy(() => import("@/pages/ReturnPolicyPage").then((m) => ({ default: m.ReturnPolicyPage })));
const LoginPage = lazy(() => import("@/pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("@/pages/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage").then((m) => ({ default: m.CheckoutPage })));
const ComingSoonPage = lazy(() => import("@/pages/ComingSoonPage").then((m) => ({ default: m.ComingSoonPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

const AccountOverviewPage = lazy(() => import("@/pages/account/AccountOverviewPage").then((m) => ({ default: m.AccountOverviewPage })));
const AccountOrdersPage = lazy(() => import("@/pages/account/AccountOrdersPage").then((m) => ({ default: m.AccountOrdersPage })));
const AccountOrderDetailPage = lazy(() => import("@/pages/account/AccountOrderDetailPage").then((m) => ({ default: m.AccountOrderDetailPage })));
const AccountFavoritesPage = lazy(() => import("@/pages/account/AccountFavoritesPage").then((m) => ({ default: m.AccountFavoritesPage })));
const AccountProfilePage = lazy(() => import("@/pages/account/AccountProfilePage").then((m) => ({ default: m.AccountProfilePage })));
const AccountAddressesPage = lazy(() => import("@/pages/account/AccountAddressesPage").then((m) => ({ default: m.AccountAddressesPage })));
const AccountMessagesPage = lazy(() => import("@/pages/account/AccountMessagesPage").then((m) => ({ default: m.AccountMessagesPage })));
const AccountAffiliatePage = lazy(() => import("@/pages/account/AccountAffiliatePage").then((m) => ({ default: m.AccountAffiliatePage })));

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
const AdminDiscountCodesPage = lazy(() => import("@/pages/admin/AdminDiscountCodesPage").then((m) => ({ default: m.AdminDiscountCodesPage })));
const AdminMessagesPage = lazy(() => import("@/pages/admin/AdminMessagesPage").then((m) => ({ default: m.AdminMessagesPage })));
const AdminNotificationsPage = lazy(() => import("@/pages/admin/AdminNotificationsPage").then((m) => ({ default: m.AdminNotificationsPage })));
const AdminAffiliatesPage = lazy(() => import("@/pages/admin/AdminAffiliatesPage").then((m) => ({ default: m.AdminAffiliatesPage })));
const AdminSettingsPage = lazy(() => import("@/pages/admin/AdminSettingsPage").then((m) => ({ default: m.AdminSettingsPage })));

function AdminFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-fitora-black text-fitora-gray">
      Chargement de l'espace administrateur...
    </div>
  );
}

// Fallback discret pour les pages boutique/compte chargées à la demande.
// Volontairement minimaliste (pas de logo ni de mise en page) afin de
// s'afficher instantanément sans provoquer de saut de mise en page notable :
// sur un réseau rapide, ce fallback n'est visible que quelques dizaines de ms.
function PageFallback() {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center text-fitora-gray"
      role="status"
      aria-label="Chargement de la page"
    >
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

export function App() {
  usePresenceHeartbeat();

  // Capture ?ref=CODE dès l'arrivée sur le site, quelle que soit la page
  // d'atterrissage (accueil, produit partagé, etc.), avant même que le
  // visiteur atteigne le formulaire d'inscription.
  useEffect(() => {
    captureReferralCodeFromUrl();
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
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
          <Route path="/reset-password" element={<ResetPasswordPage />} />

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
              <Route path="/compte/messages" element={<AccountMessagesPage />} />
              <Route path="/compte/affiliation" element={<AccountAffiliatePage />} />
            </Route>
          </Route>

          <Route path="/aide/livraison" element={<ComingSoonPage title="Livraison" />} />
          <Route path="/aide/paiement" element={<ComingSoonPage title="Paiement" />} />
          <Route path="/aide/retours" element={<ReturnPolicyPage />} />
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
            <Route path="/admin/discount-codes" element={<AdminDiscountCodesPage />} />
            <Route path="/admin/messages" element={<AdminMessagesPage />} />
            <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
            <Route path="/admin/affiliates" element={<AdminAffiliatesPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
          </Route>
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
