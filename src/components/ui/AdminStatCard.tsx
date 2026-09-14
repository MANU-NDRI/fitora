import { cn } from "@/lib/cn";

export function AdminStatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-fitora-charcoal p-5">
      <div
        className={cn(
          "mb-3 flex h-10 w-10 items-center justify-center rounded-full",
          accent ? "bg-fitora-green/10 text-fitora-green" : "bg-white/5 text-fitora-gray"
        )}
      >
        <Icon size={18} />
      </div>
      <p className="font-display text-2xl font-bold">{value}</p>
      <p className="text-xs text-fitora-gray">{label}</p>
    </div>
  );
}
