import type { Product, ProductBadge, ProductFilters, SortOption } from "@/types";
import { PRODUCTS, CATEGORIES } from "@/services/mockData";

// ---------------------------------------------------------------------------
// Ce service simule les requêtes qui seront faites à Supabase
// (`supabase.from('products').select(...)`) une fois le backend branché.
// L'API (signatures des fonctions) ne changera pas : seule l'implémentation
// interne sera remplacée par de vrais appels réseau.
// ---------------------------------------------------------------------------

function delay<T>(value: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * Un produit est en stock si au moins une variante a une quantité
 * disponible ET que l'administrateur ne l'a pas marqué manuellement comme
 * en rupture de stock (indépendamment des quantités réelles).
 */
function isInStock(product: Product): boolean {
  if (product.outOfStockOverride) return false;
  return product.variants.some((v) => v.stockAvailable - v.stockReserved > 0);
}

/**
 * Badges à afficher pour un produit : les badges statiques (nouveau, promo,
 * best-seller) plus le badge "rupture" calculé dynamiquement à partir du
 * stock réel et de la rupture manuelle éventuelle, afin qu'il reste toujours
 * exact même après une modification de stock par l'administrateur.
 */
export function getDisplayBadges(product: Product): ProductBadge[] {
  const base = product.badges.filter((b) => b !== "rupture");
  return isInStock(product) ? base : [...base, "rupture"];
}

function sortProducts(products: Product[], sort?: SortOption): Product[] {
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

export async function getProducts(
  filters: ProductFilters = {},
  page = 1,
  pageSize = 12
): Promise<PaginatedProducts> {
  let list = PRODUCTS.filter((p) => p.published);

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
    const category = CATEGORIES.find((c) => c.slug === filters.categorySlug);
    list = list.filter((p) => p.categoryId === category?.id);
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

  list = sortProducts(list, filters.sort);

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const items = list.slice(start, start + pageSize);

  return delay({ items, total, page, pageSize, totalPages });
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const product = PRODUCTS.find((p) => p.slug === slug && p.published) ?? null;
  return delay(product);
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  const products = PRODUCTS.filter((p) => ids.includes(p.id) && p.published);
  return delay(products);
}

/**
 * Recommandation de produits similaires affichée sur chaque fiche produit
 * ("les clients ayant consulté cet article ont aussi aimé..."). Priorise la
 * même catégorie, puis le même sport, puis une fourchette de prix proche ;
 * complète avec les meilleures ventes s'il manque des résultats afin que la
 * section ne soit jamais vide.
 */
export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const candidates = PRODUCTS.filter((p) => p.id !== product.id && p.published);

  function score(p: Product): number {
    let s = 0;
    if (p.categoryId === product.categoryId) s += 3;
    if (p.sport === product.sport) s += 2;
    const priceDiff = Math.abs(p.price - product.price) / Math.max(product.price, 1);
    if (priceDiff <= 0.4) s += 1;
    return s;
  }

  const ranked = candidates
    .map((p) => ({ p, s: score(p) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || b.p.salesCount - a.p.salesCount)
    .map((r) => r.p);

  const related = ranked.slice(0, limit);

  if (related.length < limit) {
    const usedIds = new Set([product.id, ...related.map((p) => p.id)]);
    const fillers = [...candidates]
      .filter((p) => !usedIds.has(p.id))
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, limit - related.length);
    related.push(...fillers);
  }

  return delay(related);
}

export async function getNewArrivals(limit = 8): Promise<Product[]> {
  const list = sortProducts(
    PRODUCTS.filter((p) => p.published),
    "recent"
  ).slice(0, limit);
  return delay(list);
}

export async function getPopularProducts(limit = 8): Promise<Product[]> {
  const list = sortProducts(
    PRODUCTS.filter((p) => p.published),
    "popular"
  ).slice(0, limit);
  return delay(list);
}

export async function getPromotions(limit = 8): Promise<Product[]> {
  const list = PRODUCTS.filter((p) => p.published && p.oldPrice).slice(0, limit);
  return delay(list);
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

export { isInStock };
