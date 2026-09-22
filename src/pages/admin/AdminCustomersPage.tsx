import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { adminGetCustomers, type AdminCustomerView } from "@/services/adminCustomerService";
import { formatFCFA, formatDate, formatDateTime } from "@/lib/format";

export function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomerView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminGetCustomers()
      .then(setCustomers)
      .catch((e) => {
        console.error("Erreur chargement clients :", e);
        setError("Impossible de charger la liste des clients pour le moment.");
        setCustomers([]);
      });
  }, []);

  const activeCount = (customers ?? []).filter((c) => c.isActiveNow).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold">
          Clients ({customers?.length ?? "…"})
        </h1>
        <span className="flex items-center gap-2 rounded-full bg-fitora-green/10 px-3 py-1 text-xs font-medium text-fitora-green">
          <span className="h-2 w-2 rounded-full bg-fitora-green" />
          {activeCount} actif{activeCount > 1 ? "s" : ""} maintenant
        </span>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-2xl bg-fitora-charcoal">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-fitora-border text-left text-xs uppercase text-fitora-gray">
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Téléphone</th>
              <th className="px-4 py-3">Inscription</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Commandes</th>
              <th className="px-4 py-3">Total dépensé</th>
              <th className="px-4 py-3">Dernière commande</th>
              <th className="px-4 py-3">Position</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-fitora-border">
            {(customers ?? []).map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium">
                  {c.firstName} {c.lastName}
                </td>
                <td className="px-4 py-3 text-fitora-gray">{c.email}</td>
                <td className="px-4 py-3 text-fitora-gray">{c.phone}</td>
                <td className="px-4 py-3 text-fitora-gray">{formatDate(c.createdAt)}</td>
                <td className="px-4 py-3">
                  {c.isActiveNow ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-fitora-green">
                      <span className="h-1.5 w-1.5 rounded-full bg-fitora-green" />
                      Actif maintenant
                    </span>
                  ) : (
                    <span className="text-xs text-fitora-gray-dim">
                      {c.lastSeenAt ? `Vu ${formatDateTime(c.lastSeenAt)}` : "Jamais connecté"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{c.ordersCount}</td>
                <td className="px-4 py-3 font-semibold text-fitora-green">{formatFCFA(c.totalSpent)}</td>
                <td className="px-4 py-3 text-fitora-gray">
                  {c.lastOrderAt ? formatDate(c.lastOrderAt) : "—"}
                </td>
                <td className="px-4 py-3">
                  {c.location?.consent && c.location.latitude != null && c.location.longitude != null ? (
                    <a
                      href={`https://www.google.com/maps?q=${c.location.latitude},${c.location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-fitora-green hover:underline"
                      title={c.location.updatedAt ? `Mis à jour ${formatDateTime(c.location.updatedAt)}` : undefined}
                    >
                      <MapPin size={14} />
                      Voir sur la carte
                    </a>
                  ) : (
                    <span className="text-xs text-fitora-gray-dim">Non partagée</span>
                  )}
                </td>
              </tr>
            ))}
            {customers && customers.length === 0 && !error && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-fitora-gray">
                  Aucun client inscrit pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
