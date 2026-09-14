import { useEffect, useState } from "react";
import { MessageCircle, Archive, CheckCheck } from "lucide-react";
import type { ContactMessage } from "@/types";
import { adminGetMessages, adminUpdateMessageStatus } from "@/services/messageService";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

const FILTERS: (ContactMessage["status"] | "all")[] = ["all", "unread", "read", "replied", "archived"];
const LABELS: Record<ContactMessage["status"], string> = {
  unread: "Non lu",
  read: "Lu",
  replied: "Répondu",
  archived: "Archivé",
};

export function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [filter, setFilter] = useState<ContactMessage["status"] | "all">("all");

  async function refresh() {
    setMessages(await adminGetMessages());
  }

  useEffect(() => {
    refresh();
  }, []);

  const unreadCount = messages.filter((m) => m.status === "unread").length;
  const filtered = filter === "all" ? messages : messages.filter((m) => m.status === filter);

  async function updateStatus(id: string, status: ContactMessage["status"]) {
    await adminUpdateMessageStatus(id, status);
    refresh();
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-xl font-bold">
        💬 Messages {unreadCount > 0 && <span className="text-fitora-green">({unreadCount})</span>}
      </h1>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f
                ? "border-fitora-green bg-fitora-green text-fitora-black"
                : "border-fitora-border text-fitora-gray hover:border-fitora-gray"
            )}
          >
            {f === "all" ? "Tous" : LABELS[f]}
          </button>
        ))}
      </div>

      <ul className="space-y-3">
        {filtered.map((m) => (
          <li
            key={m.id}
            className={cn(
              "rounded-2xl border p-5",
              m.status === "unread" ? "border-fitora-green/40 bg-fitora-green/5" : "border-fitora-border bg-fitora-charcoal"
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-display text-sm font-bold">{m.subject}</p>
                <p className="text-xs text-fitora-gray">
                  {m.name} · {m.phone} {m.email && `· ${m.email}`}
                </p>
              </div>
              <span className="text-xs text-fitora-gray-dim">{formatDateTime(m.createdAt)}</span>
            </div>
            <p className="mt-3 text-sm text-fitora-gray">{m.message}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={buildWhatsAppLink(`Bonjour ${m.name}, `, m.phone.replace(/\D/g, ""))} target="_blank" rel="noopener noreferrer">
                <button className="flex items-center gap-1.5 rounded-full border border-fitora-border px-3 py-1.5 text-xs hover:border-fitora-green hover:text-fitora-green">
                  <MessageCircle size={13} /> WhatsApp
                </button>
              </a>
              {m.status !== "read" && m.status !== "replied" && (
                <button
                  onClick={() => updateStatus(m.id, "read")}
                  className="flex items-center gap-1.5 rounded-full border border-fitora-border px-3 py-1.5 text-xs hover:border-fitora-white"
                >
                  Marquer comme lu
                </button>
              )}
              {m.status !== "replied" && (
                <button
                  onClick={() => updateStatus(m.id, "replied")}
                  className="flex items-center gap-1.5 rounded-full border border-fitora-border px-3 py-1.5 text-xs hover:border-fitora-white"
                >
                  <CheckCheck size={13} /> Marquer répondu
                </button>
              )}
              {m.status !== "archived" && (
                <button
                  onClick={() => updateStatus(m.id, "archived")}
                  className="flex items-center gap-1.5 rounded-full border border-fitora-border px-3 py-1.5 text-xs hover:border-fitora-white"
                >
                  <Archive size={13} /> Archiver
                </button>
              )}
            </div>
          </li>
        ))}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-fitora-gray">Aucun message dans cette catégorie.</p>
        )}
      </ul>
    </div>
  );
}
