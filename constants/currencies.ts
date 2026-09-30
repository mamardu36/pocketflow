import type { CurrencyCode } from "@/types";

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  label: string;
  /** Locale used by Intl to format this currency. */
  locale: string;
}

/** Add a currency: extend `CurrencyCode` in types and add an entry here (+ the SQL check constraint). */
export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  EUR: { code: "EUR", symbol: "€", label: "Euro", locale: "en-IE" },
  USD: { code: "USD", symbol: "$", label: "US dollar", locale: "en-US" },
  GBP: { code: "GBP", symbol: "£", label: "British pound", locale: "en-GB" },
  CHF: { code: "CHF", symbol: "CHF", label: "Swiss franc", locale: "de-CH" },
  CAD: { code: "CAD", symbol: "$", label: "Canadian dollar", locale: "en-CA" },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];
