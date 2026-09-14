// ---------------------------------------------------------------------------
// FITORA — Types de domaine
// Ces types reflètent la structure des tables Supabase (voir /supabase/schema.sql
// qui sera livré à l'étape "Espace administrateur / base de données").
// ---------------------------------------------------------------------------

export type Sport =
  | "football"
  | "basketball"
  | "running"
  | "fitness"
  | "training"
  | "tennis"
  | "combat"
  | "lifestyle";

export type ProductBadge = "nouveau" | "promo" | "best-seller" | "rupture";

export interface Category {
  id: string;
  slug: string;
  name: string;
  image: string;
  sport: Sport;
  productCount: number;
  order: number;
  published: boolean;
}

export interface ProductVariant {
  id: string;
  size?: string; // taille vêtement (S, M, L...)
  color?: string; // couleur
  colorHex?: string;
  shoeSize?: string; // pointure
  stockAvailable: number;
  stockReserved: number;
  sku: string;
}

export interface ProductReview {
  id: string;
  author: string;
  rating: number; // 1-5
  comment: string;
  date: string;
  customerId?: string; // renseigné si l'avis vient d'un achat vérifié
  orderId?: string; // commande (livrée) ayant permis de laisser cet avis
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  categoryName: string;
  sport: Sport;
  description: string;
  features: string[];
  images: string[];
  price: number; // FCFA
  oldPrice?: number; // FCFA
  rating: number;
  reviewCount: number;
  reviews: ProductReview[];
  variants: ProductVariant[];
  badges: ProductBadge[];
  published: boolean;
  createdAt: string;
  salesCount: number;
  // Rupture de stock déclarée manuellement par l'administrateur,
  // indépendamment des quantités réelles en stock des variantes.
  outOfStockOverride?: boolean;
}

export interface CartLine {
  id: string; // productId + variantId
  productId: string;
  variantId: string;
  name: string;
  image: string;
  price: number;
  oldPrice?: number;
  size?: string;
  color?: string;
  shoeSize?: string;
  quantity: number;
  maxStock: number;
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  whatsapp?: string;
  city: string;
  commune: string;
  quartier: string;
  address: string;
  isDefault: boolean;
  // Position GPS partagée volontairement par le client, visible par l'admin
  // pour faciliter la livraison.
  latitude?: number;
  longitude?: number;
}

export type UserRole = "customer" | "admin";

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  createdAt: string;
}

export type OrderStatus =
  | "pending_payment"
  | "payment_proof_received"
  | "paid"
  | "preparing"
  | "delivering"
  | "delivered"
  | "cancelled";

export type PaymentMethod =
  | "wave"
  | "orange_money"
  | "mtn_money"
  | "moov_money"
  | "cash_on_delivery";

export type ReceptionMode = "livraison" | "retrait";

export type ShippingMethod = "standard" | "express";

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  image: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  number: string; // FIT-2026-000125
  customerId: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  discountCode?: string;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  receptionMode: ReceptionMode;
  shippingMethod?: ShippingMethod;
  estimatedDeliveryDays?: number;
  address?: Address;
  note?: string;
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  status: "unread" | "read" | "replied" | "archived";
  customerId?: string; // renseigné si le client était connecté en envoyant le message
  reply?: string; // réponse de FITORA visible côté client sur la plateforme
  repliedAt?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  scope: "broadcast" | "customer";
  customerId?: string; // uniquement pour scope "customer"
  title: string;
  message: string;
  link?: string;
  createdAt: string;
}

export type DiscountType = "percentage" | "fixed";

export interface DiscountCode {
  id: string;
  code: string;
  type: DiscountType;
  value: number; // % si "percentage", montant FCFA si "fixed"
  customerId?: string; // code réservé à un client précis si renseigné
  customerName?: string; // pour affichage admin
  maxUses: number; // nombre de fois où ce code peut être utilisé au total
  usedCount: number; // nombre de fois déjà utilisé
  expiresAt?: string;
  createdAt: string;
}

export type SortOption =
  | "recent"
  | "popular"
  | "best-selling"
  | "price-asc"
  | "price-desc"
  | "top-rated";

export interface ProductFilters {
  search?: string;
  categorySlug?: string;
  sport?: Sport;
  priceMin?: number;
  priceMax?: number;
  sizes?: string[];
  colors?: string[];
  shoeSizes?: string[];
  inStockOnly?: boolean;
  onSaleOnly?: boolean;
  sort?: SortOption;
}
