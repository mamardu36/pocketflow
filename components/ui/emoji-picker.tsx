import { EMOJI_OPTIONS } from "@/constants/categories";
import { cn } from "@/lib/utils";

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  label: string;
}

export function EmojiPicker({ value, onChange, label }: EmojiPickerProps) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-8 gap-1.5">
      {EMOJI_OPTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          role="radio"
          aria-checked={value === emoji}
          aria-label={emoji}
          onClick={() => onChange(emoji)}
          className={cn(
            "grid aspect-square place-items-center rounded-xl text-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === emoji ? "bg-primary/15 ring-2 ring-primary" : "hover:bg-muted",
          )}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
