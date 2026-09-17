import { supabase } from "@/lib/supabase";
import { getProductsByIds } from "@/services/productService";
import { getOrders } from "@/services/orderService";
import type { Order, Product, ProductReview } from "@/types";

interface ReviewRow {
  id: string;
  product_id: string;
  customer_id: string | null;
  order_id: string | null;
  author: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface ReviewableItem {
  orderId: string;
  orderNumber: string;
  productId: string;
  productName: string;
  image: string;
  variantLabel: string;
}

function mapReview(row: ReviewRow): ProductReview {
  return {
    id: row.id,
    author: row.author,
    rating: row.rating,
    comment: row.comment,
    date: row.created_at,
    customerId: row.customer_id ?? undefined,
    orderId: row.order_id ?? undefined,
  };
}

async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Vous devez être connecté pour gérer un avis.");
  return data.user.id;
}

async function hasReview(productId: string, customerId: string, orderId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("product_reviews")
    .select("id")
    .eq("product_id", productId)
    .eq("customer_id", customerId)
    .eq("order_id", orderId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

/**
 * Compatibilité avec l'ancien composant de détail de commande.
 * La vérification autoritative est faite par `hasReview` au moment de la
 * soumission et par la contrainte unique/RLS côté PostgreSQL.
 *
 * Cette fonction ne lit plus de données locales et ne doit pas être utilisée
 * pour une décision de sécurité.
 */
export function isProductReviewed(_productId: string, _customerId: string, _orderId: string): boolean {
  return false;
}

export async function getProductReviews(productId: string): Promise<ProductReview[]> {
  const { data, error } = await supabase
    .from("product_reviews")
    .select("id, product_id, customer_id, order_id, author, rating, comment, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as ReviewRow[]).map(mapReview);
}

export async function getReviewableItems(customerId: string): Promise<ReviewableItem[]> {
  const authenticatedUserId = await getAuthenticatedUserId();
  if (authenticatedUserId !== customerId) throw new Error("Utilisateur non autorisé.");

  const orders: Order[] = await getOrders(authenticatedUserId);
  const delivered = orders.filter((order) => order.status === "delivered");
  const items: ReviewableItem[] = [];

  for (const order of delivered) {
    for (const item of order.items) {
      if (!(await hasReview(item.productId, authenticatedUserId, order.id))) {
        items.push({
          orderId: order.id,
          orderNumber: order.number,
          productId: item.productId,
          productName: item.productName,
          image: item.image,
          variantLabel: item.variantLabel,
        });
      }
    }
  }

  return items;
}

export async function submitProductReview(input: {
  productId: string;
  customerId: string;
  orderId: string;
  author: string;
  rating: number;
  comment: string;
}): Promise<Product | null> {
  const authenticatedUserId = await getAuthenticatedUserId();
  if (authenticatedUserId !== input.customerId) throw new Error("Utilisateur non autorisé.");

  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  if (rating < 1 || rating > 5) throw new Error("La note doit être comprise entre 1 et 5.");

  if (await hasReview(input.productId, authenticatedUserId, input.orderId)) {
    const [product] = await getProductsByIds([input.productId]);
    return product ?? null;
  }

  const { error } = await supabase.from("product_reviews").insert({
    product_id: input.productId,
    customer_id: authenticatedUserId,
    order_id: input.orderId,
    author: input.author.trim(),
    rating,
    comment: input.comment.trim(),
  });
  if (error) throw error;

  const [product] = await getProductsByIds([input.productId]);
  return product ?? null;
}
