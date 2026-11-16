import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useUiStore, type ToastVariant } from '@/stores/uiStore';

const STYLES: Record<ToastVariant, { box: string; icon: typeof Info }> = {
  success: { box: 'bg-brand-900 text-white border-green-500/40', icon: CheckCircle2 },
  error: { box: 'bg-danger text-white border-red-300/30', icon: AlertCircle },
  warning: { box: 'bg-amber-900 text-white border-amber-400/40', icon: TriangleAlert },
  info: { box: 'bg-brand-900 text-white border-stone-700', icon: Info },
};

export function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts);
  const dismissToast = useUiStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => {
        const cfg = STYLES[toast.variant];
        const Icon = cfg.icon;
        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-md items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg ${cfg.box}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Tutup notifikasi"
              className="rounded-lg p-1 opacity-75 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

