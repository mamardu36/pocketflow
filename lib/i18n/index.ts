import { en, type Messages } from "@/lib/i18n/en";
import { fr } from "@/lib/i18n/fr";
import type { LanguageCode } from "@/types";

const dictionaries: Record<LanguageCode, Messages> = { en, fr };

export const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
];

/** Locale used for dates. */
export const DATE_LOCALES: Record<LanguageCode, string> = { en: "en-GB", fr: "fr-FR" };

export function getMessages(language: LanguageCode): Messages {
  return dictionaries[language] ?? en;
}

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && value in dictionaries;
}

/** Device language (first supported one), English otherwise. Always "en" on the server. */
export function detectLanguage(): LanguageCode {
  if (typeof navigator === "undefined") return "en";
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of candidates) {
    const base = tag?.toLowerCase().split("-")[0];
    if (isLanguageCode(base)) return base;
  }
  return "en";
}

/** Translates built-in category/goal names ("Rent" → "Loyer"); user-typed names are returned unchanged. */
export function localizeName(name: string, messages: Messages): string {
  return messages.categoryNames[name] ?? name;
}

export type { Messages };
