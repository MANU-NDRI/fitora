import { useEffect, useState } from "react";
import { Power, CheckCircle2, XCircle, Banknote } from "lucide-react";
import {
  adminGetAffiliates,
  adminGetCommissions,
  adminSetAffiliateActive,
  adminUpdateCommissionStatus,
  type AdminAffiliateView,
  type AdminCommissionView,
} from "@/services/adminAffiliateService";
import { useToastStore } from "@/store/toastStore";
import { formatFCFA, formatDateTime } from "@/lib/format";

const STATUS_LABEL: Record<AdminCommissionView["status"], string> = {
  pending: "En attente",
  validated: "Validée",
  paid: "Payée",
  cancelled: "Annulée",
};

export function AdminAffiliatesPage() {
  const [tab, setTab] = useState<"affiliates" | "commissions">("affiliates");
  const [affiliates, setAffiliates] = useState<AdminAffiliateView[] | null>(null);
  const [commissions, setCommissions] = useState<AdminCommissionView[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const pushToast = useToastStore((s) => s.push);

  function refreshAffiliates() {
    adminGetAffiliates()
      .then(setAffiliates)
      .catch(() => pushToast("Impossible de charger les affiliés.", "error"));
  }

  function refreshCommissions() {
    adminGetCommissions()
      .then(setCommissions)
      .catch(() => pushToast("Impossible de charger les commissions.", "error"));
  }

  useEffect(() => {
    refreshAffiliates();
    refreshCommissions();
  }, []);

  async function handleToggleActive(a: AdminAffiliateView) {
    setBusyId(a.id);
    try {
      await adminSetAffiliateActive(a.id, !a.affiliateActive);
      pushToast(a.affiliateActive ? "Affilié suspendu" : "Affilié réactivé", "success");
      refreshAffiliates();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Action impossible.", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCommissionAction(c: AdminCommissionView, status: "validated" | "paid" | "cancelled") {
    setBusyId(c.id);
    try {
      await adminUpdateCommissionStatus(c.id, status);
      pushToast("Commission mise à jour", "success");
      refreshCommissions();
      refreshAffiliates();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Action impossible.", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <h1 className="font-display text-xl font-bold">Programme d'affiliation</h1>
      </div>

      <div className="mb-6 flex gap-2 border-b border-fitora-border">
        <button
          onClick={() => setTab("affiliates")}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${tab === "affiliates" ? "border-fitora-green text-fitora-green" : "border-transparent text-fitora-gray"}`}
        >
          Affiliés ({affiliates?.length ?? "…"})
        </button>
        <button
          onClick={() => setTab("commissions")}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${tab === "commissions" ? "border-fitora-green text-fitora-green" : "border-transparent text-fitora-gray"}`}
        >
          Commissions ({commissions?.length ?? "…"})
        </button>
      </div>

      {tab === "affiliates" && (
        <div className="overflow-x-auto rounded-2xl bg-fitora-charcoal">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-fitora-border text-left text-xs uppercase text-fitora-gray">
                <th className="px-4 py-3">Affilié</th>
                <th className="px-4 py-3">Code réduction</th>
                <th className="px-4 py-3">Clics</th>
                <th className="px-4 py-3">Inscriptions</th>
                <th className="px-4 py-3">En attente</th>
                <th className="px-4 py-3">Validées</th>
                <th className="px-4 py-3">Payées</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fitora-border">
              {(affiliates ?? []).map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.firstName} {a.lastName}</p>
                    <p className="text-xs text-fitora-gray-dim">{a.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{a.affiliateDiscountCode}</td>
                  <td className="px-4 py-3">{a.clicksCount}</td>
                  <td className="px-4 py-3">{a.registrationsCount}</td>
                  <td className="px-4 py-3 text-amber-400">{formatFCFA(a.commissionPendingTotal)}</td>
                  <td className="px-4 py-3 text-fitora-green">{formatFCFA(a.commissionValidatedTotal)}</td>
                  <td className="px-4 py-3">{formatFCFA(a.commissionPaidTotal)}</td>
                  <td className="px-4 py-3">
                    {a.affiliateActive ? (
                      <span className="text-xs font-medium text-fitora-green">Actif</span>
                    ) : (
                      <span className="text-xs font-medium text-red-400">Suspendu</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(a)}
                      disabled={busyId === a.id}
                      className="flex items-center gap-1.5 rounded-full border border-fitora-border px-3 py-1.5 text-xs hover:bg-white/5 disabled:opacity-50"
                    >
                      <Power size={12} />
                      {a.affiliateActive ? "Suspendre" : "Réactiver"}
                    </button>
                  </td>
                </tr>
              ))}
              {affiliates && affiliates.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-fitora-gray">
                    Aucun affilié pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "commissions" && (
        <div className="overflow-x-auto rounded-2xl bg-fitora-charcoal">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-fitora-border text-left text-xs uppercase text-fitora-gray">
                <th className="px-4 py-3">Affilié</th>
                <th className="px-4 py-3">Commande</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fitora-border">
              {(commissions ?? []).map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">{c.affiliateName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.orderNumber}</td>
                  <td className="px-4 py-3 font-semibold">{formatFCFA(c.commissionAmount)}</td>
                  <td className="px-4 py-3 text-fitora-gray">{formatDateTime(c.createdAt)}</td>
                  <td className="px-4 py-3">{STATUS_LABEL[c.status]}</td>
                  <td className="px-4 py-3">
                    {(c.status === "pending" || c.status === "validated") && (
                      <div className="flex gap-2">
                        {c.status === "pending" && (
                          <button
                            onClick={() => handleCommissionAction(c, "validated")}
                            disabled={busyId === c.id}
                            className="flex items-center gap-1 rounded-full border border-fitora-border px-2.5 py-1 text-xs hover:bg-white/5 disabled:opacity-50"
                          >
                            <CheckCircle2 size={12} /> Valider
                          </button>
                        )}
                        {c.status === "validated" && (
                          <button
                            onClick={() => handleCommissionAction(c, "paid")}
                            disabled={busyId === c.id}
                            className="flex items-center gap-1 rounded-full border border-fitora-border px-2.5 py-1 text-xs hover:bg-white/5 disabled:opacity-50"
                          >
                            <Banknote size={12} /> Marquer payée
                          </button>
                        )}
                        <button
                          onClick={() => handleCommissionAction(c, "cancelled")}
                          disabled={busyId === c.id}
                          className="flex items-center gap-1 rounded-full border border-fitora-border px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          <XCircle size={12} /> Annuler
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {commissions && commissions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-fitora-gray">
                    Aucune commission pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
