import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Category } from "@/types";
import { getCategories } from "@/services/categoryService";
import { Skeleton } from "@/components/ui/Skeleton";

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  return (
    <div className="container-fitora py-8 md:py-12">
      <h1 className="mb-8 font-display text-2xl font-bold md:text-3xl">Toutes les catégories</h1>

      {!categories ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/categorie/${cat.slug}`}
              className="group relative block aspect-square overflow-hidden rounded-2xl bg-fitora-charcoal ring-1 ring-fitora-border transition-all hover:ring-fitora-green/50"
            >
              <img
                src={cat.image}
                alt={cat.name}
                loading="lazy"
                className="h-full w-full object-cover opacity-70 transition-all duration-500 group-hover:scale-110 group-hover:opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="font-display text-base font-bold">{cat.name}</p>
                <p className="text-xs text-fitora-gray">{cat.productCount} produits</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
