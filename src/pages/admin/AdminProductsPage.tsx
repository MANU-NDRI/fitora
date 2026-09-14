import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, Search } from "lucide-react";
import type { Product } from "@/types";
import {
  adminGetProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  adminTogglePublish,
  recomputeCategoryCounts,
} from "@/services/adminProductService";
import { adminGetCategories } from "@/services/adminCategoryService";
import { ProductForm, type ProductFormValues } from "@/features/admin/ProductForm";
import { Button } from "@/components/ui/Button";
import { formatFCFA } from "@/lib/format";
import { useToastStore } from "@/store/toastStore";
import type { Category } from "@/types";

type View = { mode: "list" } | { mode: "create" } | { mode: "edit"; product: Product };

export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [view, setView] = useState<View>({ mode: "list" });
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const pushToast = useToastStore((s) => s.push);

  async function refresh() {
    setProducts(await adminGetProducts());
    setCategories(await adminGetCategories());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(values: ProductFormValues) {
    setSubmitting(true);
    try {
      const category = categories.find((c) => c.id === values.categoryId)!;
      await adminCreateProduct({
        name: values.name,
        categoryId: values.categoryId,
        categoryName: category.name,
        sport: values.sport,
        description: values.description,
        features: values.features.split(",").map((f) => f.trim()).filter(Boolean),
        images: values.images.split(",").map((i) => i.trim()).filter(Boolean),
        price: values.price,
        oldPrice: values.oldPrice,
        variants: values.variants,
        badges: [],
        published: values.published,
      });
      recomputeCategoryCounts();
      pushToast("Produit créé", "success");
      setView({ mode: "list" });
      refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(id: string, values: ProductFormValues) {
    setSubmitting(true);
    try {
      const category = categories.find((c) => c.id === values.categoryId)!;
      await adminUpdateProduct(id, {
        name: values.name,
        categoryId: values.categoryId,
        categoryName: category.name,
        sport: values.sport,
        description: values.description,
        features: values.features.split(",").map((f) => f.trim()).filter(Boolean),
        images: values.images.split(",").map((i) => i.trim()).filter(Boolean),
        price: values.price,
        oldPrice: values.oldPrice,
        variants: values.variants,
        published: values.published,
      });
      recomputeCategoryCounts();
      pushToast("Produit modifié", "success");
      setView({ mode: "list" });
      refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    await adminDeleteProduct(id);
    recomputeCategoryCounts();
    pushToast("Produit supprimé", "info");
    refresh();
  }

  async function handleTogglePublish(id: string) {
    await adminTogglePublish(id);
    recomputeCategoryCounts();
    refresh();
  }

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  if (view.mode === "create") {
    return (
      <div>
        <h1 className="mb-6 font-display text-xl font-bold">Nouveau produit</h1>
        <ProductForm
          categories={categories}
          onSubmit={handleCreate}
          onCancel={() => setView({ mode: "list" })}
          submitting={submitting}
        />
      </div>
    );
  }

  if (view.mode === "edit") {
    return (
      <div>
        <h1 className="mb-6 font-display text-xl font-bold">Modifier « {view.product.name} »</h1>
        <ProductForm
          categories={categories}
          initial={view.product}
          onSubmit={(values) => handleUpdate(view.product.id, values)}
          onCancel={() => setView({ mode: "list" })}
          submitting={submitting}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold">Produits ({products.length})</h1>
        <Button onClick={() => setView({ mode: "create" })}>
          <Plus size={16} /> Nouveau produit
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-fitora-border bg-fitora-charcoal px-3 py-2">
        <Search size={16} className="text-fitora-gray" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un produit..."
          className="flex-1 bg-transparent text-sm focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl bg-fitora-charcoal">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-fitora-border text-left text-xs uppercase text-fitora-gray">
              <th className="px-4 py-3">Produit</th>
              <th className="px-4 py-3">Catégorie</th>
              <th className="px-4 py-3">Prix</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-fitora-border">
            {filtered.map((p) => {
              const stock = p.variants.reduce((s, v) => s + Math.max(0, v.stockAvailable - v.stockReserved), 0);
              return (
                <tr key={p.id}>
                  <td className="flex items-center gap-3 px-4 py-3">
                    <img src={p.images[0]} alt={p.name} className="h-10 w-10 rounded-lg object-cover" />
                    <span className="font-medium">{p.name}</span>
                  </td>
                  <td className="px-4 py-3 text-fitora-gray">{p.categoryName}</td>
                  <td className="px-4 py-3">{formatFCFA(p.price)}</td>
                  <td className="px-4 py-3">
                    <span className={stock === 0 ? "text-red-400" : stock <= 5 ? "text-yellow-400" : "text-fitora-gray"}>
                      {stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        p.published
                          ? "rounded-full bg-fitora-green/10 px-2 py-0.5 text-xs font-medium text-fitora-green"
                          : "rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-fitora-gray-dim"
                      }
                    >
                      {p.published ? "Publié" : "Non publié"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => handleTogglePublish(p.id)} aria-label="Publier/Dépublier" className="text-fitora-gray hover:text-fitora-white">
                        {p.published ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button onClick={() => setView({ mode: "edit", product: p })} aria-label="Modifier" className="text-fitora-gray hover:text-fitora-white">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} aria-label="Supprimer" className="text-fitora-gray hover:text-red-400">
                        <Trash2 size={16} />
                      </button>
                    </div>
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
