import { supabase } from "@/lib/supabase";
import type { DiscountCode, DiscountType } from "@/types";
import { sendCustomerNotification } from "@/services/notificationService";

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
  profiles?: {
    full_name: string | null;
  } | null;
}

function mapDiscountCode(row: DiscountCodeRow): DiscountCode {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    value: Number(row.value),
    customerId: row.customer_id ?? undefined,
    customerName: row.profiles?.full_name ?? undefined,
    maxUses: Number(row.max_uses),
    usedCount: Number(row.used_count),
    expiresAt: row.expires_at ?? undefined,
    createdAt: row.created_at,
  };
}

async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "FITORA-";

  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

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
  created_at,
  profiles:customer_id (
    full_name
  )
`;

// ---------------------------------------------------------------------------
// ADMIN
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
  const maxUses = Math.max(1, input.maxUses ?? 1);
  const value = Math.max(0, input.value);

  const { data, error } = await supabase
    .from("discount_codes")
    .insert({
      code,
      type: input.type,
      value,
      customer_id: input.customerId ?? null,
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

    throw error;
  }

  const discountCode = mapDiscountCode(
    data as unknown as DiscountCodeRow,
  );

  if (discountCode.customerId) {
    const valueLabel =
      discountCode.type === "percentage"
        ? `${discountCode.value}%`
        : `${discountCode.value} FCFA`;

    await sendCustomerNotification(discountCode.customerId, {
      title: "Un code de réduction vous a été offert 🎁",
      message: `Profitez de ${valueLabel} de réduction avec le code ${discountCode.code} lors de votre prochaine commande.`,
      link: "/boutique",
    });
  }

  return discountCode;
}

export async function adminGetDiscountCodes(): Promise<DiscountCode[]> {
  const { data, error } = await supabase
    .from("discount_codes")
    .select(discountSelect)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) =>
    mapDiscountCode(row as unknown as DiscountCodeRow),
  );
}

export async function adminDeleteDiscountCode(
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("discount_codes")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}

// ---------------------------------------------------------------------------
// VALIDATION
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
  subtotal: number,
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
    throw error;
  }

  if (!data) {
    return {
      valid: false,
      reason: "Code de réduction introuvable.",
    };
  }

  const code = mapDiscountCode(
    data as unknown as DiscountCodeRow,
  );

  if (code.usedCount >= code.maxUses) {
    return {
      valid: false,
      reason:
        "Ce code a atteint son nombre maximum d'utilisations.",
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

export async function redeemDiscountCode(
  codeId: string,
): Promise<void> {
  const { error } = await supabase.rpc("redeem_discount_code", {
    p_code_id: codeId,
  });

  if (error) {
    throw new Error(error.message);
  }
}