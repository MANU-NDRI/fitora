import type { Category, Product, ProductBadge, ProductReview, ProductVariant } from "@/types";

// ---------------------------------------------------------------------------
// Conversion des lignes PostgreSQL (snake_case) vers les types du domaine
// utilisés dans toute l'application (camelCase). Centraliser ces conversions
// ici évite de dupliquer le mapping dans chaque service.
// ---------------------------------------------------------------------------

const NEW_PRODUCT_DAYS = 14;
const BEST_SELLER_MIN_SALES = 100;

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  sport: string;
  description: string | null;
  features: string[] | null;
  price: number | string;
  old_price: number | string | null;
  rating: number | string | null;
  review_count: number | null;
  sales_count: number | null;
  published: boolean;
  out_of_stock_override?: boolean | null;
  created_at: string;
  categories?: { name: string } | { name: string }[] | null;
  product_images?: { url: string; position: number | null }[] | null;
  product_variants?: VariantRow[] | null;
  product_reviews?: ReviewRow[] | null;
}

export interface VariantRow {
  id: string;
  size: string | null;
  color: string | null;
  color_hex: string | null;
  shoe_size: string | null;
  stock_available: number | null;
  stock_reserved: number | null;
  sku: string;
}

export interface ReviewRow {
  id: string;
  author: string;
  rating: number;
  comment: string | null;
  created_at: string;
  customer_id?: string | null;
  order_id?: string | null;
}

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  image: string;
  sport: string;
  order_index: number | null;
  published: boolean;
}

function num(value: number | string | null | undefined, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const parsed = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function mapVariant(row: VariantRow): ProductVariant {
  return {
    id: row.id,
    size: row.size ?? undefined,
    color: row.color ?? undefined,
    colorHex: row.color_hex ?? undefined,
    shoeSize: row.shoe_size ?? undefined,
    stockAvailable: num(row.stock_available),
    stockReserved: num(row.stock_reserved),
    sku: row.sku,
  };
}

export function mapReview(row: ReviewRow): ProductReview {
  return {
    id: row.id,
    author: row.author,
    rating: num(row.rating),
    comment: row.comment ?? "",
    date: row.created_at,
    customerId: row.customer_id ?? undefined,
    orderId: row.order_id ?? undefined,
  };
}

/**
 * Les badges ne sont pas stockés en base : ils sont déduits des données du
 * produit (date d'ajout, promotion en cours, volume de ventes, stock).
 */
function deriveBadges(product: Omit<Product, "badges">): ProductBadge[] {
  const badges: ProductBadge[] = [];
  const ageDays = (Date.now() - new Date(product.createdAt).getTime()) / 86_400_000;

  if (ageDays <= NEW_PRODUCT_DAYS) badges.push("nouveau");
  if (product.oldPrice && product.oldPrice > product.price) badges.push("promo");
  if (product.salesCount >= BEST_SELLER_MIN_SALES) badges.push("best-seller");

  const inStock =
    !product.outOfStockOverride &&
    product.variants.some((v) => v.stockAvailable - v.stockReserved > 0);
  if (!inStock) badges.push("rupture");

  return badges;
}

export function mapProduct(row: ProductRow): Product {
  const categoryRelation = Array.isArray(row.categories) ? row.categories[0] : row.categories;

  const images = (row.product_images ?? [])
    .slice()
    .sort((a, b) => num(a.position) - num(b.position))
    .map((img) => img.url);

  const base: Omit<Product, "badges"> = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    categoryId: row.category_id,
    categoryName: categoryRelation?.name ?? "",
    sport: row.sport as Product["sport"],
    description: row.description ?? "",
    features: row.features ?? [],
    images: images.length > 0 ? images : ["https://picsum.photos/seed/fitora-placeholder/900/1100"],
    price: num(row.price),
    oldPrice: row.old_price === null || row.old_price === undefined ? undefined : num(row.old_price),
    rating: num(row.rating),
    reviewCount: num(row.review_count),
    reviews: (row.product_reviews ?? []).map(mapReview),
    variants: (row.product_variants ?? []).map(mapVariant),
    published: row.published,
    createdAt: row.created_at,
    salesCount: num(row.sales_count),
    outOfStockOverride: row.out_of_stock_override ?? false,
  };

  return { ...base, badges: deriveBadges(base) };
}

export function mapCategory(row: CategoryRow, productCount = 0): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    image: row.image,
    sport: row.sport as Category["sport"],
    productCount,
    order: num(row.order_index, 1),
    published: row.published,
  };
}

/** Sélection Supabase complète d'un produit avec ses relations. */
export const PRODUCT_SELECT = `
  id, slug, name, category_id, sport, description, features, price, old_price,
  rating, review_count, sales_count, published, out_of_stock_override, created_at,
  categories ( name ),
  product_images ( url, position ),
  product_variants ( id, size, color, color_hex, shoe_size, stock_available, stock_reserved, sku ),
  product_reviews ( id, author, rating, comment, created_at, customer_id, order_id )
`;
