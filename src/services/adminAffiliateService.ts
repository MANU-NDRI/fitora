import { supabase } from "@/lib/supabase";
import { adminGetAllOrders } from "@/services/orderService";

export interface AdminAffiliateView {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  referralCode: string;
  affiliateDiscountCode: string;
  affiliateActive: boolean;
  clicksCount: number;
  registrationsCount: number;
  commissionPendingTotal: number;
  commissionValidatedTotal: number;
  commissionPaidTotal: number;
}

export interface AdminCommissionView {
  id: string;
  affiliateId: string;
  affiliateName: string;
  orderId: string;
  orderNumber: string;
  commissionAmount: number;
  status: "pending" | "validated" | "paid" | "cancelled";
  createdAt: string;
}

/**
 * Vue admin du programme d'affiliation. Repose entièrement sur les policies
 * RLS "is_admin()" déjà en place (profiles, affiliate_commissions,
 * affiliate_click_counts) — aucun accès élevé supplémentaire nécessaire ici.
 */
export async function adminGetAffiliates(): Promise<AdminAffiliateView[]> {
  const [
    { data: profiles, error: profilesError },
    { data: clicks, error: clicksError },
    { data: commissions, error: commissionsError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, referral_code, affiliate_discount_code, affiliate_active")
      .eq("role", "customer")
      .order("created_at", { ascending: false }),
    supabase.from("affiliate_click_counts").select("referral_code, clicks"),
    supabase.from("affiliate_commissions").select("affiliate_id, commission_amount, status"),
  ]);

  if (profilesError) throw profilesError;
  if (clicksError) console.error("Erreur lecture clics affiliation :", clicksError);
  if (commissionsError) console.error("Erreur lecture commissions :", commissionsError);

  const clicksByCode = new Map<string, number>();
  ((clicks ?? []) as unknown as Array<{ referral_code: string; clicks: number }>).forEach((c) => {
    clicksByCode.set(c.referral_code, c.clicks);
  });

  const commissionsByAffiliate = new Map<string, { pending: number; validated: number; paid: number }>();
  ((commissions ?? []) as unknown as Array<{ affiliate_id: string; commission_amount: number; status: string }>).forEach(
    (c) => {
      const entry = commissionsByAffiliate.get(c.affiliate_id) ?? { pending: 0, validated: 0, paid: 0 };
      if (c.status === "pending") entry.pending += Number(c.commission_amount);
      if (c.status === "validated") entry.validated += Number(c.commission_amount);
      if (c.status === "paid") entry.paid += Number(c.commission_amount);
      commissionsByAffiliate.set(c.affiliate_id, entry);
    }
  );

  const registrationCounts = new Map<string, number>();

  // Compte les inscriptions générées par référent (referred_by), en une
  // seule requête plutôt qu'une par affilié.
  const { data: referredRows } = await supabase.from("profiles").select("referred_by").not("referred_by", "is", null);
  ((referredRows ?? []) as unknown as Array<{ referred_by: string }>).forEach((r) => {
    registrationCounts.set(r.referred_by, (registrationCounts.get(r.referred_by) ?? 0) + 1);
  });

  return ((profiles ?? []) as unknown as Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    referral_code: string;
    affiliate_discount_code: string;
    affiliate_active: boolean;
  }>).map((p) => {
    const commissionTotals = commissionsByAffiliate.get(p.id) ?? { pending: 0, validated: 0, paid: 0 };
    return {
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      email: p.email,
      referralCode: p.referral_code,
      affiliateDiscountCode: p.affiliate_discount_code,
      affiliateActive: p.affiliate_active,
      clicksCount: clicksByCode.get(p.referral_code) ?? 0,
      registrationsCount: registrationCounts.get(p.id) ?? 0,
      commissionPendingTotal: commissionTotals.pending,
      commissionValidatedTotal: commissionTotals.validated,
      commissionPaidTotal: commissionTotals.paid,
    };
  });
}

export async function adminGetCommissions(): Promise<AdminCommissionView[]> {
  const [{ data, error }, orders, { data: profiles, error: profilesError }] = await Promise.all([
    supabase
      .from("affiliate_commissions")
      .select("id, affiliate_id, order_id, commission_amount, status, created_at")
      .order("created_at", { ascending: false }),
    adminGetAllOrders(),
    supabase.from("profiles").select("id, first_name, last_name"),
  ]);

  if (error) throw error;
  if (profilesError) console.error("Erreur lecture profils affiliés :", profilesError);

  const orderById = new Map(orders.map((o) => [o.id, o]));
  const nameById = new Map(
    ((profiles ?? []) as unknown as Array<{ id: string; first_name: string; last_name: string }>).map((p) => [
      p.id,
      `${p.first_name} ${p.last_name}`,
    ])
  );

  return ((data ?? []) as unknown as Array<{
    id: string;
    affiliate_id: string;
    order_id: string;
    commission_amount: number;
    status: "pending" | "validated" | "paid" | "cancelled";
    created_at: string;
  }>).map((row) => ({
    id: row.id,
    affiliateId: row.affiliate_id,
    affiliateName: nameById.get(row.affiliate_id) ?? "—",
    orderId: row.order_id,
    orderNumber: orderById.get(row.order_id)?.number ?? row.order_id.slice(0, 8),
    commissionAmount: Number(row.commission_amount),
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function adminSetAffiliateActive(affiliateId: string, active: boolean): Promise<void> {
  const { error } = await supabase.rpc("admin_set_affiliate_active", {
    p_affiliate_id: affiliateId,
    p_active: active,
  });
  if (error) throw error;
}

export async function adminUpdateCommissionStatus(
  commissionId: string,
  newStatus: "validated" | "paid" | "cancelled"
): Promise<void> {
  const { error } = await supabase.rpc("admin_update_commission_status", {
    p_commission_id: commissionId,
    p_new_status: newStatus,
  });
  if (error) throw error;
}
