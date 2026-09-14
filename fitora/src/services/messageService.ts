import type { ContactMessage } from "@/types";
import { sendCustomerNotification } from "@/services/notificationService";

// Simule la table Supabase `contact_messages`.
const STORAGE_KEY = "fitora-contact-messages";

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function read(): ContactMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ContactMessage[]) : [];
  } catch {
    return [];
  }
}

function write(messages: ContactMessage[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

export async function sendContactMessage(
  input: Pick<ContactMessage, "name" | "phone" | "email" | "subject" | "message"> & {
    customerId?: string;
  }
): Promise<ContactMessage> {
  const message: ContactMessage = {
    id: `msg-${Date.now()}`,
    ...input,
    status: "unread",
    createdAt: new Date().toISOString(),
  };
  write([message, ...read()]);
  return delay(message);
}

export async function adminGetMessages(): Promise<ContactMessage[]> {
  return delay(read());
}

export async function getMessagesForCustomer(customerId: string): Promise<ContactMessage[]> {
  return delay(read().filter((m) => m.customerId === customerId));
}

export async function adminUpdateMessageStatus(
  id: string,
  status: ContactMessage["status"]
): Promise<ContactMessage | null> {
  const messages = read();
  const message = messages.find((m) => m.id === id);
  if (!message) return delay(null);
  message.status = status;
  write(messages);
  return delay(message);
}

/**
 * Réponse de l'administrateur visible directement sur la plateforme
 * (en plus, ou à la place, d'une réponse par WhatsApp). Si le client était
 * connecté au moment de l'envoi du message, il reçoit une notification.
 */
export async function adminReplyToMessage(id: string, reply: string): Promise<ContactMessage | null> {
  const messages = read();
  const message = messages.find((m) => m.id === id);
  if (!message) return delay(null);

  message.reply = reply;
  message.repliedAt = new Date().toISOString();
  message.status = "replied";
  write(messages);

  if (message.customerId) {
    await sendCustomerNotification(message.customerId, {
      title: "Réponse de FITORA à votre message",
      message: reply,
      link: "/compte/messages",
    });
  }

  return delay(message);
}
