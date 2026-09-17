import type { Category, Product, ProductReview, ProductVariant, Sport } from '@/types';

type CatalogRow = {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  sport: Sport;
  description: string;
  features: string[];
  price: number | string;
  old_price: number | string | null;
  rating: number | string;
  review_count: number;
  sales_count: number;
  published: boolean;
  out_of_stock_override: boolean;
  created_at: string;
  categories?: { id: string; slug: string; name: string; sport: Sport; image: string; order_index: number; published: boolean } | null;
  product_images?: Array<{ id: string; url: string; position: number }>;
  product_variants?: Array<{ id: string; size: string | null; color: string | null; color_hex: string | null; shoe_size: string | null; stock_available: number; stock_reserved: number; sku: string }>;
  product_reviews?: Array<{ id: string; author: string; rating: number; comment: string; created_at: string; customer_id: string | null; order_id: string | null }>;
};

const number = (value: number | string | null | undefined): number => Number(value ?? 0);

export function mapCategory(row: CatalogRow['categories'] | CatalogRow): Category {
  const category = 'categories' in row ? row.categories : row;
  if (!category) throw new Error('Catégorie introuvable pour ce produit.');
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    image: category.image,
    sport: category.sport,
    productCount: 0,
    order: category.order_index,
    published: category.published,
  };
}

function mapReview(review: NonNullable<CatalogRow['product_reviews']>[number]): ProductReview {
  return {
    id: review.id,
    author: review.author,
    rating: review.rating,
    comment: review.comment,
    date: review.created_at,
    customerId: review.customer_id ?? undefined,
    orderId: review.order_id ?? undefined,
  };
}

export function mapProduct(row: CatalogRow): Product {
  const category = row.categories;
  const reviews = (row.product_reviews ?? []).map(mapReview);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    categoryId: row.category_id,
    categoryName: category?.name ?? '',
    sport: row.sport,
    description: row.description,
    features: row.features ?? [],
    images: (row.product_images ?? []).sort((a, b) => a.position - b.position).map((image) => image.url),
    price: number(row.price),
    oldPrice: row.old_price === null ? undefined : number(row.old_price),
    rating: number(row.rating),
    reviewCount: row.review_count,
    reviews,
    variants: (row.product_variants ?? []).map((variant): ProductVariant => ({
      id: variant.id,
      size: variant.size ?? undefined,
      color: variant.color ?? undefined,
      colorHex: variant.color_hex ?? undefined,
      shoeSize: variant.shoe_size ?? undefined,
      stockAvailable: variant.stock_available,
      stockReserved: variant.stock_reserved,
      sku: variant.sku,
    })),
    badges: [
      ...(row.old_price !== null ? ['promo' as const] : []),
      ...(row.sales_count > 0 ? ['best-seller' as const] : []),
    ],
    published: row.published,
    createdAt: row.created_at,
    salesCount: row.sales_count,
    outOfStockOverride: row.out_of_stock_override,
  };
}
