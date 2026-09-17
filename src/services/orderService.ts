import { supabase } from "@/lib/supabase";
import type { Address, CartLine, Order, OrderStatus, PaymentMethod, ReceptionMode, ShippingMethod } from "@/types";
import { sendCustomerNotification } from "@/services/notificationService";

type OrderRow = {
  id: string;
  number: string;
  customer_id: string;
  subtotal: number | string;
  delivery_fee: number | string;
  discount: number | string;
  discount_code: string | null;
  total: number | string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  reception_mode: ReceptionMode;
  shipping_method: ShippingMethod | null;
  estimated_delivery_days: number | null;
  note: string | null;
  created_at: string;
  address_id: string | null;
  addresses: AddressRow | AddressRow[] | null;
  order_items: OrderItemRow[] | null;
};

type AddressRow = {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  whatsapp: string | null;
  city: string;
  commune: string;
  quartier: string;
  address: string;
  is_default: boolean;
  latitude: number | null;
  longitude: number | null;
};

type OrderItemRow = {
  id: string;
  product_id: string;
  product_name: string;
  image: string;
  variant_label: string;
  quantity: number;
  unit_price: number | string;
};

function asAddress(value: OrderRow["addresses"]): AddressRow | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapAddress(row: AddressRow | null): Address | undefined {
  if (!row) return undefined;
  return {
    id: row.id,
    label: row.label,
    fullName: row.full_name,
    phone: row.phone,
    whatsapp: row.whatsapp ?? undefined,
    city: row.city,
    commune: row.commune,
    quartier: row.quartier,
    address: row.address,
    isDefault: row.is_default,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
  };
}

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    number: row.number,
    customerId: row.customer_id,
    items: (row.order_items ?? []).map((item) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      image: item.image,
      variantLabel: item.variant_label,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
    })),
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    discount: Number(row.discount),
    discountCode: row.discount_code ?? undefined,
    total: Number(row.total),
    status: row.status,
    paymentMethod: row.payment_method,
    receptionMode: row.reception_mode,
    shippingMethod: row.shipping_method ?? undefined,
    estimatedDeliveryDays: row.estimated_delivery_days ?? undefined,
    address: mapAddress(asAddress(row.addresses)),
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

const ORDER_SELECT = "*, addresses(*), order_items(*)";

async function fetchOrder(orderId: string, customerId?: string): Promise<Order | null> {
  let query = supabase.from("orders").select(ORDER_SELECT).eq("id", orderId);
  if (customerId) query = query.eq("customer_id", customerId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? mapOrder(data as unknown as OrderRow) : null;
}

export interface CreateOrderInput {
  userId: string;
  lines: CartLine[];
  deliveryFee: number;
  discount?: number;
  discountCode?: string;
  receptionMode: ReceptionMode;
  shippingMethod?: ShippingMethod;
  estimatedDeliveryDays?: number;
  paymentMethod: PaymentMethod;
  address?: Address;
  note?: string;
}

export class OrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderError";
  }
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  if (input.lines.length === 0) throw new OrderError("Le panier est vide.");
  if (input.lines.some((line) => !line.variantId || !Number.isInteger(line.quantity) || line.quantity <= 0)) {
    throw new OrderError("Une ligne de commande est invalide.");
  }

  const { data: orderId, error } = await supabase.rpc("create_order_transaction", {
    p_customer_id: input.userId,
    p_items: input.lines.map((line) => ({
      product_id: line.productId,
      variant_id: line.variantId,
      quantity: line.quantity,
    })),
    p_delivery_fee: input.receptionMode === "retrait" ? 0 : Math.max(0, input.deliveryFee),
    p_discount: Math.max(0, input.discount ?? 0),
    p_discount_code: input.discountCode ?? null,
    p_payment_method: input.paymentMethod,
    p_reception_mode: input.receptionMode,
    p_shipping_method: input.receptionMode === "livraison" ? input.shippingMethod ?? null : null,
    p_estimated_delivery_days: input.receptionMode === "livraison" ? input.estimatedDeliveryDays ?? null : null,
    p_address: input.receptionMode === "livraison" && input.address ? {
      label: input.address.label,
      full_name: input.address.fullName,
      phone: input.address.phone,
      whatsapp: input.address.whatsapp ?? null,
      city: input.address.city,
      commune: input.address.commune,
      quartier: input.address.quartier,
      address: input.address.address,
      latitude: input.address.latitude ?? null,
      longitude: input.address.longitude ?? null,
    } : null,
    p_note: input.note ?? null,
  });

  if (error) throw new OrderError(error.message);
  if (typeof orderId !== "string") throw new OrderError("La commande n'a pas été créée.");

  const order = await fetchOrder(orderId, input.userId);
  if (!order) throw new OrderError("Commande créée mais impossible à relire.");
  return order;
}

export async function getOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("customer_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as OrderRow[]).map(mapOrder);
}

export async function getOrderById(userId: string, orderId: string): Promise<Order | null> {
  return fetchOrder(orderId, userId);
}

export async function adminGetAllOrders(): Promise<Order[]> {
  const { data, error } = await supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as OrderRow[]).map(mapOrder);
}

export async function adminUpdateOrderStatus(orderId: string, status: OrderStatus): Promise<Order | null> {
  const { data, error } = await supabase.from("orders").update({ status }).eq("id", orderId).select("id, customer_id").maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const order = await fetchOrder(orderId);
  if (!order) return null;
  await sendCustomerNotification(order.customerId, {
    title: `Commande ${order.number}`,
    message: `Votre commande est maintenant : ${ORDER_STATUS_LABELS[status]}.`,
    link: `/compte/commandes/${order.id}`,
  });
  return order;
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
