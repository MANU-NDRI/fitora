import { useEffect, useState } from "react";
import { MessageCircle, Archive, CheckCheck, Send, BadgeCheck } from "lucide-react";
import type { ContactMessage } from "@/types";
import { adminGetMessages, adminUpdateMessageStatus, adminReplyToMessage } from "@/services/messageService";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { useToastStore } from "@/store/toastStore";

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
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [sendingReplyId, setSendingReplyId] = useState<string | null>(null);
  const pushToast = useToastStore((s) => s.push);

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

  async function handleSendReply(message: ContactMessage) {
    const reply = (replyDrafts[message.id] ?? "").trim();
    if (!reply) return;
    setSendingReplyId(message.id);
    try {
      await adminReplyToMessage(message.id, reply);
      pushToast(
        message.customerId
          ? "Réponse envoyée — visible dans l'espace client du destinataire"
          : "Réponse enregistrée (client non connecté : pensez à répondre aussi par WhatsApp)",
        "success"
      );
      setReplyDrafts((d) => ({ ...d, [message.id]: "" }));
      refresh();
    } finally {
      setSendingReplyId(null);
    }
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
                  {m.customerId && (
                    <span className="ml-2 inline-flex items-center gap-1 text-fitora-green">
                      <BadgeCheck size={12} /> Compte client
                    </span>
                  )}
                </p>
              </div>
              <span className="text-xs text-fitora-gray-dim">{formatDateTime(m.createdAt)}</span>
            </div>
            <p className="mt-3 text-sm text-fitora-gray">{m.message}</p>

            {m.reply && (
              <div className="mt-3 rounded-xl border border-fitora-green/30 bg-fitora-green/5 p-3">
                <p className="text-xs font-semibold text-fitora-green">Réponse FITORA (visible par le client)</p>
                <p className="mt-1 text-sm text-fitora-gray">{m.reply}</p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <a href={buildWhatsAppLink(`Bonjour ${m.name}, `, m.phone.replace(/\D/g, ""))} target="_blank" rel="noopener noreferrer">
                <button className="flex items-center gap-1.5 rounded-full border border-fitora-border px-3 py-1.5 text-xs hover:border-fitora-green hover:text-fitora-green">
                  <MessageCircle size={13} /> Répondre sur WhatsApp
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
              {m.status !== "archived" && (
                <button
                  onClick={() => updateStatus(m.id, "archived")}
                  className="flex items-center gap-1.5 rounded-full border border-fitora-border px-3 py-1.5 text-xs hover:border-fitora-white"
                >
                  <Archive size={13} /> Archiver
                </button>
              )}
            </div>

            <div className="mt-4 border-t border-fitora-border pt-4">
              <p className="mb-2 text-xs font-medium text-fitora-gray">
                Répondre directement sur la plateforme
                {!m.customerId && " (client non connecté — la réponse sera enregistrée mais non notifiée)"}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <textarea
                  value={replyDrafts[m.id] ?? ""}
                  onChange={(e) => setReplyDrafts((d) => ({ ...d, [m.id]: e.target.value }))}
                  rows={2}
                  placeholder="Votre réponse au client..."
                  className="input flex-1 resize-none"
                />
                <Button
                  size="sm"
                  onClick={() => handleSendReply(m)}
                  disabled={sendingReplyId === m.id || !(replyDrafts[m.id] ?? "").trim()}
                >
                  <Send size={14} /> Envoyer
                </Button>
              </div>
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
