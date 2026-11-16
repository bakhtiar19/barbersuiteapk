import { useState, useEffect } from 'react';
import { ShieldCheck, Smartphone, KeyRound, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { activateDeviceWithLicense, getDeviceInfo, DeviceInfo } from '@/lib/license';

interface Props {
  onActivated: () => void;
  initialError?: string;
}

export function LicenseActivationScreen({ onActivated, initialError }: Props) {
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [device, setDevice] = useState<DeviceInfo | null>(null);

  useEffect(() => {
    getDeviceInfo().then(setDevice);
  }, []);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) return;

    setError(null);
    setLoading(true);

    try {
      await activateDeviceWithLicense(licenseKey);
      onActivated();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Terjadi kesalahan saat aktivasi lisensi.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-brand-950/95 backdrop-blur-md p-4 overflow-y-auto">
      <Card className="w-full max-w-md space-y-6 p-6 sm:p-8 bg-brand-900 border-brand-800 text-white shadow-2xl rounded-2xl">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-lg shadow-amber-500/10">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Aktivasi Barber Suite</h1>
          <p className="text-sm text-brand-200">
            Aplikasi ini dilindungi sistem lisensi perangkat. Masukkan kredensial lisensi resmi untuk mengaktifkan perangkat ini.
          </p>
        </div>

        {/* Device Information Card */}
        {device && (
          <div className="rounded-xl bg-brand-950/60 border border-brand-800/80 p-3.5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-brand-300">
              <span className="flex items-center gap-1.5 font-medium">
                <Smartphone className="h-3.5 w-3.5 text-amber-400" />
                Perangkat Terdeteksi:
              </span>
              <span className="font-semibold text-white">{device.deviceName}</span>
            </div>
            <div className="flex items-center justify-between text-brand-400 font-mono text-[11px]">
              <span>Device ID:</span>
              <span className="truncate max-w-[200px]" title={device.deviceId}>
                {device.deviceId.substring(0, 18)}...
              </span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-200">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-300">Gagal Mengaktifkan</p>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleActivate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-brand-200 uppercase tracking-wider mb-1.5">
              Kunci Lisensi (License Key)
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
                Memverifikasi ke Server...
              </span>
            ) : (
              'Aktifkan Perangkat Ini'
            )}
          </Button>
        </form>

        {/* Footer info */}
        <div className="text-center text-[11px] text-brand-400 border-t border-brand-800/60 pt-4 space-y-1">
          <p>Satu lisensi hanya berlaku untuk 1 perangkat.</p>
          <p>Jika Anda mengganti HP/tablet, hubungi administrator untuk mereset lisensi Anda.</p>
        </div>

      </Card>
    </div>
  );
}
