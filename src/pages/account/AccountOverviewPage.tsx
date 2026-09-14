import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Heart, MapPin, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getOrders } from "@/services/orderService";
import { useFavoritesStore } from "@/store/favoritesStore";
import { formatFCFA } from "@/lib/format";
import type { Order } from "@/types";

export function AccountOverviewPage() {
  const user = useAuthStore((s) => s.user);
  const favoritesCount = useFavoritesStore((s) => s.productIds.length);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (user) getOrders(user.id).then(setOrders);
  }, [user]);

  if (!user) return null;

  return (
    <div className="space-y-5 sm:space-y-8">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard icon={Package} label="Commandes" value={orders.length} to="/compte/commandes" />
        <StatCard icon={Heart} label="Favoris" value={favoritesCount} to="/compte/favoris" />
        <StatCard icon={MapPin} label="Adresses" value="Gérer" to="/compte/adresses" isText />
      </div>

      <div className="rounded-2xl bg-fitora-charcoal p-4 sm:p-6">
        <h2 className="mb-3 font-display text-base font-bold sm:mb-4 sm:text-lg">Informations personnelles</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Info label="Nom complet" value={`${user.firstName} ${user.lastName}`} />
          <Info label="Email" value={user.email} />
          <Info label="Téléphone" value={user.phone} />
          <Info label="Membre depuis" value={new Date(user.createdAt).toLocaleDateString("fr-FR")} />
        </dl>
        <Link
          to="/compte/profil"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-fitora-green hover:underline"
        >
          Modifier mon profil <ChevronRight size={14} />
        </Link>
      </div>

      {orders.length > 0 && (
        <div className="rounded-2xl bg-fitora-charcoal p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <h2 className="font-display text-lg font-bold">Dernières commandes</h2>
            <Link to="/compte/commandes" className="text-sm text-fitora-green hover:underline">
              Voir tout
            </Link>
          </div>
          <ul className="divide-y divide-fitora-border">
            {orders.slice(0, 3).map((order) => (
              <li key={order.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="max-w-[60%] truncate text-xs font-semibold sm:text-sm">{order.number}</p>
                  <p className="text-xs text-fitora-gray">
                    {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <p className="font-display text-sm font-bold text-fitora-green">
                  {formatFCFA(order.total)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  to,
  isText,
}: {
  icon: typeof Package;
  label: string;
  value: string | number;
  to: string;
  isText?: boolean;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 rounded-2xl bg-fitora-charcoal p-4 transition-colors hover:bg-fitora-charcoal-light sm:gap-3 sm:p-5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fitora-green/10 text-fitora-green sm:h-11 sm:w-11">
        <Icon size={20} />
      </div>
      <div>
        <p className={isText ? "font-display text-sm font-bold" : "font-display text-lg font-bold sm:text-xl"}>
          {value}
        </p>
        <p className="text-xs text-fitora-gray">{label}</p>
      </div>
    </Link>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-fitora-gray">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}
