import { COLOR_STYLES } from "@/constants/categories";
import { cn } from "@/lib/utils";
import type { CategoryColor } from "@/types";

export function CategoryIcon({ emoji, color, size = "md" }: { emoji: string; color: CategoryColor; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center",
        COLOR_STYLES[color].tile,
        size === "sm" && "h-9 w-9 rounded-xl text-base",
        size === "md" && "h-11 w-11 rounded-2xl text-xl",
        size === "lg" && "h-14 w-14 rounded-[1.1rem] text-2xl",
      )}
    >
      {emoji}
    </span>
  );
}
