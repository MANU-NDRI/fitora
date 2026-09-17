import type { Product, ProductVariant } from "@/types";
import { PRODUCTS as MOCK_PRODUCTS } from "@/services/mockData";
import { persistProducts, recomputeCategoryCounts } from "@/services/adminDataStore";
import { slugify } from "@/lib/format";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { mapProduct, PRODUCT_SELECT, type ProductRow } from "@/services/mappers";
import { fetchAllProducts } from "@/services/productService";

// ---------------------------------------------------------------------------
// Administration du catalogue.
// Lorsque Supabase est configuré, toutes les écritures vont en base : un
// produit créé par l'administrateur est donc immédiatement visible par tous
// les clients, sur tous les appareils. Les politiques RLS garantissent que
// seuls les comptes `role = 'admin'` peuvent écrire.
// ---------------------------------------------------------------------------

function delay<T>(value: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export type ProductInput = Omit<
  Product,
  "id" | "slug" | "reviews" | "reviewCount" | "rating" | "createdAt" | "salesCount"
>;

export async function adminGetProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured) {
    return delay(
      [...MOCK_PRODUCTS].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    );
  }
  // includeUnpublished = true : l'admin doit voir aussi les produits dépubliés.
  const all = await fetchAllProducts(true);
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function adminGetProduct(id: string): Promise<Product | null> {
  if (!isSupabaseConfigured) {
    return delay(MOCK_PRODUCTS.find((p) => p.id === id) ?? null);
  }

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Chargement du produit impossible : ${error.message}`);
  return data ? mapProduct(data as unknown as ProductRow) : null;
}

/** Réécrit images et variantes d'un produit (suppression puis insertion). */
async function replaceRelations(productId: string, images: string[], variants: ProductVariant[]) {
  const { error: deleteImagesError } = await supabase
    .from("product_images")
    .delete()
    .eq("product_id", productId);
  if (deleteImagesError) {
    throw new Error(`Remplacement des images impossible : ${deleteImagesError.message}`);
  }

  if (images.length > 0) {
    const { error } = await supabase.from("product_images").insert(
      images.map((url, position) => ({ product_id: productId, url, position }))
    );
    if (error) throw new Error(`Enregistrement des images impossible : ${error.message}`);
  }

  // Les variantes référencées par des commandes existantes ne sont pas
  // supprimées (contrainte on delete set null), on remplace donc uniquement
  // celles du produit courant.
  const { error: deleteVariantsError } = await supabase
    .from("product_variants")
    .delete()
    .eq("product_id", productId);
  if (deleteVariantsError) {
    throw new Error(
      `Remplacement des variantes impossible : ${deleteVariantsError.message}. ` +
      `Les images ont déjà été mises à jour ; le produit peut être temporairement incohérent, réessayez.`
    );
  }
  if (variants.length > 0) {
    const { error } = await supabase.from("product_variants").insert(
      variants.map((v, index) => ({
        product_id: productId,
        size: v.size || null,
        color: v.color || null,
        color_hex: v.colorHex || null,
        shoe_size: v.shoeSize || null,
        stock_available: v.stockAvailable,
        stock_reserved: v.stockReserved,
        // `sku` est UNIQUE sur toute la table : si l'admin laisse le champ
        // vide, on génère une valeur garantie unique (productId + index)
        // plutôt qu'une valeur dérivée qui pourrait entrer en collision avec
        // une autre variante vide de taille/couleur identique.
        sku: v.sku || `${productId}-${index + 1}`,
      }))
    );
    if (error) throw new Error(`Enregistrement des variantes impossible : ${error.message}`);
  }
}

export async function adminCreateProduct(input: ProductInput): Promise<Product> {
  if (!isSupabaseConfigured) {
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
    MOCK_PRODUCTS.unshift(product);
    persistProducts();
    return delay(product);
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      slug: slugify(input.name),
      name: input.name,
      category_id: input.categoryId,
      sport: input.sport,
      description: input.description,
      features: input.features,
      price: input.price,
      old_price: input.oldPrice ?? null,
      published: input.published,
      out_of_stock_override: input.outOfStockOverride ?? false,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Création du produit impossible : ${error.message}`);

  const productId = (data as { id: string }).id;
  await replaceRelations(productId, input.images, input.variants);

  const created = await adminGetProduct(productId);
  if (!created) throw new Error("Produit créé mais introuvable au rechargement.");
  return created;
}

