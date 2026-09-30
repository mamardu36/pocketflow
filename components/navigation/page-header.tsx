"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useT } from "@/hooks/use-app";

interface PageHeaderProps {
  title: ReactNode;
  back?: boolean;
  action?: ReactNode;
}

export function PageHeader({ title, back, action }: PageHeaderProps) {
  const router = useRouter();
  const t = useT();
  return (
    <header className="mb-5 flex min-h-11 items-center gap-2">
      {back && (
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
          aria-label={t.common.back}
          className="-ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <div className="min-w-0 flex-1">{typeof title === "string" ? <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1> : title}</div>
      {action}
    </header>
  );
}
