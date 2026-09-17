import { PRODUCTS, CATEGORIES } from "@/services/mockData";
import type { Product, Category } from "@/types";

// ---------------------------------------------------------------------------
// Tant que Supabase n'est pas branché, les modifications faites par
// l'administrateur (produits/catégories) sont persistées dans le
// localStorage du navigateur et rechargées au démarrage, par-dessus les
// données de démonstration. Cela permet de tester tout le cycle
// création → modification → publication sans backend réel.
// Une fois Supabase branché, ce fichier n'est plus nécessaire : les
// services liront/écriront directement dans PostgreSQL.
// ---------------------------------------------------------------------------

const PRODUCTS_KEY = "fitora-admin-products";
const CATEGORIES_KEY = "fitora-admin-categories";

export function initPersistedCatalog() {
  try {
    const rawProducts = localStorage.getItem(PRODUCTS_KEY);
    if (rawProducts) {
      const saved: Product[] = JSON.parse(rawProducts);
      PRODUCTS.length = 0;
      PRODUCTS.push(...saved);
    }
  } catch {
    // ignore corrupted storage
  }

  try {
    const rawCategories = localStorage.getItem(CATEGORIES_KEY);
    if (rawCategories) {
      const saved: Category[] = JSON.parse(rawCategories);
      CATEGORIES.length = 0;
      CATEGORIES.push(...saved);
    }
  } catch {
    // ignore corrupted storage
  }
}

export function persistProducts() {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(PRODUCTS));
}

export function persistCategories() {
  recomputeCategoryCounts();
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(CATEGORIES));
}

export function recomputeCategoryCounts() {
  CATEGORIES.forEach((c) => {
    c.productCount = PRODUCTS.filter((p) => p.categoryId === c.id && p.published).length;
  });
}
