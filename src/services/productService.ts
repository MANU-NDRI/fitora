import { supabase } from "@/lib/supabase";
import type { Product, ProductBadge, ProductFilters, SortOption, Sport } from "@/types";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category_id: string | null;
  sport: Sport;
  description: string | null;
  features: string[] | null;
  price: number | string;
  old_price: number | string | null;
  rating: number | string | null;
  review_count: number | null;
  sales_count: number | null;
  published: boolean;
  out_of_stock_override: boolean;
  created_at: string;
  categories: CategoryRow | CategoryRow[] | null;
  product_images: ImageRow[] | null;
  product_variants: VariantRow[] | null;
  product_reviews: ReviewRow[] | null;
};

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  image: string;
  sport: Sport;
  order_index: number;
  published: boolean;
};

type ImageRow = { id: string; url: string; position: number };
type VariantRow = {
  id: string;
  size: string | null;
  color: string | null;
  color_hex: string | null;
  shoe_size: string | null;
  stock_available: number;
  stock_reserved: number;
  sku: string;
};
type ReviewRow = {
  id: string;
  author: string;
  rating: number;
  comment: string;
  created_at: string;
  customer_id: string | null;
  order_id: string | null;
};

function categoryOf(row: ProductRow): CategoryRow | null {
  return Array.isArray(row.categories) ? row.categories[0] ?? null : row.categories;
}

