import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Heart, ShoppingBag, User, Menu, X } from "lucide-react";
import { useCartCount, useCartStore } from "@/store/cartStore";
import { useFavoritesStore } from "@/store/favoritesStore";
import { cn } from "@/lib/cn";

const NAV_LINKS = [
  { label: "Accueil", to: "/" },
  { label: "Boutique", to: "/boutique" },
  { label: "CatÃ©gories", to: "/categories" },
  { label: "Promotions", to: "/promotions" },
  { label: "NouveautÃ©s", to: "/nouveautes" },
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
    <header className="sticky top-0 z-50 border-b border-fitora-border bg-fitora-black/95 backdrop-blur-md">
      <div className="container-fitora flex h-16 items-center justify-between gap-2 sm:gap-3 md:h-20 md:gap-4">
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu size={24} />
        </button>

        <Link to="/" className="flex min-w-0 items-center gap-0.5 font-display text-[1.35rem] font-extrabold tracking-tight sm:text-2xl">
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

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1 md:gap-2">
          <button
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Rechercher"
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10 sm:h-10 sm:w-10"
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

          <button
            onClick={toggleCart}
            aria-label="Panier"
            className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10 sm:h-10 sm:w-10"
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

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[min(86vw,340px)] max-w-full flex-col overflow-y-auto bg-fitora-charcoal px-5 pb-6 pt-5 shadow-2xl md:hidden sm:px-6"
            >
              <div className="mb-6 flex items-center justify-between sm:mb-8">
                <span className="font-display text-lg font-extrabold sm:text-xl">
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
              <div className="mt-5 flex flex-col gap-2 border-t border-fitora-border pt-5 sm:mt-6 sm:flex-row sm:gap-3 sm:pt-6">
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
      </AnimatePresence>
    </header>
  );
}

function CountBubble({ count }: { count: number }) {
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-fitora-green px-1 text-[10px] font-bold text-fitora-black">
      {count > 9 ? "9+" : count}
    </span>
  );
}

