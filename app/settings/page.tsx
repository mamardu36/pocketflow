"use client";

import {
  Cloud, Download, FlaskConical, LogOut, MessageCircleHeart, RotateCcw, ShieldCheck, Smartphone, Trash2, Upload, UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/navigation/page-header";
import { InstallGuideSheet } from "@/components/pwa/install-guide-sheet";
import { Card } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Field, Select } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { APP_CONFIG } from "@/config/app";
import { CURRENCIES, CURRENCY_CODES } from "@/constants/currencies";
import { useApp, useT } from "@/hooks/use-app";
import { useInstallOffer } from "@/hooks/use-install-offer";
import { updatePreferences } from "@/lib/domain/actions";
import { createEmptyData } from "@/lib/domain/factories";
import { hasUserData } from "@/lib/domain/selectors";
import { buildJsonExport, buildTransactionsCsv, downloadFile, parseImportFile } from "@/lib/export";
import { LANGUAGES } from "@/lib/i18n";
import { LocalRepository } from "@/lib/storage/local-repository";
import { cn, errorMessage } from "@/lib/utils";
import type { CurrencyCode, LanguageCode, ThemePreference } from "@/types";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">{title}</h2>
      <Card className="divide-y divide-border p-0">{children}</Card>
    </section>
  );
}

interface RowProps {
  icon: ReactNode;
  label: string;
  hint?: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
}

function Row({ icon, label, hint, onClick, href, danger, disabled }: RowProps) {
  const className = cn(
    "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition first:rounded-t-3xl last:rounded-b-3xl hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-50",
    danger && "text-danger",
  );
  const content = (
    <>
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", danger ? "bg-danger/10" : "bg-muted")} aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted-foreground">{hint}</span>}
      </span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {content}
    </button>
  );
}

