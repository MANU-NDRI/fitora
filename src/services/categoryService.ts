import type { Category } from '@/types';
import { requireSupabase } from '@/lib/supabase';
import { mapCategory, type CategoryRow } from './catalogMapper';

export async function getCategories(): Promise<Category[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('categories').select('*').eq('published', true).order('order_index');
  if (error) throw error;
  return Promise.all((data ?? []).map(async (row) => {
    const category = mapCategory(row as CategoryRow);
    const { count, error: countError } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('category_id', category.id).eq('published', true);
    if (countError) throw countError;
    return { ...category, productCount: count ?? 0 };
  }));
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const categories = await getCategories();
  return categories.find((category) => category.slug === slug) ?? null;
}
