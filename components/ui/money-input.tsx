"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { CURRENCIES } from "@/constants/currencies";
import { useApp } from "@/hooks/use-app";
import { currencySymbolPosition } from "@/lib/money";
import { cn } from "@/lib/utils";

interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "size"> {
  value: string;
  onValueChange: (value: string) => void;
  size?: "md" | "xl";
}

/**
 * Text input with decimal keyboard; parse the string with parseMoneyInput().
 * The symbol follows the language: "€ 12" in English, "12 €" in French.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onValueChange, size = "md", className, ...props },
  ref,
) {
  const { currency, language } = useApp().data.preferences;
  const symbol = CURRENCIES[currency].symbol;
  const suffix = currencySymbolPosition(currency, language) === "suffix";
  const xl = size === "xl";
  const symbolEl = (
    <span aria-hidden className={cn("shrink-0 text-muted-foreground", xl ? "text-3xl" : "text-base")}>
      {symbol}
    </span>
  );
  return (
    <div
      // Clicking anywhere in the box (e.g. on the symbol) focuses the field.
      onClick={(e) => (e.currentTarget.querySelector("input") as HTMLInputElement | null)?.focus()}
      className={cn(
        "flex cursor-text items-center gap-2 overflow-hidden rounded-2xl border border-border bg-background px-4 transition focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
        xl ? "h-20" : "h-12",
        className,
      )}
    >
      {!suffix && symbolEl}
      {suffix ? (
        // Auto-width: an invisible copy of the text (::after) sizes the grid cell the input sits in,
        // so the symbol always sits right after the number.
        <span
          data-value={value || "0"}
          className={cn(
            "tabular inline-grid min-w-0 max-w-full after:invisible after:whitespace-pre after:content-[attr(data-value)] after:[grid-area:1/1]",
            xl ? "text-4xl font-semibold tracking-tight" : "text-base",
          )}
        >
          <input
            ref={ref}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={value}
            onChange={(e) => onValueChange(e.target.value.replace(/[^\d.,\s]/g, ""))}
            // size=1 removes the browser's default ~20-character width; the grid cell sets the real width.
            size={1}
            className="w-0 min-w-full bg-transparent text-foreground [grid-area:1/1] placeholder:text-muted-foreground/50 focus:outline-none"
            {...props}
          />
        </span>
      ) : (
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
      )}
      {suffix && symbolEl}
    </div>
  );
});
