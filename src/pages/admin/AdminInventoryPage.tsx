import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { Product } from "@/types";
import { adminGetProducts, adminUpdateVariantStock } from "@/services/adminProductService";
import { useToastStore } from "@/store/toastStore";
import { cn } from "@/lib/cn";

const LOW_STOCK_THRESHOLD = 5;

export function AdminInventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const pushToast = useToastStore((s) => s.push);

  async function refresh() {
    setProducts(await adminGetProducts());
  }

  useEffect(() => {
    refresh();
  }, []);

  const rows = useMemo(() => {
    return products
      .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
      .flatMap((p) => p.variants.map((v) => ({ product: p, variant: v })));
  }, [products, search]);

  async function handleCorrection(productId: string, variantId: string, value: number) {
    await adminUpdateVariantStock(productId, variantId, { stockAvailable: Math.max(0, value) });
    pushToast("Stock mis à jour", "success");
    refresh();
  }

  const outOfStockCount = rows.filter((r) => r.variant.stockAvailable - r.variant.stockReserved <= 0).length;
  const lowStockCount = rows.filter((r) => {
    const avail = r.variant.stockAvailable - r.variant.stockReserved;
    return avail > 0 && avail <= LOW_STOCK_THRESHOLD;
  }).length;

  return (
    <div>
      <h1 className="mb-2 font-display text-xl font-bold">Gestion du stock</h1>
      <p className="mb-6 flex items-center gap-2 text-sm text-fitora-gray">
        <AlertTriangle size={14} className="text-yellow-400" />
        {outOfStockCount} variante(s) en rupture · {lowStockCount} presque en rupture (≤ {LOW_STOCK_THRESHOLD})
      </p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un produit..."
        className="input mb-4 max-w-xs"
      />

      <div className="overflow-x-auto rounded-2xl bg-fitora-charcoal">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-fitora-border text-left text-xs uppercase text-fitora-gray">
              <th className="px-4 py-3">Produit</th>
              <th className="px-4 py-3">Variante</th>
              <th className="px-4 py-3">Stock disponible</th>
              <th className="px-4 py-3">Stock réservé</th>
              <th className="px-4 py-3">Stock total</th>
              <th className="px-4 py-3">Correction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-fitora-border">
            {rows.map(({ product, variant }) => {
              const availableNow = variant.stockAvailable - variant.stockReserved;
              return (
                <tr key={variant.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={product.images[0]} alt={product.name} className="h-9 w-9 rounded-lg object-cover" />
                      <span>{product.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-fitora-gray">
                    {[variant.size, variant.shoeSize, variant.color].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 font-medium",
                      availableNow <= 0 ? "text-red-400" : availableNow <= LOW_STOCK_THRESHOLD ? "text-yellow-400" : "text-fitora-white"
                    )}
                  >
                    {availableNow}
                  </td>
                  <td className="px-4 py-3 text-fitora-gray">{variant.stockReserved}</td>
                  <td className="px-4 py-3 text-fitora-gray">{variant.stockAvailable}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      defaultValue={variant.stockAvailable}
                      onBlur={(e) => {
                        const value = Number(e.target.value);
                        if (value !== variant.stockAvailable) handleCorrection(product.id, variant.id, value);
                      }}
                      className="input w-24 !py-1.5"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
