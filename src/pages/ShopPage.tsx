import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import type { Category, Product, ProductFilters, SortOption } from "@/types";
import {
  getAvailableColors,
  getAvailableShoeSizes,
  getAvailableSizes,
  getProducts,
} from "@/services/productService";
import { getCategories } from "@/services/categoryService";
import { PRODUCTS } from "@/services/mockData";
import { ProductCard } from "@/components/product/ProductCard";
import { FiltersPanel } from "@/features/products/FiltersPanel";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Plus récent" },
  { value: "popular", label: "Plus populaire" },
  { value: "best-selling", label: "Meilleures ventes" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
  { value: "top-rated", label: "Mieux noté" },
];

const PAGE_SIZE = 12;

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Product[] | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const page = Number(searchParams.get("page") ?? "1");

  const filters: ProductFilters = useMemo(
    () => ({
      search: searchParams.get("q") ?? undefined,
      categorySlug: searchParams.get("categorie") ?? undefined,
      sport: (searchParams.get("sport") as ProductFilters["sport"]) ?? undefined,
      priceMin: searchParams.get("prixMin") ? Number(searchParams.get("prixMin")) : undefined,
      priceMax: searchParams.get("prixMax") ? Number(searchParams.get("prixMax")) : undefined,
      sizes: searchParams.get("tailles")?.split(",").filter(Boolean),
      shoeSizes: searchParams.get("pointures")?.split(",").filter(Boolean),
      colors: searchParams.get("couleurs")?.split(",").filter(Boolean),
      inStockOnly: searchParams.get("stock") === "1",
      onSaleOnly: searchParams.get("promo") === "1",
      sort: (searchParams.get("tri") as SortOption) ?? "recent",
    }),
    [searchParams]
  );

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    setItems(null);
    getProducts(filters, page, PAGE_SIZE).then((res) => {
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    });
  }, [filters, page]);

  function updateFilters(next: ProductFilters) {
    const params = new URLSearchParams();
    if (next.search) params.set("q", next.search);
    if (next.categorySlug) params.set("categorie", next.categorySlug);
    if (next.sport) params.set("sport", next.sport);
    if (next.priceMin !== undefined) params.set("prixMin", String(next.priceMin));
    if (next.priceMax !== undefined) params.set("prixMax", String(next.priceMax));
    if (next.sizes?.length) params.set("tailles", next.sizes.join(","));
    if (next.shoeSizes?.length) params.set("pointures", next.shoeSizes.join(","));
    if (next.colors?.length) params.set("couleurs", next.colors.join(","));
    if (next.inStockOnly) params.set("stock", "1");
    if (next.onSaleOnly) params.set("promo", "1");
    if (next.sort) params.set("tri", next.sort);
    setSearchParams(params);
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(p));
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const availableSizes = useMemo(() => getAvailableSizes(PRODUCTS), []);
  const availableShoeSizes = useMemo(() => getAvailableShoeSizes(PRODUCTS), []);
  const availableColors = useMemo(() => getAvailableColors(PRODUCTS), []);

  const activeFilterCount = [
    filters.categorySlug,
    filters.sport,
    filters.priceMin,
    filters.priceMax,
    filters.sizes?.length,
    filters.shoeSizes?.length,
    filters.colors?.length,
    filters.inStockOnly,
    filters.onSaleOnly,
  ].filter(Boolean).length;

  return (
    <div className="container-fitora py-8 md:py-12">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold md:text-3xl">Boutique</h1>
        <p className="text-sm text-fitora-gray">
          {filters.search ? (
            <>Résultats pour « {filters.search} » — </>
          ) : null}
          {items === null ? "Chargement..." : `${total} produit${total > 1 ? "s" : ""}`}
        </p>
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-64 flex-shrink-0 lg:block">
          <FiltersPanel
            categories={categories}
            sizes={availableSizes}
            shoeSizes={availableShoeSizes}
            colors={availableColors}
            filters={filters}
            onChange={updateFilters}
          />
        </aside>

        <div className="flex-1">
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="flex items-center gap-2 rounded-full border border-fitora-border px-4 py-2 text-sm lg:hidden"
            >
              <SlidersHorizontal size={15} />
              Filtres {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>

            <select
              value={filters.sort}
              onChange={(e) => updateFilters({ ...filters, sort: e.target.value as SortOption })}
              className="ml-auto rounded-lg border border-fitora-border bg-fitora-charcoal px-3 py-2 text-sm focus:border-fitora-green"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Trier : {opt.label}
                </option>
              ))}
            </select>
          </div>

          {items === null ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/5] w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-fitora-border py-20 text-center">
              <p className="text-fitora-gray">Aucun produit ne correspond à ces critères.</p>
              <Button variant="outline" onClick={() => updateFilters({ sort: filters.sort })}>
                Réinitialiser les filtres
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 xl:grid-cols-4">
                {items.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToPage(i + 1)}
                      className={`h-9 w-9 rounded-full text-sm font-medium transition-colors ${
                        page === i + 1
                          ? "bg-fitora-green text-fitora-black"
                          : "border border-fitora-border text-fitora-gray hover:text-fitora-white"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-[85%] max-w-sm overflow-y-auto bg-fitora-charcoal p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Filtres</h2>
              <button onClick={() => setMobileFiltersOpen(false)} aria-label="Fermer">
                <X size={22} />
              </button>
            </div>
            <FiltersPanel
              categories={categories}
              sizes={availableSizes}
              shoeSizes={availableShoeSizes}
              colors={availableColors}
              filters={filters}
              onChange={updateFilters}
            />
            <Button className="mt-6 w-full" onClick={() => setMobileFiltersOpen(false)}>
              Voir {total} résultat{total > 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
