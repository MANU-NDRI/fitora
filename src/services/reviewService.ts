import type { Order, Product } from "@/types";
import { PRODUCTS } from "@/services/mockData";
import { persistProducts } from "@/services/adminDataStore";
import { getOrders } from "@/services/orderService";

function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export interface ReviewableItem {
  orderId: string;
  orderNumber: string;
  productId: string;
  productName: string;
  image: string;
  variantLabel: string;
}

export function isProductReviewed(productId: string, customerId: string, orderId: string): boolean {
  const product = PRODUCTS.find((p) => p.id === productId);
  return Boolean(product?.reviews.some((r) => r.customerId === customerId && r.orderId === orderId));
}

/**
 * Liste les articles que le client peut noter : uniquement ceux provenant
 * d'une commande dont le statut est "delivered" et qui n'ont pas déjà été
 * notés pour cette commande.
 */
export async function getReviewableItems(customerId: string): Promise<ReviewableItem[]> {
  const orders: Order[] = await getOrders(customerId);
  const delivered = orders.filter((o) => o.status === "delivered");

  const items: ReviewableItem[] = [];
  for (const order of delivered) {
    for (const item of order.items) {
      if (!isProductReviewed(item.productId, customerId, order.id)) {
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
  return delay(items);
}

export async function submitProductReview(input: {
  productId: string;
  customerId: string;
  orderId: string;
  author: string;
  rating: number;
  comment: string;
}): Promise<Product | null> {
  const product = PRODUCTS.find((p) => p.id === input.productId);
  if (!product) return delay(null);
  if (isProductReviewed(input.productId, input.customerId, input.orderId)) return delay(product);

  product.reviews.unshift({
    id: `rev-${Date.now()}`,
    author: input.author,
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    comment: input.comment,
    date: new Date().toISOString(),
    customerId: input.customerId,
    orderId: input.orderId,
  });

  product.reviewCount = product.reviews.length;
  product.rating =
    Math.round((product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length) * 10) / 10;

  persistProducts();
  return delay(product);
}
