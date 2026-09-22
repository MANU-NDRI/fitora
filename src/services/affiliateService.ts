import { supabase } from "@/lib/supabase";

export interface AffiliateSummary {
  referralCode: string;
  affiliateDiscountCode: string;
  affiliateActive: boolean;
  clicksCount: number;
  registrationsCount: number;
  confirmedOrdersCount: number;
  rewardsCount: number;
  rewardsTotal: number;
  commissionPendingTotal: number;
  commissionValidatedTotal: number;
  commissionPaidTotal: number;
}

export interface AffiliateCommission {
  id: string;
  orderId: string;
  commissionAmount: number;
  commissionType: "percentage" | "fixed";
  status: "pending" | "validated" | "paid" | "cancelled";
  createdAt: string;
}

export interface AffiliateReward {
  id: string;
  amount: number;
  rewardType: "percentage" | "fixed";
  status: "issued" | "cancelled";
  createdAt: string;
  discountCode: string | null;
  discountExpiresAt: string | null;
}

/**
 * Récupère les statistiques de parrainage de l'utilisateur connecté via une
 * fonction Supabase sécurisée (security definer) : le client n'a jamais un
 * accès direct aux profils ou commandes d'autres clients, seulement à ces
 * agrégats calculés côté serveur pour son propre compte.
 */
export async function getMyAffiliateSummary(): Promise<AffiliateSummary | null> {
  const { data, error } = await supabase.rpc("get_my_affiliate_summary");

  if (error) {
    console.error("Erreur récupération résumé parrainage :", error);
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row || !row.referral_code) {
    return null;
  }

  return {
    referralCode: row.referral_code,
    affiliateDiscountCode: row.affiliate_discount_code,
    affiliateActive: row.affiliate_active ?? true,
    clicksCount: Number(row.clicks_count ?? 0),
    registrationsCount: Number(row.registrations_count ?? 0),
    confirmedOrdersCount: Number(row.confirmed_orders_count ?? 0),
    rewardsCount: Number(row.rewards_count ?? 0),
    rewardsTotal: Number(row.rewards_total ?? 0),
    commissionPendingTotal: Number(row.commission_pending_total ?? 0),
    commissionValidatedTotal: Number(row.commission_validated_total ?? 0),
    commissionPaidTotal: Number(row.commission_paid_total ?? 0),
  };
}

/** Historique des commissions liées à l'utilisation du code personnel de l'affilié. */
export async function getMyCommissions(): Promise<AffiliateCommission[]> {
  const { data, error } = await supabase
    .from("affiliate_commissions")
    .select("id, order_id, commission_amount, commission_type, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur récupération commissions :", error);
    throw error;
  }

  return ((data ?? []) as unknown as Array<{
    id: string;
    order_id: string;
    commission_amount: number;
    commission_type: "percentage" | "fixed";
    status: "pending" | "validated" | "paid" | "cancelled";
    created_at: string;
  }>).map((row) => ({
    id: row.id,
    orderId: row.order_id,
    commissionAmount: Number(row.commission_amount),
    commissionType: row.commission_type,
    status: row.status,
    createdAt: row.created_at,
  }));
}

/**
 * Enregistre un clic sur un lien d'affiliation. Appelable par un visiteur
 * non connecté (fonction anonyme côté base, voir migration Phase 4) : ne
 * fait qu'incrémenter un compteur agrégé, sans exposer aucune donnée
 * personnelle.
 */
export async function recordAffiliateClick(code: string): Promise<void> {
  try {
    await supabase.rpc("record_affiliate_click", { p_code: code });
  } catch (error) {
    // Non bloquant : un compteur de clics qui échoue à s'incrémenter ne doit
    // jamais empêcher la navigation du visiteur.
    console.error("Erreur enregistrement clic affiliation :", error);
  }
}

/**
 * Historique des récompenses attribuées au parrain connecté. Repose sur la
 * policy RLS "referrer_id = auth.uid()" de affiliate_rewards : impossible de
 * lire les récompenses d'un autre client.
 */
export async function getMyAffiliateRewards(): Promise<AffiliateReward[]> {
  const { data, error } = await supabase
    .from("affiliate_rewards")
    .select(
      "id, amount, reward_type, status, created_at, discount_codes(code, expires_at)"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur récupération récompenses parrainage :", error);
    throw error;
  }

  return ((data ?? []) as unknown as Array<{
    id: string;
    amount: number;
    reward_type: "percentage" | "fixed";
    status: "issued" | "cancelled";
    created_at: string;
    discount_codes: { code: string; expires_at: string | null } | null;
  }>).map((row) => ({
    id: row.id,
    amount: Number(row.amount),
    rewardType: row.reward_type,
    status: row.status,
    createdAt: row.created_at,
    discountCode: row.discount_codes?.code ?? null,
    discountExpiresAt: row.discount_codes?.expires_at ?? null,
  }));
}

export function buildAffiliateLink(referralCode: string): string {
  // Utilise l'origine actuelle du navigateur (fonctionne en local, en
  // prévisualisation et une fois déployé sur *.workers.dev ou un domaine
  // personnalisé) plutôt qu'une URL codée en dur.
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://fitora.fitora.workers.dev";
  return `${origin}/?ref=${referralCode}`;
}

const REFERRAL_STORAGE_KEY = "fitora-referral-code";

/**
 * Mémorise un code de parrainage présent dans l'URL (?ref=CODE) le temps que
 * le visiteur s'inscrive, potentiellement après avoir navigué sur plusieurs
 * pages. Purement informatif côté client : le code n'est vérifié et
 * appliqué que côté serveur, à l'inscription (voir authService.signUp).
 */
export function captureReferralCodeFromUrl(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref && ref.trim()) {
    const normalized = ref.trim().toUpperCase();
    const alreadyCaptured = sessionStorage.getItem(REFERRAL_STORAGE_KEY) === normalized;
    sessionStorage.setItem(REFERRAL_STORAGE_KEY, normalized);
    // On ne compte qu'un clic par code et par session — pas un par
    // navigation interne si le paramètre reste dans l'URL après un refresh.
    if (!alreadyCaptured) {
      void recordAffiliateClick(normalized);
    }
  }
}

export function getStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(REFERRAL_STORAGE_KEY);
}

export function clearStoredReferralCode(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
}
