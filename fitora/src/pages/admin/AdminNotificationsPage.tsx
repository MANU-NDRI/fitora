import { useEffect, useState } from "react";
import { Megaphone, Send } from "lucide-react";
import type { AppNotification } from "@/types";
import { adminSendBroadcast, adminGetBroadcasts } from "@/services/notificationService";
import { useToastStore } from "@/store/toastStore";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";

export function AdminNotificationsPage() {
  const [broadcasts, setBroadcasts] = useState<AppNotification[]>([]);
  const [form, setForm] = useState({ title: "", message: "", link: "" });
  const [sending, setSending] = useState(false);
  const pushToast = useToastStore((s) => s.push);

  async function refresh() {
    setBroadcasts(await adminGetBroadcasts());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;

    setSending(true);
    try {
      await adminSendBroadcast({
        title: form.title.trim(),
        message: form.message.trim(),
        link: form.link.trim() || undefined,
      });
      pushToast("Notification diffusée à tous les comptes clients", "success");
      setForm({ title: "", message: "", link: "" });
      refresh();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fitora-green/10 text-fitora-green">
          <Megaphone size={18} />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold">Notifications générales</h1>
          <p className="text-sm text-fitora-gray">
            Diffusez une annonce (promotion, nouveauté...) à tous les comptes clients.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-fitora-charcoal p-6">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-fitora-gray">Titre</span>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="input"
            placeholder="Ex : -20% sur toute la collection Running"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-fitora-gray">Message</span>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows={3}
            className="input resize-none"
            placeholder="Détaillez votre offre ou votre annonce..."
            required
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-fitora-gray">
            Lien (optionnel — ex : /promotions)
          </span>
          <input
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
            className="input"
            placeholder="/promotions"
          />
        </label>
        <Button type="submit" disabled={sending}>
          {sending ? "Envoi..." : <><Send size={16} /> Diffuser à tous les clients</>}
        </Button>
      </form>

      <h2 className="mb-3 mt-8 font-display text-sm font-semibold text-fitora-gray">
        Historique des diffusions
      </h2>
      <ul className="space-y-2">
        {broadcasts.map((b) => (
          <li key={b.id} className="rounded-xl bg-fitora-charcoal p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{b.title}</p>
              <span className="text-xs text-fitora-gray-dim">{formatDateTime(b.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm text-fitora-gray">{b.message}</p>
          </li>
        ))}
        {broadcasts.length === 0 && (
          <p className="py-6 text-center text-sm text-fitora-gray">Aucune diffusion envoyée pour le moment.</p>
        )}
      </ul>
    </div>
  );
}
