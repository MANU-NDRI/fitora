import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import type { Category, Sport } from "@/types";
import {
  adminGetCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  adminTogglePublishCategory,
  type CategoryInput,
} from "@/services/adminCategoryService";
import { Button } from "@/components/ui/Button";
import { useToastStore } from "@/store/toastStore";

const SPORTS: Sport[] = ["football", "basketball", "running", "fitness", "training", "tennis", "combat", "lifestyle"];
const EMPTY: CategoryInput = { name: "", image: "", sport: "training", order: 1, published: true };

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null | undefined>(undefined);
  const [form, setForm] = useState<CategoryInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const pushToast = useToastStore((s) => s.push);

  async function refresh() {
    setCategories(await adminGetCategories());
  }

  useEffect(() => {
    refresh();
  }, []);

  function openNew() {
    setForm({ ...EMPTY, order: categories.length + 1 });
    setEditing(null);
  }

  function openEdit(cat: Category) {
    setForm(cat);
    setEditing(cat);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await adminUpdateCategory(editing.id, form);
        pushToast("Catégorie modifiée", "success");
      } else {
        await adminCreateCategory(form);
        pushToast("Catégorie créée", "success");
      }
      setEditing(undefined);
      refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await adminDeleteCategory(id);
    pushToast("Catégorie supprimée", "info");
    refresh();
  }

  async function handleToggle(id: string) {
    await adminTogglePublishCategory(id);
    refresh();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold">Catégories ({categories.length})</h1>
        {editing === undefined && (
          <Button onClick={openNew}>
            <Plus size={16} /> Nouvelle catégorie
          </Button>
        )}
      </div>

      {editing !== undefined ? (
        <form onSubmit={handleSubmit} className="max-w-lg space-y-4 rounded-2xl bg-fitora-charcoal p-6">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fitora-gray">Nom</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fitora-gray">Image (URL)</span>
            <input
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              className="input"
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-fitora-gray">Sport</span>
              <select
                value={form.sport}
                onChange={(e) => setForm({ ...form, sport: e.target.value as Sport })}
                className="input"
              >
                {SPORTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-fitora-gray">Ordre d'affichage</span>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                className="input"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-fitora-gray">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
              className="h-4 w-4 accent-fitora-green"
            />
            Publiée
          </label>
          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(undefined)}>
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-fitora-charcoal">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-fitora-border text-left text-xs uppercase text-fitora-gray">
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Sport</th>
                <th className="px-4 py-3">Produits</th>
                <th className="px-4 py-3">Ordre</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fitora-border">
              {categories.map((c) => (
                <tr key={c.id}>
                  <td className="flex items-center gap-3 px-4 py-3">
                    <img src={c.image} alt={c.name} className="h-9 w-9 rounded-lg object-cover" />
                    <span className="font-medium">{c.name}</span>
                  </td>
                  <td className="px-4 py-3 text-fitora-gray">{c.sport}</td>
                  <td className="px-4 py-3">{c.productCount}</td>
                  <td className="px-4 py-3">{c.order}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        c.published
                          ? "rounded-full bg-fitora-green/10 px-2 py-0.5 text-xs font-medium text-fitora-green"
                          : "rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-fitora-gray-dim"
                      }
                    >
                      {c.published ? "Publiée" : "Non publiée"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => handleToggle(c.id)} className="text-fitora-gray hover:text-fitora-white">
                        {c.published ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button onClick={() => openEdit(c)} className="text-fitora-gray hover:text-fitora-white">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="text-fitora-gray hover:text-red-400">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
