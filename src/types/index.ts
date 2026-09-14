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
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  receptionMode: ReceptionMode;
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
