"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authErrorMessage } from "@/components/auth/auth-errors";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { useApp, useT } from "@/hooks/use-app";
import { STORAGE_KEYS, safeGet } from "@/lib/storage/keys";

type AuthView = "signin" | "signup" | "reset";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthForm({ initialTab = "signin" }: { initialTab?: "signin" | "signup" }) {
  const t = useT();
  const router = useRouter();
  const { mode, cloudAvailable, signIn, signUp, startGuest, requestPasswordReset } = useApp();
  const [view, setView] = useState<AuthView>(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const switchView = (next: AuthView) => {
    setView(next);
    setErrors({});
    setInfo(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = t.auth.invalidEmail;
    if (view !== "reset" && password.length < 8) next.password = t.auth.shortPassword;
    setErrors(next);
    setInfo(null);
    if (next.email || next.password) return;

    setBusy(true);
    try {
      if (view === "reset") {
        await requestPasswordReset(email.trim());
        setInfo(t.auth.linkSent);
      } else if (view === "signin") {
        await signIn(email.trim(), password);
        router.replace("/");
      } else {
        const { needsConfirmation } = await signUp(email.trim(), password);
        if (needsConfirmation) {
          setView("signin");
          setInfo(t.auth.checkEmail);
        } else {
          router.replace("/");
        }
      }
    } catch (error) {
      setErrors({ form: authErrorMessage(error, t) });
    } finally {
      setBusy(false);
    }
  };

  // Existing guest data → go straight in; otherwise run onboarding.
  const continueGuest = async () => {
    if (mode === "guest") return router.replace("/");
    if (safeGet(STORAGE_KEYS.guestData)) {
      await startGuest();
      router.replace("/");
    } else {
      router.push("/onboarding");
    }
  };

  if (!cloudAvailable) {
    return (
      <div className="space-y-4">
        <p role="status" className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          {t.auth.notConfigured}
        </p>
        <Button size="lg" className="w-full" onClick={continueGuest}>
          {t.auth.continueGuest}
        </Button>
      </div>
    );
  }

  const isReset = view === "reset";

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {isReset ? (
        <div>
          <h2 className="text-lg font-semibold">{t.auth.resetTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.auth.resetHint}</p>
        </div>
      ) : (
        <>
          <Segmented
            label={t.auth.signInTitle}
            value={view}
            onChange={switchView}
            options={[
              { value: "signin", label: t.auth.signIn },
              { value: "signup", label: t.auth.signUp },
            ]}
          />
          <p className="text-sm text-muted-foreground">{view === "signin" ? t.auth.signInHint : t.auth.signUpHint}</p>
        </>
      )}

      <Field label={t.auth.email} htmlFor="auth-email" error={errors.email}>
        <Input
          id="auth-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(errors.email)}
          required
        />
      </Field>

      {!isReset && (
        <Field
          label={t.auth.password}
          htmlFor="auth-password"
          error={errors.password}
          hint={view === "signup" ? t.auth.passwordHint : undefined}
        >
          <Input
            id="auth-password"
            type="password"
            autoComplete={view === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
            required
          />
        </Field>
      )}

      {view === "signin" && (
        <button
          type="button"
          onClick={() => switchView("reset")}
          className="-mt-1 rounded-lg px-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t.auth.forgot}
        </button>
      )}

      {info && (
        <p role="status" className="rounded-2xl bg-positive/10 px-3 py-2 text-sm text-positive">
          {info}
        </p>
      )}
      {errors.form && (
        <p role="alert" className="rounded-2xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {errors.form}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? t.common.loading : isReset ? t.auth.sendLink : view === "signin" ? t.auth.signIn : t.auth.signUp}
      </Button>
      {isReset ? (
        <Button type="button" variant="ghost" size="lg" className="w-full" onClick={() => switchView("signin")} disabled={busy}>
          {t.auth.backToSignIn}
        </Button>
      ) : (
        <Button type="button" variant="ghost" size="lg" className="w-full" onClick={continueGuest} disabled={busy}>
          {t.auth.continueGuest}
        </Button>
      )}
    </form>
  );
}
