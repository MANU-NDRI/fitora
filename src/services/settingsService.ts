import type { PaymentMethod } from "@/types";
import { FITORA_WHATSAPP_NUMBER } from "@/lib/whatsapp";

export interface ShopSettings {
  shopName: string;
  slogan: string;
  whatsapp: string;
  phone: string;
  email: string;
  address: string;
  deliveryFee: number;
  codEnabled: boolean; // paiement à la livraison
  paymentNumbers: Record<Exclude<PaymentMethod, "cash_on_delivery">, string>;
}

const STORAGE_KEY = "fitora-shop-settings";

const DEFAULT_SETTINGS: ShopSettings = {
  shopName: "FITORA",
  slogan: "SPORT • STYLE • PERFORMANCE",
  whatsapp: FITORA_WHATSAPP_NUMBER,
  phone: FITORA_WHATSAPP_NUMBER,
  email: "contact@fitora.ci",
  address: "Abidjan, Côte d'Ivoire",
  deliveryFee: 2000,
  codEnabled: true,
  paymentNumbers: {
    wave: "07 89 77 77 67",
    orange_money: "07 89 77 77 67",
    mtn_money: "05 89 77 77 67",
    moov_money: "01 89 77 77 67",
  },
};

function delay<T>(value: T, ms = 100): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function getShopSettings(): Promise<ShopSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return delay({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
  } catch {
    // ignore
  }
  return delay(DEFAULT_SETTINGS);
}

export async function saveShopSettings(settings: ShopSettings): Promise<ShopSettings> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  return delay(settings);
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  wave: "Wave",
  orange_money: "Orange Money",
  mtn_money: "MTN Mobile Money",
  moov_money: "Moov Money",
  cash_on_delivery: "Paiement à la livraison",
};
