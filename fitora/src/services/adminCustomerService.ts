import type { UserProfile } from "@/types";
import { adminGetAllOrders } from "@/services/orderService";

const USERS_KEY = "fitora-demo-users";

export interface AdminCustomerView extends UserProfile {
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function readUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const users = JSON.parse(raw) as Array<UserProfile & { password: string }>;
    return users.map(({ password: _password, ...profile }) => {
      void _password;
      return profile;
    });
  } catch {
    return [];
  }
}

export async function adminGetCustomers(): Promise<AdminCustomerView[]> {
  const users = readUsers().filter((u) => u.role === "customer");
  const orders = await adminGetAllOrders();

  const views: AdminCustomerView[] = users.map((user) => {
    const customerOrders = orders.filter((o) => o.customerId === user.id);
    const totalSpent = customerOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + o.total, 0);
    const lastOrderAt = customerOrders.length
      ? customerOrders.reduce((latest, o) => (o.createdAt > latest ? o.createdAt : latest), customerOrders[0].createdAt)
      : null;

    return {
      ...user,
      ordersCount: customerOrders.length,
      totalSpent,
      lastOrderAt,
    };
  });

  return delay(views);
}
