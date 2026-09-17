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
  // Expédition — la boutique propose deux modes au client au checkout :
  // "standard" (tarif de base fixé par l'administrateur) et "express"
  // (majoration appliquée automatiquement sur le tarif standard).
  standardDeliveryDays: number;
  expressDeliveryDays: number;
  expressSurchargeRate: number; // ex: 100 => l'express coûte 100% de plus (double), 2 => +2%
  // Image de fond du hero sur la page d'accueil (URL ou image téléversée
  // encodée en base64). Si vide, l'image de démonstration par défaut est utilisée.
  heroImageUrl?: string;
  // Politique de retour affichée publiquement sur /aide/retours, éditable
  // librement par l'administrateur.
  returnPolicy: string;
}

export const DEFAULT_HERO_IMAGE = "https://picsum.photos/seed/fitora-hero/1600/1200";

export const DEFAULT_RETURN_POLICY = `Vous disposez de 7 jours après réception de votre commande pour demander un retour ou un échange, à condition que l'article soit inutilisé, dans son emballage d'origine et accompagné de la preuve d'achat.

Pour initier un retour, contactez-nous directement sur WhatsApp en précisant votre numéro de commande. Nos équipes vous indiqueront la marche à suivre.

Les frais de retour sont à la charge du client, sauf en cas d'erreur de notre part (produit défectueux ou non conforme à la commande). Le remboursement ou l'échange est effectué dans un délai de 5 jours ouvrés après réception et vérification de l'article retourné.

Certains articles (sous-vêtements, chaussettes, produits personnalisés) ne peuvent faire l'objet d'un retour pour des raisons d'hygiène, sauf défaut avéré.`;

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
  standardDeliveryDays: 4,
  expressDeliveryDays: 2,
  expressSurchargeRate: 2,
  heroImageUrl: undefined,
  returnPolicy: DEFAULT_RETURN_POLICY,
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

export const SHIPPING_METHOD_LABELS: Record<"standard" | "express", string> = {
  standard: "Livraison standard",
  express: "Livraison express",
};

/**
 * Calcule le tarif d'expédition applicable selon le mode choisi par le client.
 * Le tarif standard est fixé par l'administrateur (`deliveryFee`) ; le tarif
 * express applique automatiquement la majoration configurée
 * (`expressSurchargeRate`, en pourcentage) sur ce tarif standard.
 */
export function computeShippingFee(
  settings: Pick<ShopSettings, "deliveryFee" | "expressSurchargeRate">,
  method: "standard" | "express"
): number {
  if (method === "standard") return settings.deliveryFee;
  const surcharge = settings.deliveryFee * (settings.expressSurchargeRate / 100);
  return Math.round(settings.deliveryFee + surcharge);
}

export function getShippingOptions(settings: ShopSettings) {
  return [
    {
      method: "standard" as const,
      label: SHIPPING_METHOD_LABELS.standard,
      days: settings.standardDeliveryDays,
      fee: computeShippingFee(settings, "standard"),
    },
    {
      method: "express" as const,
      label: SHIPPING_METHOD_LABELS.express,
      days: settings.expressDeliveryDays,
      fee: computeShippingFee(settings, "express"),
    },
  ];
}
