import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, ChevronRight } from "lucide-react";
import type { Order } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { getOrders, ORDER_STATUS_LABELS } from "@/services/orderService";
import { formatFCFA, formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const STATUS_STYLES: Record<Order["status"], string> = {
  pending_payment: "bg-yellow-500/10 text-yellow-400",
  payment_proof_received: "bg-blue-500/10 text-blue-400",
  paid: "bg-fitora-green/10 text-fitora-green",
  preparing: "bg-fitora-green/10 text-fitora-green",
  delivering: "bg-fitora-green/10 text-fitora-green",
  delivered: "bg-fitora-green/20 text-fitora-green",
  cancelled: "bg-red-500/10 text-red-400",
};

export function AccountOrdersPage() {
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (user) getOrders(user.id).then(setOrders);
  }, [user]);

  if (orders === null) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-fitora-border py-16 text-center">
        <Package size={32} className="text-fitora-gray-dim" />
        <p className="text-fitora-gray">Vous n'avez pas encore passé de commande.</p>
        <Link to="/boutique">
          <Button variant="outline">Découvrir la boutique</Button>
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            to={`/compte/commandes/${order.id}`}
            className="flex items-center justify-between gap-4 rounded-2xl bg-fitora-charcoal p-5 transition-colors hover:bg-fitora-charcoal-light"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-display text-sm font-bold">{order.number}</p>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_STYLES[order.status])}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>
              <p className="mt-1 text-xs text-fitora-gray">
                {formatDate(order.createdAt)} · {order.items.length} article{order.items.length > 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-display font-bold text-fitora-green">{formatFCFA(order.total)}</p>
              <ChevronRight size={16} className="text-fitora-gray-dim" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
