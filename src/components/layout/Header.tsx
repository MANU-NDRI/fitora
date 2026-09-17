import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Heart, ShoppingBag, User, Menu, X } from "lucide-react";
import { useCartCount, useCartStore } from "@/store/cartStore";
import { useFavoritesStore } from "@/store/favoritesStore";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { cn } from "@/lib/cn";

const NAV_LINKS = [
  { label: "Accueil", to: "/" },
  { label: "Boutique", to: "/boutique" },
  { label: "Catégories", to: "/categories" },
  { label: "Promotions", to: "/promotions" },
  { label: "Nouveautés", to: "/nouveautes" },
  { label: "Contact", to: "/contact" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const cartCount = useCartCount();
  const favoritesCount = useFavoritesStore((s) => s.productIds.length);
  const toggleCart = useCartStore((s) => s.toggleCart);
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchValue.trim()) return;
    navigate(`/boutique?q=${encodeURIComponent(searchValue.trim())}`);
    setSearchOpen(false);
    setMobileOpen(false);
  }

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-fitora-border bg-fitora-black/90 backdrop-blur-md">
      <div className="container-fitora flex h-16 items-center justify-between gap-4 md:h-20">
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu size={24} />
        </button>

        <Link to="/" className="flex items-center gap-1 font-display text-2xl font-extrabold tracking-tight">
          FIT<span className="text-fitora-green">ORA</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "text-sm font-medium text-fitora-gray transition-colors hover:text-fitora-white",
                  isActive && "text-fitora-white"
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1 md:gap-2">
          <button
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Rechercher"
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          >
            <Search size={20} />
          </button>

          <Link
            to="/compte/favoris"
            aria-label="Favoris"
            className="relative hidden h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10 sm:flex"
          >
            <Heart size={20} />
            {favoritesCount > 0 && <CountBubble count={favoritesCount} />}
          </Link>

          <NotificationBell />

          <button
            onClick={toggleCart}
            aria-label="Panier"
            className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && <CountBubble count={cartCount} />}
          </button>

          <Link
            to="/compte"
            aria-label="Mon compte"
            className="hidden h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10 sm:flex"
          >
            <User size={20} />
          </Link>
        </div>
      </div>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-fitora-border"
          >
            <form onSubmit={submitSearch} className="container-fitora flex items-center gap-3 py-3">
              <Search size={18} className="text-fitora-gray" />
              <input
                autoFocus
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Rechercher un maillot, une chaussure, un ballon..."
                className="flex-1 bg-transparent text-sm text-fitora-white placeholder:text-fitora-gray-dim focus:outline-none"
              />
              <button type="button" onClick={() => setSearchOpen(false)} aria-label="Fermer la recherche">
                <X size={18} className="text-fitora-gray" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </header>

    {/*
      Le menu mobile est rendu dans un portail directement sur <body>, en
      dehors du <header>. Nécessaire car <header> utilise backdrop-blur
      (backdrop-filter), qui crée un nouveau "containing block" CSS pour
      tout descendant en position:fixed — sans ce portail, le panneau et son
      fond semi-transparent restaient coincés dans la petite zone du header
      au lieu de couvrir tout l'écran (bug visible sur iPhone/Safari).
    */}
    {createPortal(
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[90] bg-black/60 md:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed inset-y-0 left-0 z-[95] flex w-[78%] max-w-xs flex-col overflow-y-auto bg-fitora-charcoal p-6 md:hidden"
            >
              <div className="mb-8 flex items-center justify-between">
                <span className="font-display text-xl font-extrabold">
                  FIT<span className="text-fitora-green">ORA</span>
                </span>
                <button onClick={() => setMobileOpen(false)} aria-label="Fermer le menu">
                  <X size={22} />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "rounded-lg px-3 py-3 text-base font-medium text-fitora-gray transition-colors hover:bg-white/5 hover:text-fitora-white",
                        isActive && "bg-white/5 text-fitora-white"
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>
              <div className="mt-6 flex items-center gap-3 border-t border-fitora-border pt-6">
                <Link
                  to="/compte/favoris"
                  onClick={() => setMobileOpen(false)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-fitora-border py-2.5 text-sm"
                >
                  <Heart size={16} /> Favoris
                </Link>
                <Link
                  to="/compte"
                  onClick={() => setMobileOpen(false)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-fitora-border py-2.5 text-sm"
                >
                  <User size={16} /> Compte
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    )}
    </>
  );
}

function CountBubble({ count }: { count: number }) {
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-fitora-green px-1 text-[10px] font-bold text-fitora-black">
      {count > 9 ? "9+" : count}
    </span>
  );
}
