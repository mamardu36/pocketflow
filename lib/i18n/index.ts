import { en, type Messages } from "@/lib/i18n/en";
import type { LanguageCode } from "@/types";

const dictionaries: Record<LanguageCode, Messages> = { en };

/** `available: false` entries are shown as "coming soon" in Settings. */
export const LANGUAGES: { code: string; label: string; available: boolean }[] = [
  { code: "en", label: "English", available: true },
  { code: "fr", label: "Français", available: false },
];

/** Locale used for dates. */
export const DATE_LOCALES: Record<LanguageCode, string> = { en: "en-GB" };

export function getMessages(language: LanguageCode): Messages {
  return dictionaries[language] ?? en;
}

export type { Messages };
