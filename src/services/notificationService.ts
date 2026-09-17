import type { AppNotification } from "@/types";

// ---------------------------------------------------------------------------
// Préfigure une future table Supabase `notifications` (scope 'broadcast' ou
// 'customer') + une table de suivi de lecture par utilisateur. En mode démo,
// tout est stocké dans le localStorage du navigateur :
// - les diffusions générales (promotions) sont globales à la boutique ;
// - les notifications ciblées (statut de commande, réponse à un message)
//   sont rattachées à un customer_id ;
// - l'état "lu" est propre à chaque utilisateur.
// ---------------------------------------------------------------------------

const BROADCASTS_KEY = "fitora-notifications-broadcast";
const customerKey = (customerId: string) => `fitora-notifications-customer-${customerId}`;
const readKey = (customerId: string) => `fitora-notifications-read-${customerId}`;

function delay<T>(value: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function readList(key: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: AppNotification[]) {
  localStorage.setItem(key, JSON.stringify(list));
}

function readReadIds(customerId: string): Set<string> {
  try {
    const raw = localStorage.getItem(readKey(customerId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeReadIds(customerId: string, ids: Set<string>) {
  localStorage.setItem(readKey(customerId), JSON.stringify([...ids]));
}

export interface NotificationView extends AppNotification {
  read: boolean;
}

// --------------------------- Émission (admin / système) --------------------

export async function adminSendBroadcast(input: {
  title: string;
  message: string;
  link?: string;
}): Promise<AppNotification> {
  const notification: AppNotification = {
    id: `notif-${Date.now()}`,
    scope: "broadcast",
    title: input.title,
    message: input.message,
    link: input.link,
    createdAt: new Date().toISOString(),
  };
  writeList(BROADCASTS_KEY, [notification, ...readList(BROADCASTS_KEY)]);
  return delay(notification);
}

export async function adminGetBroadcasts(): Promise<AppNotification[]> {
  return delay(readList(BROADCASTS_KEY));
}

export async function sendCustomerNotification(
  customerId: string,
  input: { title: string; message: string; link?: string }
): Promise<AppNotification> {
  const notification: AppNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    scope: "customer",
    customerId,
    title: input.title,
    message: input.message,
    link: input.link,
    createdAt: new Date().toISOString(),
  };
  const key = customerKey(customerId);
  writeList(key, [notification, ...readList(key)]);
  return delay(notification);
}

// --------------------------- Lecture (client) -------------------------------

export async function getNotificationsForUser(customerId: string): Promise<NotificationView[]> {
  const broadcasts = readList(BROADCASTS_KEY);
  const personal = readList(customerKey(customerId));
  const readIds = readReadIds(customerId);

  const all = [...broadcasts, ...personal]
    .map((n) => ({ ...n, read: readIds.has(n.id) }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return delay(all);
}

export async function getUnreadCount(customerId: string): Promise<number> {
  const all = await getNotificationsForUser(customerId);
  return all.filter((n) => !n.read).length;
}

export async function markAsRead(customerId: string, notificationId: string): Promise<void> {
  const ids = readReadIds(customerId);
  ids.add(notificationId);
  writeReadIds(customerId, ids);
  return delay(undefined, 50);
}

export async function markAllAsRead(customerId: string): Promise<void> {
  const all = await getNotificationsForUser(customerId);
  const ids = readReadIds(customerId);
  all.forEach((n) => ids.add(n.id));
  writeReadIds(customerId, ids);
  return delay(undefined, 50);
}