export function mapProduct(row: ProductRow): Product {
  const category = categoryOf(row);
  const images = [...(row.product_images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((image) => image.url);
  const variants = (row.product_variants ?? []).map((variant) => ({
    id: variant.id,
    size: variant.size ?? undefined,
    color: variant.color ?? undefined,
    colorHex: variant.color_hex ?? undefined,
    shoeSize: variant.shoe_size ?? undefined,
    stockAvailable: variant.stock_available,
    stockReserved: variant.stock_reserved,
    sku: variant.sku,
  }));
  const reviews = (row.product_reviews ?? []).map((review) => ({
    id: review.id,
    author: review.author,
    rating: review.rating,
    comment: review.comment,
    date: review.created_at,
    customerId: review.customer_id ?? undefined,
    orderId: review.order_id ?? undefined,
  }));

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    categoryId: row.category_id ?? "",
    categoryName: category?.name ?? "Sans catégorie",
    sport: row.sport,
    description: row.description ?? "",
    features: row.features ?? [],
    images,
    price: Number(row.price),
    oldPrice: row.old_price === null ? undefined : Number(row.old_price),
    rating: Number(row.rating ?? 0),
    reviewCount: row.review_count ?? reviews.length,
    reviews,
    variants,
    badges: [
      ...(row.old_price !== null ? (["promo"] as ProductBadge[]) : []),
      ...(row.out_of_stock_override || !variants.some((v) => v.stockAvailable - v.stockReserved > 0)
        ? (["rupture"] as ProductBadge[])
        : []),
    ],
    published: row.published,
    createdAt: row.created_at,
    salesCount: row.sales_count ?? 0,
    outOfStockOverride: row.out_of_stock_override,
  };
}

function isInStock(product: Product): boolean {
  return !product.outOfStockOverride && product.variants.some((v) => v.stockAvailable - v.stockReserved > 0);
}

export function getDisplayBadges(product: Product): ProductBadge[] {
  const base = product.badges.filter((badge) => badge !== "rupture");
  return isInStock(product) ? base : [...base, "rupture"];
}

function sortProducts(products: Product[], sort?: SortOption): Product[] {
  const list = [...products];
  switch (sort) {
    case "popular": return list.sort((a, b) => b.reviewCount - a.reviewCount);
    case "best-selling": return list.sort((a, b) => b.salesCount - a.salesCount);
    case "price-asc": return list.sort((a, b) => a.price - b.price);
    case "price-desc": return list.sort((a, b) => b.price - a.price);
    case "top-rated": return list.sort((a, b) => b.rating - a.rating);
    default: return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export interface PaginatedProducts { items: Product[]; total: number; page: number; pageSize: number; totalPages: number }

async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(*), product_images(*), product_variants(*), product_reviews(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as ProductRow[]).map(mapProduct);
}

export async function getProducts(filters: ProductFilters = {}, page = 1, pageSize = 12): Promise<PaginatedProducts> {
  let list = (await fetchProducts()).filter((product) => product.published);
  const query = filters.search?.trim().toLowerCase();
  if (query) list = list.filter((p) => p.name.toLowerCase().includes(query) || p.categoryName.toLowerCase().includes(query) || p.description.toLowerCase().includes(query));
  if (filters.categorySlug) list = list.filter((p) => p.slug !== "" && p.categoryId !== "" && p.categoryName && p.categoryId && p.categoryName.toLowerCase() !== "");
  if (filters.sport) list = list.filter((p) => p.sport === filters.sport);
  if (filters.priceMin !== undefined) list = list.filter((p) => p.price >= filters.priceMin!);
  if (filters.priceMax !== undefined) list = list.filter((p) => p.price <= filters.priceMax!);
  if (filters.sizes?.length) list = list.filter((p) => p.variants.some((v) => v.size && filters.sizes!.includes(v.size)));
  if (filters.shoeSizes?.length) list = list.filter((p) => p.variants.some((v) => v.shoeSize && filters.shoeSizes!.includes(v.shoeSize)));
  if (filters.colors?.length) list = list.filter((p) => p.variants.some((v) => v.color && filters.colors!.includes(v.color)));
  if (filters.inStockOnly) list = list.filter(isInStock);
  if (filters.onSaleOnly) list = list.filter((p) => p.oldPrice !== undefined);
  if (filters.categorySlug) {
    const { data: category } = await supabase.from("categories").select("id").eq("slug", filters.categorySlug).maybeSingle();
    list = category ? list.filter((p) => p.categoryId === category.id) : [];
  }
  list = sortProducts(list, filters.sort);
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { items: list.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, totalPages };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase.from("products").select("*, categories(*), product_images(*), product_variants(*), product_reviews(*)").eq("slug", slug).eq("published", true).maybeSingle();
  if (error) throw error;
  return data ? mapProduct(data as unknown as ProductRow) : null;
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("products").select("*, categories(*), product_images(*), product_variants(*), product_reviews(*)").in("id", ids).eq("published", true);
  if (error) throw error;
  return ((data ?? []) as unknown as ProductRow[]).map(mapProduct);
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const { items } = await getProducts({}, 1, 1000);
  return items.filter((candidate) => candidate.id !== product.id).sort((a, b) => (b.categoryId === product.categoryId ? 1 : 0) - (a.categoryId === product.categoryId ? 1 : 0) || b.salesCount - a.salesCount).slice(0, limit);
}
export async function getNewArrivals(limit = 8): Promise<Product[]> { return (await getProducts({ sort: "recent" }, 1, limit)).items; }
export async function getPopularProducts(limit = 8): Promise<Product[]> { return (await getProducts({ sort: "popular" }, 1, limit)).items; }
export async function getPromotions(limit = 8): Promise<Product[]> { return (await getProducts({ onSaleOnly: true }, 1, limit)).items; }
export function getAvailableSizes(products: Product[]): string[] { return [...new Set(products.flatMap((p) => p.variants.flatMap((v) => v.size ? [v.size] : [])))]; }
export function getAvailableShoeSizes(products: Product[]): string[] { return [...new Set(products.flatMap((p) => p.variants.flatMap((v) => v.shoeSize ? [v.shoeSize] : [])))].sort(); }
export function getAvailableColors(products: Product[]): string[] { return [...new Set(products.flatMap((p) => p.variants.flatMap((v) => v.color ? [v.color] : [])))]; }
export { isInStock };
