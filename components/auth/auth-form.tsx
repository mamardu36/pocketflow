"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { useApp, useT } from "@/hooks/use-app";
import { STORAGE_KEYS, safeGet } from "@/lib/storage/keys";
import { errorMessage } from "@/lib/utils";

type AuthTab = "signin" | "signup";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthForm({ initialTab = "signin" }: { initialTab?: AuthTab }) {
  const t = useT();
  const router = useRouter();
  const { mode, cloudAvailable, signIn, signUp, startGuest } = useApp();
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = t.auth.invalidEmail;
    if (password.length < 8) next.password = t.auth.shortPassword;
    setErrors(next);
    setInfo(null);
    if (next.email || next.password) return;

    setBusy(true);
    try {
      if (tab === "signin") {
        await signIn(email.trim(), password);
        toast.success(t.auth.signedIn);
        router.replace("/");
      } else {
        const { needsConfirmation } = await signUp(email.trim(), password);
        if (needsConfirmation) {
          setInfo(t.auth.checkEmail);
          setTab("signin");
        } else {
          toast.success(t.auth.accountCreated);
          router.replace("/");
        }
      }
    } catch (error) {
      setErrors({ form: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const continueGuest = async () => {
    if (mode === "guest") return router.replace("/");
    await startGuestOrOnboard();
  };

  // Existing guest data → go straight in; otherwise run onboarding.
  const startGuestOrOnboard = async () => {
    const hasLocal = safeGet(STORAGE_KEYS.guestData);
    if (hasLocal) {
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

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Segmented
        label={t.auth.signInTitle}
        value={tab}
        onChange={(v) => {
          setTab(v);
          setErrors({});
        }}
        options={[
          { value: "signin", label: t.auth.signIn },
          { value: "signup", label: t.auth.signUp },
        ]}
      />
      <p className="text-sm text-muted-foreground">{tab === "signin" ? t.auth.signInHint : t.auth.signUpHint}</p>
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
      <Field label={t.auth.password} htmlFor="auth-password" error={errors.password} hint={tab === "signup" ? t.auth.passwordHint : undefined}>
        <Input
          id="auth-password"
          type="password"
          autoComplete={tab === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(errors.password)}
          required
        />
      </Field>
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
        {busy ? t.common.loading : tab === "signin" ? t.auth.signIn : t.auth.signUp}
      </Button>
      <Button type="button" variant="ghost" size="lg" className="w-full" onClick={continueGuest} disabled={busy}>
        {t.auth.continueGuest}
      </Button>
    </form>
  );
}
