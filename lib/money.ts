import { CURRENCIES } from "@/constants/currencies";
import type { Cents, CurrencyCode, LanguageCode } from "@/types";

const formatterCache = new Map<string, Intl.NumberFormat>();

/** French UI → French number style (1 000,50 €); otherwise the currency's own locale (€1,000.50). */
export function moneyLocale(currency: CurrencyCode, language: LanguageCode = "en"): string {
  if (language === "fr") return currency === "CHF" ? "fr-CH" : currency === "CAD" ? "fr-CA" : "fr-FR";
  return CURRENCIES[currency].locale;
}

function getFormatter(currency: CurrencyCode, decimals: boolean, language: LanguageCode): Intl.NumberFormat {
  const key = `${currency}:${decimals}:${language}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(moneyLocale(currency, language), {
      style: "currency",
      currency,
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: 2,
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

export interface FormatMoneyOptions {
  /** Prefix positive values with "+". */
  signed?: boolean;
  /** UI language; changes separators and symbol position. Defaults to English. */
  language?: LanguageCode;
}

/** €1,000 for whole amounts, €167.50 otherwise. */
export function formatMoney(cents: Cents, currency: CurrencyCode, options: FormatMoneyOptions = {}): string {
  const abs = Math.abs(Math.round(cents));
  const text = getFormatter(currency, abs % 100 !== 0, options.language ?? "en").format(abs / 100);
  if (cents < 0) return `−${text}`;
  if (options.signed && cents > 0) return `+${text}`;
  return text;
}

const MAX_CENTS = 99_999_999_99; // ~1 billion, protects against absurd input

/**
 * Parses user input into integer cents without floating point math.
 * Accepts "32.50", "32,50", "1,000.50", "1.000,50", "€ 12". Returns null if invalid.
 */
export function parseMoneyInput(input: string): Cents | null {
  let s = input.trim().replace(/[\s\u00a0\u202f'’]/g, "").replace(/^(€|\$|£|CHF|CAD|EUR|USD|GBP)/i, "").replace(/(€|\$|£)$/, "");
  if (!s) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    const decimalSep = lastComma > lastDot ? "," : ".";
    const thousandSep = decimalSep === "," ? "." : ",";
    s = s.split(thousandSep).join("").replace(decimalSep, ".");
  } else if (lastComma > -1) {
    s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (lastDot > -1 && /^\d{1,3}(\.\d{3}){2,}$/.test(s)) {
    s = s.replace(/\./g, "");
  }

  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  const [whole, fraction = ""] = s.split(".");
  const cents = Number.parseInt(whole, 10) * 100 + Number.parseInt(fraction.padEnd(2, "0") || "0", 10);
  if (!Number.isSafeInteger(cents) || cents > MAX_CENTS) return null;
  return cents;
}

/** Value used to prefill inputs: 3250 → "32.50", 60000 → "600". */
export function centsToInput(cents: Cents): string {
  if (cents % 100 === 0) return String(cents / 100);
  const whole = Math.trunc(cents / 100);
  const fraction = String(Math.abs(cents % 100)).padStart(2, "0");
  return `${whole}.${fraction}`;
}

/** Where the currency symbol goes for this language: "€12" in English, "12 €" in French. */
export function currencySymbolPosition(currency: CurrencyCode, language: LanguageCode = "en"): "prefix" | "suffix" {
  const parts = new Intl.NumberFormat(moneyLocale(currency, language), { style: "currency", currency }).formatToParts(1);
  const symbolIndex = parts.findIndex((p) => p.type === "currency");
  const numberIndex = parts.findIndex((p) => p.type === "integer");
  return symbolIndex > numberIndex ? "suffix" : "prefix";
}
