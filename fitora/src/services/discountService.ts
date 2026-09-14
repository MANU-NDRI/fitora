import type { DiscountCode, DiscountType } from "@/types";
import { sendCustomerNotification } from "@/services/notificationService";

// Préfigure une future table Supabase `discount_codes`.
const STORAGE_KEY = "fitora-discount-codes";

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function read(): DiscountCode[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DiscountCode[]) : [];
  } catch {
    return [];
  }
}

function write(codes: DiscountCode[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "FITORA-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function adminCreateDiscountCode(input: {
  code?: string;
  type: DiscountType;
  value: number;
  customerId?: string;
  customerName?: string;
  maxUses?: number;
  expiresAt?: string;
}): Promise<DiscountCode> {
  const discountCode: DiscountCode = {
    id: `code-${Date.now()}`,
    code: (input.code?.trim() || generateCode()).toUpperCase(),
    type: input.type,
    value: input.value,
    customerId: input.customerId,
    customerName: input.customerName,
    maxUses: Math.max(1, input.maxUses ?? 1),
    usedCount: 0,
    expiresAt: input.expiresAt,
    createdAt: new Date().toISOString(),
  };

  write([discountCode, ...read()]);

  if (discountCode.customerId) {
    const valueLabel =
      discountCode.type === "percentage" ? `${discountCode.value}%` : `${discountCode.value} FCFA`;
    await sendCustomerNotification(discountCode.customerId, {
      title: "Un code de réduction vous a été offert 🎁",
      message: `Profitez de ${valueLabel} de réduction avec le code ${discountCode.code} lors de votre prochaine commande.`,
      link: "/boutique",
    });
  }

  return delay(discountCode);
}

export async function adminGetDiscountCodes(): Promise<DiscountCode[]> {
  return delay(read().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
}

export async function adminDeleteDiscountCode(id: string): Promise<void> {
  write(read().filter((c) => c.id !== id));
  return delay(undefined);
}

export interface DiscountValidationResult {
  valid: boolean;
  reason?: string;
  discountAmount?: number;
  code?: DiscountCode;
}

/**
 * Valide un code au checkout et calcule le montant de réduction applicable
 * au sous-total donné. Ne marque pas encore le code comme utilisé —
 * `redeemDiscountCode` s'en charge une fois la commande créée.
 */
export async function validateDiscountCode(
  rawCode: string,
  customerId: string,
  subtotal: number
): Promise<DiscountValidationResult> {
  const code = read().find((c) => c.code === rawCode.trim().toUpperCase());

  if (!code) return delay({ valid: false, reason: "Code de réduction introuvable." });
  if (code.usedCount >= code.maxUses) {
    return delay({ valid: false, reason: "Ce code a atteint son nombre maximum d'utilisations." });
  }
  if (code.customerId && code.customerId !== customerId) {
    return delay({ valid: false, reason: "Ce code ne correspond pas à votre compte." });
  }
  if (code.expiresAt && new Date(code.expiresAt).getTime() < Date.now()) {
    return delay({ valid: false, reason: "Ce code a expiré." });
  }

  const discountAmount =
    code.type === "percentage" ? Math.round(subtotal * (code.value / 100)) : Math.min(code.value, subtotal);

  return delay({ valid: true, discountAmount, code });
}

export async function redeemDiscountCode(codeId: string): Promise<void> {
  const codes = read();
  const code = codes.find((c) => c.id === codeId);
  if (code) {
    code.usedCount += 1;
    write(codes);
  }
  return delay(undefined, 50);
}
