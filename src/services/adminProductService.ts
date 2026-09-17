import type { Product, ProductVariant } from '@/types';
import { requireSupabase } from '@/lib/supabase';
import { mapProduct } from './catalogMapper';
import { slugify } from '@/lib/format';

export type ProductInput = Omit<Product, 'id' | 'slug' | 'reviews' | 'reviewCount' | 'rating' | 'createdAt' | 'salesCount'>;
const SELECT = '*, categories!inner(id,slug,name,sport,image,order_index,published), product_images(id,url,position), product_variants(id,size,color,color_hex,shoe_size,stock_available,stock_reserved,sku), product_reviews(id,author,rating,comment,created_at,customer_id,order_id)';

async function readProduct(id: string): Promise<Product | null> {
  const { data, error } = await requireSupabase().from('products').select(SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapProduct(data) : null;
}

function productPayload(input: Partial<ProductInput>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!['images', 'variants', 'badges', 'categoryName', 'reviews', 'maxStock'].includes(key)) payload[key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)] = value;
  }
  return payload;
}

async function syncChildren(productId: string, input: Partial<ProductInput>): Promise<void> {
  const supabase = requireSupabase();
  if (input.images) {
    await supabase.from('product_images').delete().eq('product_id', productId);
    const { error } = await supabase.from('product_images').insert(input.images.map((url, position) => ({ product_id: productId, url, position })));
    if (error) throw error;
  }
  if (input.variants) {
    await supabase.from('product_variants').delete().eq('product_id', productId);
    const { error } = await supabase.from('product_variants').insert(input.variants.map((variant) => ({ product_id: productId, size: variant.size ?? null, color: variant.color ?? null, color_hex: variant.colorHex ?? null, shoe_size: variant.shoeSize ?? null, stock_available: variant.stockAvailable, sku: variant.sku })));
    if (error) throw error;
  }
}

export async function adminGetProducts(): Promise<Product[]> {
  const { data, error } = await requireSupabase().from('products').select(SELECT).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}
export async function adminGetProduct(id: string): Promise<Product | null> { return readProduct(id); }
export async function adminCreateProduct(input: ProductInput): Promise<Product> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('products').insert({ ...productPayload(input), slug: slugify(input.name) }).select('id').single();
  if (error) throw error;
  await syncChildren(data.id, input);
  return (await readProduct(data.id))!;
}
export async function adminUpdateProduct(id: string, input: Partial<ProductInput>): Promise<Product | null> {
  const supabase = requireSupabase();
  const payload = productPayload(input);
  if (input.name) payload.slug = slugify(input.name);
  if (Object.keys(payload).length) {
    const { error } = await supabase.from('products').update(payload).eq('id', id);
    if (error) throw error;
  }
  await syncChildren(id, input);
  return readProduct(id);
}
export async function adminDeleteProduct(id: string): Promise<void> {
  const { error } = await requireSupabase().from('products').delete().eq('id', id);
  if (error) throw error;
}
export async function adminTogglePublish(id: string): Promise<Product | null> {
  const current = await readProduct(id);
  if (!current) return null;
  const { error } = await requireSupabase().from('products').update({ published: !current.published }).eq('id', id);
  if (error) throw error;
  return readProduct(id);
}
export async function adminToggleOutOfStock(id: string): Promise<Product | null> {
  const current = await readProduct(id);
  if (!current) return null;
  const { error } = await requireSupabase().from('products').update({ out_of_stock_override: !current.outOfStockOverride }).eq('id', id);
  if (error) throw error;
  return readProduct(id);
}
export async function adminUpdateVariantStock(productId: string, variantId: string, updates: Partial<Pick<ProductVariant, 'stockAvailable'>>): Promise<Product | null> {
  const { error } = await requireSupabase().from('product_variants').update({ stock_available: updates.stockAvailable }).eq('id', variantId).eq('product_id', productId);
  if (error) throw error;
  return readProduct(productId);
}
export { recomputeCategoryCounts } from './adminDataStore';
