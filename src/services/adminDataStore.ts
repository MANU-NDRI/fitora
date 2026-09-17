// Catalogue persistence has intentionally been removed.
// Products and categories are read and written exclusively through Supabase.
export function initPersistedCatalog(): void { /* no-op kept for backwards compatibility */ }
export function persistProducts(): void { /* no-op */ }
export function persistCategories(): void { /* no-op */ }
export function recomputeCategoryCounts(): void { /* derived from Supabase */ }
