"use client";

import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { APP_CONFIG } from "@/config/app";
import { useApp, useT } from "@/hooks/use-app";

export default function AuthPage() {
  const t = useT();
  const router = useRouter();
  const { mode } = useApp();
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <button
        type="button"
        onClick={() => router.push(mode ? "/settings" : "/welcome")}
        aria-label={t.common.back}
        className="-ml-2 grid h-11 w-11 place-items-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="mt-6 animate-fade-in">
        <Logo className="h-12 w-12" />
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">{APP_CONFIG.name}</h1>
        <div className="mt-6">
          <AuthForm initialTab={mode === "guest" ? "signup" : "signin"} />
        </div>
      </div>
    </div>
  );
}
