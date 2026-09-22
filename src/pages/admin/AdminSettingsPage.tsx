import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import {
  getShopSettings,
  saveShopSettings,
  uploadHeroImage,
  DEFAULT_HERO_IMAGE,
  type ShopSettings,
} from "@/services/settingsService";
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
    // Toujours lire la valeur la plus fraîche ici : c'est l'écran d'édition,
    // pas question de partir d'une copie potentiellement périmée du cache.
    getShopSettings({ forceRefresh: true }).then(setSettings);
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
      // Téléversée vers Supabase Storage : seule l'URL publique (courte)
      // est stockée dans shop_settings, jamais l'image en base64.
      const publicUrl = await uploadHeroImage(file);
      update("heroImageUrl", publicUrl);
      pushToast("Image téléversée. Cliquez sur Enregistrer pour la publier.", "success");
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : "Échec du téléversement de l'image.",
        "error"
      );
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

        <section className="space-y-3 rounded-2xl bg-fitora-charcoal p-6">
          <h2 className="font-display text-sm font-semibold">Réseaux sociaux</h2>
          <p className="text-xs text-fitora-gray-dim">
            Ces liens alimentent automatiquement les icônes du pied de page. Laissez un champ
            vide pour masquer proprement l'icône correspondante.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Facebook">
              <input
                type="url"
                placeholder="https://facebook.com/votre-page"
                value={settings.socialLinks.facebook ?? ""}
                onChange={(e) =>
                  update("socialLinks", { ...settings.socialLinks, facebook: e.target.value })
                }
                className="input"
              />
            </Field>
            <Field label="Instagram">
              <input
                type="url"
                placeholder="https://instagram.com/votre-compte"
                value={settings.socialLinks.instagram ?? ""}
                onChange={(e) =>
                  update("socialLinks", { ...settings.socialLinks, instagram: e.target.value })
                }
                className="input"
              />
            </Field>
            <Field label="TikTok">
              <input
                type="url"
                placeholder="https://tiktok.com/@votre-compte"
                value={settings.socialLinks.tiktok ?? ""}
                onChange={(e) =>
                  update("socialLinks", { ...settings.socialLinks, tiktok: e.target.value })
                }
                className="input"
              />
            </Field>
            <Field label="YouTube">
              <input
                type="url"
                placeholder="https://youtube.com/@votre-chaine"
                value={settings.socialLinks.youtube ?? ""}
                onChange={(e) =>
                  update("socialLinks", { ...settings.socialLinks, youtube: e.target.value })
                }
                className="input"
              />
            </Field>
            <Field label="WhatsApp (lien de discussion)">
              <input
                type="url"
                placeholder="https://wa.me/2250789777767"
                value={settings.socialLinks.whatsapp ?? ""}
                onChange={(e) =>
                  update("socialLinks", { ...settings.socialLinks, whatsapp: e.target.value })
                }
                className="input"
              />
            </Field>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl bg-fitora-charcoal p-6">
          <h2 className="font-display text-sm font-semibold">Programme de parrainage</h2>
          <p className="text-xs text-fitora-gray-dim">
            La récompense est attribuée automatiquement et en toute sécurité (côté serveur)
            dès qu'une commande d'un client parrainé passe au statut « Livrée ». Ce même taux
            régit aussi la commission versée quand un client utilise le code de réduction
            personnel d'un affilié au paiement — un seul réglage pour les deux mécanismes.
            Le programme reste désactivé tant que vous ne l'activez pas explicitement ci-dessous.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.affiliate.enabled}
              onChange={(e) =>
                update("affiliate", { ...settings.affiliate, enabled: e.target.checked })
              }
            />
            Activer le programme de parrainage
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Type de récompense">
              <select
                value={settings.affiliate.rewardType}
                onChange={(e) =>
                  update("affiliate", {
                    ...settings.affiliate,
                    rewardType: e.target.value as "percentage" | "fixed",
                  })
                }
                className="input"
              >
                <option value="fixed">Montant fixe (FCFA)</option>
                <option value="percentage">Pourcentage (%)</option>
              </select>
            </Field>
            <Field
              label={
                settings.affiliate.rewardType === "percentage"
                  ? "Valeur de la récompense (%)"
                  : "Valeur de la récompense (FCFA)"
              }
            >
              <input
                type="number"
                min={0}
                value={settings.affiliate.rewardValue}
                onChange={(e) =>
                  update("affiliate", { ...settings.affiliate, rewardValue: Number(e.target.value) })
                }
                className="input"
              />
            </Field>
            <Field label="Montant minimum de commande (FCFA)">
              <input
                type="number"
                min={0}
                value={settings.affiliate.minOrderTotal}
                onChange={(e) =>
                  update("affiliate", {
                    ...settings.affiliate,
                    minOrderTotal: Number(e.target.value),
                  })
                }
                className="input"
              />
            </Field>
            <Field label="Validité de la récompense (jours)">
              <input
                type="number"
                min={1}
                value={settings.affiliate.rewardExpiresDays}
                onChange={(e) =>
                  update("affiliate", {
                    ...settings.affiliate,
                    rewardExpiresDays: Number(e.target.value),
                  })
                }
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
