import { useState } from 'react';
import { ShieldCheck, KeyRound, AlertCircle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { activateDeviceWithLicense } from '@/lib/license';

interface Props {
  onActivated: () => void;
  onClose?: () => void;
  initialError?: string;
}

function sanitizeMessage(msg: string): string {
  const lower = msg.toLowerCase();
  if (
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('koneksi') ||
    lower.includes('internet') ||
    lower.includes('202.10') ||
    lower.includes('timeout') ||
    lower.includes('server')
  ) {
    return 'Koneksi internet bermasalah. Pastikan perangkat terhubung ke internet lalu coba lagi.';
  }
  if (
    lower.includes('device') ||
    lower.includes('perangkat') ||
    lower.includes('limit') ||
    lower.includes('maksimal')
  ) {
    return 'Kode lisensi sudah digunakan atau tidak dapat diaktifkan. Silakan hubungi admin layanan pelanggan.';
  }
  if (
    lower.includes('not found') ||
    lower.includes('tidak ditemukan') ||
    lower.includes('invalid') ||
    lower.includes('salah')
  ) {
    return 'Kode lisensi tidak valid. Periksa kembali kombinasi huruf dan angka Anda.';
  }
  if (lower.includes('expired') || lower.includes('berakhir') || lower.includes('habis')) {
    return 'Masa berlaku kode lisensi ini telah selesai. Silakan hubungi admin untuk perpanjangan.';
  }
  return msg || 'Aktivasi belum berhasil. Pastikan kode lisensi Anda benar.';
}

export function LicenseActivationScreen({ onActivated, onClose, initialError }: Props) {
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError ? sanitizeMessage(initialError) : null
  );

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) return;

    setError(null);
    setLoading(true);

    try {
      await activateDeviceWithLicense(licenseKey);
      onActivated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(sanitizeMessage(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-brand-950/95 backdrop-blur-md p-4 overflow-y-auto">
      <Card className="relative w-full max-w-md space-y-6 p-6 sm:p-8 bg-brand-900 border-brand-800 text-white shadow-2xl rounded-2xl">
        
        {/* Close button if optional */}
        {onClose && (
          <button
            onClick={onClose}
            type="button"
            className="absolute right-4 top-4 p-2 text-brand-400 hover:text-white rounded-xl hover:bg-brand-800 transition"
            title="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-lg shadow-amber-500/10">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Aktivasi Barber Suite</h1>
          <p className="text-sm text-brand-200">
            Masukkan kode lisensi resmi Anda untuk mengaktifkan aplikasi.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-200">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-300">Pemberitahuan</p>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleActivate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-brand-200 uppercase tracking-wider mb-1.5">
              Kode Lisensi
            </label>
            <div className="relative">
              <Input
                type="text"
                required
                autoFocus
                placeholder="BS-XXXX-XXXX-XXXX"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                className="font-mono text-center tracking-widest uppercase bg-brand-950 border-brand-700 text-white placeholder-brand-600 focus:border-amber-400 h-12 text-base"
              />
              <KeyRound className="absolute right-3.5 top-3.5 h-5 w-5 text-brand-500 pointer-events-none" />
            </div>
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={loading}
            disabled={licenseKey.trim().length < 8}
            className="bg-amber-500 hover:bg-amber-400 text-brand-950 font-bold h-12 rounded-xl shadow-lg shadow-amber-500/20 text-sm transition"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Memeriksa Lisensi...
              </span>
            ) : (
              'Aktifkan Aplikasi'
            )}
          </Button>

          {onClose && (
            <Button
              type="button"
              variant="ghost"
              fullWidth
              size="sm"
              onClick={onClose}
              className="text-brand-300 hover:text-white hover:bg-brand-800/60 text-xs py-2"
            >
              Nanti Saja
            </Button>
          )}
        </form>

        {/* Footer info */}
        <div className="text-center text-xs text-brand-300 border-t border-brand-800/60 pt-4 space-y-1">
          <p className="font-medium">Butuh bantuan kode lisensi?</p>
          <p className="text-[11px] text-brand-400">
            Hubungi admin atau layanan pelanggan Kriakarya untuk bantuan aktivasi.
          </p>
        </div>

      </Card>
    </div>
  );
}
