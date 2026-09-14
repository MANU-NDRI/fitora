import type { Address, CartLine, Order, OrderStatus, PaymentMethod, ReceptionMode } from "@/types";
import { PRODUCTS } from "@/services/mockData";

// ---------------------------------------------------------------------------
// Simule les tables Supabase `orders` + `order_items` + la logique de
// réservation de stock (section 30 du cahier des charges). Les commandes
// sont stockées par client dans le localStorage. Le stock (`stockReserved`)
// est décrémenté directement sur les données en mémoire de `mockData.ts`
// le temps de la session, pour refléter la réservation de 24h côté catalogue.
// ---------------------------------------------------------------------------

function ordersKey(userId: string) {
  return `fitora-orders-${userId}`;
}

const GLOBAL_ORDERS_KEY = "fitora-orders-all";

function readGlobalOrders(): Order[] {
  try {
    const raw = localStorage.getItem(GLOBAL_ORDERS_KEY);
    return raw ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    return [];
  }
}

function writeGlobalOrders(orders: Order[]) {
  localStorage.setItem(GLOBAL_ORDERS_KEY, JSON.stringify(orders));
}

function delay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function readOrders(userId: string): Order[] {
  try {
    const raw = localStorage.getItem(ordersKey(userId));
    return raw ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    return [];
  }
}

function writeOrders(userId: string, orders: Order[]) {
  localStorage.setItem(ordersKey(userId), JSON.stringify(orders));
}

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const sequence = Math.floor(100000 + Math.random() * 899999);
  return `FIT-${year}-${sequence}`;
}

export interface CreateOrderInput {
  userId: string;
  lines: CartLine[];
  deliveryFee: number;
  receptionMode: ReceptionMode;
  paymentMethod: PaymentMethod;
  address?: Address;
  note?: string;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const subtotal = input.lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const deliveryFee = input.receptionMode === "retrait" ? 0 : input.deliveryFee;
  const total = subtotal + deliveryFee;

  const order: Order = {
    id: `order-${Date.now()}`,
    number: generateOrderNumber(),
    customerId: input.userId,
    items: input.lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      productName: l.name,
      image: l.image,
      variantLabel: [l.size, l.shoeSize && `Pointure ${l.shoeSize}`, l.color].filter(Boolean).join(" · "),
      quantity: l.quantity,
      unitPrice: l.price,
    })),
    subtotal,
    deliveryFee,
    discount: 0,
    total,
    status: "pending_payment",
    paymentMethod: input.paymentMethod,
    receptionMode: input.receptionMode,
    address: input.address,
    note: input.note,
    createdAt: new Date().toISOString(),
  };

  // Réservation de stock : on incrémente stockReserved sur les variantes
  // concernées (libéré automatiquement côté back-end réel après 24h si le
  // paiement n'est pas confirmé — logique à implémenter en base via un
  // trigger/cron Supabase).
  for (const line of input.lines) {
    const product = PRODUCTS.find((p) => p.id === line.productId);
    const variant = product?.variants.find((v) => v.id === line.variantId);
    if (variant) {
      variant.stockReserved += line.quantity;
    }
  }

  const orders = readOrders(input.userId);
  writeOrders(input.userId, [order, ...orders]);
  writeGlobalOrders([order, ...readGlobalOrders()]);
  return delay(order);
}

export async function getOrders(userId: string): Promise<Order[]> {
  return delay(readOrders(userId));
}

export async function getOrderById(userId: string, orderId: string): Promise<Order | null> {
  const order = readOrders(userId).find((o) => o.id === orderId) ?? null;
  return delay(order);
}

// --------------------------- Vue administrateur ---------------------------

export async function adminGetAllOrders(): Promise<Order[]> {
  return delay(readGlobalOrders());
}

export async function adminUpdateOrderStatus(orderId: string, status: OrderStatus): Promise<Order | null> {
  const globalOrders = readGlobalOrders();
  const order = globalOrders.find((o) => o.id === orderId);
  if (!order) return delay(null);
  order.status = status;
  writeGlobalOrders(globalOrders);

  // Répercute la mise à jour sur la copie stockée côté client.
  const customerOrders = readOrders(order.customerId);
  const customerOrder = customerOrders.find((o) => o.id === orderId);
  if (customerOrder) {
    customerOrder.status = status;
    writeOrders(order.customerId, customerOrders);
  }

  return delay(order);
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "En attente de paiement",
  payment_proof_received: "Preuve reçue",
  paid: "Payée",
  preparing: "En préparation",
  delivering: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export const ORDER_STATUS_STEPS: OrderStatus[] = [
  "pending_payment",
  "payment_proof_received",
  "paid",
  "preparing",
  "delivering",
  "delivered",
];
