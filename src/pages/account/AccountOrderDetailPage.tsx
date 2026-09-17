import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MessageCircle, ChevronRight, Star, MapPin } from "lucide-react";
import type { Order } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { getOrderById, ORDER_STATUS_LABELS } from "@/services/orderService";
import { PAYMENT_METHOD_LABELS } from "@/services/settingsService";
import { isProductReviewed, submitProductReview } from "@/services/reviewService";
import { formatFCFA, formatDateTime } from "@/lib/format";
import { OrderTimeline } from "@/features/orders/OrderTimeline";
import { buildWhatsAppLink, whatsappOrderMessage } from "@/lib/whatsapp";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { StarRatingInput } from "@/components/ui/StarRatingInput";
import { useToastStore } from "@/store/toastStore";

export function AccountOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    if (user && id) getOrderById(user.id, id).then(setOrder);
  }, [user, id]);

  if (order === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-fitora-gray">Commande introuvable.</p>
        <Link to="/compte/commandes">
          <Button variant="outline">Retour à mes commandes</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-fitora-gray-dim">
        <Link to="/compte/commandes" className="hover:text-fitora-white">Mes commandes</Link>
        <ChevronRight size={12} />
        <span className="text-fitora-gray">{order.number}</span>
      </nav>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">{order.number}</h2>
          <p className="text-sm text-fitora-gray">Passée le {formatDateTime(order.createdAt)}</p>
        </div>
        <p className="font-display text-lg font-bold text-fitora-green">{formatFCFA(order.total)}</p>
      </div>

      {order.status === "pending_payment" && (
        <div className="mb-8 rounded-2xl border border-fitora-green/30 bg-fitora-green/5 p-6">
          <h3 className="mb-2 font-display font-bold">Paiement en attente</h3>
          <p className="text-sm text-fitora-gray">
            Envoyez votre preuve de paiement ({PAYMENT_METHOD_LABELS[order.paymentMethod]}) à FITORA
            sur WhatsApp pour que votre commande soit validée.
          </p>
          <a
            href={buildWhatsAppLink(
              whatsappOrderMessage({
                orderNumber: order.number,
                amount: formatFCFA(order.total),
                paymentMethod: PAYMENT_METHOD_LABELS[order.paymentMethod],
              })
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="mt-4">
              <MessageCircle size={16} /> Envoyer ma preuve sur WhatsApp
            </Button>
          </a>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl bg-fitora-charcoal p-6">
          <h3 className="mb-5 font-display font-bold">Suivi de commande</h3>
          <OrderTimeline status={order.status} />
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-fitora-charcoal p-6">
            <h3 className="mb-4 font-display font-bold">Articles</h3>
            <ul className="space-y-3">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <img src={item.image} alt={item.productName} className="h-16 w-16 rounded-lg object-cover" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.productName}</p>
                    <p className="text-xs text-fitora-gray">{item.variantLabel} · Qté {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold">{formatFCFA(item.unitPrice * item.quantity)}</p>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-1.5 border-t border-fitora-border pt-4 text-sm">
              <div className="flex justify-between text-fitora-gray">
                <span>Sous-total</span>
                <span>{formatFCFA(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-fitora-gray">
                <span>Livraison</span>
                <span>{formatFCFA(order.deliveryFee)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-fitora-green">
                  <span>Réduction{order.discountCode && ` (${order.discountCode})`}</span>
                  <span>-{formatFCFA(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-display font-bold">
                <span>Total</span>
                <span className="text-fitora-green">{formatFCFA(order.total)}</span>
              </div>
            </div>
          </div>

          {order.address && (
            <div className="rounded-2xl bg-fitora-charcoal p-6">
              <h3 className="mb-2 font-display font-bold">Livraison</h3>
              {order.shippingMethod && (
                <p className="mb-1 text-sm text-fitora-gray">
                  Mode : <span className="font-medium text-fitora-white">{order.shippingMethod === "express" ? "Express" : "Standard"}</span>
                  {order.estimatedDeliveryDays && ` · Délai estimé : ${order.estimatedDeliveryDays} jour(s)`}
                </p>
              )}
              <p className="text-sm text-fitora-gray">{order.address.fullName} · {order.address.phone}</p>
              <p className="text-sm text-fitora-gray">
                {order.address.address}, {order.address.quartier}, {order.address.commune}, {order.address.city}
              </p>
              {order.address.latitude && order.address.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${order.address.latitude},${order.address.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-fitora-green hover:underline"
                >
                  <MapPin size={13} /> Voir ma position GPS partagée
                </a>
              )}
            </div>
          )}

          <div className="rounded-2xl bg-fitora-charcoal p-6">
            <h3 className="mb-2 font-display font-bold">Paiement</h3>
            <p className="text-sm text-fitora-gray">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</p>
            <p className="mt-1 text-sm text-fitora-gray">Statut : {ORDER_STATUS_LABELS[order.status]}</p>
          </div>
        </div>
      </div>

      {order.status === "delivered" && (
        <div className="mt-8 rounded-2xl bg-fitora-charcoal p-6">
          <div className="mb-4 flex items-center gap-2">
            <Star size={16} className="text-fitora-green" />
            <h3 className="font-display font-bold">Notez vos achats</h3>
          </div>
          <div className="space-y-4">
            {order.items.map((item) => (
              <ReviewItemForm key={item.id} orderId={order.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewItemForm({
  orderId,
  item,
}: {
  orderId: string;
  item: Order["items"][number];
}) {
  const user = useAuthStore((s) => s.user);
  const pushToast = useToastStore((s) => s.push);
  const [alreadyReviewed, setAlreadyReviewed] = useState(
    user ? isProductReviewed(item.productId, user.id, orderId) : false
  );
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (alreadyReviewed) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-fitora-black/30 p-3">
        <img src={item.image} alt={item.productName} className="h-12 w-12 rounded-lg object-cover" />
        <p className="text-sm text-fitora-gray">
          <span className="font-medium text-fitora-white">{item.productName}</span> — Merci, votre avis a été publié !
        </p>
      </div>
    );
  }

  async function handleSubmit() {
    if (!user || rating === 0) return;
    setSubmitting(true);
    try {
      await submitProductReview({
        productId: item.productId,
        customerId: user.id,
        orderId,
        author: user.firstName,
        rating,
        comment,
      });
      pushToast("Merci pour votre avis !", "success");
      setAlreadyReviewed(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl bg-fitora-black/30 p-4">
      <div className="flex items-center gap-3">
        <img src={item.image} alt={item.productName} className="h-12 w-12 rounded-lg object-cover" />
        <p className="text-sm font-medium">{item.productName}</p>
      </div>
      <div className="mt-3">
        <StarRatingInput value={rating} onChange={setRating} size={20} />
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="Votre avis sur ce produit (optionnel)..."
        className="input mt-3 resize-none"
      />
      <Button size="sm" className="mt-3" onClick={handleSubmit} disabled={rating === 0 || submitting}>
        {submitting ? "Envoi..." : "Publier mon avis"}
      </Button>
    </div>
  );
}
