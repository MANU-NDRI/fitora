import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { User, Package, Heart, MapPin, MessageSquare, LogOut, Gift } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { useTranslation } from "@/i18n/i18nStore";
import { cn } from "@/lib/cn";

function useAccountLinks() {
  const { t } = useTranslation();
  return [
    { to: "/compte", label: t("account.overview"), icon: User, end: true },
    { to: "/compte/commandes", label: t("account.orders"), icon: Package },
    { to: "/compte/favoris", label: t("account.favorites"), icon: Heart },
    { to: "/compte/adresses", label: t("account.addresses"), icon: MapPin },
    { to: "/compte/messages", label: t("account.messages"), icon: MessageSquare },
    { to: "/compte/affiliation", label: t("account.affiliate"), icon: Gift },
  ];
}

export function AccountLayout() {
  const { t } = useTranslation();
  const LINKS = useAccountLinks();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const pushToast = useToastStore((s) => s.push);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    pushToast(t("auth.loggedOut"), "info");
    navigate("/");
  }

  return (
    <div className="container-fitora py-8 md:py-12">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-wide text-fitora-gray">{t("nav.account")}</p>
        <h1 className="font-display text-2xl font-bold md:text-3xl">
          {t("account.greeting")} {user?.firstName} 👋
        </h1>
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="flex flex-shrink-0 gap-2 overflow-x-auto md:w-56 md:flex-col md:overflow-visible">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors md:whitespace-normal",
                  isActive
                    ? "bg-fitora-green text-fitora-black"
                    : "text-fitora-gray hover:bg-white/5 hover:text-fitora-white"
                )
              }
            >
              <link.icon size={16} />
              {link.label}
            </NavLink>
          ))}
          <button
            onClick={handleLogout}
            className="flex flex-shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium text-fitora-gray transition-colors hover:bg-red-500/10 hover:text-red-400 md:whitespace-normal"
          >
            <LogOut size={16} />
            {t("nav.logout")}
          </button>
        </aside>

        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
