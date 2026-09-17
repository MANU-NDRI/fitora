import type { Product, ProductBadge, ProductFilters, SortOption } from "@/types";
import { PRODUCTS as MOCK_PRODUCTS, CATEGORIES as MOCK_CATEGORIES } from "@/services/mockData";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { mapProduct, PRODUCT_SELECT, type ProductRow } from "@/services/mappers";

// ---------------------------------------------------------------------------
// Source des produits.
//
// En production (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY renseignées), les
// produits proviennent exclusivement de Supabase : ils sont donc identiques
// sur tous les appareils.
//
// Sans configuration Supabase (développement local sans .env), l'application
// bascule automatiquement sur le catalogue de démonstration afin de rester
// utilisable. Les signatures de toutes les fonctions sont identiques dans les
// deux cas : aucun composant appelant n'a besoin de connaître la source.
// ---------------------------------------------------------------------------

function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * Un produit est en stock si au moins une variante a une quantité
 * disponible ET que l'administrateur ne l'a pas marqué manuellement comme
 * en rupture de stock (indépendamment des quantités réelles).
 */
export function isInStock(product: Product): boolean {
  if (product.outOfStockOverride) return false;
  return product.variants.some((v) => v.stockAvailable - v.stockReserved > 0);
}

/**
 * Badges à afficher pour un produit : les badges statiques (nouveau, promo,
 * best-seller) plus le badge "rupture" calculé dynamiquement à partir du
 * stock réel et de la rupture manuelle éventuelle.
 */
export function getDisplayBadges(product: Product): ProductBadge[] {
  const base = product.badges.filter((b) => b !== "rupture");
  return isInStock(product) ? base : [...base, "rupture"];
}

export function sortProducts(products: Product[], sort?: SortOption): Product[] {
  const list = [...products];
  switch (sort) {
    case "popular":
      return list.sort((a, b) => b.reviewCount - a.reviewCount);
    case "best-selling":
      return list.sort((a, b) => b.salesCount - a.salesCount);
    case "price-asc":
      return list.sort((a, b) => a.price - b.price);
    case "price-desc":
      return list.sort((a, b) => b.price - a.price);
    case "top-rated":
      return list.sort((a, b) => b.rating - a.rating);
    case "recent":
    default:
      return list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Récupère l'intégralité du catalogue publié (avec relations).
 * Le filtrage/tri/pagination est ensuite appliqué en mémoire : le catalogue
 * FITORA reste de taille modeste et cela garantit un comportement strictement
 * identique entre la source Supabase et la source de démonstration.
 */
async function fetchAllProducts(includeUnpublished = false): Promise<Product[]> {
  if (!isSupabaseConfigured) {
    const list = includeUnpublished ? MOCK_PRODUCTS : MOCK_PRODUCTS.filter((p) => p.published);
    return delay(list.map((p) => ({ ...p })));
  }

  let query = supabase.from("products").select(PRODUCT_SELECT);
  if (!includeUnpublished) query = query.eq("published", true);

  const { data, error } = await query;
  if (error) throw new Error(`Chargement des produits impossible : ${error.message}`);

  return ((data ?? []) as unknown as ProductRow[]).map(mapProduct);
}

export { fetchAllProducts };

function applyFilters(products: Product[], filters: ProductFilters): Product[] {
  let list = products;

  if (filters.search) {
    const q = filters.search.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }
  if (filters.categorySlug) {
    list = list.filter((p) => categorySlugOf(p, products) === filters.categorySlug);
  }
  if (filters.sport) {
    list = list.filter((p) => p.sport === filters.sport);
  }
  if (filters.priceMin !== undefined) {
    list = list.filter((p) => p.price >= filters.priceMin!);
  }
  if (filters.priceMax !== undefined) {
    list = list.filter((p) => p.price <= filters.priceMax!);
  }
  if (filters.sizes?.length) {
    list = list.filter((p) => p.variants.some((v) => v.size && filters.sizes!.includes(v.size)));
  }
  if (filters.shoeSizes?.length) {
    list = list.filter((p) =>
      p.variants.some((v) => v.shoeSize && filters.shoeSizes!.includes(v.shoeSize))
    );
  }
  if (filters.colors?.length) {
    list = list.filter((p) => p.variants.some((v) => v.color && filters.colors!.includes(v.color)));
  }
  if (filters.inStockOnly) {
    list = list.filter(isInStock);
  }
  if (filters.onSaleOnly) {
    list = list.filter((p) => Boolean(p.oldPrice));
  }

  return list;
}

// Cache du slug de catégorie par identifiant, alimenté au premier besoin.
let categorySlugById: Record<string, string> = {};

function categorySlugOf(product: Product, _all: Product[]): string | undefined {
  return categorySlugById[product.categoryId];
}

/** Alimente la correspondance categoryId -> slug utilisée par le filtre catégorie. */
export function primeCategorySlugMap(entries: { id: string; slug: string }[]) {
  categorySlugById = entries.reduce<Record<string, string>>((acc, c) => {
    acc[c.id] = c.slug;
    return acc;
  }, {});
}

// Initialisation par défaut avec les catégories de démonstration ; elle est
// écrasée dès que les vraies catégories Supabase sont chargées.
primeCategorySlugMap(MOCK_CATEGORIES.map((c) => ({ id: c.id, slug: c.slug })));

export async function getProducts(
  filters: ProductFilters = {},
  page = 1,
  pageSize = 12
): Promise<PaginatedProducts> {
  const all = await fetchAllProducts();
  const filtered = sortProducts(applyFilters(all, filters), filters.sort);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return { items, total, page, pageSize, totalPages };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured) {
    return delay(MOCK_PRODUCTS.find((p) => p.slug === slug && p.published) ?? null);
  }

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error) throw new Error(`Chargement du produit impossible : ${error.message}`);
  return data ? mapProduct(data as unknown as ProductRow) : null;
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];

  if (!isSupabaseConfigured) {
    return delay(MOCK_PRODUCTS.filter((p) => ids.includes(p.id) && p.published));
  }

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .in("id", ids)
    .eq("published", true);

  if (error) throw new Error(`Chargement des produits impossible : ${error.message}`);
  return ((data ?? []) as unknown as ProductRow[]).map(mapProduct);
}

