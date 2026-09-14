import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useToastStore } from "@/store/toastStore";
import { cn } from "@/lib/cn";

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 md:top-6">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md",
                toast.type === "success" && "border-fitora-green/40 bg-fitora-black/95 text-fitora-white",
                toast.type === "error" && "border-red-500/40 bg-fitora-black/95 text-fitora-white",
                toast.type === "info" && "border-fitora-border bg-fitora-black/95 text-fitora-white"
              )}
              role="status"
            >
              <Icon
                size={18}
                className={cn(
                  toast.type === "success" && "text-fitora-green",
                  toast.type === "error" && "text-red-400",
                  toast.type === "info" && "text-fitora-gray"
                )}
              />
              <p className="flex-1 text-sm">{toast.message}</p>
              <button
                onClick={() => dismiss(toast.id)}
                aria-label="Fermer"
                className="text-fitora-gray-dim hover:text-fitora-white"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
