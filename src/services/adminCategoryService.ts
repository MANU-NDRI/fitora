import { supabase } from "@/lib/supabase";
import type { Category, Sport } from "@/types";
import { slugify } from "@/lib/format";
import { invalidateCategoriesCache } from "@/services/categoryService";

type CategoryRow = { id: string; slug: string; name: string; image: string; sport: Sport; order_index: number; published: boolean };
type CategoryCountRow = { category_id: string | null; published: boolean };
export type CategoryInput = Omit<Category, "id" | "slug" | "productCount">;

function mapCategory(row: CategoryRow, productCount = 0): Category { return { id: row.id, slug: row.slug, name: row.name, image: row.image, sport: row.sport, order: row.order_index, published: row.published, productCount }; }

export async function adminGetCategories(): Promise<Category[]> {
  const [{ data, error }, { data: products, error: productsError }] = await Promise.all([
    supabase.from("categories").select("*").order("order_index"),
    supabase.from("products").select("category_id, published"),
  ]);
  if (error) throw error; if (productsError) throw productsError;
  const counts = new Map<string, number>();
  ((products ?? []) as unknown as CategoryCountRow[]).forEach((product) => { if (product.category_id && product.published) counts.set(product.category_id, (counts.get(product.category_id) ?? 0) + 1); });
  return ((data ?? []) as unknown as CategoryRow[]).map((row) => mapCategory(row, counts.get(row.id) ?? 0));
}
export async function adminCreateCategory(input: CategoryInput): Promise<Category> {
  const { data, error } = await supabase.from("categories").insert({ slug: slugify(input.name), name: input.name.trim(), image: input.image, sport: input.sport, order_index: input.order, published: input.published }).select("*").single();
  if (error) throw error;
  invalidateCategoriesCache();
  return mapCategory(data as unknown as CategoryRow);
}
export async function adminUpdateCategory(id: string, input: Partial<CategoryInput>): Promise<Category | null> {
  const payload: Record<string, string | number | boolean> = {};
  if (input.name !== undefined) { payload.name = input.name.trim(); payload.slug = slugify(input.name); }
  if (input.image !== undefined) payload.image = input.image;
  if (input.sport !== undefined) payload.sport = input.sport;
  if (input.order !== undefined) payload.order_index = input.order;
  if (input.published !== undefined) payload.published = input.published;
  const { data, error } = await supabase.from("categories").update(payload).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  invalidateCategoriesCache();
  return data ? mapCategory(data as unknown as CategoryRow) : null;
}
export async function adminDeleteCategory(id: string): Promise<void> { const { error } = await supabase.from("categories").delete().eq("id", id); if (error) throw error; invalidateCategoriesCache(); }
export async function adminTogglePublishCategory(id: string): Promise<Category | null> { const categories = await adminGetCategories(); const category = categories.find((item) => item.id === id); if (!category) return null; return adminUpdateCategory(id, { published: !category.published }); }
