import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import {
  getNotificationsForUser,
  markAllAsRead,
  markAsRead,
  type NotificationView,
} from "@/services/notificationService";
import { cn } from "@/lib/cn";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

export function NotificationBell() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationView[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  async function refresh() {
    if (!user) return;
    setNotifications(await getNotificationsForUser(user.id));
  }

  useEffect(() => {
    refresh();
    // Rafraîchit périodiquement pour refléter les statuts de commande / réponses admin.
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleOpenNotification(n: NotificationView) {
    if (!user) return;
    await markAsRead(user.id, n.id);
    refresh();
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  async function handleMarkAllRead() {
    if (!user) return;
    await markAllAsRead(user.id);
    refresh();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-fitora-green px-1 text-[10px] font-bold text-fitora-black">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-fitora-border bg-fitora-charcoal shadow-xl sm:w-96"
          >
            <div className="flex items-center justify-between border-b border-fitora-border px-4 py-3">
              <p className="font-display text-sm font-bold">Notifications</p>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs text-fitora-gray hover:text-fitora-green"
                >
                  <CheckCheck size={13} /> Tout marquer comme lu
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-fitora-gray">
                  Aucune notification pour le moment.
                </p>
              ) : (
                <ul className="divide-y divide-fitora-border">
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <button
                        onClick={() => handleOpenNotification(n)}
                        className={cn(
                          "block w-full px-4 py-3 text-left transition-colors hover:bg-white/5",
                          !n.read && "bg-fitora-green/5"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold">{n.title}</p>
                          {!n.read && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-fitora-green" />}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-fitora-gray">{n.message}</p>
                        <p className="mt-1 text-[11px] text-fitora-gray-dim">{timeAgo(n.createdAt)}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
