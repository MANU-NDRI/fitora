import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Minus, Plus, MessageCircle, Heart, ChevronRight } from "lucide-react";
import type { Product, ProductVariant } from "@/types";
import { getProductBySlug, getRelatedProducts, getDisplayBadges } from "@/services/productService";
import { formatFCFA, discountPercent } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { RatingStars } from "@/components/ui/RatingStars";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/product/ProductCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCartStore } from "@/store/cartStore";
import { useFavoritesStore } from "@/store/favoritesStore";
import { useToastStore } from "@/store/toastStore";
import { buildWhatsAppLink, whatsappProductMessage } from "@/lib/whatsapp";
import { cn } from "@/lib/cn";

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [related, setRelated] = useState<Product[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [color, setColor] = useState<string | undefined>();
  const [size, setSize] = useState<string | undefined>();
  const [shoeSize, setShoeSize] = useState<string | undefined>();
  const [quantity, setQuantity] = useState(1);

  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const isFavorite = useFavoritesStore((s) => (product ? s.isFavorite(product.id) : false));
  const toggleFavorite = useFavoritesStore((s) => s.toggle);
  const pushToast = useToastStore((s) => s.push);

  useEffect(() => {
    if (!slug) return;
    setProduct(undefined);
    setActiveImage(0);
    setQuantity(1);
    getProductBySlug(slug).then((p) => {
      setProduct(p);
      if (p) {
        setColor(p.variants[0]?.color);
        setSize(p.variants.find((v) => v.size)?.size);
        setShoeSize(p.variants.find((v) => v.shoeSize)?.shoeSize);
        getRelatedProducts(p).then(setRelated);
      }
    });
  }, [slug]);

  const hasSizes = product?.variants.some((v) => v.size) ?? false;
  const hasShoeSizes = product?.variants.some((v) => v.shoeSize) ?? false;
  const colors = useMemo(
    () => Array.from(new Set(product?.variants.map((v) => v.color).filter(Boolean))) as string[],
    [product]
  );
  const sizes = useMemo(
    () => Array.from(new Set(product?.variants.map((v) => v.size).filter(Boolean))) as string[],
    [product]
  );
  const shoeSizes = useMemo(
    () => Array.from(new Set(product?.variants.map((v) => v.shoeSize).filter(Boolean))) as string[],
    [product]
  );

  const selectedVariant: ProductVariant | undefined = useMemo(() => {
    if (!product) return undefined;
    return product.variants.find(
      (v) =>
        (!hasSizes || v.size === size) &&
        (!hasShoeSizes || v.shoeSize === shoeSize) &&
        (!colors.length || v.color === color)
    );
  }, [product, color, size, shoeSize, hasSizes, hasShoeSizes, colors.length]);

  const availableStock =
    selectedVariant && !product?.outOfStockOverride
      ? Math.max(0, selectedVariant.stockAvailable - selectedVariant.stockReserved)
      : 0;

  // Ajout automatique si on arrive depuis un "ajout rapide" sur une fiche
  // produit sans variante obligatoire (ex: accessoires/équipements).
  useEffect(() => {
    if (searchParams.get("add") === "1" && product && selectedVariant && !hasSizes && !hasShoeSizes) {
      handleAddToCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, selectedVariant]);

  if (product === undefined) {
    return <ProductPageSkeleton />;
  }

  if (product === null) {
    return (
      <div className="container-fitora flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Produit introuvable</h1>
        <p className="text-fitora-gray">Ce produit n'existe pas ou n'est plus disponible.</p>
        <Link to="/boutique">
          <Button>Retour à la boutique</Button>
        </Link>
      </div>
    );
  }

  function handleAddToCart() {
    if (!product || !selectedVariant) return;
    if (availableStock <= 0) {
      pushToast("Stock insuffisant pour cette variante", "error");
      return;
    }
    addItem(product, selectedVariant, quantity);
    pushToast("Produit ajouté au panier", "success");
    openCart();
  }

  function handleBuyNow() {
    handleAddToCart();
    navigate("/panier");
  }

  const discount = discountPercent(product.price, product.oldPrice);

  return (
    <div className="container-fitora py-8 md:py-12">
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-fitora-gray-dim">
        <Link to="/" className="hover:text-fitora-white">Accueil</Link>
        <ChevronRight size={12} />
        <Link to="/boutique" className="hover:text-fitora-white">Boutique</Link>
        <ChevronRight size={12} />
        <span className="text-fitora-gray">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Galerie */}
        <div>
          <motion.div
            key={activeImage}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            className="aspect-square overflow-hidden rounded-2xl bg-fitora-charcoal"
          >
            <img
              src={product.images[activeImage]}
              alt={product.name}
              className="h-full w-full cursor-zoom-in object-cover transition-transform duration-300 hover:scale-110"
            />
          </motion.div>
          <div className="mt-3 flex gap-3">
            {product.images.map((image, i) => (
              <button
                key={image}
                onClick={() => setActiveImage(i)}
                className={cn(
                  "h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl ring-2 transition-all",
                  activeImage === i ? "ring-fitora-green" : "ring-transparent opacity-70"
                )}
              >
                <img src={image} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Informations */}
        <div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {getDisplayBadges(product).map((b) => (
              <Badge key={b} type={b} />
            ))}
          </div>
          <p className="text-xs uppercase tracking-wide text-fitora-gray">{product.categoryName}</p>
          <h1 className="mt-1 font-display text-2xl font-bold md:text-3xl">{product.name}</h1>

          <div className="mt-2">
            <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-3xl font-extrabold text-fitora-green">
              {formatFCFA(product.price)}
            </span>
            {product.oldPrice && (
              <span className="text-lg text-fitora-gray-dim line-through">
                {formatFCFA(product.oldPrice)}
              </span>
            )}
            {discount && (
              <span className="rounded-full bg-fitora-green/10 px-2 py-0.5 text-sm font-semibold text-fitora-green">
                -{discount}%
              </span>
            )}
          </div>

          <p className="mt-5 text-sm leading-relaxed text-fitora-gray">{product.description}</p>

          {colors.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold">Couleur : <span className="font-normal text-fitora-gray">{color}</span></p>
              <div className="flex gap-2">
                {colors.map((c) => {
                  const variantForColor = product.variants.find((v) => v.color === c);
                  return (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      aria-label={c}
                      className={cn(
                        "h-9 w-9 rounded-full ring-2 ring-offset-2 ring-offset-fitora-black transition-all",
                        color === c ? "ring-fitora-green" : "ring-fitora-border"
                      )}
                      style={{ backgroundColor: variantForColor?.colorHex ?? "#333" }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {hasSizes && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold">Taille</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={cn(
                      "h-10 min-w-[2.5rem] rounded-lg border px-3 text-sm font-medium transition-colors",
                      size === s
                        ? "border-fitora-green bg-fitora-green text-fitora-black"
                        : "border-fitora-border text-fitora-gray hover:border-fitora-gray"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasShoeSizes && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold">Pointure</p>
              <div className="flex flex-wrap gap-2">
                {shoeSizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setShoeSize(s)}
                    className={cn(
                      "h-10 min-w-[2.5rem] rounded-lg border px-3 text-sm font-medium transition-colors",
                      shoeSize === s
                        ? "border-fitora-green bg-fitora-green text-fitora-black"
                        : "border-fitora-border text-fitora-gray hover:border-fitora-gray"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-4">
            <p className="text-sm font-semibold">Quantité</p>
            <div className="flex items-center gap-3 rounded-full border border-fitora-border px-3 py-1.5">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Diminuer">
                <Minus size={14} />
              </button>
              <span className="w-5 text-center text-sm">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(availableStock || q, q + 1))}
                aria-label="Augmenter"
              >
                <Plus size={14} />
              </button>
            </div>
            <span className="text-xs text-fitora-gray">
              {availableStock > 0 ? `${availableStock} en stock` : "Rupture de stock"}
            </span>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="flex-1" onClick={handleAddToCart} disabled={availableStock <= 0}>
              Ajouter au panier
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="flex-1"
              onClick={handleBuyNow}
              disabled={availableStock <= 0}
            >
              Acheter maintenant
            </Button>
            <button
              onClick={() => toggleFavorite(product.id)}
              aria-label="Favoris"
              className={cn(
                "flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border transition-colors",
                isFavorite ? "border-fitora-green bg-fitora-green/10 text-fitora-green" : "border-fitora-border text-fitora-gray"
              )}
            >
              <Heart size={20} className={isFavorite ? "fill-fitora-green" : ""} />
            </button>
          </div>

          <a
            href={buildWhatsAppLink(whatsappProductMessage(product.name))}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 rounded-full border border-fitora-border py-3.5 text-sm font-semibold text-fitora-white transition-colors hover:border-fitora-green hover:text-fitora-green"
          >
            <MessageCircle size={16} /> Contacter FITORA sur WhatsApp
          </a>

          {product.features.length > 0 && (
            <div className="mt-8 border-t border-fitora-border pt-6">
              <p className="mb-3 font-display text-sm font-semibold">Caractéristiques</p>
              <ul className="space-y-1.5">
                {product.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-fitora-gray">
                    <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-fitora-green" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Avis */}
      {product.reviews.length > 0 && (
        <div className="mt-16 border-t border-fitora-border pt-10">
          <h2 className="mb-6 font-display text-xl font-bold">Avis clients</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {product.reviews.map((r) => (
              <div key={r.id} className="rounded-2xl bg-fitora-charcoal p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{r.author}</p>
                  <RatingStars rating={r.rating} showCount={false} size={13} />
                </div>
                <p className="mt-2 text-sm text-fitora-gray">{r.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Produits similaires */}
      {related.length > 0 && (
        <div className="mt-16 border-t border-fitora-border pt-10">
          <h2 className="mb-6 font-display text-xl font-bold">Produits similaires</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductPageSkeleton() {
  return (
    <div className="container-fitora py-8 md:py-12">
      <div className="grid gap-10 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