export async function adminUpdateProduct(
  id: string,
  input: Partial<ProductInput>
): Promise<Product | null> {
  if (!isSupabaseConfigured) {
    const index = MOCK_PRODUCTS.findIndex((p) => p.id === id);
    if (index === -1) return delay(null);
    MOCK_PRODUCTS[index] = {
      ...MOCK_PRODUCTS[index],
      ...input,
      slug: input.name ? slugify(input.name) : MOCK_PRODUCTS[index].slug,
    };
    persistProducts();
    return delay(MOCK_PRODUCTS[index]);
  }

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) {
    patch.name = input.name;
    patch.slug = slugify(input.name);
  }
  if (input.categoryId !== undefined) patch.category_id = input.categoryId;
  if (input.sport !== undefined) patch.sport = input.sport;
  if (input.description !== undefined) patch.description = input.description;
  if (input.features !== undefined) patch.features = input.features;
  if (input.price !== undefined) patch.price = input.price;
  if (input.oldPrice !== undefined) patch.old_price = input.oldPrice ?? null;
  if (input.published !== undefined) patch.published = input.published;
  if (input.outOfStockOverride !== undefined) {
    patch.out_of_stock_override = input.outOfStockOverride;
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) throw new Error(`Modification du produit impossible : ${error.message}`);
  }

  if (input.images !== undefined || input.variants !== undefined) {
    const current = await adminGetProduct(id);
    if (current) {
      await replaceRelations(
        id,
        input.images ?? current.images,
        input.variants ?? current.variants
      );
    }
  }

  return adminGetProduct(id);
}

export async function adminDeleteProduct(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const index = MOCK_PRODUCTS.findIndex((p) => p.id === id);
    if (index !== -1) MOCK_PRODUCTS.splice(index, 1);
    persistProducts();
    return delay(undefined);
  }

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(`Suppression du produit impossible : ${error.message}`);
}

export async function adminTogglePublish(id: string): Promise<Product | null> {
  if (!isSupabaseConfigured) {
    const product = MOCK_PRODUCTS.find((p) => p.id === id);
    if (!product) return delay(null);
    product.published = !product.published;
    persistProducts();
    return delay(product);
  }

  const current = await adminGetProduct(id);
  if (!current) return null;
  return adminUpdateProduct(id, { published: !current.published });
}

/**
 * Permet à l'administrateur de déclarer manuellement un produit en rupture
 * de stock (ou de lever cette déclaration), indépendamment des quantités
 * réelles restantes sur les variantes.
 */
export async function adminToggleOutOfStock(id: string): Promise<Product | null> {
  if (!isSupabaseConfigured) {
    const product = MOCK_PRODUCTS.find((p) => p.id === id);
    if (!product) return delay(null);
    product.outOfStockOverride = !product.outOfStockOverride;
    persistProducts();
    return delay(product);
  }

  const current = await adminGetProduct(id);
  if (!current) return null;
  return adminUpdateProduct(id, { outOfStockOverride: !current.outOfStockOverride });
}

export async function adminUpdateVariantStock(
  productId: string,
  variantId: string,
  updates: Partial<Pick<ProductVariant, "stockAvailable" | "stockReserved">>
): Promise<Product | null> {
  if (!isSupabaseConfigured) {
    const product = MOCK_PRODUCTS.find((p) => p.id === productId);
    const variant = product?.variants.find((v) => v.id === variantId);
    if (!product || !variant) return delay(null);
    Object.assign(variant, updates);
    persistProducts();
    return delay(product);
  }

  const patch: Record<string, unknown> = {};
  if (updates.stockAvailable !== undefined) patch.stock_available = updates.stockAvailable;
  if (updates.stockReserved !== undefined) patch.stock_reserved = updates.stockReserved;

  const { error } = await supabase.from("product_variants").update(patch).eq("id", variantId);
  if (error) throw new Error(`Mise à jour du stock impossible : ${error.message}`);

  return adminGetProduct(productId);
}

export { recomputeCategoryCounts };
