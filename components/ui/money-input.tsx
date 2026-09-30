"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { CURRENCIES } from "@/constants/currencies";
import { useApp } from "@/hooks/use-app";
import { cn } from "@/lib/utils";

interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "size"> {
  value: string;
  onValueChange: (value: string) => void;
  size?: "md" | "xl";
}

/** Text input with decimal keyboard; parse the string with parseMoneyInput(). */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onValueChange, size = "md", className, ...props },
  ref,
) {
  const symbol = CURRENCIES[useApp().data.preferences.currency].symbol;
  const xl = size === "xl";
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-border bg-background px-4 transition focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
        xl ? "h-20" : "h-12",
        className,
      )}
    >
      <span aria-hidden className={cn("text-muted-foreground", xl ? "text-3xl" : "text-base")}>
        {symbol}
      </span>
      <input
        ref={ref}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        value={value}
        onChange={(e) => onValueChange(e.target.value.replace(/[^\d.,\s]/g, ""))}
        className={cn(
          "tabular min-w-0 flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none",
          xl ? "text-4xl font-semibold tracking-tight" : "text-base",
        )}
        {...props}
      />
    </div>
  );
});
