"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** "sheet": bottom sheet on mobile, centered on desktop. "dialog": always centered (confirmations). */
  variant?: "sheet" | "dialog";
  closeLabel?: string;
}

/**
 * The part of the screen actually visible. On phones the on-screen keyboard covers the bottom of the
 * page without resizing it (iOS), so a bottom sheet anchored to the page would slide under the keyboard.
 * Following window.visualViewport keeps the sheet right above the keyboard.
 */
function useVisibleArea(active: boolean): CSSProperties | undefined {
  const [area, setArea] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!active || !vv) return;
    const update = () => setArea({ top: vv.offsetTop, height: vv.height });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setArea(null);
    };
  }, [active]);
  return area ? { top: area.top, height: area.height, bottom: "auto" } : undefined;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Sheet({ open, onClose, title, description, children, variant = "sheet", closeLabel = "Close" }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();
  const descId = useId();
  const visibleArea = useVisibleArea(open);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const previous = { body: document.body.style.overflow, html: html.style.overflow };
    document.body.style.overflow = "hidden";
    html.style.overflow = "hidden";

    const panel = panelRef.current;
    const autofocus = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    // preventScroll: without it, phones scroll the page to the field while the sheet is still sliding in.
    autofocus?.focus({ preventScroll: true });

    // When a field gets focus (and the keyboard appears), bring it into view inside the sheet only.
    const scroller = panel?.querySelector<HTMLElement>("[data-sheet-scroll]");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onFocusIn = (e: FocusEvent) => {
      const field = e.target as HTMLElement;
      if (!scroller || !field.matches("input, textarea, select")) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const box = scroller.getBoundingClientRect();
        const rect = field.getBoundingClientRect();
        const margin = 16;
        if (rect.bottom > box.bottom - margin) scroller.scrollTop += rect.bottom - box.bottom + margin;
        else if (rect.top < box.top + margin) scroller.scrollTop -= box.top + margin - rect.top;
      }, 320); // after the keyboard animation
    };
    panel?.addEventListener("focusin", onFocusIn);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      } else if (e.key === "Tab" && panel) {
        const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      panel?.removeEventListener("focusin", onFocusIn);
      clearTimeout(timer);
      document.body.style.overflow = previous.body;
      html.style.overflow = previous.html;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const isDialog = variant === "dialog";
  return createPortal(
    <div
      style={visibleArea}
      className={cn("fixed inset-0 z-50 flex justify-center", isDialog ? "items-center p-4" : "items-end sm:items-center sm:p-4")}
    >
      <div aria-hidden className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panelRef}
        role={isDialog ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={cn(
          // 92% of the visible area (above the keyboard when it's open).
          "relative flex max-h-[92%] w-full flex-col overflow-hidden bg-card text-foreground shadow-lift",
          isDialog
            ? "max-w-sm animate-dialog-in rounded-3xl"
            : "animate-sheet-up rounded-t-4xl pb-[env(safe-area-inset-bottom)] sm:max-w-md sm:animate-dialog-in sm:rounded-4xl sm:pb-0",
        )}
      >
        {!isDialog && <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-muted-foreground/25 sm:hidden" />}
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {!isDialog && (
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="-mr-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div data-sheet-scroll className="overflow-y-auto overscroll-contain px-5 pb-5 pt-2">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