/**
 * Recommandation de produits similaires affichée sur chaque fiche produit.
 * Priorise la même catégorie, puis le même sport, puis une fourchette de prix
 * proche ; complète avec les meilleures ventes s'il manque des résultats afin
 * que la section ne soit jamais vide.
 */
export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const all = await fetchAllProducts();
  const candidates = all.filter((p) => p.id !== product.id);

  function score(p: Product): number {
    let s = 0;
    if (p.categoryId === product.categoryId) s += 3;
    if (p.sport === product.sport) s += 2;
    const priceDiff = Math.abs(p.price - product.price) / Math.max(product.price, 1);
    if (priceDiff <= 0.4) s += 1;
    return s;
  }

  const related = candidates
    .map((p) => ({ p, s: score(p) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || b.p.salesCount - a.p.salesCount)
    .map((r) => r.p)
    .slice(0, limit);

  if (related.length < limit) {
    const usedIds = new Set([product.id, ...related.map((p) => p.id)]);
    related.push(
      ...candidates
        .filter((p) => !usedIds.has(p.id))
        .sort((a, b) => b.salesCount - a.salesCount)
        .slice(0, limit - related.length)
    );
  }

  return related;
}

export async function getNewArrivals(limit = 8): Promise<Product[]> {
  const all = await fetchAllProducts();
  return sortProducts(all, "recent").slice(0, limit);
}

export async function getPopularProducts(limit = 8): Promise<Product[]> {
  const all = await fetchAllProducts();
  return sortProducts(all, "popular").slice(0, limit);
}

export async function getPromotions(limit = 8): Promise<Product[]> {
  const all = await fetchAllProducts();
  return all.filter((p) => p.oldPrice && p.oldPrice > p.price).slice(0, limit);
}

export function getAvailableSizes(products: Product[]): string[] {
  const sizes = new Set<string>();
  products.forEach((p) => p.variants.forEach((v) => v.size && sizes.add(v.size)));
  return Array.from(sizes);
}

export function getAvailableShoeSizes(products: Product[]): string[] {
  const sizes = new Set<string>();
  products.forEach((p) => p.variants.forEach((v) => v.shoeSize && sizes.add(v.shoeSize)));
  return Array.from(sizes).sort();
}

export function getAvailableColors(products: Product[]): string[] {
  const colors = new Set<string>();
  products.forEach((p) => p.variants.forEach((v) => v.color && colors.add(v.color)));
  return Array.from(colors);
}
