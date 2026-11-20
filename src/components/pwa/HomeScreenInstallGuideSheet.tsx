import { MoreVertical, Share } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/Modal';
import { isIosDevice } from '@/platform/pwaInstall';

/**
 * Displays step-by-step instructions to pin Barber Suite to the mobile home screen
 * when the browser's native install prompt is unavailable.
 */
export function HomeScreenInstallGuideSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const isIos = isIosDevice();

  const androidSteps = (
    <div className="space-y-1.5 rounded-xl border border-stone-200 bg-stone-50 p-3.5">
      <p className="text-xs font-bold text-brand-900">Android (Chrome)</p>
      <ol className="list-decimal space-y-1 pl-4 text-xs text-ink/80">
        <li>
          Ketuk ikon menu <MoreVertical className="inline h-3.5 w-3.5 align-text-bottom" /> di pojok
          kanan atas browser.
        </li>
        <li>
          Pilih <strong>Tambahkan ke layar utama</strong> (<em>Add to Home screen</em>).
        </li>
        <li>
          Ketuk <strong>Tambahkan</strong> / <strong>Pasang</strong> untuk konfirmasi.
        </li>
      </ol>
    </div>
  );

  const iosSteps = (
    <div className="space-y-1.5 rounded-xl border border-stone-200 bg-stone-50 p-3.5">
      <p className="text-xs font-bold text-brand-900">iPhone / iPad (Safari)</p>
      <ol className="list-decimal space-y-1 pl-4 text-xs text-ink/80">
        <li>
          Ketuk ikon <strong>Bagikan</strong>{' '}
          <Share className="inline h-3.5 w-3.5 align-text-bottom" /> di bilah browser Safari.
        </li>
        <li>
          Gulir ke bawah lalu pilih <strong>Tambahkan ke Layar Utama</strong> (
          <em>Add to Home Screen</em>).
        </li>
        <li>
          Ketuk <strong>Tambah</strong> di pojok kanan atas.
        </li>
      </ol>
    </div>
  );

  return (
    <BottomSheet open={open} onClose={onClose} title="Tambahkan ke Layar Utama">
      <div className="space-y-3">
        <p className="text-xs leading-relaxed text-muted">
          Pasang pintasan <strong>Barber Suite</strong> di layar utama HP agar bisa dibuka seperti
          aplikasi dengan akses lebih cepat.
        </p>

        {isIos ? (
          <>
            {iosSteps}
            {androidSteps}
          </>
        ) : (
          <>
            {androidSteps}
            {iosSteps}
          </>
        )}

        <Button variant="secondary" fullWidth onClick={onClose}>
          Mengerti
        </Button>
      </div>
    </BottomSheet>
  );
}
