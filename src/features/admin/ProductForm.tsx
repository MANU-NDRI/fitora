import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Category, Product, ProductVariant, Sport } from "@/types";
import { Button } from "@/components/ui/Button";

const SPORTS: Sport[] = ["football", "basketball", "running", "fitness", "training", "tennis", "combat", "lifestyle"];

export interface ProductFormValues {
  name: string;
  categoryId: string;
  sport: Sport;
  description: string;
  features: string;
  images: string;
  price: number;
  oldPrice?: number;
  published: boolean;
  variants: ProductVariant[];
}

export function ProductForm({
  categories,
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  categories: Category[];
  initial?: Product;
  onSubmit: (values: ProductFormValues) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<ProductFormValues>({
    name: initial?.name ?? "",
    categoryId: initial?.categoryId ?? categories[0]?.id ?? "",
    sport: initial?.sport ?? "training",
    description: initial?.description ?? "",
    features: initial?.features.join(", ") ?? "",
    images: initial?.images.join(", ") ?? "",
    price: initial?.price ?? 0,
    oldPrice: initial?.oldPrice,
    published: initial?.published ?? true,
    variants: initial?.variants ?? [
      { id: `v-${Date.now()}`, size: "M", stockAvailable: 10, stockReserved: 0, sku: "SKU-1" },
    ],
  });

  function updateVariant(id: string, updates: Partial<ProductVariant>) {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    }));
  }

  function addVariant() {
    setForm((f) => ({
      ...f,
      variants: [
        ...f.variants,
        { id: `v-${Date.now()}`, size: "", stockAvailable: 0, stockReserved: 0, sku: "" },
      ],
    }));
  }

  function removeVariant(id: string) {
    setForm((f) => ({ ...f, variants: f.variants.filter((v) => v.id !== id) }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-5 rounded-2xl bg-fitora-charcoal p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom du produit">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
            required
          />
        </Field>
        <Field label="Catégorie">
          <select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className="input"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Sport">
          <select
            value={form.sport}
            onChange={(e) => setForm({ ...form, sport: e.target.value as Sport })}
            className="input"
          >
            {SPORTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Prix (FCFA)">
          <input
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            className="input"
            required
          />
        </Field>
        <Field label="Ancien prix (promo, optionnel)">
          <input
            type="number"
            min={0}
            value={form.oldPrice ?? ""}
            onChange={(e) =>
              setForm({ ...form, oldPrice: e.target.value ? Number(e.target.value) : undefined })
            }
            className="input"
          />
        </Field>
      </div>

      <Field label="Description">
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          className="input resize-none"
          required
        />
      </Field>

      <Field label="Caractéristiques (séparées par des virgules)">
        <input
          value={form.features}
          onChange={(e) => setForm({ ...form, features: e.target.value })}
          className="input"
          placeholder="Tissu respirant, Coupe ergonomique, ..."
        />
      </Field>

      <Field label="Images (URLs séparées par des virgules)">
        <input
          value={form.images}
          onChange={(e) => setForm({ ...form, images: e.target.value })}
          className="input"
          placeholder="https://..."
        />
      </Field>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-fitora-gray">Variantes (taille / couleur / pointure / stock)</span>
          <Button type="button" size="sm" variant="outline" onClick={addVariant}>
            <Plus size={14} /> Ajouter
          </Button>
        </div>
        <div className="space-y-2">
          {form.variants.map((variant) => (
            <div key={variant.id} className="grid grid-cols-6 gap-2 rounded-xl bg-fitora-black/40 p-2">
              <input
                placeholder="Taille"
                value={variant.size ?? ""}
                onChange={(e) => updateVariant(variant.id, { size: e.target.value })}
                className="input col-span-1 !py-1.5 text-xs"
              />
              <input
                placeholder="Couleur"
                value={variant.color ?? ""}
                onChange={(e) => updateVariant(variant.id, { color: e.target.value })}
                className="input col-span-1 !py-1.5 text-xs"
              />
              <input
                placeholder="Pointure"
                value={variant.shoeSize ?? ""}
                onChange={(e) => updateVariant(variant.id, { shoeSize: e.target.value })}
                className="input col-span-1 !py-1.5 text-xs"
              />
              <input
                type="number"
                placeholder="Stock"
                value={variant.stockAvailable}
                onChange={(e) => updateVariant(variant.id, { stockAvailable: Number(e.target.value) })}
                className="input col-span-1 !py-1.5 text-xs"
              />
              <input
                placeholder="SKU"
                value={variant.sku}
                onChange={(e) => updateVariant(variant.id, { sku: e.target.value })}
                className="input col-span-1 !py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={() => removeVariant(variant.id)}
                className="flex items-center justify-center text-fitora-gray-dim hover:text-red-400"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-fitora-gray">
        <input
          type="checkbox"
          checked={form.published}
          onChange={(e) => setForm({ ...form, published: e.target.checked })}
          className="h-4 w-4 accent-fitora-green"
        />
        Publié (visible sur la boutique)
      </label>

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Enregistrement..." : initial ? "Enregistrer les modifications" : "Créer le produit"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-fitora-gray">{label}</span>
      {children}
    </label>
  );
}
