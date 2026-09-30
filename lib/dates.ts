import type { MonthKey } from "@/types";

/** All dates are local calendar dates (YYYY-MM-DD). We never use UTC day boundaries. */

export function getCurrentMonthKey(now: Date = new Date()): MonthKey {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function addMonths(key: MonthKey, delta: number): MonthKey {
  const index = key.year * 12 + (key.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (((index % 12) + 12) % 12) + 1 };
}

export function compareMonthKeys(a: MonthKey, b: MonthKey): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

export function isSameMonth(a: MonthKey, b: MonthKey): boolean {
  return a.year === b.year && a.month === b.month;
}

/** Handles February and leap years via the Date overflow trick. */
export function daysInMonth(key: MonthKey): number {
  return new Date(key.year, key.month, 0).getDate();
}

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isValidISODate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const date = parseISODate(iso);
  return toISODate(date) === iso;
}

export function monthKeyFromISODate(iso: string): MonthKey {
  const [y, m] = iso.split("-").map(Number);
  return { year: y, month: m };
}

export function isDateInMonth(iso: string, key: MonthKey): boolean {
  return isValidISODate(iso) && isSameMonth(monthKeyFromISODate(iso), key);
}

export function firstDayOfMonth(key: MonthKey): string {
  return `${key.year}-${pad(key.month)}-01`;
}

export function lastDayOfMonth(key: MonthKey): string {
  return `${key.year}-${pad(key.month)}-${pad(daysInMonth(key))}`;
}

/** Today when viewing the current month, otherwise a date inside the viewed month. */
export function defaultDateForMonth(key: MonthKey, today: Date = new Date()): string {
  const cmp = compareMonthKeys(key, getCurrentMonthKey(today));
  if (cmp === 0) return toISODate(today);
  return cmp < 0 ? lastDayOfMonth(key) : firstDayOfMonth(key);
}

export function monthKeyToString(key: MonthKey): string {
  return `${key.year}-${pad(key.month)}`;
}

export function formatMonthLabel(key: MonthKey, locale = "en-GB", withYear = true): string {
  return new Intl.DateTimeFormat(locale, { month: "long", ...(withYear ? { year: "numeric" } : {}) }).format(
    new Date(key.year, key.month - 1, 1),
  );
}

export function formatShortDate(iso: string, locale = "en-GB"): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(parseISODate(iso));
}

export function formatLongDate(iso: string, locale = "en-GB"): string {
  return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(parseISODate(iso));
}

/** Whole days between two local dates (b − a). */
export function daysBetween(a: string, b: string): number {
  const ms = parseISODate(b).getTime() - parseISODate(a).getTime();
  return Math.round(ms / 86_400_000);
}
