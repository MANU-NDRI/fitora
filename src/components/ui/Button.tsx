import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-fitora-green text-fitora-black hover:brightness-95 active:brightness-90 shadow-[0_0_0_rgba(0,0,0,0)] hover:shadow-glow",
  secondary: "bg-fitora-white text-fitora-black hover:bg-white/90",
  outline: "border border-fitora-green text-fitora-green hover:bg-fitora-green hover:text-fitora-black",
  ghost: "text-fitora-white hover:bg-white/10",
  danger: "bg-red-500/90 text-white hover:bg-red-500",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-12 px-6 text-sm",
  lg: "h-14 px-8 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40",
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
