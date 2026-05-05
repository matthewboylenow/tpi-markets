import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-tpi-orange text-white hover:bg-tpi-orange-dark focus-visible:ring-tpi-orange/40",
  secondary:
    "bg-white border border-tpi-ink/15 text-tpi-ink hover:border-tpi-ink/30 focus-visible:ring-tpi-blue/30",
  ghost:
    "bg-transparent text-tpi-stone hover:text-tpi-ink hover:bg-tpi-ink/5 focus-visible:ring-tpi-blue/20",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/40",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", className, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-medium rounded-md transition-colors focus:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...rest}
    />
  );
});
