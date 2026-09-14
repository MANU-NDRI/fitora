import type { Category, ProductFilters } from "@/types";
import { cn } from "@/lib/cn";

const SPORTS: { value: NonNullable<ProductFilters["sport"]>; label: string }[] = [
  { value: "football", label: "Football" },
  { value: "basketball", label: "Basketball" },
  { value: "running", label: "Running" },
  { value: "fitness", label: "Fitness" },
  { value: "training", label: "Training" },
  { value: "tennis", label: "Tennis" },
  { value: "combat", label: "Sports de combat" },
];

export function FiltersPanel({
  categories,
  sizes,
  shoeSizes,
  colors,
  filters,
  onChange,
}: {
  categories: Category[];
  sizes: string[];
  shoeSizes: string[];
  colors: string[];
  filters: ProductFilters;
  onChange: (next: ProductFilters) => void;
}) {
  return (
    <div className="space-y-7">
      <FilterGroup title="Catégorie">
        <div className="flex flex-col gap-1.5">
          <Chip
            active={!filters.categorySlug}
            onClick={() => onChange({ ...filters, categorySlug: undefined })}
            label="Toutes les catégories"
          />
          {categories.map((c) => (
            <Chip
              key={c.id}
              active={filters.categorySlug === c.slug}
              onClick={() => onChange({ ...filters, categorySlug: c.slug })}
              label={`${c.name} (${c.productCount})`}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Sport">
        <div className="flex flex-wrap gap-2">
          {SPORTS.map((s) => (
            <PillToggle
              key={s.value}
              active={filters.sport === s.value}
              label={s.label}
              onClick={() =>
                onChange({ ...filters, sport: filters.sport === s.value ? undefined : s.value })
              }
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Prix (FCFA)">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            placeholder="Min"
            value={filters.priceMin ?? ""}
            onChange={(e) =>
              onChange({ ...filters, priceMin: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-full rounded-lg border border-fitora-border bg-fitora-charcoal px-3 py-2 text-sm focus:border-fitora-green"
          />
          <span className="text-fitora-gray-dim">–</span>
          <input
            type="number"
            min={0}
            placeholder="Max"
            value={filters.priceMax ?? ""}
            onChange={(e) =>
              onChange({ ...filters, priceMax: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-full rounded-lg border border-fitora-border bg-fitora-charcoal px-3 py-2 text-sm focus:border-fitora-green"
          />
        </div>
      </FilterGroup>

      {sizes.length > 0 && (
        <FilterGroup title="Taille">
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <PillToggle
                key={size}
                active={Boolean(filters.sizes?.includes(size))}
                label={size}
                onClick={() => {
                  const current = filters.sizes ?? [];
                  onChange({
                    ...filters,
                    sizes: current.includes(size) ? current.filter((s) => s !== size) : [...current, size],
                  });
                }}
              />
            ))}
          </div>
        </FilterGroup>
      )}

      {shoeSizes.length > 0 && (
        <FilterGroup title="Pointure">
          <div className="flex flex-wrap gap-2">
            {shoeSizes.map((size) => (
              <PillToggle
                key={size}
                active={Boolean(filters.shoeSizes?.includes(size))}
                label={size}
                onClick={() => {
                  const current = filters.shoeSizes ?? [];
                  onChange({
                    ...filters,
                    shoeSizes: current.includes(size)
                      ? current.filter((s) => s !== size)
                      : [...current, size],
                  });
                }}
              />
            ))}
          </div>
        </FilterGroup>
      )}

      {colors.length > 0 && (
        <FilterGroup title="Couleur">
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <PillToggle
                key={color}
                active={Boolean(filters.colors?.includes(color))}
                label={color}
                onClick={() => {
                  const current = filters.colors ?? [];
                  onChange({
                    ...filters,
                    colors: current.includes(color)
                      ? current.filter((c) => c !== color)
                      : [...current, color],
                  });
                }}
              />
            ))}
          </div>
        </FilterGroup>
      )}

      <FilterGroup title="Disponibilité">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-fitora-gray">
          <input
            type="checkbox"
            checked={Boolean(filters.inStockOnly)}
            onChange={(e) => onChange({ ...filters, inStockOnly: e.target.checked })}
            className="h-4 w-4 accent-fitora-green"
          />
          En stock uniquement
        </label>
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-fitora-gray">
          <input
            type="checkbox"
            checked={Boolean(filters.onSaleOnly)}
            onChange={(e) => onChange({ ...filters, onSaleOnly: e.target.checked })}
            className="h-4 w-4 accent-fitora-green"
          />
          En promotion uniquement
        </label>
      </FilterGroup>

      <button
        onClick={() => onChange({ sort: filters.sort })}
        className="text-sm font-medium text-fitora-gray underline underline-offset-2 hover:text-fitora-white"
      >
        Réinitialiser les filtres
      </button>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 font-display text-sm font-semibold text-fitora-white">{title}</h3>
      {children}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-2 text-left text-sm transition-colors",
        active ? "bg-fitora-green/10 font-medium text-fitora-green" : "text-fitora-gray hover:bg-white/5 hover:text-fitora-white"
      )}
    >
      {label}
    </button>
  );
}

function PillToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-fitora-green bg-fitora-green text-fitora-black"
          : "border-fitora-border text-fitora-gray hover:border-fitora-gray"
      )}
    >
      {label}
    </button>
  );
}
