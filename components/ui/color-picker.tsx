import { CATEGORY_COLORS, COLOR_STYLES } from "@/constants/categories";
import { cn } from "@/lib/utils";
import type { CategoryColor } from "@/types";

export function ColorPicker({ value, onChange, label }: { value: CategoryColor; onChange: (c: CategoryColor) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {CATEGORY_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={color}
          onClick={() => onChange(color)}
          className={cn(
            "h-8 w-8 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
            COLOR_STYLES[color].swatch,
            value === color ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : "opacity-80 hover:opacity-100",
          )}
        />
      ))}
    </div>
  );
}
