import { supabase } from "@/lib/supabase";
import type { Category, Sport } from "@/types";

type CategoryRow = { id: string; slug: string; name: string; image: string; sport: Sport; order_index: number; published: boolean };
type ProductCountRow = { category_id: string | null };
function mapCategory(row: CategoryRow, productCount: number): Category { return { id: row.id, slug: row.slug, name: row.name, image: row.image, sport: row.sport, order: row.order_index, published: row.published, productCount }; }
export async function getCategories(): Promise<Category[]> {
  const [{ data, error }, { data: products, error: productsError }] = await Promise.all([supabase.from("categories").select("*").eq("published", true).order("order_index"), supabase.from("products").select("category_id").eq("published", true)]);
  if (error) throw error; if (productsError) throw productsError;
  const counts = new Map<string, number>(); ((products ?? []) as unknown as ProductCountRow[]).forEach((p) => { if (p.category_id) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1); });
  return ((data ?? []) as unknown as CategoryRow[]).map((row) => mapCategory(row, counts.get(row.id) ?? 0));
}
export async function getCategoryBySlug(slug: string): Promise<Category | null> { const categories = await getCategories(); return categories.find((category) => category.slug === slug) ?? null; }
