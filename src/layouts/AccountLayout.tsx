import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { User, Package, Heart, MapPin, MessageSquare, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { cn } from "@/lib/cn";

const LINKS = [
  { to: "/compte", label: "Vue d'ensemble", icon: User, end: true },
  { to: "/compte/commandes", label: "Mes commandes", icon: Package },
  { to: "/compte/favoris", label: "Mes favoris", icon: Heart },
  { to: "/compte/adresses", label: "Mes adresses", icon: MapPin },
  { to: "/compte/messages", label: "Mes messages", icon: MessageSquare },
];

export function AccountLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const pushToast = useToastStore((s) => s.push);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    pushToast("Vous êtes déconnecté(e)", "info");
    navigate("/");
  }

  return (
    <div className="container-fitora py-6 sm:py-8 md:py-12">
      <div className="mb-5 sm:mb-8">
        <p className="text-xs uppercase tracking-wide text-fitora-gray">Mon compte</p>
        <h1 className="font-display text-[1.55rem] font-bold leading-tight sm:text-2xl md:text-3xl">
          Bonjour {user?.firstName} 👋
        </h1>
      </div>

      <div className="flex min-w-0 flex-col gap-5 sm:gap-6 md:gap-8 md:flex-row">
        <aside className="flex min-w-0 flex-shrink-0 gap-1.5 overflow-x-auto pb-1 md:w-56 md:flex-col md:gap-2 md:overflow-visible md:pb-0">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  "flex min-h-10 flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:py-2.5 sm:text-sm md:whitespace-normal",
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
            className="flex min-h-10 flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium text-fitora-gray transition-colors hover:bg-red-500/10 hover:text-red-400 sm:px-4 sm:py-2.5 sm:text-sm md:whitespace-normal"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </aside>

        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
