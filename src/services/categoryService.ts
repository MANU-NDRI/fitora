import { supabase } from "@/lib/supabase";
import type { Category, Sport } from "@/types";

type CategoryRow = { id: string; slug: string; name: string; image: string; sport: Sport; order_index: number; published: boolean };
type ProductCountRow = { category_id: string | null };
function mapCategory(row: CategoryRow, productCount: number): Category { return { id: row.id, slug: row.slug, name: row.name, image: row.image, sport: row.sport, order: row.order_index, published: row.published, productCount }; }

// Cache mémoire courte (mêmes principes que productService.fetchProducts) :
// HomePage, ShopPage et CategoriesPage demandent chacune les catégories
// indépendamment, souvent au même instant lors d'une navigation. Sans cache,
// c'est jusqu'à 3 x 2 requêtes Supabase (catégories + comptage produits)
// pour afficher une seule page.
let categoriesCache: Category[] | null = null;
let categoriesCacheTime = 0;
let categoriesInFlight: Promise<Category[]> | null = null;
const CATEGORIES_CACHE_TTL = 60_000;

/**
 * À appeler après toute création/modification/suppression de catégorie côté
 * admin pour que la boutique reflète le changement immédiatement au lieu
 * d'attendre l'expiration du cache.
 */
export function invalidateCategoriesCache(): void {
  categoriesCache = null;
  categoriesCacheTime = 0;
}

export async function getCategories(options?: { forceRefresh?: boolean }): Promise<Category[]> {
  const now = Date.now();

  if (!options?.forceRefresh && categoriesCache && now - categoriesCacheTime < CATEGORIES_CACHE_TTL) {
    return categoriesCache;
  }

  if (!options?.forceRefresh && categoriesInFlight) {
    return categoriesInFlight;
  }

  categoriesInFlight = (async () => {
    const [{ data, error }, { data: products, error: productsError }] = await Promise.all([supabase.from("categories").select("*").eq("published", true).order("order_index"), supabase.from("products").select("category_id").eq("published", true)]);
    if (error) throw error; if (productsError) throw productsError;
    const counts = new Map<string, number>(); ((products ?? []) as unknown as ProductCountRow[]).forEach((p) => { if (p.category_id) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1); });
    const categories = ((data ?? []) as unknown as CategoryRow[]).map((row) => mapCategory(row, counts.get(row.id) ?? 0));

    categoriesCache = categories;
    categoriesCacheTime = now;

    return categories;
  })();

  try {
    return await categoriesInFlight;
  } finally {
    categoriesInFlight = null;
  }
}
export async function getCategoryBySlug(slug: string): Promise<Category | null> { const categories = await getCategories(); return categories.find((category) => category.slug === slug) ?? null; }
