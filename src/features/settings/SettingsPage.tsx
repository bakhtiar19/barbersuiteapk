import { useEffect, useState, type ChangeEvent } from 'react';
import { ImagePlus, Lock, ShieldCheck, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, TextArea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { updateSettings } from '@/db/repositories/settingsRepo';
import { shopSettingsSchema } from '@/features/settings/schema';
import { hashPin } from '@/lib/crypto';
import { scheduleBackupReminder } from '@/platform/notifications';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';

export function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings);
  const setSettings = useSettingsStore((s) => s.setSettings);
  const showToast = useUiStore((s) => s.showToast);

  const [shopName, setShopName] = useState(settings.shop_name);
  const [shopAddress, setShopAddress] = useState(settings.shop_address);
  const [shopPhone, setShopPhone] = useState(settings.shop_phone);
  const [shopLogo, setShopLogo] = useState(settings.shop_logo);
  const [receiptFooter, setReceiptFooter] = useState(settings.receipt_footer);
  const [followupTemplate, setFollowupTemplate] = useState(settings.followup_template);
  const [backupIntervalDays, setBackupIntervalDays] = useState(
    String(settings.backup_interval_days),
  );
  const [weekStart, setWeekStart] = useState(String(settings.week_start));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setShopName(settings.shop_name);
    setShopAddress(settings.shop_address);
    setShopPhone(settings.shop_phone);
    setShopLogo(settings.shop_logo);
    setReceiptFooter(settings.receipt_footer);
    setFollowupTemplate(settings.followup_template);
    setBackupIntervalDays(String(settings.backup_interval_days));
    setWeekStart(String(settings.week_start));
  }, [settings]);

  // PIN modal
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [savingPin, setSavingPin] = useState(false);

  const hasPin = Boolean(settings.pin_hash && settings.pin_salt);

  const handlePickLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Pilih file gambar (PNG/JPG/WebP).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 180;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setShopLogo(canvas.toDataURL('image/png'));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsed = shopSettingsSchema.safeParse({
      shop_name: shopName,
      shop_address: shopAddress,
      shop_phone: shopPhone,
      receipt_footer: receiptFooter,
      followup_template: followupTemplate,
      backup_interval_days: backupIntervalDays,
      week_start: weekStart,
    });

    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message || 'Periksa kembali pengaturan Anda.');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateSettings({
        shop_name: parsed.data.shop_name,
        shop_address: parsed.data.shop_address,
        shop_phone: parsed.data.shop_phone,
        shop_logo: shopLogo,
        receipt_footer: parsed.data.receipt_footer,
        followup_template: parsed.data.followup_template,
        backup_interval_days: parsed.data.backup_interval_days,
        week_start: parsed.data.week_start as 0 | 1,
      });
      setSettings(updated);
      await scheduleBackupReminder(updated.backup_interval_days);
      showToast('Pengaturan disimpan.', 'success');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    if (!/^\d{4,6}$/.test(newPin)) {
      setPinError('PIN harus berupa 4–6 digit angka.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('Konfirmasi PIN tidak cocok.');
      return;
    }

    setSavingPin(true);
    try {
      const { hash, salt } = await hashPin(newPin);
      const updated = await updateSettings({ pin_hash: hash, pin_salt: salt });
      setSettings(updated);
      setPinModalOpen(false);
      setNewPin('');
      setConfirmPin('');
      showToast('PIN aplikasi diaktifkan.', 'success');
    } catch {
      setPinError('Gagal menyimpan PIN.');
    } finally {
      setSavingPin(false);
    }
  };

  const handleDisablePin = async () => {
    setSavingPin(true);
    try {
      const updated = await updateSettings({ pin_hash: '', pin_salt: '' });
      setSettings(updated);
      showToast('PIN aplikasi dinonaktifkan.', 'success');
    } finally {
      setSavingPin(false);
    }
  };

  return (
    <AppShell>
      <PageHeader title="Pengaturan" subtitle="Profil toko, struk, pengingat & PIN" backTo="/more" />

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-4">
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <Card className="space-y-3">
            <h2 className="text-base font-bold text-brand-900">Profil Barbershop & Struk</h2>
            <Input
              label="Nama Barbershop *"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              required
            />
            <Input
              label="Alamat"
              placeholder="Jl. Contoh No. 12"
              value={shopAddress}
              onChange={(e) => setShopAddress(e.target.value)}
            />
            <Input
              label="Telepon / WhatsApp Toko"
              placeholder="081234567890"
              value={shopPhone}
              onChange={(e) => setShopPhone(e.target.value)}
            />
            <div className="space-y-1.5">
              <span className="block text-sm font-medium text-ink">Logo Toko (Opsional)</span>
              <div className="flex items-center gap-3">
                {shopLogo ? (
                  <img
                    src={shopLogo}
                    alt="Logo toko"
                    className="h-14 w-14 rounded-xl border border-stone-200 object-contain bg-white p-1"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50 text-muted">
                    <ImagePlus className="h-5 w-5" />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex min-h-[40px] cursor-pointer items-center rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-ink hover:bg-stone-50">
                    <span>{shopLogo ? 'Ganti Logo' : 'Pilih Logo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePickLogo}
                    />
                  </label>
                  {shopLogo && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger"
                      onClick={() => setShopLogo('')}
                      leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                    >
                      Hapus
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <Input
              label="Footer Struk *"
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              required
            />
          </Card>

          <Card className="space-y-3">
            <h2 className="text-base font-bold text-brand-900">Template WhatsApp & Operasional</h2>
            <TextArea
              label="Template Pesan Follow-up WhatsApp"
              value={followupTemplate}
              onChange={(e) => setFollowupTemplate(e.target.value)}
              rows={3}
              hint="Variabel tersedia: {nama}, {minggu}, {toko}"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                label="Pengingat Backup Berkala"
                value={backupIntervalDays}
                onChange={(e) => setBackupIntervalDays(e.target.value)}
                options={[
                  { value: 1, label: 'Setiap Hari' },
                  { value: 3, label: 'Setiap 3 Hari' },
                  { value: 7, label: 'Mingguan (7 Hari)' },
                  { value: 14, label: '2 Mingguan (14 Hari)' },
                ]}
              />
              <Select
                label="Hari Awal Minggu (Laporan)"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                options={[
                  { value: 1, label: 'Senin' },
                  { value: 0, label: 'Minggu' },
                ]}
              />
            </div>
          </Card>

          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-danger">
              {formError}
            </div>
          )}

          <Button type="submit" fullWidth size="lg" loading={saving}>
            Simpan Pengaturan
          </Button>
        </form>

        {/* PIN App Lock */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Lock className="h-5 w-5 text-brand-600" />
              <div>
                <h2 className="text-base font-bold text-brand-900">PIN Aplikasi (Opsional)</h2>
                <p className="text-xs text-muted">
                  Kunci akses aplikasi saat dibuka ulang atau setelah ke background.
                </p>
              </div>
            </div>
            <Badge variant={hasPin ? 'success' : 'neutral'}>
              {hasPin ? 'Aktif' : 'Nonaktif'}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setNewPin('');
                setConfirmPin('');
                setPinError(null);
                setPinModalOpen(true);
              }}
            >
              {hasPin ? 'Ubah PIN' : 'Aktifkan PIN'}
            </Button>
            {hasPin && (
              <Button variant="ghost" className="text-danger" onClick={handleDisablePin}>
                Nonaktifkan PIN
              </Button>
            )}
          </div>
        </Card>

        {/* About */}
        <Card className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-brand-600" />
            <div>
              <p className="text-sm font-bold text-brand-900">Barber Suite v4.2.0</p>
              <p className="text-xs text-muted">by Kriakarya 2026</p>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        title={hasPin ? 'Ubah PIN Aplikasi' : 'Buat PIN Aplikasi'}
      >
        <form onSubmit={handleSavePin} className="space-y-4">
          <Input
            label="PIN Baru (4–6 digit angka)"
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="••••"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            required
          />
          <Input
            label="Ulangi PIN"
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="••••"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            required
          />
          {pinError && <p className="text-xs font-medium text-danger">{pinError}</p>}
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setPinModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" fullWidth loading={savingPin}>
              Simpan PIN
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}

