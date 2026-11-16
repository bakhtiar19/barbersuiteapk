import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { verifyPin } from '@/lib/crypto';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';

export function PinLockScreen() {
  const settings = useSettingsStore((s) => s.settings);
  const setPinLocked = useUiStore((s) => s.setPinLocked);

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setChecking(true);
    try {
      const valid = await verifyPin(pin, settings.pin_hash, settings.pin_salt);
      if (valid) {
        setPin('');
        setPinLocked(false);
      } else {
        setError('PIN salah. Silakan coba lagi.');
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-brand-900 px-4">
      <Card className="w-full max-w-sm space-y-5 p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Lock className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-brand-900">{settings.shop_name}</h1>
          <p className="mt-1 text-sm text-muted">Masukkan PIN untuk membuka aplikasi</p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4 text-left">
          <Input
            label="PIN Aplikasi"
            type="password"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            error={error ?? undefined}
          />
          <Button type="submit" fullWidth size="lg" loading={checking} disabled={pin.length < 4}>
            Buka Kunci
          </Button>
        </form>
      </Card>
    </div>
  );
}