function InfoRow({ icon, title, hint }: { icon: ReactNode; title: string; hint: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const t = useT();
  const router = useRouter();
  const confirm = useConfirm();
  const app = useApp();
  const { mode, user, data, commit, cloudAvailable } = app;
  const fileRef = useRef<HTMLInputElement>(null);
  const installOffer = useInstallOffer();
  const [busy, setBusy] = useState(false);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const stamp = new Date().toISOString().slice(0, 10);
  const slug = APP_CONFIG.name.toLowerCase().replace(/\s+/g, "-");

  const exportJson = () => {
    downloadFile(`${slug}-${stamp}.json`, buildJsonExport(data), "application/json");
  };
  const exportCsv = () => {
    downloadFile(`${slug}-expenses-${stamp}.csv`, buildTransactionsCsv(data), "text/csv;charset=utf-8");
  };

  const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await run(async () => {
      const imported = parseImportFile(await file.text());
      const ok = await confirm({
        title: t.settings.importTitle,
        description: t.settings.importBody,
        confirmLabel: t.settings.importJson,
        cancelLabel: t.common.cancel,
        destructive: true,
      });
      if (!ok) return;
      await app.replaceAllData(imported);
      toast.success(t.settings.imported);
    });
  };

  const reset = async () => {
    const ok = await confirm({
      title: t.settings.resetTitle,
      description: t.settings.resetBody,
      confirmLabel: t.settings.reset,
      cancelLabel: t.common.cancel,
      destructive: true,
    });
    if (!ok) return;
    await run(async () => {
      await app.replaceAllData({ ...createEmptyData(), preferences: data.preferences });
      toast.success(t.settings.resetDone);
      router.push("/");
    });
  };

  const clearLocal = async () => {
    const ok = await confirm({
      title: t.settings.clearLocalTitle,
      description: t.settings.clearLocalBody,
      confirmLabel: t.settings.clearLocal,
      cancelLabel: t.common.cancel,
      destructive: true,
    });
    if (!ok) return;
    await run(async () => {
      await app.clearGuestData();
      toast.success(t.settings.localCleared);
    });
  };

  const signOut = async () => {
    if (app.syncPending) {
      const ok = await confirm({
        title: t.sync.signOutTitle,
        description: t.sync.signOutBody,
        confirmLabel: t.sync.signOutAnyway,
        cancelLabel: t.common.cancel,
        destructive: true,
      });
      if (!ok) return;
    }
    await run(async () => {
      await app.signOut();
      router.replace("/welcome");
    });
  };

  const deleteAccount = async () => {
    const ok = await confirm({
      title: t.settings.deleteAccountTitle,
      description: t.settings.deleteAccountBody,
      confirmLabel: t.settings.deleteAccount,
      cancelLabel: t.common.cancel,
      destructive: true,
    });
    if (!ok) return;
    await run(async () => {
      await app.deleteAccount();
      toast.success(t.settings.accountDeleted);
      router.replace("/welcome");
    });
  };

  // Opens the mail app with just the address filled in.
  const sendFeedback = () => {
    window.location.href = `mailto:${APP_CONFIG.contactEmail}`;
  };

  const localGuestData = mode === "cloud" && hasUserData(LocalRepository.guest().peek());

  return (
    <div className="space-y-6">
      <PageHeader title={t.settings.title} />

      <Section title={t.settings.account}>
        {mode === "cloud" && user && (
          <>
            <InfoRow
              icon={<UserRound className="h-5 w-5" />}
              title={t.settings.signedInAs(user.email)}
              hint={app.syncPending ? t.sync.pending : t.settings.syncHint}
            />
            {localGuestData && <Row icon={<Smartphone className="h-4 w-4" />} label={t.settings.importLocal} onClick={app.openMigration} />}
            <Row icon={<LogOut className="h-4 w-4" />} label={t.settings.signOut} onClick={signOut} disabled={busy} />
            <Row icon={<Trash2 className="h-4 w-4" />} label={t.settings.deleteAccount} onClick={deleteAccount} danger disabled={busy} />
          </>
        )}
        {mode === "guest" && (
          <>
            <InfoRow icon={<Smartphone className="h-5 w-5" />} title={t.settings.guestMode} hint={t.settings.guestHint} />
            {cloudAvailable ? (
              <>
                <Row icon={<Cloud className="h-4 w-4" />} label={t.settings.createAccount} hint={t.auth.signUpHint} href="/auth" />
                <Row icon={<Upload className="h-4 w-4" />} label={t.settings.transferData} hint={t.migration.keep} href="/auth" />
              </>
            ) : (
              <p className="px-4 py-3 text-sm text-muted-foreground">{t.settings.cloudUnavailable}</p>
            )}
            <Row icon={<Trash2 className="h-4 w-4" />} label={t.settings.clearLocal} onClick={clearLocal} danger disabled={busy} />
          </>
        )}
        {mode === "demo" && (
          <>
            <InfoRow icon={<FlaskConical className="h-5 w-5" />} title={t.settings.demoMode} hint={t.settings.demoHint} />
            <Row
              icon={<RotateCcw className="h-4 w-4" />}
              label={t.demo.reset}
              onClick={() => run(async () => {
                await app.startDemo();
              })}
            />
            <Row
              icon={<LogOut className="h-4 w-4" />}
              label={t.demo.exit}
              onClick={() => {
                app.leave();
                router.replace("/welcome");
              }}
            />
          </>
        )}
        {installOffer.canInstall && (
          <Row
            icon={<Smartphone className="h-4 w-4" />}
            label={t.settings.installApp}
            hint={t.settings.installHint}
            onClick={installOffer.install}
          />
        )}
      </Section>

      <Section title={t.settings.preferences}>
        <div className="space-y-4 p-4">
          <Field label={t.settings.currency} htmlFor="pref-currency">
            <Select
              id="pref-currency"
              value={data.preferences.currency}
              onChange={(e) => commit((d) => updatePreferences(d, { currency: e.target.value as CurrencyCode }))}
            >
              {CURRENCY_CODES.map((code) => (
                <option key={code} value={code}>
                  {CURRENCIES[code].symbol} · {CURRENCIES[code].label} ({code})
                </option>
              ))}
            </Select>
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-medium">{t.settings.theme}</p>
            <Segmented<ThemePreference>
              label={t.settings.theme}
              value={data.preferences.theme}
              onChange={(theme) => commit((d) => updatePreferences(d, { theme }))}
              options={(["system", "light", "dark"] as const).map((v) => ({ value: v, label: t.settings.themes[v] }))}
            />
          </div>
          <Field label={t.settings.language} htmlFor="pref-language" hint={t.settings.languageHint}>
            <Select
              id="pref-language"
              value={data.preferences.language}
              onChange={(e) => commit((d) => updatePreferences(d, { language: e.target.value as LanguageCode }))}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      <Section title={t.settings.data}>
        <Row icon={<Download className="h-4 w-4" />} label={t.settings.exportJson} onClick={exportJson} />
        <Row icon={<Download className="h-4 w-4" />} label={t.settings.exportCsv} onClick={exportCsv} disabled={data.transactions.length === 0} />
        <Row icon={<Upload className="h-4 w-4" />} label={t.settings.importJson} onClick={() => fileRef.current?.click()} disabled={busy} />
        <Row icon={<RotateCcw className="h-4 w-4" />} label={t.settings.reset} onClick={reset} danger disabled={busy} />
      </Section>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFile} aria-hidden tabIndex={-1} />

      <InstallGuideSheet open={installOffer.guideOpen} onClose={installOffer.closeGuide} />

      <Section title={t.settings.about}>
        {APP_CONFIG.contactEmail && (
          <Row
            icon={<MessageCircleHeart className="h-4 w-4" />}
            label={t.settings.feedback}
            hint={t.settings.feedbackHint}
            onClick={sendFeedback}
          />
        )}
        <Row icon={<ShieldCheck className="h-4 w-4" />} label={t.settings.privacy} href="/privacy" />
      </Section>

      <p className="pb-2 text-center text-xs text-muted-foreground">
        {APP_CONFIG.name} · {t.settings.version(APP_CONFIG.version)}
      </p>
    </div>
  );
}
