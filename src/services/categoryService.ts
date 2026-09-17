import type { Category } from '@/types';
import { requireSupabase } from '@/lib/supabase';
import { mapCategory } from './catalogMapper';

export async function getCategories(): Promise<Category[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('categories').select('*, products:products(count)').eq('published', true).order('order_index');
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...mapCategory(row), productCount: row.products?.[0]?.count ?? 0 }));
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const categories = await getCategories();
  return categories.find((category) => category.slug === slug) ?? null;
}
