import type { Category } from "@/types";
import { CATEGORIES } from "@/services/mockData";
import { persistCategories } from "@/services/adminDataStore";
import { slugify } from "@/lib/format";

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function adminGetCategories(): Promise<Category[]> {
  return delay([...CATEGORIES].sort((a, b) => a.order - b.order));
}

export type CategoryInput = Omit<Category, "id" | "slug" | "productCount">;

export async function adminCreateCategory(input: CategoryInput): Promise<Category> {
  const category: Category = {
    ...input,
    id: `cat-${Date.now()}`,
    slug: slugify(input.name),
    productCount: 0,
  };
  CATEGORIES.push(category);
  persistCategories();
  return delay(category);
}

export async function adminUpdateCategory(id: string, input: Partial<CategoryInput>): Promise<Category | null> {
  const index = CATEGORIES.findIndex((c) => c.id === id);
  if (index === -1) return delay(null);
  CATEGORIES[index] = {
    ...CATEGORIES[index],
    ...input,
    slug: input.name ? slugify(input.name) : CATEGORIES[index].slug,
  };
  persistCategories();
  return delay(CATEGORIES[index]);
}

export async function adminDeleteCategory(id: string): Promise<void> {
  const index = CATEGORIES.findIndex((c) => c.id === id);
  if (index !== -1) CATEGORIES.splice(index, 1);
  persistCategories();
  return delay(undefined);
}

export async function adminTogglePublishCategory(id: string): Promise<Category | null> {
  const category = CATEGORIES.find((c) => c.id === id);
  if (!category) return delay(null);
  category.published = !category.published;
  persistCategories();
  return delay(category);
}
