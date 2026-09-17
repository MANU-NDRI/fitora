import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import {
  getShopSettings,
  saveShopSettings,
  DEFAULT_HERO_IMAGE,
  type ShopSettings,
} from "@/services/settingsService";
import { fileToDataUrl } from "@/lib/image";
import { formatFCFA } from "@/lib/format";
import { useToastStore } from "@/store/toastStore";
import { Button } from "@/components/ui/Button";

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const heroFileInputRef = useRef<HTMLInputElement>(null);
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

  async function handleHeroFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHero(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      update("heroImageUrl", dataUrl);
    } finally {
      setUploadingHero(false);
      if (heroFileInputRef.current) heroFileInputRef.current.value = "";
    }
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
          <h2 className="font-display text-sm font-semibold">Expédition & paiement</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Frais de livraison standard (FCFA)">
              <input
                type="number"
                value={settings.deliveryFee}
                onChange={(e) => update("deliveryFee", Number(e.target.value))}
                className="input"
              />
            </Field>
            <Field label="Majoration livraison express (%)">
              <input
                type="number"
                min={0}
                value={settings.expressSurchargeRate}
                onChange={(e) => update("expressSurchargeRate", Number(e.target.value))}
                className="input"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Délai de livraison standard (jours)">
              <input
                type="number"
                min={1}
                value={settings.standardDeliveryDays}
                onChange={(e) => update("standardDeliveryDays", Number(e.target.value))}
                className="input"
              />
            </Field>
            <Field label="Délai de livraison express (jours)">
              <input
                type="number"
                min={1}
                value={settings.expressDeliveryDays}
                onChange={(e) => update("expressDeliveryDays", Number(e.target.value))}
                className="input"
              />
            </Field>
          </div>
          <p className="text-xs text-fitora-gray-dim">
            Le tarif express est calculé automatiquement : frais standard + majoration (
            {formatFCFA(Math.round(settings.deliveryFee * (1 + settings.expressSurchargeRate / 100)))} avec les
            valeurs actuelles).
          </p>
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

        <section className="space-y-4 rounded-2xl bg-fitora-charcoal p-6">
          <h2 className="font-display text-sm font-semibold">Image d'accueil (hero)</h2>
          <p className="text-xs text-fitora-gray-dim">
            Grande image affichée en fond de la page d'accueil, derrière « REPousse TES LIMITES. ».
          </p>

          <div className="overflow-hidden rounded-xl border border-fitora-border">
            <img
              src={settings.heroImageUrl || DEFAULT_HERO_IMAGE}
              alt="Aperçu de l'image d'accueil"
              className="h-40 w-full object-cover"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              ref={heroFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleHeroFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => heroFileInputRef.current?.click()}
              disabled={uploadingHero}
            >
              {uploadingHero ? "Téléversement..." : <><Upload size={15} /> Téléverser une image</>}
            </Button>
            <input
              value={settings.heroImageUrl ?? ""}
              onChange={(e) => update("heroImageUrl", e.target.value || undefined)}
              placeholder="Ou collez une URL d'image..."
              className="input flex-1"
            />
          </div>
          {settings.heroImageUrl && (
            <button
              type="button"
              onClick={() => update("heroImageUrl", undefined)}
              className="text-xs text-fitora-gray underline underline-offset-2 hover:text-fitora-white"
            >
              Revenir à l'image par défaut
            </button>
          )}
        </section>

        <section className="space-y-3 rounded-2xl bg-fitora-charcoal p-6">
          <h2 className="font-display text-sm font-semibold">Politique de retour</h2>
          <p className="text-xs text-fitora-gray-dim">
            Ce texte est affiché publiquement sur la page « Politique de retour » (lien en pied de page).
          </p>
          <textarea
            value={settings.returnPolicy}
            onChange={(e) => update("returnPolicy", e.target.value)}
            rows={10}
            className="input resize-y"
          />
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
