import { useEffect, useState } from "react";
import { Megaphone, Send, Trash2 } from "lucide-react";
import type { AppNotification } from "@/types";
import { adminSendBroadcast, adminGetBroadcasts, adminDeleteNotification } from "@/services/notificationService";
import { useToastStore } from "@/store/toastStore";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";

export function AdminNotificationsPage() {
  const [broadcasts, setBroadcasts] = useState<AppNotification[]>([]);
  const [form, setForm] = useState({ title: "", message: "", link: "" });
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  async function handleDeleteBroadcast(id: string) {
    if (deletingId === id) return;

    // Diffusion générale : la suppression la retire immédiatement pour tous
    // les clients (une seule ligne en base, pas de copie par client) — on
    // confirme donc explicitement avant d'agir.
    const confirmed = window.confirm(
      "Supprimer définitivement cette diffusion ? Elle disparaîtra du compte de tous les clients."
    );
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await adminDeleteNotification(id);
      pushToast("Diffusion supprimée", "success");
      await refresh();
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : "Impossible de supprimer cette diffusion.",
        "error"
      );
    } finally {
      setDeletingId(null);
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
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-fitora-green/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fitora-green">
                  Diffusion
                </span>
                <p className="text-sm font-semibold">{b.title}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-fitora-gray-dim">{formatDateTime(b.createdAt)}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteBroadcast(b.id)}
                  disabled={deletingId === b.id}
                  aria-label="Supprimer la diffusion"
                  title="Supprimer"
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-fitora-gray transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
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
