import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, CheckCircle2 } from "lucide-react";
import type { Address, PaymentMethod, ReceptionMode } from "@/types";
import { useCartStore, useCartSubtotal } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { getAddresses } from "@/services/addressService";
import { getShopSettings, PAYMENT_METHOD_LABELS, type ShopSettings } from "@/services/settingsService";
import { createOrder } from "@/services/orderService";
import { formatFCFA } from "@/lib/format";
import { buildWhatsAppLink, whatsappOrderMessage } from "@/lib/whatsapp";
import { Button } from "@/components/ui/Button";

export function CheckoutPage() {
  const user = useAuthStore((s) => s.user);
  const lines = useCartStore((s) => s.lines);
  const clearCart = useCartStore((s) => s.clear);
  const subtotal = useCartSubtotal();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState({
    fullName: user ? `${user.firstName} ${user.lastName}` : "",
    phone: user?.phone ?? "",
    whatsapp: "",
    city: "",
    commune: "",
    quartier: "",
    address: "",
    receptionMode: "livraison" as ReceptionMode,
    paymentMethod: "wave" as PaymentMethod,
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Awaited<ReturnType<typeof createOrder>> | null>(null);

  useEffect(() => {
    getShopSettings().then(setSettings);
    if (user) {
      getAddresses(user.id).then((list) => {
        setAddresses(list);
        const def = list.find((a) => a.isDefault) ?? list[0];
        if (def) {
          setForm((f) => ({
            ...f,
            fullName: def.fullName,
            phone: def.phone,
            whatsapp: def.whatsapp ?? "",
            city: def.city,
            commune: def.commune,
            quartier: def.quartier,
            address: def.address,
          }));
        }
      });
    }
  }, [user]);

  if (lines.length === 0 && !confirmedOrder) {
    return (
      <div className="container-fitora flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-fitora-gray">Votre panier est vide.</p>
        <Button onClick={() => navigate("/boutique")}>Découvrir la boutique</Button>
      </div>
    );
  }

  const deliveryFee = form.receptionMode === "retrait" ? 0 : (settings?.deliveryFee ?? 0);
  const total = subtotal + deliveryFee;

  async function submitOrder() {
    if (!user) return;

    setSubmitting(true);
    try {
      const address: Address = {
        id: "checkout-address",
        label: "Adresse de livraison",
        fullName: form.fullName,
        phone: form.phone,
        whatsapp: form.whatsapp || undefined,
        city: form.city,
        commune: form.commune,
        quartier: form.quartier,
        address: form.address,
        isDefault: false,
      };

      const order = await createOrder({
        userId: user.id,
        lines,
        deliveryFee: settings?.deliveryFee ?? 0,
        receptionMode: form.receptionMode,
        paymentMethod: form.paymentMethod,
        address: form.receptionMode === "livraison" ? address : undefined,
        note: form.note || undefined,
      });

      clearCart();
      setConfirmedOrder(order);
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitOrder();
  }

  if (confirmedOrder) {
    const paymentNumber =
      confirmedOrder.paymentMethod !== "cash_on_delivery"
        ? settings?.paymentNumbers[confirmedOrder.paymentMethod]
        : null;

    return (
      <div className="container-fitora flex justify-center py-14">
        <div className="w-full max-w-lg rounded-2xl bg-fitora-charcoal p-8 text-center">
          <CheckCircle2 size={40} className="mx-auto mb-4 text-fitora-green" />
          <h1 className="font-display text-xl font-bold">Commande créée avec succès</h1>
          <p className="mt-1 text-sm text-fitora-gray">Numéro de commande</p>
          <p className="font-display text-lg font-bold text-fitora-green">{confirmedOrder.number}</p>

          <div className="mt-6 rounded-xl bg-fitora-black/40 p-5 text-left">
            <p className="text-sm text-fitora-gray">Montant à payer</p>
            <p className="font-display text-2xl font-bold">{formatFCFA(confirmedOrder.total)}</p>
            <p className="mt-3 text-sm text-fitora-gray">Moyen de paiement</p>
            <p className="font-semibold">{PAYMENT_METHOD_LABELS[confirmedOrder.paymentMethod]}</p>
            {paymentNumber && (
              <>
                <p className="mt-3 text-sm text-fitora-gray">Numéro à créditer</p>
                <p className="font-semibold">{paymentNumber}</p>
              </>
            )}
          </div>

          <p className="mt-5 text-sm text-fitora-gray">
            Envoyez votre preuve de paiement sur WhatsApp pour que votre commande soit validée par FITORA.
          </p>

          <a
            href={buildWhatsAppLink(
              whatsappOrderMessage({
                orderNumber: confirmedOrder.number,
                amount: formatFCFA(confirmedOrder.total),
                paymentMethod: PAYMENT_METHOD_LABELS[confirmedOrder.paymentMethod],
              })
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="lg" className="mt-5 w-full">
              <MessageCircle size={16} /> Envoyer ma preuve sur WhatsApp
            </Button>
          </a>

          <Button
            variant="ghost"
            className="mt-3 w-full"
            onClick={() => navigate(`/compte/commandes/${confirmedOrder.id}`)}
          >
            Suivre ma commande
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fitora py-8 md:py-12">
      <h1 className="mb-8 font-display text-2xl font-bold md:text-3xl">Finaliser la commande</h1>

      <div className="grid gap-10 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-2">
          {addresses.length > 0 && (
            <div className="rounded-2xl bg-fitora-charcoal p-5">
              <p className="mb-3 text-sm font-semibold">Utiliser une adresse enregistrée</p>
              <div className="flex flex-wrap gap-2">
                {addresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        fullName: a.fullName,
                        phone: a.phone,
                        whatsapp: a.whatsapp ?? "",
                        city: a.city,
                        commune: a.commune,
                        quartier: a.quartier,
                        address: a.address,
                      }))
                    }
                    className="rounded-full border border-fitora-border px-3 py-1.5 text-xs hover:border-fitora-green"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-fitora-charcoal p-5">
            <h2 className="mb-4 font-display text-sm font-semibold">Coordonnées</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom complet">
                <input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="input"
                  required
                />
              </Field>
              <Field label="Téléphone">
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input"
                  required
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="WhatsApp (optionnel)">
                <input
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  className="input"
                />
              </Field>
            </div>
          </div>

          <div className="rounded-2xl bg-fitora-charcoal p-5">
            <h2 className="mb-4 font-display text-sm font-semibold">Mode de réception</h2>
            <div className="flex gap-3">
              {(["livraison", "retrait"] as ReceptionMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setForm({ ...form, receptionMode: mode })}
                  className={`flex-1 rounded-xl border py-3 text-sm font-medium capitalize transition-colors ${
                    form.receptionMode === mode
                      ? "border-fitora-green bg-fitora-green/10 text-fitora-green"
                      : "border-fitora-border text-fitora-gray"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {form.receptionMode === "livraison" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Field label="Ville">
                  <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input" required />
                </Field>
                <Field label="Commune">
                  <input value={form.commune} onChange={(e) => setForm({ ...form, commune: e.target.value })} className="input" required />
                </Field>
                <Field label="Quartier">
                  <input value={form.quartier} onChange={(e) => setForm({ ...form, quartier: e.target.value })} className="input" required />
                </Field>
                <div className="sm:col-span-3">
                  <Field label="Adresse détaillée">
                    <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" required />
                  </Field>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-fitora-charcoal p-5">
            <h2 className="mb-4 font-display text-sm font-semibold">Moyen de paiement</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[])
                .filter((m) => m !== "cash_on_delivery" || settings?.codEnabled)
                .map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setForm({ ...form, paymentMethod: method })}
                    className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                      form.paymentMethod === method
                        ? "border-fitora-green bg-fitora-green/10 text-fitora-green"
                        : "border-fitora-border text-fitora-gray"
                    }`}
                  >
                    {PAYMENT_METHOD_LABELS[method]}
                  </button>
                ))}
            </div>
          </div>

          <div className="rounded-2xl bg-fitora-charcoal p-5">
            <Field label="Note (optionnelle)">
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={3}
                className="input resize-none"
              />
            </Field>
          </div>

          <Button type="submit" size="lg" className="w-full lg:hidden" disabled={submitting}>
            {submitting ? "Création de la commande..." : "Confirmer la commande"}
          </Button>
        </form>

        <div className="h-fit rounded-2xl bg-fitora-charcoal p-6">
          <h2 className="mb-4 font-display text-lg font-bold">Récapitulatif</h2>
          <ul className="mb-4 max-h-64 space-y-3 overflow-y-auto">
            {lines.map((l) => (
              <li key={l.id} className="flex items-center gap-3">
                <img src={l.image} alt={l.name} className="h-12 w-12 rounded-lg object-cover" />
                <div className="flex-1 text-sm">
                  <p className="line-clamp-1">{l.name}</p>
                  <p className="text-xs text-fitora-gray">Qté {l.quantity}</p>
                </div>
                <p className="text-sm font-semibold">{formatFCFA(l.price * l.quantity)}</p>
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t border-fitora-border pt-4 text-sm">
            <div className="flex justify-between text-fitora-gray">
              <span>Sous-total</span><span className="text-fitora-white">{formatFCFA(subtotal)}</span>
            </div>
            <div className="flex justify-between text-fitora-gray">
              <span>Livraison</span><span className="text-fitora-white">{formatFCFA(deliveryFee)}</span>
            </div>
            <div className="flex justify-between font-display text-base font-bold">
              <span>Total</span><span className="text-fitora-green">{formatFCFA(total)}</span>
            </div>
          </div>
          <Button size="lg" className="mt-6 hidden w-full lg:flex" onClick={() => submitOrder()} disabled={submitting}>
            {submitting ? "Création de la commande..." : "Confirmer la commande"}
          </Button>
        </div>
      </div>
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
