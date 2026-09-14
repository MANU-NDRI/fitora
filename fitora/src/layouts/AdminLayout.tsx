import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingCart,
  Boxes,
  Users,
  MessageSquare,
  Megaphone,
  Tag,
  Settings,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/cn";

const LINKS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/products", label: "Produits", icon: Package },
  { to: "/admin/categories", label: "Catégories", icon: Tags },
  { to: "/admin/orders", label: "Commandes", icon: ShoppingCart },
  { to: "/admin/inventory", label: "Stock", icon: Boxes },
  { to: "/admin/customers", label: "Clients", icon: Users },
  { to: "/admin/discount-codes", label: "Codes promo", icon: Tag },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare },
  { to: "/admin/notifications", label: "Notifications", icon: Megaphone },
  { to: "/admin/settings", label: "Paramètres", icon: Settings },
];

export function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-fitora-black text-fitora-white">
      <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-fitora-border bg-fitora-charcoal/40 md:flex">
        <div className="flex h-16 items-center px-6">
          <span className="font-display text-lg font-extrabold tracking-tight">
            FIT<span className="text-fitora-green">ORA</span>
          </span>
          <span className="ml-2 rounded bg-fitora-green/10 px-1.5 py-0.5 text-[10px] font-bold text-fitora-green">
            ADMIN
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
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
        </nav>
        <div className="space-y-1 border-t border-fitora-border p-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-fitora-gray hover:bg-white/5 hover:text-fitora-white"
          >
            <ExternalLink size={16} /> Voir la boutique
          </a>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-fitora-gray hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex h-16 items-center justify-between border-b border-fitora-border px-4 md:px-8">
          <p className="font-display text-sm font-semibold md:text-base">Espace administrateur</p>
          <p className="text-sm text-fitora-gray">{user?.firstName} {user?.lastName}</p>
        </header>
        <main className="p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
