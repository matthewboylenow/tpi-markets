import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-tpi-ink/15 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-tpi-blue focus:ring-2 focus:ring-tpi-blue/20",
          className
        )}
        {...rest}
      />
    );
  }
);

export function Label({
  htmlFor,
  children,
  hint,
  required,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between mb-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-xs font-medium uppercase tracking-wider text-tpi-stone"
      >
        {children}
        {required && <span className="text-tpi-orange ml-0.5">*</span>}
      </label>
      {hint && <span className="text-xs text-tpi-stone/70">{hint}</span>}
    </div>
  );
}

export function Field({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-0", className)}>{children}</div>;
}
