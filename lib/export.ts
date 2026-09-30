import { APP_CONFIG } from "@/config/app";
import { parseAppData } from "@/lib/storage/schema";
import { centsToInput } from "@/lib/money";
import type { AppData } from "@/types";

export function buildJsonExport(data: AppData): string {
  return JSON.stringify({ app: APP_CONFIG.name, format: 1, exportedAt: new Date().toISOString(), data }, null, 2);
}

const csvCell = (value: string | number): string => {
  const s = String(value);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function buildTransactionsCsv(data: AppData): string {
  const categories = new Map(data.categories.map((c) => [c.id, c]));
  const header = ["date", "description", "category", "category_type", "amount", "currency"];
  const rows = [...data.transactions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => {
      const c = categories.get(t.categoryId);
      return [t.date, t.description, c?.name ?? "", c?.type ?? "", centsToInput(t.amount), data.preferences.currency];
    });
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}

export function parseImportFile(text: string): AppData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("This file isn't valid JSON.");
  }
  return parseAppData(raw);
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
