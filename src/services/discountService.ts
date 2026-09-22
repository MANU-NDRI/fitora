
import { supabase } from "@/lib/supabase";
import type { DiscountCode, DiscountType } from "@/types";
import { sendCustomerNotification } from "@/services/notificationService";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

interface DiscountCodeRow {
  id: string;
  code: string;
  type: DiscountType;
  value: number | string;
  customer_id: string | null;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

interface CustomerProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

// ---------------------------------------------------------------------------
// MAPPING
// ---------------------------------------------------------------------------

function mapDiscountCode(
  row: DiscountCodeRow,
  customerName?: string
): DiscountCode {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    value: Number(row.value),
    customerId: row.customer_id ?? undefined,
    customerName: customerName || undefined,
    maxUses: Number(row.max_uses),
    usedCount: Number(row.used_count),
    expiresAt: row.expires_at ?? undefined,
    createdAt: row.created_at,
  };
}

function getCustomerFullName(
  profile: CustomerProfileRow
): string {
  return `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
}

async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

// ---------------------------------------------------------------------------
// GÉNÉRATION DU CODE
// ---------------------------------------------------------------------------

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "FITORA-";

  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

// Sélection des colonnes existantes dans discount_codes.
// Ne pas joindre profiles.full_name : cette colonne n'existe pas.
const discountSelect = `
  id,
  code,
  type,
  value,
  customer_id,
  max_uses,
  used_count,
  expires_at,
  created_by,
  created_at
`;

// ---------------------------------------------------------------------------
// ADMIN : CRÉER UN CODE DE RÉDUCTION
// ---------------------------------------------------------------------------

export async function adminCreateDiscountCode(input: {
  code?: string;
  type: DiscountType;
  value: number;
  customerId?: string;
  customerName?: string;
  maxUses?: number;
  expiresAt?: string;
}): Promise<DiscountCode> {
  const createdBy = await getCurrentUserId();

  if (!createdBy) {
    throw new Error("Vous devez être connecté.");
  }

  const code = (input.code?.trim() || generateCode()).toUpperCase();
  const maxUses = Math.max(1, Math.floor(input.maxUses ?? 1));
  const value = Math.max(0, input.value);

  if (!Number.isFinite(value)) {
    throw new Error("La valeur de la réduction est invalide.");
  }

  if (input.type === "percentage" && value > 100) {
    throw new Error("La réduction en pourcentage ne peut pas dépasser 100 %.");
  }

  const { data, error } = await supabase
    .from("discount_codes")
    .insert({
      code,
      type: input.type,
      value,
      customer_id: input.customerId || null,
      max_uses: maxUses,
      used_count: 0,
      expires_at: input.expiresAt || null,
      created_by: createdBy,
    })
    .select(discountSelect)
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ce code promo existe déjà.");
    }

    console.error("Erreur création code de réduction :", error);
    throw new Error(error.message || "Impossible de créer le code de réduction.");
  }

  const discountCode = mapDiscountCode(
    data as unknown as DiscountCodeRow,
    input.customerName
  );

  // Notification facultative : une erreur de notification
  // ne doit pas annuler ni masquer la création réussie du code.
  if (discountCode.customerId) {
    const valueLabel =
      discountCode.type === "percentage"
        ? `${discountCode.value}%`
        : `${discountCode.value} FCFA`;

    try {
      await sendCustomerNotification(discountCode.customerId, {
        title: "Un code de réduction vous a été offert 🎁",
        message: `Profitez de ${valueLabel} de réduction avec le code ${discountCode.code} lors de votre prochaine commande.`,
        link: "/boutique",
      });
    } catch (notificationError) {
      console.error(
        "Code créé, mais erreur lors de la notification du client :",
        notificationError
      );
    }
  }

  return discountCode;
}

// ---------------------------------------------------------------------------
// ADMIN : RÉCUPÉRER LES CODES DE RÉDUCTION
// ---------------------------------------------------------------------------

export async function adminGetDiscountCodes(): Promise<DiscountCode[]> {
  const { data, error } = await supabase
    .from("discount_codes")
    .select(discountSelect)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur lecture codes de réduction :", error);
    throw error;
  }

  const rows = (data ?? []) as unknown as DiscountCodeRow[];

  if (rows.length === 0) {
    return [];
  }

  // Récupérer les identifiants uniques des clients associés aux codes.
  const customerIds = [
    ...new Set(
      rows
        .map((row) => row.customer_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  // Aucun code attribué à un client précis.
  if (customerIds.length === 0) {
    return rows.map((row) => mapDiscountCode(row));
  }

  // Les profils utilisent first_name et last_name,
  // et non full_name.
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .in("id", customerIds);

  if (profilesError) {
    console.error("Erreur lecture noms des clients :", profilesError);
    throw profilesError;
  }

  const customerNames = new Map<string, string>(
    ((profiles ?? []) as CustomerProfileRow[]).map((profile) => [
      profile.id,
      getCustomerFullName(profile),
    ])
  );

  return rows.map((row) =>
    mapDiscountCode(
      row,
      row.customer_id
        ? customerNames.get(row.customer_id) || undefined
        : undefined
    )
  );
}

// ---------------------------------------------------------------------------
// ADMIN : SUPPRIMER UN CODE DE RÉDUCTION
// ---------------------------------------------------------------------------

export async function adminDeleteDiscountCode(
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("discount_codes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erreur suppression code de réduction :", error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// VALIDATION D'UN CODE DE RÉDUCTION
// ---------------------------------------------------------------------------

export interface DiscountValidationResult {
  valid: boolean;
  reason?: string;
  discountAmount?: number;
  code?: DiscountCode;
}

export async function validateDiscountCode(
  rawCode: string,
  customerId: string,
  subtotal: number
): Promise<DiscountValidationResult> {
  const normalizedCode = rawCode.trim().toUpperCase();

  if (!normalizedCode) {
    return {
      valid: false,
      reason: "Veuillez saisir un code de réduction.",
    };
  }

  const { data, error } = await supabase
    .from("discount_codes")
    .select(discountSelect)
    .eq("code", normalizedCode)
    .maybeSingle();

  if (error) {
    console.error("Erreur validation code de réduction :", error);
    throw error;
  }

  if (!data) {
    return {
      valid: false,
      reason: "Code de réduction introuvable.",
    };
  }

  const code = mapDiscountCode(data as unknown as DiscountCodeRow);

  if (code.usedCount >= code.maxUses) {
    return {
      valid: false,
      reason: "Ce code a atteint son nombre maximum d'utilisations.",
    };
  }

  if (code.customerId && code.customerId !== customerId) {
    return {
      valid: false,
      reason: "Ce code ne correspond pas à votre compte.",
    };
  }

  if (
    code.expiresAt &&
    new Date(code.expiresAt).getTime() < Date.now()
  ) {
    return {
      valid: false,
      reason: "Ce code a expiré.",
    };
  }

  const safeSubtotal = Math.max(0, subtotal);

  const discountAmount =
    code.type === "percentage"
      ? Math.round(safeSubtotal * (code.value / 100))
      : Math.min(code.value, safeSubtotal);

  return {
    valid: true,
    discountAmount,
    code,
  };
}

// ---------------------------------------------------------------------------
// UTILISATION DU CODE
// ---------------------------------------------------------------------------

/**
 * @deprecated
 * Ne pas appeler depuis le frontend.
 *
 * La validation et la consommation du code doivent être gérées
 * de façon atomique par create_order_transaction.
 *
 * Ne pas appeler cette fonction lors du paiement : cela pourrait
 * consommer le code une seconde fois.
 */
export async function redeemDiscountCode(
  codeId: string
): Promise<void> {
  const { error } = await supabase.rpc("redeem_discount_code", {
    p_code_id: codeId,
  });

  if (error) {
    throw new Error(error.message);
  }
}