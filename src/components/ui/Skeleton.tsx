export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-stone-200/80 ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}

/**
 * Lightweight branded boot screen shown while SQLite and license access initialize.
 * Mirrors the pre-React splash in index.html to avoid layout shifts on startup.
 */
export function AppBootLoader() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="barber-stripe h-1 w-full" />
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-black shadow-md">
          <span className="absolute inset-0 animate-ping rounded-2xl bg-amber-500/15 [animation-duration:2s]" />
          <img
            src="/icons/icon-192.png"
            alt="Barber Suite"
            width={64}
            height={64}
            className="relative h-full w-full rounded-2xl object-contain"
          />
        </div>

        <p className="font-display text-lg font-bold tracking-tight text-brand-900">
          Barber Suite
        </p>
        <p className="mt-1 text-xs text-muted">Menyiapkan aplikasi...</p>

        <div className="mt-4 h-1.5 w-36 overflow-hidden rounded-full bg-stone-200/90">
          <div className="bs-boot-bar-fill h-full w-1/2 rounded-full bg-gradient-to-r from-brand-600 via-amber-400 to-brand-600" />
        </div>
      </div>
    </div>
  );
}

