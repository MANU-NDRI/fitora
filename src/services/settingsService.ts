import type { PaymentMethod } from "@/types";
import { FITORA_WHATSAPP_NUMBER } from "@/lib/whatsapp";
import { supabase } from "@/lib/supabase";

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  whatsapp?: string;
}

export interface AffiliateSettings {
  enabled: boolean;
  rewardType: "percentage" | "fixed";
  rewardValue: number;
  minOrderTotal: number;
  rewardExpiresDays: number;
}

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
  socialLinks: SocialLinks;
  affiliate: AffiliateSettings;
}

export const DEFAULT_HERO_IMAGE =
  "https://picsum.photos/seed/fitora-hero/1600/1200";

// Bucket Supabase Storage dédié aux visuels de la boutique (hors photos
// produits, qui restent gérées séparément). Doit être créé une seule fois
// côté Supabase — voir la migration fournie dans le rapport d'audit.
const HERO_IMAGE_BUCKET = "shop-assets";

/**
 * Téléverse la nouvelle image hero vers Supabase Storage et retourne son URL
 * publique (courte, quelques dizaines de caractères) à enregistrer dans
 * shop_settings.hero_image_url — jamais l'image elle-même en base64, qui
 * alourdirait chaque lecture de la table pour tous les visiteurs.
 *
 * Un nom de fichier horodaté est utilisé à chaque téléversement : l'URL
 * change donc à chaque changement d'image, ce qui évite tout problème de
 * cache navigateur/CDN sur l'ancienne image.
 */
export async function uploadHeroImage(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `hero/hero-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(HERO_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) {
    throw new Error(
      `Échec du téléversement vers Supabase Storage (bucket "${HERO_IMAGE_BUCKET}") : ${uploadError.message}. ` +
        `Vérifiez que ce bucket existe et autorise l'écriture pour les administrateurs (voir la migration fournie dans le rapport).`
    );
  }

  const { data } = supabase.storage.from(HERO_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

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
  socialLinks: {},
  affiliate: {
    enabled: false,
    rewardType: "fixed",
    rewardValue: 0,
    minOrderTotal: 0,
    rewardExpiresDays: 30,
  },
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
    socialLinks: {
      ...DEFAULT_SETTINGS.socialLinks,
      ...(row.social_links ?? {}),
    },
    affiliate: {
      enabled: row.affiliate_enabled ?? DEFAULT_SETTINGS.affiliate.enabled,
      rewardType: row.affiliate_reward_type ?? DEFAULT_SETTINGS.affiliate.rewardType,
      rewardValue: Number(row.affiliate_reward_value ?? DEFAULT_SETTINGS.affiliate.rewardValue),
      minOrderTotal: Number(row.affiliate_min_order_total ?? DEFAULT_SETTINGS.affiliate.minOrderTotal),
      rewardExpiresDays: Number(row.affiliate_reward_expires_days ?? DEFAULT_SETTINGS.affiliate.rewardExpiresDays),
    },
  };
}

let cachedSettings: ShopSettings | null = null;
let inFlightRequest: Promise<ShopSettings> | null = null;
const subscribers = new Set<(settings: ShopSettings) => void>();
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

function notifySubscribers(settings: ShopSettings) {
  cachedSettings = settings;
  subscribers.forEach((fn) => fn(settings));
}

/**
 * Ouvre (une seule fois, quel que soit le nombre d'appelants) un canal
 * Supabase Realtime sur la ligne unique de shop_settings. Dès qu'un
 * administrateur enregistre une modification (ex : nouvelle image hero),
 * chaque onglet client déjà ouvert reçoit la mise à jour et rafraîchit son
 * cache sans recharger la page ni refaire de requête.
 *
 * Nécessite que la table soit ajoutée à la publication realtime côté
 * Supabase : alter publication supabase_realtime add table public.shop_settings;
 * Si ce n'est pas fait, cette fonction ne casse rien : elle échoue
 * silencieusement et l'appli continue de fonctionner avec le cache normal
 * (rafraîchi à chaque nouvelle navigation/mount), simplement sans la
 * synchronisation instantanée entre onglets déjà ouverts.
 */
