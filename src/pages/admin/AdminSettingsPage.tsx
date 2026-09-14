import { useEffect, useState } from "react";
import { getShopSettings, saveShopSettings, type ShopSettings } from "@/services/settingsService";
import { useToastStore } from "@/store/toastStore";
import { Button } from "@/components/ui/Button";

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const pushToast = useToastStore((s) => s.push);

  useEffect(() => {
    getShopSettings().then(setSettings);
  }, []);

  if (!settings) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await saveShopSettings(settings);
      pushToast("Paramètres enregistrés", "success");
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof ShopSettings>(key: K, value: ShopSettings[K]) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 font-display text-xl font-bold">Paramètres de la boutique</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4 rounded-2xl bg-fitora-charcoal p-6">
          <h2 className="font-display text-sm font-semibold">Informations générales</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom de la boutique">
              <input value={settings.shopName} onChange={(e) => update("shopName", e.target.value)} className="input" />
            </Field>
            <Field label="Slogan">
              <input value={settings.slogan} onChange={(e) => update("slogan", e.target.value)} className="input" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Téléphone">
              <input value={settings.phone} onChange={(e) => update("phone", e.target.value)} className="input" />
            </Field>
            <Field label="Numéro WhatsApp">
              <input value={settings.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} className="input" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email">
              <input value={settings.email} onChange={(e) => update("email", e.target.value)} className="input" />
            </Field>
            <Field label="Adresse">
              <input value={settings.address} onChange={(e) => update("address", e.target.value)} className="input" />
            </Field>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl bg-fitora-charcoal p-6">
          <h2 className="font-display text-sm font-semibold">Livraison & paiement</h2>
          <Field label="Frais de livraison (FCFA)">
            <input
              type="number"
              value={settings.deliveryFee}
              onChange={(e) => update("deliveryFee", Number(e.target.value))}
              className="input max-w-xs"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-fitora-gray">
            <input
              type="checkbox"
              checked={settings.codEnabled}
              onChange={(e) => update("codEnabled", e.target.checked)}
              className="h-4 w-4 accent-fitora-green"
            />
            Activer le paiement à la livraison
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Numéro Wave">
              <input
                value={settings.paymentNumbers.wave}
                onChange={(e) => update("paymentNumbers", { ...settings.paymentNumbers, wave: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Numéro Orange Money">
              <input
                value={settings.paymentNumbers.orange_money}
                onChange={(e) => update("paymentNumbers", { ...settings.paymentNumbers, orange_money: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Numéro MTN Mobile Money">
              <input
                value={settings.paymentNumbers.mtn_money}
                onChange={(e) => update("paymentNumbers", { ...settings.paymentNumbers, mtn_money: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Numéro Moov Money">
              <input
                value={settings.paymentNumbers.moov_money}
                onChange={(e) => update("paymentNumbers", { ...settings.paymentNumbers, moov_money: e.target.value })}
                className="input"
              />
            </Field>
          </div>
        </section>

        <Button type="submit" disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer les paramètres"}
        </Button>
      </form>
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
