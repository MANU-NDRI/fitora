import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/types";
import { adminGetAllOrders } from "@/services/orderService";

// Une session client est considérée "active maintenant" si son dernier
// signal de présence (last_seen_at) date de moins de 5 minutes. Au-delà,
// on ne l'affiche que comme "dernière activité" et non comme en ligne —
// évite les faux positifs d'un onglet resté ouvert sans être réellement
// utilisé, ou fermé sans déclencher d'événement de déconnexion.
const PRESENCE_WINDOW_MS = 5 * 60 * 1000;

export interface AdminCustomerView extends UserProfile {
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  isActiveNow: boolean;
  location: {
    consent: boolean;
    latitude: number | null;
    longitude: number | null;
    updatedAt: string | null;
  } | null;
}

function mapProfileRow(row: any): UserProfile {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone ?? "",
    role: row.role ?? "customer",
    createdAt: row.created_at,
    referralCode: row.referral_code ?? undefined,
    lastSeenAt: row.last_seen_at ?? null,
  };
}

function isActiveNow(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < PRESENCE_WINDOW_MS;
}

/**
 * Liste les clients inscrits (profils Supabase réels, role = 'customer')
 * avec leurs statistiques de commande et leur statut de présence. Remplace
 * l'ancienne implémentation qui lisait un faux magasin localStorage
 * ("fitora-demo-users") jamais alimenté par le vrai flux d'inscription
 * Supabase Auth — la page admin clients était donc toujours vide.
 */
export async function adminGetCustomers(): Promise<AdminCustomerView[]> {
  const [{ data: profiles, error: profilesError }, orders, { data: locations, error: locationsError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone, role, created_at, referral_code, last_seen_at")
        .eq("role", "customer")
        .order("created_at", { ascending: false }),
      adminGetAllOrders(),
      supabase.from("customer_locations").select("customer_id, consent, latitude, longitude, updated_at"),
    ]);

  if (profilesError) {
    throw profilesError;
  }
  if (locationsError) {
    // Non bloquant : si la table n'existe pas encore (migration Phase 3 non
    // appliquée), on affiche simplement la liste sans les positions plutôt
    // que de casser toute la page clients.
    console.error("Erreur lecture positions clients :", locationsError);
  }

  const users = ((profiles ?? []) as unknown[]).map(mapProfileRow);
  const locationByCustomer = new Map<
    string,
    { consent: boolean; latitude: number | null; longitude: number | null; updatedAt: string | null }
  >();
  ((locations ?? []) as unknown as Array<{
    customer_id: string;
    consent: boolean;
    latitude: number | null;
    longitude: number | null;
    updated_at: string;
  }>).forEach((row) => {
    locationByCustomer.set(row.customer_id, {
      consent: row.consent,
      latitude: row.latitude,
      longitude: row.longitude,
      updatedAt: row.updated_at,
    });
  });

  return users.map((user) => {
    const customerOrders = orders.filter((o) => o.customerId === user.id);
    const totalSpent = customerOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + o.total, 0);
    const lastOrderAt = customerOrders.length
      ? customerOrders.reduce(
          (latest, o) => (o.createdAt > latest ? o.createdAt : latest),
          customerOrders[0].createdAt
        )
      : null;

    return {
      ...user,
      ordersCount: customerOrders.length,
      totalSpent,
      lastOrderAt,
      isActiveNow: isActiveNow(user.lastSeenAt),
      location: locationByCustomer.get(user.id) ?? null,
    };
  });
}
