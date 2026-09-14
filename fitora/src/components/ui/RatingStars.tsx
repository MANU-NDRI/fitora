import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

export function RatingStars({
  rating,
  reviewCount,
  size = 14,
  showCount = true,
  className,
}: {
  rating: number;
  reviewCount?: number;
  size?: number;
  showCount?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i + 1 <= Math.round(rating);
          return (
            <Star
              key={i}
              size={size}
              className={filled ? "fill-fitora-green text-fitora-green" : "text-fitora-gray-dim"}
              strokeWidth={1.5}
            />
          );
        })}
      </div>
      {showCount && reviewCount !== undefined && (
        <span className="text-xs text-fitora-gray">({reviewCount})</span>
      )}
    </div>
  );
}
