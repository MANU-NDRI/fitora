import { Check, Truck } from "lucide-react";
import type { OrderStatus } from "@/types";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STEPS } from "@/services/orderService";
import { cn } from "@/lib/cn";

export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400">
        Cette commande a été annulée.
      </div>
    );
  }

  const currentIndex = ORDER_STATUS_STEPS.indexOf(status);

  return (
    <ol className="space-y-0">
      {ORDER_STATUS_STEPS.map((step, i) => {
        const done = i <= currentIndex;
        const isCurrent = i === currentIndex;
        const isLast = i === ORDER_STATUS_STEPS.length - 1;
        return (
          <li key={step} className="relative flex gap-4 pb-8 last:pb-0">
            {!isLast && (
              <span
                className={cn(
                  "absolute left-[15px] top-8 h-full w-0.5",
                  done && i < currentIndex ? "bg-fitora-green" : "bg-fitora-border"
                )}
              />
            )}
            <span
              className={cn(
                "z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2",
                done
                  ? "border-fitora-green bg-fitora-green text-fitora-black"
                  : "border-fitora-border bg-fitora-black text-fitora-gray-dim"
              )}
            >
              {step === "delivering" && isCurrent ? <Truck size={14} /> : done ? <Check size={14} /> : null}
            </span>
            <div className={cn("pt-1", !done && "opacity-50")}>
              <p className={cn("text-sm font-semibold", isCurrent && "text-fitora-green")}>
                {ORDER_STATUS_LABELS[step]}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
