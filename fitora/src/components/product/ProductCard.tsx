import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ShoppingBag } from "lucide-react";
import type { Product } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { RatingStars } from "@/components/ui/RatingStars";
import { formatFCFA, discountPercent } from "@/lib/format";
import { useFavoritesStore } from "@/store/favoritesStore";
import { useToastStore } from "@/store/toastStore";
import { isInStock, getDisplayBadges } from "@/services/productService";
import { cn } from "@/lib/cn";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const isFavorite = useFavoritesStore((s) => s.isFavorite(product.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggle);
  const pushToast = useToastStore((s) => s.push);
  const inStock = isInStock(product);
  const discount = discountPercent(product.price, product.oldPrice);
  const navigate = useNavigate();

  function handleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    toggleFavorite(product.id);
    pushToast(
      isFavorite ? "Produit retiré des favoris" : "Produit ajouté aux favoris",
      "success"
    );
  }

  function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    if (!inStock) return;
    // Si le produit a plusieurs variantes, on redirige vers la fiche produit
    // pour que le client choisisse taille / couleur / pointure (règle du cahier des charges).
    navigate(`/produit/${product.slug}?add=1`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
    >
      <Link
        to={`/produit/${product.slug}`}
        className="group block overflow-hidden rounded-2xl bg-fitora-charcoal ring-1 ring-fitora-border transition-all hover:ring-fitora-green/50"
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-fitora-charcoal-light">
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {getDisplayBadges(product).map((b) => (
              <Badge key={b} type={b} />
            ))}
          </div>

          <button
            onClick={handleFavorite}
            aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            className={cn(
              "absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition-colors",
              isFavorite ? "bg-fitora-green text-fitora-black" : "bg-black/40 text-white hover:bg-black/60"
            )}
          >
            <Heart size={16} className={isFavorite ? "fill-fitora-black" : ""} />
          </button>

          <button
            onClick={handleQuickAdd}
            disabled={!inStock}
            aria-label="Ajouter au panier"
            className="absolute bottom-3 right-3 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-fitora-green text-fitora-black opacity-0 shadow-glow transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-0"
          >
            <ShoppingBag size={16} />
          </button>
        </div>

        <div className="p-3.5">
          <p className="text-[11px] uppercase tracking-wide text-fitora-gray">{product.categoryName}</p>
          <h3 className="mt-1 truncate font-display text-sm font-semibold text-fitora-white">
            {product.name}
          </h3>

          <div className="mt-1.5">
            <RatingStars rating={product.rating} reviewCount={product.reviewCount} size={12} />
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-base font-bold text-fitora-green">
              {formatFCFA(product.price)}
            </span>
            {product.oldPrice && (
              <span className="text-xs text-fitora-gray-dim line-through">
                {formatFCFA(product.oldPrice)}
              </span>
            )}
            {discount && (
              <span className="text-xs font-semibold text-fitora-green">-{discount}%</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
