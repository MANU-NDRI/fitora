import type { Product, ProductVariant } from "@/types";
import { PRODUCTS } from "@/services/mockData";
import { persistProducts, recomputeCategoryCounts } from "@/services/adminDataStore";
import { slugify } from "@/lib/format";

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function adminGetProducts(): Promise<Product[]> {
  return delay([...PRODUCTS].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
}

export async function adminGetProduct(id: string): Promise<Product | null> {
  return delay(PRODUCTS.find((p) => p.id === id) ?? null);
}

export type ProductInput = Omit<
  Product,
  "id" | "slug" | "reviews" | "reviewCount" | "rating" | "createdAt" | "salesCount"
>;

export async function adminCreateProduct(input: ProductInput): Promise<Product> {
  const product: Product = {
    ...input,
    id: `prod-${Date.now()}`,
    slug: slugify(input.name),
    reviews: [],
    reviewCount: 0,
    rating: 0,
    createdAt: new Date().toISOString(),
    salesCount: 0,
  };
  PRODUCTS.unshift(product);
  persistProducts();
  return delay(product);
}

export async function adminUpdateProduct(id: string, input: Partial<ProductInput>): Promise<Product | null> {
  const index = PRODUCTS.findIndex((p) => p.id === id);
  if (index === -1) return delay(null);
  PRODUCTS[index] = {
    ...PRODUCTS[index],
    ...input,
    slug: input.name ? slugify(input.name) : PRODUCTS[index].slug,
  };
  persistProducts();
  return delay(PRODUCTS[index]);
}

export async function adminDeleteProduct(id: string): Promise<void> {
  const index = PRODUCTS.findIndex((p) => p.id === id);
  if (index !== -1) PRODUCTS.splice(index, 1);
  persistProducts();
  return delay(undefined);
}

export async function adminTogglePublish(id: string): Promise<Product | null> {
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) return delay(null);
  product.published = !product.published;
  persistProducts();
  return delay(product);
}

export async function adminUpdateVariantStock(
  productId: string,
  variantId: string,
  updates: Partial<Pick<ProductVariant, "stockAvailable" | "stockReserved">>
): Promise<Product | null> {
  const product = PRODUCTS.find((p) => p.id === productId);
  const variant = product?.variants.find((v) => v.id === variantId);
  if (!product || !variant) return delay(null);
  Object.assign(variant, updates);
  persistProducts();
  return delay(product);
}

export { recomputeCategoryCounts };
