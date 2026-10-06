import type { Messages } from "@/lib/i18n";
import { errorMessage } from "@/lib/utils";

/** Supabase returns English technical messages: show a clear, translated one when we recognise it. */
export function authErrorMessage(error: unknown, t: Messages): string {
  const raw = errorMessage(error, t.errors.generic);
  const rules: [RegExp, string][] = [
    [/invalid login credentials/i, t.auth.errorInvalidCredentials],
    [/email not confirmed/i, t.auth.errorEmailNotConfirmed],
    [/already (registered|exists)/i, t.auth.errorUserExists],
    [/rate limit|too many|security purposes/i, t.auth.errorRateLimit],
    [/load failed|failed to fetch|network|fetch/i, t.auth.errorNetwork],
    [/should be different/i, t.auth.errorSamePassword],
    [/password should be at least/i, t.auth.shortPassword],
  ];
  return rules.find(([re]) => re.test(raw))?.[1] ?? raw;
}
