import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useFavoritesStore } from "@/store/favoritesStore";
import { getProductsByIds } from "@/services/productService";
import { ProductCard } from "@/components/product/ProductCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

export function AccountFavoritesPage() {
  const productIds = useFavoritesStore((s) => s.productIds);
  const [products, setProducts] = useState<Awaited<ReturnType<typeof getProductsByIds>> | null>(null);

  useEffect(() => {
    getProductsByIds(productIds).then(setProducts);
  }, [productIds]);

  if (products === null) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/5] w-full" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-fitora-border py-16 text-center">
        <Heart size={32} className="text-fitora-gray-dim" />
        <p className="text-fitora-gray">Vous n'avez pas encore de favoris.</p>
        <Link to="/boutique">
          <Button variant="outline">Découvrir la boutique</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} index={i} />
      ))}
    </div>
  );
}
