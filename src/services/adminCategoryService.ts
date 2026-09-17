import type { Category } from '@/types';
import { requireSupabase } from '@/lib/supabase';
import { mapCategory, type CategoryRow } from './catalogMapper';
import { slugify } from '@/lib/format';

export type CategoryInput = Omit<Category, 'id' | 'slug' | 'productCount'>;

async function withCount(row: CategoryRow): Promise<Category> {
  const category = mapCategory(row);
  const { count, error } = await requireSupabase()
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', category.id)
    .eq('published', true);

  if (error) throw error;
  return { ...category, productCount: count ?? 0 };
}

export async function adminGetCategories(): Promise<Category[]> {
  const { data, error } = await requireSupabase()
    .from('categories')
    .select('id, slug, name, image, sport, order_index, published')
    .order('order_index');

  if (error) throw error;
  return Promise.all((data ?? []).map((row) => withCount(row as CategoryRow)));
}

export async function adminCreateCategory(input: CategoryInput): Promise<Category> {
  const { data, error } = await requireSupabase()
    .from('categories')
    .insert({
      slug: slugify(input.name),
      name: input.name,
      image: input.image,
      sport: input.sport,
      order_index: input.order,
      published: input.published,
    })
    .select('id, slug, name, image, sport, order_index, published')
    .single();

  if (error) throw error;
  return withCount(data as CategoryRow);
}

export async function adminUpdateCategory(id: string, input: Partial<CategoryInput>): Promise<Category | null> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) {
    payload.name = input.name;
    payload.slug = slugify(input.name);
  }
  if (input.image !== undefined) payload.image = input.image;
  if (input.sport !== undefined) payload.sport = input.sport;
  if (input.order !== undefined) payload.order_index = input.order;
  if (input.published !== undefined) payload.published = input.published;

  const { data, error } = await requireSupabase()
    .from('categories')
    .update(payload)
    .eq('id', id)
    .select('id, slug, name, image, sport, order_index, published')
    .maybeSingle();

  if (error) throw error;
  return data ? withCount(data as CategoryRow) : null;
}

export async function adminDeleteCategory(id: string): Promise<void> {
  const { error } = await requireSupabase().from('categories').delete().eq('id', id);
  if (error) throw new Error('Cette catégorie est utilisée par des produits ou ne peut pas être supprimée.');
}

export async function adminTogglePublishCategory(id: string): Promise<Category | null> {
  const supabase = requireSupabase();
  const { data: current, error: readError } = await supabase
    .from('categories')
    .select('id, slug, name, image, sport, order_index, published')
    .eq('id', id)
    .single();

  if (readError) throw readError;

  const { data, error } = await supabase
    .from('categories')
    .update({ published: !current.published })
    .eq('id', id)
    .select('id, slug, name, image, sport, order_index, published')
    .maybeSingle();

  if (error) throw error;
  return data ? withCount(data as CategoryRow) : null;
}
