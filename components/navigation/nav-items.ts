import { CalendarClock, House, PiggyBank, ReceiptText, Settings, type LucideIcon } from "lucide-react";
import type { Messages } from "@/lib/i18n";

export interface NavItem {
  href: string;
  label: keyof Messages["nav"];
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "home", icon: House },
  { href: "/expenses", label: "expenses", icon: ReceiptText },
  { href: "/savings", label: "savings", icon: PiggyBank },
  { href: "/history", label: "history", icon: CalendarClock },
  { href: "/settings", label: "settings", icon: Settings },
];

/** Detail pages highlight their parent tab. */
export function isNavActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/category");
  if (href === "/history") return pathname.startsWith("/history") || pathname.startsWith("/month");
  return pathname.startsWith(href);
}
