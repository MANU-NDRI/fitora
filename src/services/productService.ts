import type { Product, ProductBadge, ProductFilters, SortOption } from '@/types';
import { requireSupabase } from '@/lib/supabase';
import { mapProduct } from './catalogMapper';

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const PRODUCT_SELECT = '*, categories!inner(id,slug,name,sport,image,order_index,published), product_images(id,url,position), product_variants(id,size,color,color_hex,shoe_size,stock_available,stock_reserved,sku), product_reviews(id,author,rating,comment,created_at,customer_id,order_id)';

function isInStock(product: Product): boolean {
  return !product.outOfStockOverride && product.variants.some((variant) => variant.stockAvailable - variant.stockReserved > 0);
}

export function getDisplayBadges(product: Product): ProductBadge[] {
  const base = product.badges.filter((badge) => badge !== 'rupture');
  return isInStock(product) ? base : [...base, 'rupture'];
}

function applyClientFilters(products: Product[], filters: ProductFilters): Product[] {
  return products.filter((product) => {
    const query = filters.search?.trim().toLowerCase();
    if (query && ![product.name, product.categoryName, product.description].some((value) => value.toLowerCase().includes(query))) return false;
    if (filters.sport && product.sport !== filters.sport) return false;
    if (filters.priceMin !== undefined && product.price < filters.priceMin) return false;
    if (filters.priceMax !== undefined && product.price > filters.priceMax) return false;
    if (filters.sizes?.length && !product.variants.some((variant) => variant.size && filters.sizes?.includes(variant.size))) return false;
    if (filters.shoeSizes?.length && !product.variants.some((variant) => variant.shoeSize && filters.shoeSizes?.includes(variant.shoeSize))) return false;
    if (filters.colors?.length && !product.variants.some((variant) => variant.color && filters.colors?.includes(variant.color))) return false;
    if (filters.inStockOnly && !isInStock(product)) return false;
    if (filters.onSaleOnly && product.oldPrice === undefined) return false;
    return true;
  });
}

function sortProducts(products: Product[], sort: SortOption = 'recent'): Product[] {
  return [...products].sort((a, b) => {
    switch (sort) {
      case 'popular': return b.reviewCount - a.reviewCount;
      case 'best-selling': return b.salesCount - a.salesCount;
      case 'price-asc': return a.price - b.price;
      case 'price-desc': return b.price - a.price;
      case 'top-rated': return b.rating - a.rating;
      default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
}

async function fetchCatalog(query: ReturnType<ReturnType<typeof requireSupabase>['from']>) {
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

export async function getProducts(filters: ProductFilters = {}, page = 1, pageSize = 12): Promise<PaginatedProducts> {
  const supabase = requireSupabase();
  let query = supabase.from('products').select(PRODUCT_SELECT).eq('published', true);
  if (filters.categorySlug) query = query.eq('categories.slug', filters.categorySlug);
  const products = sortProducts(applyClientFilters(await fetchCatalog(query), filters), filters.sort);
  const total = products.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { items: products.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, totalPages };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).eq('slug', slug).eq('published', true).maybeSingle();
  if (error) throw error;
  return data ? mapProduct(data) : null;
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (!ids.length) return [];
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).in('id', ids).eq('published', true);
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const result = await getProducts({ categorySlug: undefined, page: 1, pageSize: 100 });
  return result.items.filter((candidate) => candidate.id !== product.id && (candidate.categoryId === product.categoryId || candidate.sport === product.sport)).slice(0, limit);
}

export async function getNewArrivals(limit = 8): Promise<Product[]> { return (await getProducts({}, 1, limit)).items; }
export async function getPopularProducts(limit = 8): Promise<Product[]> { return (await getProducts({ sort: 'popular' }, 1, limit)).items; }
export async function getPromotions(limit = 8): Promise<Product[]> { return (await getProducts({ onSaleOnly: true }, 1, limit)).items; }
export function getAvailableSizes(products: Product[]): string[] { return [...new Set(products.flatMap((product) => product.variants.flatMap((variant) => variant.size ? [variant.size] : [])))]; }
export function getAvailableShoeSizes(products: Product[]): string[] { return [...new Set(products.flatMap((product) => product.variants.flatMap((variant) => variant.shoeSize ? [variant.shoeSize] : [])))].sort(); }
export function getAvailableColors(products: Product[]): string[] { return [...new Set(products.flatMap((product) => product.variants.flatMap((variant) => variant.color ? [variant.color] : [])))]; }
export { isInStock };
