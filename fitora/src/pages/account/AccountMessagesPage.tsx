import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import type { ContactMessage } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { getMessagesForCustomer } from "@/services/messageService";
import { formatDateTime } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const STATUS_LABELS: Record<ContactMessage["status"], string> = {
  unread: "Envoyé",
  read: "Lu par FITORA",
  replied: "Répondu",
  archived: "Archivé",
};

export function AccountMessagesPage() {
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);

  useEffect(() => {
    if (user) getMessagesForCustomer(user.id).then(setMessages);
  }, [user]);

  if (messages === null) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-fitora-border py-16 text-center">
        <MessageSquare size={32} className="text-fitora-gray-dim" />
        <p className="text-fitora-gray">Vous n'avez pas encore envoyé de message à FITORA.</p>
        <Link to="/contact">
          <Button variant="outline">Contacter FITORA</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <div key={m.id} className="rounded-2xl bg-fitora-charcoal p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-display text-sm font-bold">{m.subject}</p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                m.status === "replied" ? "bg-fitora-green/10 text-fitora-green" : "bg-white/5 text-fitora-gray"
              )}
            >
              {STATUS_LABELS[m.status]}
            </span>
          </div>
          <p className="mt-1 text-xs text-fitora-gray-dim">{formatDateTime(m.createdAt)}</p>
          <p className="mt-3 text-sm text-fitora-gray">{m.message}</p>

          {m.reply && (
            <div className="mt-4 rounded-xl border border-fitora-green/30 bg-fitora-green/5 p-4">
              <p className="text-xs font-semibold text-fitora-green">Réponse de FITORA</p>
              <p className="mt-1 text-sm">{m.reply}</p>
              {m.repliedAt && <p className="mt-1 text-[11px] text-fitora-gray-dim">{formatDateTime(m.repliedAt)}</p>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
