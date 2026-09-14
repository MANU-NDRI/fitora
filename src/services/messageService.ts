import type { ContactMessage } from "@/types";

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
  input: Pick<ContactMessage, "name" | "phone" | "email" | "subject" | "message">
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
