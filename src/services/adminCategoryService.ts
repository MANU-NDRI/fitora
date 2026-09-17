import type { Category } from '@/types';
import { requireSupabase } from '@/lib/supabase';
import { mapCategory } from './catalogMapper';
import { slugify } from '@/lib/format';

export type CategoryInput = Omit<Category, 'id' | 'slug' | 'productCount'>;

const withCount = async (row: Record<string, unknown>): Promise<Category> => {
  const category = mapCategory(row as never);
  const { count, error } = await requireSupabase().from('products').select('id', { count: 'exact', head: true }).eq('category_id', category.id).eq('published', true);
  if (error) throw error;
  return { ...category, productCount: count ?? 0 };
};

export async function adminGetCategories(): Promise<Category[]> {
  const { data, error } = await requireSupabase().from('categories').select('*').order('order_index');
  if (error) throw error;
  return Promise.all((data ?? []).map((row) => withCount(row)));
}

export async function adminCreateCategory(input: CategoryInput): Promise<Category> {
  const { data, error } = await requireSupabase().from('categories').insert({ slug: slugify(input.name), name: input.name, image: input.image, sport: input.sport, order_index: input.order, published: input.published }).select('*').single();
  if (error) throw error;
  return withCount(data);
}

export async function adminUpdateCategory(id: string, input: Partial<CategoryInput>): Promise<Category | null> {
  const payload = { ...input, ...(input.name ? { slug: slugify(input.name) } : {}), ...(input.order !== undefined ? { order_index: input.order } : {}) } as Record<string, unknown>;
  delete payload.order;
  const { data, error } = await requireSupabase().from('categories').update(payload).eq('id', id).select('*').maybeSingle();
  if (error) throw error;
  return data ? withCount(data) : null;
}

export async function adminDeleteCategory(id: string): Promise<void> {
  const { error } = await requireSupabase().from('categories').delete().eq('id', id);
  if (error) throw new Error('Cette catégorie est utilisée par des produits ou ne peut pas être supprimée.');
}

export async function adminTogglePublishCategory(id: string): Promise<Category | null> {
  const supabase = requireSupabase();
  const { data: current, error: readError } = await supabase.from('categories').select('*').eq('id', id).single();
  if (readError) throw readError;
  const { data, error } = await supabase.from('categories').update({ published: !current.published }).eq('id', id).select('*').maybeSingle();
  if (error) throw error;
  return data ? withCount(data) : null;
}
