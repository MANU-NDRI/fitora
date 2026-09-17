import type { PaymentMethod } from "@/types";
import { FITORA_WHATSAPP_NUMBER } from "@/lib/whatsapp";
import { supabase } from "@/lib/supabase";

export interface ShopSettings {
  shopName: string;
  slogan: string;
  whatsapp: string;
  phone: string;
  email: string;
  address: string;
  deliveryFee: number;
  codEnabled: boolean;
  paymentNumbers: Record<Exclude<PaymentMethod, "cash_on_delivery">, string>;
  standardDeliveryDays: number;
  expressDeliveryDays: number;
  expressSurchargeRate: number;
  heroImageUrl?: string;
  returnPolicy: string;
}

export const DEFAULT_HERO_IMAGE =
  "https://picsum.photos/seed/fitora-hero/1600/1200";

export const DEFAULT_RETURN_POLICY = `Vous disposez de 7 jours après réception de votre commande pour demander un retour ou un échange, à condition que l'article soit inutilisé, dans son emballage d'origine et accompagné de la preuve d'achat.

Pour initier un retour, contactez-nous directement sur WhatsApp en précisant votre numéro de commande. Nos équipes vous indiqueront la marche à suivre.

Les frais de retour sont à la charge du client, sauf en cas d'erreur de notre part (produit défectueux ou non conforme à la commande). Le remboursement ou l'échange est effectué dans un délai de 5 jours ouvrés après réception et vérification de l'article retourné.

Certains articles (sous-vêtements, chaussettes, produits personnalisés) ne peuvent faire l'objet d'un retour pour des raisons d'hygiène, sauf défaut avéré.`;

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

function mapDatabaseSettings(row: any): ShopSettings {
  return {
    shopName: row.shop_name ?? DEFAULT_SETTINGS.shopName,
    slogan: row.slogan ?? DEFAULT_SETTINGS.slogan,
    whatsapp: row.whatsapp ?? DEFAULT_SETTINGS.whatsapp,
    phone: row.phone ?? DEFAULT_SETTINGS.phone,
    email: row.email ?? DEFAULT_SETTINGS.email,
    address: row.address ?? DEFAULT_SETTINGS.address,
    deliveryFee: Number(row.delivery_fee ?? DEFAULT_SETTINGS.deliveryFee),
    codEnabled: row.cod_enabled ?? DEFAULT_SETTINGS.codEnabled,
    paymentNumbers: {
      ...DEFAULT_SETTINGS.paymentNumbers,
      ...(row.payment_numbers ?? {}),
    },
    standardDeliveryDays:
      Number(
        row.standard_delivery_days ??
          DEFAULT_SETTINGS.standardDeliveryDays
      ),
    expressDeliveryDays:
      Number(
        row.express_delivery_days ??
          DEFAULT_SETTINGS.expressDeliveryDays
      ),
    expressSurchargeRate:
      Number(
        row.express_surcharge_rate ??
          DEFAULT_SETTINGS.expressSurchargeRate
      ),
    heroImageUrl: row.hero_image_url ?? undefined,
    returnPolicy:
      row.return_policy ?? DEFAULT_SETTINGS.returnPolicy,
  };
}

export async function getShopSettings(): Promise<ShopSettings> {
  try {
    const { data, error } = await supabase
      .from("shop_settings")
      .select(
        "id, shop_name, slogan, whatsapp, phone, email, address, delivery_fee, cod_enabled, standard_delivery_days, express_delivery_days, express_surcharge_rate, hero_image_url, return_policy, payment_numbers"
      )
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("Erreur récupération paramètres FITORA :", error);
      return DEFAULT_SETTINGS;
    }

    if (!data) {
      return DEFAULT_SETTINGS;
    }

    return mapDatabaseSettings(data);
  } catch (error) {
    console.error("Erreur récupération paramètres FITORA :", error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveShopSettings(
  settings: ShopSettings
): Promise<ShopSettings> {
  const payload = {
    id: 1,
    shop_name: settings.shopName,
    slogan: settings.slogan,
    whatsapp: settings.whatsapp,
    phone: settings.phone,
    email: settings.email,
    address: settings.address,
    delivery_fee: settings.deliveryFee,
    cod_enabled: settings.codEnabled,
    standard_delivery_days: settings.standardDeliveryDays,
    express_delivery_days: settings.expressDeliveryDays,
    express_surcharge_rate: settings.expressSurchargeRate,
    hero_image_url: settings.heroImageUrl || null,
    return_policy: settings.returnPolicy,
    payment_numbers: settings.paymentNumbers,
  };

  const { data, error } = await supabase
    .from("shop_settings")
    .upsert(payload, { onConflict: "id" })
    .select(
      "id, shop_name, slogan, whatsapp, phone, email, address, delivery_fee, cod_enabled, standard_delivery_days, express_delivery_days, express_surcharge_rate, hero_image_url, return_policy, payment_numbers"
    )
    .single();

  if (error) {
    console.error("Erreur sauvegarde paramètres FITORA :", error);
    throw new Error(
      error.message || "Impossible de sauvegarder les paramètres."
    );
  }

  return mapDatabaseSettings(data);
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  wave: "Wave",
  orange_money: "Orange Money",
  mtn_money: "MTN Mobile Money",
  moov_money: "Moov Money",
  cash_on_delivery: "Paiement à la livraison",
};

export const SHIPPING_METHOD_LABELS: Record<
  "standard" | "express",
  string
> = {
  standard: "Livraison standard",
  express: "Livraison express",
};

export function computeShippingFee(
  settings: Pick<ShopSettings, "deliveryFee" | "expressSurchargeRate">,
  method: "standard" | "express"
): number {
  if (method === "standard") return settings.deliveryFee;

  const surcharge =
    settings.deliveryFee * (settings.expressSurchargeRate / 100);

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