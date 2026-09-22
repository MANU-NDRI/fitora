import { useEffect, useMemo, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import type { Order, OrderStatus } from "@/types";
import { adminGetAllOrders, adminUpdateOrderStatus, ORDER_STATUS_LABELS, ORDER_STATUS_STEPS } from "@/services/orderService";
import { PAYMENT_METHOD_LABELS } from "@/services/settingsService";
import { formatFCFA, formatDateTime } from "@/lib/format";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { useToastStore } from "@/store/toastStore";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const STATUS_FILTERS: (OrderStatus | "all")[] = ["all", ...ORDER_STATUS_STEPS, "cancelled"];

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const pushToast = useToastStore((s) => s.push);

 
async function refresh() {
  try {
    const list = await adminGetAllOrders();

    setOrders(list);

    if (selected) {
      const updated = list.find((o) => o.id === selected.id) ?? null;
      setSelected(updated);
    }
  } catch (error) {
    console.error("Erreur chargement commandes admin :", error);
  }
}
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      const matchesSearch =
        !search || o.number.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, search]);

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    await adminUpdateOrderStatus(orderId, status);
    pushToast("Statut de la commande mis à jour", "success");
    refresh();
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-xl font-bold">Commandes ({orders.length})</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un numéro de commande..."
          className="input max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all")}
          className="input max-w-xs"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "Tous les statuts" : ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-fitora-charcoal">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-fitora-border text-left text-xs uppercase text-fitora-gray">
              <th className="px-4 py-3">Commande</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Paiement</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-fitora-border">
            {filtered.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3 font-medium">{o.number}</td>
                <td className="px-4 py-3 text-fitora-gray">{formatDateTime(o.createdAt)}</td>
                <td className="px-4 py-3">{formatFCFA(o.total)}</td>
                <td className="px-4 py-3 text-fitora-gray">{PAYMENT_METHOD_LABELS[o.paymentMethod]}</td>
                <td className="px-4 py-3">
                  <StatusPill status={o.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => setSelected(o)}>
                    Voir
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-fitora-gray">
                  Aucune commande ne correspond à ces critères.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-fitora-charcoal p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{selected.number}</h2>
              <button onClick={() => setSelected(null)} aria-label="Fermer">
                <X size={20} />
              </button>
            </div>

            <ul className="mb-4 space-y-2">
              {selected.items.map((item) => (
                <li key={item.id} className="flex justify-between text-sm">
                  <span>{item.productName} × {item.quantity}</span>
                  <span>{formatFCFA(item.unitPrice * item.quantity)}</span>
                </li>
              ))}
            </ul>

            <div className="mb-4 space-y-1 border-t border-fitora-border pt-3 text-sm">
              <div className="flex justify-between text-fitora-gray">
                <span>Sous-total</span><span>{formatFCFA(selected.subtotal)}</span>
              </div>
              <div className="flex justify-between text-fitora-gray">
                <span>Livraison</span><span>{formatFCFA(selected.deliveryFee)}</span>
              </div>
              {selected.discount > 0 && (
                <div className="flex justify-between text-fitora-green">
                  <span>Réduction{selected.discountCode && ` (${selected.discountCode})`}</span>
                  <span>-{formatFCFA(selected.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>Total</span><span className="text-fitora-green">{formatFCFA(selected.total)}</span>
              </div>
            </div>

            {selected.address?.latitude && selected.address?.longitude && (
              <a
                href={`https://www.google.com/maps?q=${selected.address.latitude},${selected.address.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-fitora-green hover:underline"
              >
                📍 Voir la position GPS partagée par le client
              </a>
            )}

            {selected.address && (
              <div className="mb-4 text-sm text-fitora-gray">
                <p className="font-medium text-fitora-white">Livraison</p>
                {selected.shippingMethod && (
                  <p>
                    Mode : {selected.shippingMethod === "express" ? "Express" : "Standard"}
                    {selected.estimatedDeliveryDays && ` · ${selected.estimatedDeliveryDays} jour(s)`}
                  </p>
                )}
                <p>{selected.address.fullName} · {selected.address.phone}</p>
                <p>{selected.address.address}, {selected.address.quartier}, {selected.address.commune}, {selected.address.city}</p>
              </div>
            )}

            <div className="mb-4">
              <p className="mb-1.5 text-sm font-medium text-fitora-gray">Changer le statut</p>
              <select
                value={selected.status}
                onChange={(e) => handleStatusChange(selected.id, e.target.value as OrderStatus)}
                className="input"
              >
                {[...ORDER_STATUS_STEPS, "cancelled" as const].map((s) => (
                  <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-fitora-gray-dim">
                Seul l'administrateur peut faire passer une commande de « Preuve reçue » à « Payée ».
              </p>
            </div>

            {selected.address ? (
              <a
                href={buildWhatsAppLink(
                  `Bonjour, concernant votre commande ${selected.number} sur FITORA...`,
                  (selected.address.whatsapp || selected.address.phone).replace(/\D/g, "")
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="w-full">
                  <MessageCircle size={16} /> Contacter le client sur WhatsApp
                </Button>
              </a>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: OrderStatus }) {
  const styles: Record<OrderStatus, string> = {
    pending_payment: "bg-yellow-500/10 text-yellow-400",
    payment_proof_received: "bg-blue-500/10 text-blue-400",
    paid: "bg-fitora-green/10 text-fitora-green",
    preparing: "bg-fitora-green/10 text-fitora-green",
    delivering: "bg-fitora-green/10 text-fitora-green",
    delivered: "bg-fitora-green/20 text-fitora-green",
    cancelled: "bg-red-500/10 text-red-400",
  };
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", styles[status])}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
