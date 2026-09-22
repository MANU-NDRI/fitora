import { supabase } from "@/lib/supabase";
import { mapProduct, invalidateProductsCache } from "@/services/productService";
import type { Product, ProductVariant, Sport } from "@/types";
import { slugify } from "@/lib/format";

export type ProductInput = Omit<
  Product,
  "id" | "slug" | "reviews" | "reviewCount" | "rating" | "createdAt" | "salesCount" | "categoryName"
>;

type ProductInsert = {
  slug: string;
  name: string;
  category_id: string;
  sport: Sport;
  description: string;
  features: string[];
  price: number;
  old_price: number | null;
  published: boolean;
  out_of_stock_override: boolean;
};

async function fetchProduct(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "*, categories(*), product_images(*), product_variants(*), product_reviews(*)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapProduct(data as never) : null;
}

export async function adminGetProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "*, categories(*), product_images(*), product_variants(*), product_reviews(*)"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

return ((data ?? []) as unknown as Parameters<typeof mapProduct>[0][]).map(
  (row) => mapProduct(row)
  );
}

export async function adminGetProduct(id: string): Promise<Product | null> {
  return fetchProduct(id);
}

function productPayload(input: ProductInput, slug: string): ProductInsert {
  return {
    slug,
    name: input.name.trim(),
    category_id: input.categoryId,
    sport: input.sport,
    description: input.description,
    features: input.features,
    price: input.price,
    old_price: input.oldPrice ?? null,
    published: input.published,
    out_of_stock_override: input.outOfStockOverride ?? false,
  };
}

/**
 * Génère un slug unique dans Supabase.
 *
 * Exemple :
 * produit-test
 * produit-test-2
 * produit-test-3
 */
