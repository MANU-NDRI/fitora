import type { Category } from "@/types";
import { CATEGORIES } from "@/services/mockData";

function delay<T>(value: T, ms = 100): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function getCategories(): Promise<Category[]> {
  const list = [...CATEGORIES].filter((c) => c.published).sort((a, b) => a.order - b.order);
  return delay(list);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const category = CATEGORIES.find((c) => c.slug === slug && c.published) ?? null;
  return delay(category);
}
