import { useState, type ChangeEvent } from 'react';
import { DatabaseBackup, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { createBarber } from '@/db/repositories/barberRepo';
import { updateSettings } from '@/db/repositories/settingsRepo';
import { syncTrialMetadata } from '@/lib/license';
import { parseAndValidateBackup, restoreFromBackup } from '@/features/backup/backupService';
import { formatDateTimeId } from '@/lib/date';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import type { BackupFile } from '@/types/domain';

export function OnboardingPage() {
  const navigate = useNavigate();
  const setSettings = useSettingsStore((s) => s.setSettings);
  const setLastBarberId = useSettingsStore((s) => s.setLastBarberId);
  const showToast = useUiStore((s) => s.showToast);

  const [shopName, setShopName] = useState('Barbershop Saya');
  const [shopAddress, setShopAddress] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [barberNames, setBarberNames] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore from onboarding state
  const [pendingBackup, setPendingBackup] = useState<BackupFile | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [restoring, setRestoring] = useState(false);

  const handleAddBarberRow = () => {
    setBarberNames((prev) => [...prev, '']);
  };

  const handleBarberChange = (idx: number, val: string) => {
    setBarberNames((prev) => prev.map((b, i) => (i === idx ? val : b)));
  };

  const handleRemoveBarber = (idx: number) => {
    setBarberNames((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanShop = shopName.trim();
    if (cleanShop.length < 2) {
      setError('Nama barbershop minimal 2 karakter.');
      return;
    }

    const validBarbers = barberNames.map((b) => b.trim()).filter(Boolean);
    if (validBarbers.length === 0) {
      setError('Tambahkan minimal satu nama barber untuk memulai.');
      return;
    }

    setSaving(true);
    try {
      let firstBarberId = '';
      for (const name of validBarbers) {
        const created = await createBarber({ name, is_active: true });
        if (!firstBarberId) firstBarberId = created.id;
      }

      const updated = await updateSettings({
        shop_name: cleanShop,
        shop_address: shopAddress.trim(),
        shop_phone: shopPhone.trim(),
        onboarding_completed: true,
      });

      setSettings(updated);
      if (firstBarberId) setLastBarberId(firstBarberId);
      void syncTrialMetadata({
        shop_name: cleanShop,
        shop_phone: shopPhone.trim(),
        shop_address: shopAddress.trim(),
      });
      showToast('Barbershop siap digunakan!', 'success');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan awal.');
    } finally {
      setSaving(false);
    }
  };

  const handlePickBackup = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const validated = await parseAndValidateBackup(text);
      setPendingBackup(validated);
      setConfirmText('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'File backup tidak valid.', 'error');
    }
  };

  const handleRestore = async () => {
    if (!pendingBackup || confirmText.trim().toUpperCase() !== 'PULIHKAN') return;
    setRestoring(true);
    try {
      await restoreFromBackup(pendingBackup, { skipPreRestoreSnapshot: true });
      const { getAllSettings } = await import('@/db/repositories/settingsRepo');
      const reloaded = await getAllSettings();
      setSettings({ ...reloaded, onboarding_completed: true });
      await updateSettings({ onboarding_completed: true });
      showToast('Data berhasil dipulihkan!', 'success');
      setPendingBackup(null);
      navigate('/', { replace: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memulihkan backup.', 'error');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <div className="barber-stripe h-1" />
      <div className="mx-auto max-w-md space-y-5 px-4 py-8">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-black shadow-md">
            <img
              src="/icons/icon-192.png"
              alt="Barber Suite"
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-brand-900">
            Barber Suite v4.2.0
          </h1>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.16em] text-copper-600">
            by Kriakarya 2026
          </p>
          <p className="mt-2 text-sm text-muted">
            Siapkan profil barbershop dan barber pertama Anda dalam 30 detik. Semua data tersimpan
            lokal di perangkat.
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-brand-700">
                1. Profil Barbershop
              </h2>
              <Input
                label="Nama Barbershop *"
                placeholder="Mis. Barbershop Rapi"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                required
              />
              <Input
                label="Alamat (Opsional)"
                placeholder="Jl. Merdeka No. 10, Bandung"
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
              />
              <Input
                label="No. Telepon / WA Toko (Opsional)"
                placeholder="081234567890"
                value={shopPhone}
                onChange={(e) => setShopPhone(e.target.value)}
                inputMode="tel"
              />
            </div>

            <hr className="border-stone-100" />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-brand-700">
                  2. Barber Aktif *
                </h2>
                <button
                  type="button"
                  onClick={handleAddBarberRow}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Barber
                </button>
              </div>
              <div className="space-y-2.5">
                {barberNames.map((name, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder={`Nama barber ${idx + 1} (mis. Dimas)`}
                        value={name}
                        onChange={(e) => handleBarberChange(idx, e.target.value)}
                        required={idx === 0}
                      />
                    </div>
                    {barberNames.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBarber(idx)}
                        aria-label="Hapus baris barber"
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 text-muted hover:bg-red-50 hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted">
                4 layanan awal (Haircut, Haircut + Wash, Haircut + Massage, Hair Coloring) sudah
                disiapkan dan dapat diubah nanti.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-danger">
                {error}
              </div>
            )}

            <Button type="submit" fullWidth size="lg" loading={saving}>
              Simpan & Mulai Pakai Kasir
            </Button>
          </form>
        </Card>

        <Card className="bg-brand-50/60 border-brand-200/70">
          <div className="flex items-start gap-3">
            <DatabaseBackup className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-sm font-semibold text-brand-900">Punya file cadangan data (.bms)?</p>
                <p className="text-xs text-muted">
                  Pulihkan langsung seluruh riwayat transaksi, pelanggan, dan pengaturan dari file{' '}
                  <code>.bms</code>.
                </p>
              </div>
              <label className="inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-xl border border-brand-300 bg-white px-3.5 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50">
                <span>Pulihkan dari Backup (.bms)</span>
                <input
                  type="file"
                  accept=".bms,application/json"
                  className="hidden"
                  onChange={handlePickBackup}
                />
              </label>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={Boolean(pendingBackup)}
        onClose={() => setPendingBackup(null)}
        title="Konfirmasi Pulihkan Data"
      >
        {pendingBackup && (
          <div className="space-y-4">
            <div className="rounded-xl bg-stone-50 p-3.5 text-sm space-y-1">
              <p>
                <span className="text-muted">Tanggal Backup:</span>{' '}
                <strong>{formatDateTimeId(pendingBackup.meta.createdAt)}</strong>
              </p>
              <p>
                <span className="text-muted">Transaksi:</span>{' '}
                <strong>{pendingBackup.meta.counts.transactions}</strong>
              </p>
              <p>
                <span className="text-muted">Pelanggan:</span>{' '}
                <strong>{pendingBackup.meta.counts.customers}</strong>
              </p>
            </div>
            <Input
              label='Ketik "PULIHKAN" untuk melanjutkan'
              placeholder="PULIHKAN"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" fullWidth onClick={() => setPendingBackup(null)}>
                Batal
              </Button>
              <Button
                variant="primary"
                fullWidth
                loading={restoring}
                disabled={confirmText.trim().toUpperCase() !== 'PULIHKAN'}
                onClick={handleRestore}
              >
                Pulihkan Sekarang
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

