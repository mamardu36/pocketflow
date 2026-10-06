"use client";

import { ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { authErrorMessage } from "@/components/auth/auth-errors";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useApp, useT } from "@/hooks/use-app";
import { getSupabaseClient } from "@/lib/supabase/client";

type LinkState = "checking" | "ready" | "invalid";

/** Landing page of the "reset password" email. The link signs the person in; they then pick a new password. */
export default function ResetPasswordPage() {
  const t = useT();
  const router = useRouter();
  const { completePasswordReset } = useApp();
  const [state, setState] = useState<LinkState>("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || window.location.hash.includes("error=")) {
      setState("invalid");
      return;
    }
    const markReady = () => setState("ready");
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      if (session) markReady();
    });
    client.auth.getSession().then(({ data }) => {
      if (data.session) markReady();
    });
    const timeout = setTimeout(() => setState((s) => (s === "checking" ? "invalid" : s)), 6000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError(t.auth.shortPassword);
    setError(null);
    setBusy(true);
    try {
      await completePasswordReset(password);
      toast.success(t.auth.passwordUpdated);
      router.replace("/");
    } catch (err) {
      setError(authErrorMessage(err, t));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <Link
        href="/auth"
        aria-label={t.common.back}
        className="-ml-2 grid h-11 w-11 place-items-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <div className="mt-6 animate-fade-in">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <KeyRound className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">{t.auth.newPasswordTitle}</h1>

        {state === "checking" && (
          <p role="status" className="mt-6 text-sm text-muted-foreground">
            {t.auth.checkingLink}
          </p>
        )}

        {state === "invalid" && (
          <div className="mt-6 space-y-4">
            <p role="alert" className="rounded-2xl bg-danger/10 px-3 py-2 text-sm text-danger">
              {t.auth.linkInvalid}
            </p>
            <Link href="/auth" className={buttonClasses("primary", "lg", "w-full")}>
              {t.auth.backToSignIn}
            </Link>
          </div>
        )}

        {state === "ready" && (
          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            <Field label={t.auth.newPassword} htmlFor="new-password" hint={t.auth.passwordHint} error={error}>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(error)}
                autoFocus
                required
              />
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? t.common.loading : t.auth.updatePassword}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
