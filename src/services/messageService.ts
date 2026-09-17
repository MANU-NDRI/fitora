import { supabase } from "@/lib/supabase";
import type { ContactMessage } from "@/types";
import { sendCustomerNotification } from "@/services/notificationService";

interface ContactMessageRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  status: ContactMessage["status"];
  customer_id: string | null;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
}

function mapMessage(row: ContactMessageRow): ContactMessage {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    subject: row.subject,
    message: row.message,
    status: row.status,
    customerId: row.customer_id ?? undefined,
    reply: row.reply ?? undefined,
    repliedAt: row.replied_at ?? undefined,
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

export async function sendContactMessage(
  input: Pick<
    ContactMessage,
    "name" | "phone" | "email" | "subject" | "message"
  > & {
    customerId?: string;
  },
): Promise<ContactMessage> {
  let customerId = input.customerId ?? null;

  if (!customerId) {
    customerId = await getCurrentUserId();
  }

  const { data, error } = await supabase
    .from("contact_messages")
    .insert({
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      subject: input.subject.trim(),
      message: input.message.trim(),
      status: "unread",
      customer_id: customerId,
    })
    .select(
      "id, name, phone, email, subject, message, status, customer_id, reply, replied_at, created_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return mapMessage(data as ContactMessageRow);
}

export async function adminGetMessages(): Promise<ContactMessage[]> {
  const { data, error } = await supabase
    .from("contact_messages")
    .select(
      "id, name, phone, email, subject, message, status, customer_id, reply, replied_at, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapMessage(row as ContactMessageRow));
}

export async function getMessagesForCustomer(
  customerId: string,
): Promise<ContactMessage[]> {
  const currentUserId = await getCurrentUserId();

  if (!currentUserId) {
    throw new Error("Vous devez être connecté.");
  }

  if (currentUserId !== customerId) {
    throw new Error("Utilisateur non autorisé.");
  }

  const { data, error } = await supabase
    .from("contact_messages")
    .select(
      "id, name, phone, email, subject, message, status, customer_id, reply, replied_at, created_at",
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapMessage(row as ContactMessageRow));
}

export async function adminUpdateMessageStatus(
  id: string,
  status: ContactMessage["status"],
): Promise<ContactMessage | null> {
  const { data, error } = await supabase
    .from("contact_messages")
    .update({ status })
    .eq("id", id)
    .select(
      "id, name, phone, email, subject, message, status, customer_id, reply, replied_at, created_at",
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapMessage(data as ContactMessageRow) : null;
}

export async function adminReplyToMessage(
  id: string,
  reply: string,
): Promise<ContactMessage | null> {
  const cleanReply = reply.trim();

  if (!cleanReply) {
    throw new Error("La réponse ne peut pas être vide.");
  }

  const { data, error } = await supabase
    .from("contact_messages")
    .update({
      reply: cleanReply,
      replied_at: new Date().toISOString(),
      status: "replied",
    })
    .eq("id", id)
    .select(
      "id, name, phone, email, subject, message, status, customer_id, reply, replied_at, created_at",
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const message = mapMessage(data as ContactMessageRow);

  if (message.customerId) {
    await sendCustomerNotification(message.customerId, {
      title: "Réponse de FITORA à votre message",
      message: cleanReply,
      link: "/compte/messages",
    });
  }

  return message;
}