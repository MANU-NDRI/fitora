import type { ProductBadge } from "@/types";
import { cn } from "@/lib/cn";

const BADGE_CONFIG: Record<ProductBadge, { label: string; className: string }> = {
  nouveau: { label: "Nouveau", className: "bg-fitora-white text-fitora-black" },
  promo: { label: "Promo", className: "bg-fitora-green text-fitora-black" },
  "best-seller": { label: "Best-seller", className: "bg-fitora-black text-fitora-green border border-fitora-green" },
  rupture: { label: "Rupture de stock", className: "bg-fitora-charcoal text-fitora-gray border border-fitora-border" },
};

export function Badge({ type, className }: { type: ProductBadge; className?: string }) {
  const config = BADGE_CONFIG[type];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
