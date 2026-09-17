import { useEffect, useState } from "react";
import { MapPin, Plus, Pencil, Trash2, Star } from "lucide-react";
import type { Address } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { getAddresses, saveAddress, deleteAddress } from "@/services/addressService";
import { useToastStore } from "@/store/toastStore";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

const EMPTY_FORM = {
  label: "",
  fullName: "",
  phone: "",
  whatsapp: "",
  city: "",
  commune: "",
  quartier: "",
  address: "",
  isDefault: false,
};

export function AccountAddressesPage() {
  const user = useAuthStore((s) => s.user);
  const pushToast = useToastStore((s) => s.push);
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [editing, setEditing] = useState<Address | null | undefined>(undefined); // undefined = closed, null = new
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) getAddresses(user.id).then(setAddresses);
  }, [user]);

  function openNew() {
    setForm(EMPTY_FORM);
    setEditing(null);
  }

  function openEdit(addr: Address) {
    setForm({ ...addr, whatsapp: addr.whatsapp ?? "" });
    setEditing(addr);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const updated = await saveAddress(user.id, editing ? { ...form, id: editing.id } : form);
      setAddresses(updated);
      setEditing(undefined);
      pushToast(editing ? "Adresse modifiée" : "Adresse ajoutée", "success");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!user) return;
    const updated = await deleteAddress(user.id, id);
    setAddresses(updated);
    pushToast("Adresse supprimée", "info");
  }

  if (!user) return null;

  if (addresses === null) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Mes adresses</h2>
        {editing === undefined && (
          <Button size="sm" onClick={openNew}>
            <Plus size={15} /> Ajouter
          </Button>
        )}
      </div>

      {editing !== undefined ? (
        <form onSubmit={handleSubmit} className="max-w-lg space-y-4 rounded-2xl bg-fitora-charcoal p-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Libellé (ex: Domicile)">
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="input"
                required
              />
            </Field>
            <Field label="Nom complet">
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="input"
                required
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Téléphone">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input"
                required
              />
            </Field>
            <Field label="WhatsApp (optionnel)">
              <input
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                className="input"
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Ville">
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="input"
                required
              />
            </Field>
            <Field label="Commune">
              <input
                value={form.commune}
                onChange={(e) => setForm({ ...form, commune: e.target.value })}
                className="input"
                required
              />
            </Field>
            <Field label="Quartier">
              <input
                value={form.quartier}
                onChange={(e) => setForm({ ...form, quartier: e.target.value })}
                className="input"
                required
              />
            </Field>
          </div>
          <Field label="Adresse détaillée">
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="input"
              required
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-fitora-gray">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="h-4 w-4 accent-fitora-green"
            />
            Définir comme adresse par défaut
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
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-fitora-border py-16 text-center">
          <MapPin size={32} className="text-fitora-gray-dim" />
          <p className="text-fitora-gray">Aucune adresse enregistrée pour le moment.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {addresses.map((addr) => (
            <li key={addr.id} className="rounded-2xl bg-fitora-charcoal p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="flex items-center gap-2 font-display text-sm font-bold">
                    {addr.label}
                    {addr.isDefault && (
                      <span className="flex items-center gap-1 rounded-full bg-fitora-green/10 px-2 py-0.5 text-[10px] font-semibold text-fitora-green">
                        <Star size={10} className="fill-fitora-green" /> Par défaut
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-fitora-gray">{addr.fullName} · {addr.phone}</p>
                  <p className="text-sm text-fitora-gray">
                    {addr.address}, {addr.quartier}, {addr.commune}, {addr.city}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(addr)} aria-label="Modifier" className="text-fitora-gray hover:text-fitora-white">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(addr.id)} aria-label="Supprimer" className="text-fitora-gray hover:text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
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
