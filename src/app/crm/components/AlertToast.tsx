import { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from "lucide-react";
import { cn } from "../../components/ui/utils";

export type ToastVariant = "info" | "success" | "warning" | "error";

export interface Toast {
  id: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const VARIANT_STYLES: Record<ToastVariant, { icon: typeof Info; classes: string; border: string }> = {
  info: {
    icon: Info,
    classes: "bg-[#3D2210] text-white",
    border: "border-l-[#D4AF37]",
  },
  success: {
    icon: CheckCircle,
    classes: "bg-[#1B3A1C] text-white",
    border: "border-l-[#2E7D32]",
  },
  warning: {
    icon: AlertTriangle,
    classes: "bg-[#3D2A00] text-white",
    border: "border-l-[#FFC107]",
  },
  error: {
    icon: AlertCircle,
    classes: "bg-[#3D0000] text-white",
    border: "border-l-[#B71C1C]",
  },
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const variant = toast.variant ?? "info";
  const { icon: Icon, classes, border } = VARIANT_STYLES[variant];
  const duration = toast.duration ?? 5000;

  const dismiss = useCallback(() => {
    const el = elRef.current;
    if (!el) { onDismiss(toast.id); return; }
    gsap.to(el, {
      y: -20,
      autoAlpha: 0,
      scale: 0.95,
      duration: 0.28,
      ease: "power2.in",
      onComplete: () => onDismiss(toast.id),
    });
  }, [toast.id, onDismiss]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    // Entrance: drop from top with elastic bounce
    gsap.fromTo(
      el,
      { y: -60, autoAlpha: 0, scale: 0.92 },
      { y: 0, autoAlpha: 1, scale: 1, duration: 0.45, ease: "elastic.out(0.8, 0.5)" }
    );

    // Auto-dismiss
    timerRef.current = setTimeout(dismiss, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dismiss, duration]);

  return (
    <div
      ref={elRef}
      className={cn(
        "flex min-w-[280px] max-w-sm items-start gap-3 rounded-xl border border-white/10 border-l-4 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-sm",
        classes,
        border
      )}
      role="alert"
      aria-live="assertive"
    >
      <Icon className="mt-0.5 size-4 shrink-0 opacity-85" />
      <p className="flex-1 text-sm leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={dismiss}
        className="ml-1 rounded-md p-0.5 opacity-60 transition-opacity hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

// ── Toast store (module-level singleton) ──────────────────────────────────────

type Listener = (toasts: Toast[]) => void;
let _toasts: Toast[] = [];
const _listeners = new Set<Listener>();

function notify() {
  _listeners.forEach((l) => l([..._toasts]));
}

export const toastStore = {
  add(toast: Omit<Toast, "id">) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    _toasts = [..._toasts, { ...toast, id }];
    notify();
    return id;
  },
  remove(id: string) {
    _toasts = _toasts.filter((t) => t.id !== id);
    notify();
  },
  subscribe(listener: Listener) {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
};

/** Convenience helpers */
export const toast = {
  info: (message: string, opts?: Partial<Toast>) => toastStore.add({ ...opts, message, variant: "info" }),
  success: (message: string, opts?: Partial<Toast>) => toastStore.add({ ...opts, message, variant: "success" }),
  warning: (message: string, opts?: Partial<Toast>) => toastStore.add({ ...opts, message, variant: "warning" }),
  error: (message: string, opts?: Partial<Toast>) => toastStore.add({ ...opts, message, variant: "error" }),
};

// ── AlertToastContainer — mount once near the root ───────────────────────────

export function AlertToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    setToasts([..._toasts]);
    return toastStore.subscribe(setToasts);
  }, []);

  const dismiss = useCallback((id: string) => toastStore.remove(id), []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed right-4 top-4 z-[9999] flex flex-col items-end gap-2"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  );
}
