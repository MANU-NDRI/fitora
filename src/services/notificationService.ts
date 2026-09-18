import { supabase } from "@/lib/supabase";
import type { AppNotification } from "@/types";

export interface NotificationView extends AppNotification {
  read: boolean;
}

interface NotificationRow {
  id: string;
  scope: "broadcast" | "customer";
  customer_id: string | null;
  title: string;
  message: string;
  link: string | null;
  created_by: string | null;
  created_at: string;
}

interface NotificationReadRow {
  notification_id: string;
  customer_id: string;
  read_at: string;
}

function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    scope: row.scope,
    customerId: row.customer_id ?? undefined,
    title: row.title,
    message: row.message,
    link: row.link ?? undefined,
    createdAt: row.created_at,
  };
}

async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

// ---------------------------------------------------------------------------
// Émission
// ---------------------------------------------------------------------------

export async function adminSendBroadcast(input: {
  title: string;
  message: string;
  link?: string;
}): Promise<AppNotification> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      scope: "broadcast",
      customer_id: null,
      title: input.title.trim(),
      message: input.message.trim(),
      link: input.link?.trim() || null,
      created_by: userId,
    })
    .select(
      "id, scope, customer_id, title, message, link, created_by, created_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return mapNotification(data as NotificationRow);
}

export async function adminGetBroadcasts(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, scope, customer_id, title, message, link, created_by, created_at",
    )
    .eq("scope", "broadcast")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) =>
    mapNotification(row as NotificationRow),
  );
}

export async function sendCustomerNotification(
  customerId: string,
  input: {
    title: string;
    message: string;
    link?: string;
  },
): Promise<AppNotification> {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      scope: "customer",
      customer_id: customerId,
      title: input.title.trim(),
      message: input.message.trim(),
      link: input.link?.trim() || null,
    })
    .select(
      "id, scope, customer_id, title, message, link, created_by, created_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return mapNotification(data as NotificationRow);
}

// ---------------------------------------------------------------------------
// Lecture côté client
// ---------------------------------------------------------------------------

export async function getNotificationsForUser(
  customerId: string,
): Promise<NotificationView[]> {
  const currentUserId = await getCurrentUserId();

  if (!currentUserId) {
    throw new Error("Vous devez être connecté.");
  }

  if (currentUserId !== customerId) {
    throw new Error("Utilisateur non autorisé.");
  }

  const { data: notifications, error: notificationsError } = await supabase
    .from("notifications")
    .select(
      "id, scope, customer_id, title, message, link, created_by, created_at",
    )
    .or(`scope.eq.broadcast,customer_id.eq.${customerId}`)
    .order("created_at", { ascending: false });

  if (notificationsError) {
    throw notificationsError;
  }

  const { data: reads, error: readsError } = await supabase
    .from("notification_reads")
    .select("notification_id, customer_id, read_at")
    .eq("customer_id", customerId);

  if (readsError) {
    throw readsError;
  }

  const readIds = new Set(
    (reads ?? []).map(
      (row) => (row as NotificationReadRow).notification_id,
    ),
  );

  return (notifications ?? []).map((row) => {
    const notification = mapNotification(row as NotificationRow);

    return {
      ...notification,
      read: readIds.has(notification.id),
    };
  });
}

export async function getUnreadCount(customerId: string): Promise<number> {
  const notifications = await getNotificationsForUser(customerId);
  return notifications.filter((notification) => !notification.read).length;
}

export async function markAsRead(
  customerId: string,
  notificationId: string,
): Promise<void> {
  const currentUserId = await getCurrentUserId();

  if (!currentUserId) {
    throw new Error("Vous devez être connecté.");
  }

  if (currentUserId !== customerId) {
    throw new Error("Utilisateur non autorisé.");
  }

  const { error } = await supabase
    .from("notification_reads")
    .upsert(
      {
        notification_id: notificationId,
        customer_id: customerId,
      },
      {
        onConflict: "notification_id,customer_id",
      },
    );

  if (error) {
    throw error;
  }
}

export async function markAllAsRead(customerId: string): Promise<void> {
  const notifications = await getNotificationsForUser(customerId);

  const unread = notifications.filter((notification) => !notification.read);

  if (unread.length === 0) {
    return;
  }

  const rows = unread.map((notification) => ({
    notification_id: notification.id,
    customer_id: customerId,
  }));

  const { error } = await supabase
    .from("notification_reads")
    .upsert(rows, {
      onConflict: "notification_id,customer_id",
    });

  if (error) {
    throw error;
  }
}
export async function deleteNotification(
  customerId: string,
  notificationId: string,
): Promise<void> {
  const currentUserId = await getCurrentUserId();

  if (!currentUserId) {
    throw new Error("Vous devez être connecté.");
  }

  if (currentUserId !== customerId) {
    throw new Error("Utilisateur non autorisé.");
  }

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("customer_id", customerId)
    .eq("scope", "customer");

  if (error) {
    throw error;
  }
}