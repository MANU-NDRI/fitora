import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { Button } from "@/components/ui/Button";
import { LocationConsentCard } from "@/components/account/LocationConsentCard";

export function AccountProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const pushToast = useToastStore((s) => s.push);
  const [form, setForm] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    phone: user?.phone ?? "",
  });
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(form);
      pushToast("Profil mis à jour", "success");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="max-w-lg rounded-2xl bg-fitora-charcoal p-6">
      <h2 className="mb-6 font-display text-lg font-bold">Mon profil</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fitora-gray">Prénom</span>
            <input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fitora-gray">Nom</span>
            <input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="input"
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-fitora-gray">Email</span>
          <input value={user.email} disabled className="input opacity-60" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-fitora-gray">Téléphone</span>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input"
          />
        </label>
        <Button type="submit" disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer les modifications"}
        </Button>
      </form>
      </div>

      <LocationConsentCard />
    </div>
  );
}
