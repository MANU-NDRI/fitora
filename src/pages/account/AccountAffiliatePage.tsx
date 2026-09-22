import { useEffect, useState } from "react";
import { Gift, Copy, Share2, Users, ShoppingBag, Ticket, MousePointerClick, Wallet } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import {
  getMyAffiliateSummary,
  getMyAffiliateRewards,
  getMyCommissions,
  buildAffiliateLink,
  type AffiliateSummary,
  type AffiliateReward,
  type AffiliateCommission,
} from "@/services/affiliateService";
import { formatFCFA, formatDateTime } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-fitora-charcoal p-5">
      <Icon size={18} className="mb-2 text-fitora-green" />
      <p className="font-display text-2xl font-bold">{value}</p>
      <p className="text-xs text-fitora-gray">{label}</p>
    </div>
  );
}

export function AccountAffiliatePage() {
  const user = useAuthStore((s) => s.user);
  const pushToast = useToastStore((s) => s.push);
  const [summary, setSummary] = useState<AffiliateSummary | null | undefined>(undefined);
  const [rewards, setRewards] = useState<AffiliateReward[]>([]);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [error, setError] = useState<string | null>(null);

 useEffect(() => {
  if (!user) return;

  Promise.all([
    getMyAffiliateSummary(),
    getMyAffiliateRewards(),
    getMyCommissions(),
  ])
    .then(([s, r, c]) => {
      setSummary(s);
      setRewards(r);
      setCommissions(c);
    })
    .catch((err) => {
      console.error(
        "Erreur chargement parrainage FITORA :",
        err
      );

      setError(
        "Impossible de charger votre programme de parrainage pour le moment. Réessayez plus tard."
      );

      setSummary(null);
    });
}, [user]);

  if (summary === undefined) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-fitora-border py-16 text-center">
        <Gift size={32} className="text-fitora-gray-dim" />
        <p className="text-fitora-gray">
          {error ?? "Votre code de parrainage n'est pas encore disponible."}
        </p>
      </div>
    );
  }

  const link = buildAffiliateLink(summary.referralCode);
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    `Découvre FITORA, ma boutique sport préférée ! Inscris-toi avec mon lien et profite de nos offres : ${link}`
  )}`;

  function copy(value: string, label: string) {
    navigator.clipboard
      .writeText(value)
      .then(() => pushToast(`${label} copié(e) !`, "success"))
      .catch(() => pushToast("Impossible de copier automatiquement.", "error"));
  }

  return (
    <div className="space-y-6">
      {!summary.affiliateActive && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400">
          Votre programme d'affiliation est actuellement suspendu par l'administration. Votre
          code de réduction personnel ne peut plus être utilisé. Contactez le support pour plus
          d'informations.
        </div>
      )}

      <div className="rounded-2xl bg-fitora-charcoal p-6">
        <div className="mb-1 flex items-center gap-2">
          <Gift size={18} className="text-fitora-green" />
          <h2 className="font-display text-lg font-bold">Programme de parrainage</h2>
        </div>
        <p className="mb-4 text-sm text-fitora-gray">
          Partagez votre lien personnel. Quand un ami s'inscrit et passe une commande livrée,
          vous recevez une récompense. Vous pouvez aussi partager votre code de réduction
          personnel : chaque commande passée avec ce code vous rapporte une commission.
        </p>

        <div className="mb-3">
          <p className="mb-1 text-xs uppercase tracking-wide text-fitora-gray">
            Votre code de parrainage (inscription)
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-xl bg-black/30 px-4 py-2.5 font-mono text-sm">
              {summary.referralCode}
            </code>
            <Button variant="outline" onClick={() => copy(summary.referralCode, "Code")}>
              <Copy size={14} />
            </Button>
          </div>
        </div>

        <div className="mb-3">
          <p className="mb-1 text-xs uppercase tracking-wide text-fitora-gray">
            Votre code de réduction personnel (à donner à vos proches)
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-xl bg-black/30 px-4 py-2.5 font-mono text-sm">
              {summary.affiliateDiscountCode}
            </code>
            <Button
              variant="outline"
              onClick={() => copy(summary.affiliateDiscountCode, "Code de réduction")}
            >
              <Copy size={14} />
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <p className="mb-1 text-xs uppercase tracking-wide text-fitora-gray">Votre lien</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={link}
              className="flex-1 truncate rounded-xl bg-black/30 px-4 py-2.5 text-sm text-fitora-gray"
            />
            <Button variant="outline" onClick={() => copy(link, "Lien")}>
              <Copy size={14} />
            </Button>
          </div>
        </div>

        <a href={whatsappShareUrl} target="_blank" rel="noopener noreferrer">
          <Button className="w-full sm:w-auto">
            <Share2 size={16} />
            Partager sur WhatsApp
          </Button>
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={MousePointerClick} label="Clics sur votre lien" value={summary.clicksCount} />
        <StatCard icon={Users} label="Inscriptions" value={summary.registrationsCount} />
        <StatCard icon={ShoppingBag} label="Commandes livrées (filleuls)" value={summary.confirmedOrdersCount} />
        <StatCard icon={Ticket} label="Récompenses reçues" value={summary.rewardsCount} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Wallet} label="Commissions en attente" value={formatFCFA(summary.commissionPendingTotal)} />
        <StatCard icon={Wallet} label="Commissions validées" value={formatFCFA(summary.commissionValidatedTotal)} />
        <StatCard icon={Wallet} label="Commissions payées" value={formatFCFA(summary.commissionPaidTotal)} />
      </div>

      <div>
        <h3 className="mb-3 font-display text-sm font-semibold text-fitora-gray">
          Historique des commissions (code de réduction)
        </h3>
        {commissions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-fitora-border py-10 text-center text-sm text-fitora-gray">
            Aucune commission pour le moment. Elle apparaît ici dès qu'un client utilise votre
            code de réduction personnel lors d'une commande.
          </p>
        ) : (
          <ul className="space-y-2">
            {commissions.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-xl bg-fitora-charcoal p-4">
                <div>
                  <p className="text-sm font-semibold">{formatFCFA(c.commissionAmount)}</p>
                  <p className="text-xs text-fitora-gray-dim">{formatDateTime(c.createdAt)}</p>
                </div>
                <span
                  className={
                    c.status === "paid"
                      ? "rounded-full bg-fitora-green/10 px-2 py-0.5 text-[11px] font-medium text-fitora-green"
                      : c.status === "cancelled"
                        ? "rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-fitora-gray"
                        : "rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400"
                  }
                >
                  {c.status === "pending" && "En attente"}
                  {c.status === "validated" && "Validée"}
                  {c.status === "paid" && "Payée"}
                  {c.status === "cancelled" && "Annulée"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-3 font-display text-sm font-semibold text-fitora-gray">
          Historique des récompenses (parrainage)
        </h3>
        {rewards.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-fitora-border py-10 text-center text-sm text-fitora-gray">
            Aucune récompense pour le moment. Elle apparaît ici dès qu'une commande d'un
            filleul est livrée.
          </p>
        ) : (
          <ul className="space-y-2">
            {rewards.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-xl bg-fitora-charcoal p-4">
                <div>
                  <p className="text-sm font-semibold">
                    {r.rewardType === "percentage" ? `-${r.amount}%` : formatFCFA(r.amount)}
                    {r.discountCode ? (
                      <span className="ml-2 font-mono text-xs text-fitora-gray">{r.discountCode}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-fitora-gray-dim">{formatDateTime(r.createdAt)}</p>
                </div>
                <span
                  className={
                    r.status === "issued"
                      ? "rounded-full bg-fitora-green/10 px-2 py-0.5 text-[11px] font-medium text-fitora-green"
                      : "rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-fitora-gray"
                  }
                >
                  {r.status === "issued" ? "Active" : "Annulée"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
