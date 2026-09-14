import { useState } from "react";
import { Star } from "lucide-react";

export function StarRatingInput({
  value,
  onChange,
  size = 22,
}: {
  value: number;
  onChange: (rating: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = i + 1;
        const filled = starValue <= display;
        return (
          <button
            key={starValue}
            type="button"
            onClick={() => onChange(starValue)}
            onMouseEnter={() => setHover(starValue)}
            onMouseLeave={() => setHover(null)}
            aria-label={`${starValue} étoile${starValue > 1 ? "s" : ""}`}
          >
            <Star
              size={size}
              className={filled ? "fill-fitora-green text-fitora-green" : "text-fitora-gray-dim"}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </div>
  );
}
