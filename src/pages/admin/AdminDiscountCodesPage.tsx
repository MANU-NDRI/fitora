import { useEffect, useState } from "react";
import { Tag, Plus, Trash2 } from "lucide-react";
import type { DiscountCode, DiscountType } from "@/types";
import {
  adminCreateDiscountCode,
  adminGetDiscountCodes,
  adminDeleteDiscountCode,
} from "@/services/discountService";
import { adminGetCustomers, type AdminCustomerView } from "@/services/adminCustomerService";
import { formatFCFA, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { useToastStore } from "@/store/toastStore";
import { cn } from "@/lib/cn";

export function AdminDiscountCodesPage() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [customers, setCustomers] = useState<AdminCustomerView[]>([]);
  const [form, setForm] = useState({
    code: "",
    type: "percentage" as DiscountType,
    value: 10,
    customerId: "",
    maxUses: 1,
    expiresAt: "",
  });
  const [creating, setCreating] = useState(false);
  const pushToast = useToastStore((s) => s.push);

  async function refresh() {
    setCodes(await adminGetDiscountCodes());
    setCustomers(await adminGetCustomers());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const customer = customers.find((c) => c.id === form.customerId);
      await adminCreateDiscountCode({
        code: form.code || undefined,
        type: form.type,
        value: form.value,
        customerId: form.customerId || undefined,
        customerName: customer ? `${customer.firstName} ${customer.lastName}` : undefined,
        maxUses: form.maxUses,
        expiresAt: form.expiresAt || undefined,
      });
      pushToast(
        form.customerId ? "Code créé et envoyé au client par notification" : "Code de réduction créé",
        "success"
      );
      setForm({ code: "", type: "percentage", value: 10, customerId: "", maxUses: 1, expiresAt: "" });
      refresh();
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    await adminDeleteDiscountCode(id);
    refresh();
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fitora-green/10 text-fitora-green">
          <Tag size={18} />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold">Codes de réduction</h1>
          <p className="text-sm text-fitora-gray">
            Créez un code pour tous les clients ou offrez-en un à un compte précis.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 space-y-4 rounded-2xl bg-fitora-charcoal p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fitora-gray">
              Code (laisser vide pour générer automatiquement)
            </span>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="input uppercase"
              placeholder="FITORA-XXXXXX"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fitora-gray">
              Réserver à un client (optionnel)
            </span>
            <select
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              className="input"
            >
              <option value="">Tous les clients</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName} — {c.email}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fitora-gray">Type de réduction</span>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as DiscountType })}
              className="input"
            >
              <option value="percentage">Pourcentage (%)</option>
              <option value="fixed">Montant fixe (FCFA)</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fitora-gray">
              Valeur {form.type === "percentage" ? "(%)" : "(FCFA)"}
            </span>
            <input
              type="number"
              min={0}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fitora-gray">
              Nombre d'utilisations autorisées
            </span>
            <input
              type="number"
              min={1}
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: Math.max(1, Number(e.target.value)) })}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fitora-gray">Expiration (optionnel)</span>
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="input"
            />
          </label>
        </div>

        <Button type="submit" disabled={creating}>
          {creating ? "Création..." : <><Plus size={16} /> Créer le code</>}
        </Button>
      </form>

      <div className="overflow-x-auto rounded-2xl bg-fitora-charcoal">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-fitora-border text-left text-xs uppercase text-fitora-gray">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Réduction</th>
              <th className="px-4 py-3">Bénéficiaire</th>
              <th className="px-4 py-3">Utilisations</th>
              <th className="px-4 py-3">Expiration</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-fitora-border">
            {codes.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-mono font-medium">{c.code}</td>
                <td className="px-4 py-3">
                  {c.type === "percentage" ? `${c.value}%` : formatFCFA(c.value)}
                </td>
                <td className="px-4 py-3 text-fitora-gray">{c.customerName ?? "Tous les clients"}</td>
                <td className="px-4 py-3 text-fitora-gray">{c.usedCount} / {c.maxUses}</td>
                <td className="px-4 py-3 text-fitora-gray">{c.expiresAt ? formatDate(c.expiresAt) : "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      c.usedCount >= c.maxUses ? "bg-white/5 text-fitora-gray-dim" : "bg-fitora-green/10 text-fitora-green"
                    )}
                  >
                    {c.usedCount >= c.maxUses ? "Épuisé" : "Actif"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(c.id)} aria-label="Supprimer" className="text-fitora-gray hover:text-red-400">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {codes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-fitora-gray">
                  Aucun code créé pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