async function createUniqueSlug(
  name: string,
  excludeProductId?: string
): Promise<string> {
  const baseSlug = slugify(name).trim() || `produit-${Date.now()}`;

  let candidate = baseSlug;
  let counter = 2;

  while (true) {
    let query = supabase
      .from("products")
      .select("id")
      .eq("slug", candidate)
      .limit(1);

    if (excludeProductId) {
      query = query.neq("id", excludeProductId);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (!data || data.length === 0) {
      return candidate;
    }

    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

/**
 * Génère un SKU unique dans Supabase.
 *
 * Si l'admin saisit SKU-1 et que SKU-1 existe déjà :
 * SKU-1-2
 * SKU-1-3
 * etc.
 */
async function createUniqueSku(
  sku: string,
  usedSkus: Set<string>
): Promise<string> {
  const baseSku = sku.trim() || `FITORA-${Date.now()}`;

  let candidate = baseSku;
  let counter = 2;

  while (true) {
    if (usedSkus.has(candidate.toLowerCase())) {
      candidate = `${baseSku}-${counter}`;
      counter += 1;
      continue;
    }

    const { data, error } = await supabase
      .from("product_variants")
      .select("id")
      .eq("sku", candidate)
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      usedSkus.add(candidate.toLowerCase());
      return candidate;
    }

    candidate = `${baseSku}-${counter}`;
    counter += 1;
  }
}

async function syncChildren(
  productId: string,
  input: ProductInput
): Promise<void> {
  const { error: imageDeleteError } = await supabase
    .from("product_images")
    .delete()
    .eq("product_id", productId);

  if (imageDeleteError) throw imageDeleteError;

  if (input.images.length) {
    const { error } = await supabase
      .from("product_images")
      .insert(
        input.images.map((url, position) => ({
          product_id: productId,
          url,
          position,
        }))
      );

    if (error) throw error;
  }

  /*
   * On supprime d'abord les anciennes variantes du produit.
   * Cela permet notamment de conserver leurs anciens SKU lors
   * d'une modification du produit.
   */
  const { error: variantDeleteError } = await supabase
    .from("product_variants")
    .delete()
    .eq("product_id", productId);

  if (variantDeleteError) throw variantDeleteError;

  if (input.variants.length) {
    const usedSkus = new Set<string>();

    const rows = [];

    for (const variant of input.variants) {
      const uniqueSku = await createUniqueSku(
        variant.sku,
        usedSkus
      );

      rows.push({
        product_id: productId,
        size: variant.size ?? null,
        color: variant.color ?? null,
        color_hex: variant.colorHex ?? null,
        shoe_size: variant.shoeSize ?? null,
        stock_available: variant.stockAvailable,
        stock_reserved: variant.stockReserved,
        sku: uniqueSku,
      });
    }

    const { error } = await supabase
      .from("product_variants")
      .insert(rows);

    if (error) {
      throw new Error(
        `Enregistrement des variantes impossible : ${error.message}`
      );
    }
  }
}

export async function adminCreateProduct(
  input: ProductInput
): Promise<Product> {
  const slug = await createUniqueSlug(input.name);

  const { data, error } = await supabase
    .from("products")
    .insert(productPayload(input, slug))
    .select("id")
    .single();

  if (error) throw error;

  await syncChildren(data.id, input);

  const product = await fetchProduct(data.id);

  if (!product) {
    throw new Error(
      "Produit créé mais impossible à relire."
    );
  }

  // Le catalogue vu par les clients (Accueil, Boutique) est mis en cache
  // côté productService : on l'invalide immédiatement pour que ce nouveau
  // produit apparaisse sans attendre l'expiration naturelle du cache.
  invalidateProductsCache();

  return product;
}

export async function adminUpdateProduct(
  id: string,
  input: Partial<ProductInput>
): Promise<Product | null> {
  const current = await fetchProduct(id);

  if (!current) return null;

  const merged: ProductInput = {
    categoryId: current.categoryId,
    sport: current.sport,
    description: current.description,
    features: current.features,
    images: current.images,
    price: current.price,
    oldPrice: current.oldPrice,
    variants: current.variants,
    published: current.published,
    outOfStockOverride: current.outOfStockOverride,
    name: current.name,
    badges: current.badges,
  };

  const next = {
    ...merged,
    ...input,
  };

  const slug = await createUniqueSlug(next.name, id);

  const { error } = await supabase
    .from("products")
    .update(productPayload(next, slug))
    .eq("id", id);

  if (error) throw error;

  await syncChildren(id, next);

  invalidateProductsCache();

  return fetchProduct(id);
}

export async function adminDeleteProduct(
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) throw error;

  invalidateProductsCache();
}

export async function adminTogglePublish(
  id: string
): Promise<Product | null> {
  const current = await fetchProduct(id);

  if (!current) return null;

  const { error } = await supabase
    .from("products")
    .update({
      published: !current.published,
    })
    .eq("id", id);

  if (error) throw error;

  invalidateProductsCache();

  return fetchProduct(id);
}

export async function adminToggleOutOfStock(
  id: string
): Promise<Product | null> {
  const current = await fetchProduct(id);

  if (!current) return null;

  const { error } = await supabase
    .from("products")
    .update({
      out_of_stock_override: !current.outOfStockOverride,
    })
    .eq("id", id);

  if (error) throw error;

  invalidateProductsCache();

  return fetchProduct(id);
}

export async function adminUpdateVariantStock(
  productId: string,
  variantId: string,
  updates: Partial<
    Pick<ProductVariant, "stockAvailable" | "stockReserved">
  >
): Promise<Product | null> {
  const payload: {
    stock_available?: number;
    stock_reserved?: number;
  } = {};

  if (updates.stockAvailable !== undefined) {
    payload.stock_available = updates.stockAvailable;
  }

  if (updates.stockReserved !== undefined) {
    payload.stock_reserved = updates.stockReserved;
  }

  const { error } = await supabase
    .from("product_variants")
    .update(payload)
    .eq("id", variantId)
    .eq("product_id", productId);

  if (error) throw error;

  invalidateProductsCache();

  return fetchProduct(productId);
}

export function recomputeCategoryCounts(): void {
  // Les compteurs sont dérivés de Supabase lors de chaque lecture.
}