function ensureRealtimeSubscription() {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel("shop_settings_changes")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "shop_settings", filter: "id=eq.1" },
      (payload) => {
        if (payload.new) {
          notifySubscribers(mapDatabaseSettings(payload.new));
        }
      }
    )
    .subscribe();
}

/**
 * S'abonne aux changements des paramètres boutique (ex : hero image mise à
 * jour par l'administrateur). Le callback est appelé immédiatement avec la
 * dernière valeur connue (cache ou fetch), puis à chaque mise à jour reçue
 * via Realtime. Retourne une fonction de désabonnement à appeler dans le
 * cleanup du useEffect appelant.
 */
export function subscribeToShopSettings(
  onChange: (settings: ShopSettings) => void
): () => void {
  subscribers.add(onChange);
  ensureRealtimeSubscription();

  if (cachedSettings) {
    onChange(cachedSettings);
  } else {
    getShopSettings().then(onChange);
  }

  return () => {
    subscribers.delete(onChange);
  };
}

export async function getShopSettings(options?: { forceRefresh?: boolean }): Promise<ShopSettings> {
  if (!options?.forceRefresh && cachedSettings) {
    return cachedSettings;
  }

  // Plusieurs composants peuvent demander les paramètres au même instant
  // (Header, Footer, HomePage...) : on ne déclenche qu'une seule requête
  // Supabase et tout le monde attend la même promesse.
  if (!options?.forceRefresh && inFlightRequest) {
    return inFlightRequest;
  }

  inFlightRequest = (async () => {
    try {
      const { data, error } = await supabase
        .from("shop_settings")
        .select(
          "id, shop_name, slogan, whatsapp, phone, email, address, delivery_fee, cod_enabled, standard_delivery_days, express_delivery_days, express_surcharge_rate, hero_image_url, return_policy, payment_numbers, social_links, affiliate_enabled, affiliate_reward_type, affiliate_reward_value, affiliate_min_order_total, affiliate_reward_expires_days"
        )
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        console.error("Erreur récupération paramètres FITORA :", error);
        return cachedSettings ?? DEFAULT_SETTINGS;
      }

      if (!data) {
        return cachedSettings ?? DEFAULT_SETTINGS;
      }

      const settings = mapDatabaseSettings(data);
      cachedSettings = settings;
      return settings;
    } catch (error) {
      console.error("Erreur récupération paramètres FITORA :", error);
      return cachedSettings ?? DEFAULT_SETTINGS;
    } finally {
      inFlightRequest = null;
    }
  })();

  return inFlightRequest;
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
    social_links: settings.socialLinks,
    affiliate_enabled: settings.affiliate.enabled,
    affiliate_reward_type: settings.affiliate.rewardType,
    affiliate_reward_value: settings.affiliate.rewardValue,
    affiliate_min_order_total: settings.affiliate.minOrderTotal,
    affiliate_reward_expires_days: settings.affiliate.rewardExpiresDays,
  };

const { data, error } = await supabase
  .from("shop_settings")
  .update(payload)
  .eq("id", 1)
  .select(
    "id, shop_name, slogan, whatsapp, phone, email, address, delivery_fee, cod_enabled, standard_delivery_days, express_delivery_days, express_surcharge_rate, hero_image_url, return_policy, payment_numbers, social_links, affiliate_enabled, affiliate_reward_type, affiliate_reward_value, affiliate_min_order_total, affiliate_reward_expires_days"
  )
  .single();

  if (error) {
    console.error("Erreur sauvegarde paramètres FITORA :", error);
    throw new Error(
      error.message || "Impossible de sauvegarder les paramètres."
    );
  }

  const updated = mapDatabaseSettings(data);
  // Rafraîchit immédiatement le cache local (l'admin voit son propre
  // changement sans attendre l'aller-retour Realtime), les autres onglets
  // seront notifiés par l'abonnement postgres_changes ci-dessus.
  notifySubscribers(updated);
  return updated;
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