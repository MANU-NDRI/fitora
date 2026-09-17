import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, Search, AlertTriangle, PackageCheck } from "lucide-react";
import type { Product } from "@/types";
import { adminGetProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct, adminTogglePublish, adminToggleOutOfStock } from "@/services/adminProductService";
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
    const [nextProducts, nextCategories] = await Promise.all([adminGetProducts(), adminGetCategories()]);
    setProducts(nextProducts);
    setCategories(nextCategories);
  }

  useEffect(() => {
    void refresh().catch((error: unknown) => pushToast(error instanceof Error ? error.message : "Impossible de charger le catalogue.", "error"));
  }, [pushToast]);

  function categoryFor(id: string): Category {
    const category = categories.find((item) => item.id === id);
    if (!category) throw new Error("La catégorie sélectionnée est introuvable. Rechargez les catégories puis réessayez.");
    return category;
  }

  async function handleCreate(values: ProductFormValues) {
    setSubmitting(true);
    try {
      const category = categoryFor(values.categoryId);
      await adminCreateProduct({ name: values.name, categoryId: values.categoryId, categoryName: category.name, sport: values.sport, description: values.description, features: values.features.split(",").map((f) => f.trim()).filter(Boolean), images: values.images, price: values.price, oldPrice: values.oldPrice, variants: values.variants, badges: [], published: values.published });
      pushToast("Produit créé", "success");
      setView({ mode: "list" });
      await refresh();
    } catch (error: unknown) {
      pushToast(error instanceof Error ? error.message : "Impossible de créer le produit.", "error");
    } finally { setSubmitting(false); }
  }

  async function handleUpdate(id: string, values: ProductFormValues) {
    setSubmitting(true);
    try {
      const category = categoryFor(values.categoryId);
      await adminUpdateProduct(id, { name: values.name, categoryId: values.categoryId, categoryName: category.name, sport: values.sport, description: values.description, features: values.features.split(",").map((f) => f.trim()).filter(Boolean), images: values.images, price: values.price, oldPrice: values.oldPrice, variants: values.variants, published: values.published });
      pushToast("Produit modifié", "success");
      setView({ mode: "list" });
      await refresh();
    } catch (error: unknown) {
      pushToast(error instanceof Error ? error.message : "Impossible de modifier le produit.", "error");
    } finally { setSubmitting(false); }
  }

  async function handleDelete(id: string) { try { await adminDeleteProduct(id); pushToast("Produit supprimé", "info"); await refresh(); } catch (error: unknown) { pushToast(error instanceof Error ? error.message : "Impossible de supprimer le produit.", "error"); } }
  async function handleTogglePublish(id: string) { try { await adminTogglePublish(id); await refresh(); } catch (error: unknown) { pushToast(error instanceof Error ? error.message : "Impossible de modifier la publication.", "error"); } }
  async function handleToggleOutOfStock(id: string) { try { await adminToggleOutOfStock(id); await refresh(); } catch (error: unknown) { pushToast(error instanceof Error ? error.message : "Impossible de modifier la disponibilité.", "error"); } }

  const filtered = products.filter((product) => product.name.toLowerCase().includes(search.toLowerCase()));
  if (view.mode === "create") return <div><h1 className="mb-6 font-display text-xl font-bold">Nouveau produit</h1><ProductForm categories={categories} onSubmit={handleCreate} onCancel={() => setView({ mode: "list" })} submitting={submitting} /></div>;
  if (view.mode === "edit") return <div><h1 className="mb-6 font-display text-xl font-bold">Modifier « {view.product.name} »</h1><ProductForm categories={categories} initial={view.product} onSubmit={(values) => handleUpdate(view.product.id, values)} onCancel={() => setView({ mode: "list" })} submitting={submitting} /></div>;

  return <div><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-xl font-bold">Produits ({products.length})</h1><Button onClick={() => setView({ mode: "create" })}><Plus size={16} /> Nouveau produit</Button></div><div className="mb-4 flex items-center gap-2 rounded-xl border border-fitora-border bg-fitora-charcoal px-3 py-2"><Search size={16} className="text-fitora-gray" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un produit..." className="flex-1 bg-transparent text-sm focus:outline-none" /></div><div className="overflow-x-auto rounded-2xl bg-fitora-charcoal"><table className="w-full text-sm"><tbody className="divide-y divide-fitora-border">{filtered.map((product) => { const stock = product.variants.reduce((sum, variant) => sum + Math.max(0, variant.stockAvailable - variant.stockReserved), 0); return <tr key={product.id}><td className="flex items-center gap-3 px-4 py-3"><img src={product.images[0]} alt={product.name} className="h-10 w-10 rounded-lg object-cover" /><span className="font-medium">{product.name}</span></td><td className="px-4 py-3 text-fitora-gray">{product.categoryName}</td><td className="px-4 py-3">{formatFCFA(product.price)}</td><td className="px-4 py-3">{stock}</td><td className="px-4 py-3">{product.published ? "Publié" : "Non publié"}</td><td className="px-4 py-3"><div className="flex items-center justify-end gap-3"><button onClick={() => void handleToggleOutOfStock(product.id)} aria-label="Disponibilité">{product.outOfStockOverride ? <AlertTriangle size={16} /> : <PackageCheck size={16} />}</button><button onClick={() => void handleTogglePublish(product.id)} aria-label="Publier/Dépublier">{product.published ? <Eye size={16} /> : <EyeOff size={16} />}</button><button onClick={() => setView({ mode: "edit", product })} aria-label="Modifier"><Pencil size={16} /></button><button onClick={() => void handleDelete(product.id)} aria-label="Supprimer"><Trash2 size={16} /></button></div></td></tr>; })}</tbody></table></div></div>;
}
