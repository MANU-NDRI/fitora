import { useEffect, useState } from "react";
import { adminGetCustomers, type AdminCustomerView } from "@/services/adminCustomerService";
import { formatFCFA, formatDate } from "@/lib/format";

export function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomerView[]>([]);

  useEffect(() => {
    adminGetCustomers().then(setCustomers);
  }, []);

  return (
    <div>
      <h1 className="mb-6 font-display text-xl font-bold">Clients ({customers.length})</h1>

      <div className="overflow-x-auto rounded-2xl bg-fitora-charcoal">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-fitora-border text-left text-xs uppercase text-fitora-gray">
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Téléphone</th>
              <th className="px-4 py-3">Inscription</th>
              <th className="px-4 py-3">Commandes</th>
              <th className="px-4 py-3">Total dépensé</th>
              <th className="px-4 py-3">Dernière commande</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-fitora-border">
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium">{c.firstName} {c.lastName}</td>
                <td className="px-4 py-3 text-fitora-gray">{c.email}</td>
                <td className="px-4 py-3 text-fitora-gray">{c.phone}</td>
                <td className="px-4 py-3 text-fitora-gray">{formatDate(c.createdAt)}</td>
                <td className="px-4 py-3">{c.ordersCount}</td>
                <td className="px-4 py-3 font-semibold text-fitora-green">{formatFCFA(c.totalSpent)}</td>
                <td className="px-4 py-3 text-fitora-gray">
                  {c.lastOrderAt ? formatDate(c.lastOrderAt) : "—"}
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-fitora-gray">
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
