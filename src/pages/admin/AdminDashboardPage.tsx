import { useEffect, useMemo, useState } from "react";
import { Wallet, ShoppingCart, Clock, CreditCard, Users, Package, AlertTriangle, TrendingUp } from "lucide-react";
import type { Order, Product } from "@/types";
import { adminGetAllOrders } from "@/services/orderService";
import { adminGetProducts } from "@/services/adminProductService";
import { adminGetCustomers } from "@/services/adminCustomerService";
import { AdminStatCard } from "@/components/ui/AdminStatCard";
import { SimpleBarChart } from "@/features/admin/SimpleBarChart";
import { formatFCFA } from "@/lib/format";

const LOW_STOCK_THRESHOLD = 5;

export function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customersCount, setCustomersCount] = useState(0);

  useEffect(() => {
    adminGetAllOrders().then(setOrders);
    adminGetProducts().then(setProducts);
    adminGetCustomers().then((c) => setCustomersCount(c.length));
  }, []);

  const today = new Date().toDateString();

  const revenue = orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + o.total, 0);
  const ordersToday = orders.filter((o) => new Date(o.createdAt).toDateString() === today).length;
  const pendingOrders = orders.filter((o) => o.status === "pending_payment").length;
  const paymentsToConfirm = orders.filter((o) => o.status === "payment_proof_received").length;
  const outOfStock = products.filter((p) => p.variants.every((v) => v.stockAvailable - v.stockReserved <= 0)).length;
  const lowStock = products.filter((p) =>
    p.variants.some((v) => {
      const avail = v.stockAvailable - v.stockReserved;
      return avail > 0 && avail <= LOW_STOCK_THRESHOLD;
    })
  ).length;

  const bestSellers = useMemo(
    () => [...products].sort((a, b) => b.salesCount - a.salesCount).slice(0, 5),
    [products]
  );

  const dailySales = useMemo(() => buildDailySales(orders), [orders]);
  const weeklySales = useMemo(() => buildWeeklySales(orders), [orders]);
  const monthlySales = useMemo(() => buildMonthlySales(orders), [orders]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <AdminStatCard icon={Wallet} label="Chiffre d'affaires" value={formatFCFA(revenue)} accent />
        <AdminStatCard icon={ShoppingCart} label="Commandes du jour" value={String(ordersToday)} />
        <AdminStatCard icon={Clock} label="Commandes en attente" value={String(pendingOrders)} />
        <AdminStatCard icon={CreditCard} label="Paiements à confirmer" value={String(paymentsToConfirm)} />
        <AdminStatCard icon={Users} label="Clients" value={String(customersCount)} />
        <AdminStatCard icon={Package} label="Produits" value={String(products.length)} />
        <AdminStatCard icon={AlertTriangle} label="Produits en rupture" value={String(outOfStock)} />
        <AdminStatCard icon={AlertTriangle} label="Presque en rupture" value={String(lowStock)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-fitora-charcoal p-6">
          <h3 className="mb-4 font-display text-sm font-semibold">Ventes quotidiennes (7 derniers jours)</h3>
          <SimpleBarChart data={dailySales} formatValue={(v) => `${v}`} />
        </div>
        <div className="rounded-2xl bg-fitora-charcoal p-6">
          <h3 className="mb-4 font-display text-sm font-semibold">Ventes hebdomadaires (6 semaines)</h3>
          <SimpleBarChart data={weeklySales} formatValue={(v) => `${v}`} />
        </div>
        <div className="rounded-2xl bg-fitora-charcoal p-6">
          <h3 className="mb-4 font-display text-sm font-semibold">Ventes mensuelles (6 mois)</h3>
          <SimpleBarChart data={monthlySales} formatValue={(v) => `${v}`} />
        </div>
      </div>

      <div className="rounded-2xl bg-fitora-charcoal p-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-fitora-green" />
          <h3 className="font-display text-sm font-semibold">Meilleures ventes</h3>
        </div>
        <ul className="divide-y divide-fitora-border">
          {bestSellers.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <img src={p.images[0]} alt={p.name} className="h-10 w-10 rounded-lg object-cover" />
                <p className="text-sm">{p.name}</p>
              </div>
              <p className="text-sm font-semibold text-fitora-green">{p.salesCount} ventes</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function buildDailySales(orders: Order[]) {
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  return days.map((d) => ({
    label: d.toLocaleDateString("fr-FR", { weekday: "short" }),
    value: orders.filter(
      (o) => o.status !== "cancelled" && new Date(o.createdAt).toDateString() === d.toDateString()
    ).length,
  }));
}

function buildWeeklySales(orders: Order[]) {
  const weeks = Array.from({ length: 6 }).map((_, i) => 5 - i);
  return weeks.map((weeksAgo) => {
    const end = new Date();
    end.setDate(end.getDate() - weeksAgo * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    return {
      label: weeksAgo === 0 ? "Cette sem." : `S-${weeksAgo}`,
      value: orders.filter((o) => {
        const date = new Date(o.createdAt);
        return o.status !== "cancelled" && date > start && date <= end;
      }).length,
    };
  });
}

function buildMonthlySales(orders: Order[]) {
  const months = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return d;
  });
  return months.map((d) => ({
    label: d.toLocaleDateString("fr-FR", { month: "short" }),
    value: orders.filter((o) => {
      const date = new Date(o.createdAt);
      return (
        o.status !== "cancelled" &&
        date.getMonth() === d.getMonth() &&
        date.getFullYear() === d.getFullYear()
      );
    }).length,
  }));
}
