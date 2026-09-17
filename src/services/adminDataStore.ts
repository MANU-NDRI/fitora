export function initPersistedCatalog(): void {
  // Catalogue state belongs to Supabase. Kept as a no-op for compatibility with existing imports.
}
export function persistProducts(): void { /* Catalogue mutations are persisted by Supabase services. */ }
export function persistCategories(): void { /* Catalogue mutations are persisted by Supabase services. */ }
export function recomputeCategoryCounts(): void { /* Counts are queried from PostgreSQL. */ }
