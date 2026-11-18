import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  DatabaseBackup,
  Download,
  FileSpreadsheet,
  History,
  Share2,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { listBarbers } from '@/db/repositories/barberRepo';
import { getAllSettings, updateSettings } from '@/db/repositories/settingsRepo';
import {
  exportBackupToFile,
  exportTransactionsCsv,
  listAutoSnapshots,
  parseAndValidateBackup,
  restoreFromBackup,
  saveAutoSnapshot,
} from '@/features/backup/backupService';
import { formatDateTimeId } from '@/lib/date';
import { useCartStore } from '@/stores/cartStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import type { AutoSnapshotEntry, BackupFile } from '@/types/domain';

export function BackupPage() {
  const settings = useSettingsStore((s) => s.settings);
  const setSettings = useSettingsStore((s) => s.setSettings);
  const storagePersisted = useUiStore((s) => s.storagePersisted);
  const showToast = useUiStore((s) => s.showToast);

  const [snapshots, setSnapshots] = useState<AutoSnapshotEntry[]>([]);
  const [backingUp, setBackingUp] = useState(false);
  const [sharingBackup, setSharingBackup] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const [csvFrom, setCsvFrom] = useState('');
  const [csvTo, setCsvTo] = useState('');

  const [pendingBackup, setPendingBackup] = useState<BackupFile | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [restoring, setRestoring] = useState(false);

  const loadSnapshots = useCallback(async () => {
    const list = await listAutoSnapshots();
    setSnapshots(list);
  }, []);

  useEffect(() => {
    void loadSnapshots();
  }, [loadSnapshots]);

  const handleBackup = async (shareAfterSave: boolean) => {
    if (shareAfterSave) setSharingBackup(true);
    else setBackingUp(true);

    try {
      const res = await exportBackupToFile(shareAfterSave);
      const updated = await getAllSettings();
      setSettings(updated);
      showToast(
        res.shared ? `Backup dibagikan (${res.filename})` : `Backup disimpan (${res.filename})`,
        'success',
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal membuat backup.', 'error');
    } finally {
      setBackingUp(false);
      setSharingBackup(false);
    }
  };

  const handlePickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const raw = await file.text();
      const validated = await parseAndValidateBackup(raw);
      setPendingBackup(validated);
      setConfirmText('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'File backup tidak valid.', 'error');
    }
  };

  const handlePickAutoSnapshot = async (entry: AutoSnapshotEntry) => {
    try {
      const validated = await parseAndValidateBackup(entry.payload);
      setPendingBackup(validated);
      setConfirmText('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Snapshot tidak valid.', 'error');
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingBackup || confirmText.trim().toUpperCase() !== 'PULIHKAN') return;
    setRestoring(true);
    try {
      await restoreFromBackup(pendingBackup);
      let updated = await getAllSettings();
      const activeBarbers = await listBarbers({ activeOnly: true });
      if (!updated.onboarding_completed && activeBarbers.length > 0) {
        updated = await updateSettings({ onboarding_completed: true });
      }
      setSettings(updated);
      const firstBarberId = activeBarbers[0]?.id ?? '';
      useSettingsStore.getState().setLastBarberId(firstBarberId);
      useCartStore.getState().resetCart(firstBarberId);
      await loadSnapshots();
      setPendingBackup(null);
      showToast('Database berhasil dipulihkan!', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Restore gagal. Data lama tetap aman.',
        'error',
      );
    } finally {
      setRestoring(false);
    }
  };

  const handleExportCsv = async () => {
    if (csvFrom && csvTo && csvFrom > csvTo) {
      showToast('Tanggal awal CSV tidak boleh lebih besar dari tanggal akhir.', 'error');
      return;
    }
    setExportingCsv(true);
    try {
      const res = await exportTransactionsCsv(csvFrom || undefined, csvTo || undefined);
      showToast(`${res.count} transaksi diekspor ke ${res.filename}`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal ekspor CSV.', 'error');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleCreateLocalSnapshot = async () => {
    await saveAutoSnapshot('auto');
    await loadSnapshots();
    showToast('Snapshot lokal dibuat.', 'success');
  };

  return (
    <AppShell>
      <PageHeader title="Backup & Restore" subtitle="Perlindungan data SQLite lokal" backTo="/more" />

      <div className="mx-auto max-w-4xl space-y-4 px-4 py-4">
        {/* Status & Protection Warning */}
        <Card className="border-brand-200 bg-brand-50/70 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
            <div className="space-y-1 text-xs leading-relaxed text-amber-950">
              <p className="text-sm font-bold">Data Tersimpan Aman di Aplikasi Ini</p>
              <p>
                Aplikasi bekerja secara mandiri dan offline. Buat cadangan data berkala dan simpan file{' '}
                <code>.bms</code> ke Google Drive, WhatsApp, atau komputer Anda agar pembukuan Anda selalu aman.
              </p>
              <p className="text-[11px] text-amber-900/90">
                Catatan v1: file backup <code>.bms</code> belum terenkripsi kata sandi — simpan di
                tempat aman.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-200/70 pt-2.5 text-xs">
            <span className="text-muted">
              Backup terakhir:{' '}
              <strong className="text-brand-900">
                {settings.last_backup_at ? formatDateTimeId(settings.last_backup_at) : 'Belum pernah'}
              </strong>
            </span>
            {storagePersisted !== null && (
              <Badge variant={storagePersisted ? 'success' : 'warning'}>
                {storagePersisted ? 'Penyimpanan Persisten Aktif' : 'Penyimpanan Standar Browser'}
              </Badge>
            )}
          </div>
        </Card>

        {/* Backup Action */}
        <Card className="space-y-3">
          <div className="flex items-center gap-2.5">
            <DatabaseBackup className="h-5 w-5 text-brand-600" />
            <div>
              <h2 className="text-base font-bold text-brand-900">Buat Backup Data (.bms)</h2>
              <p className="text-xs text-muted">
                Mengekspor seluruh tabel (transaksi, pelanggan, layanan, barber, pengaturan) dengan
                checksum SHA-256.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Button
              fullWidth
              loading={backingUp}
              onClick={() => handleBackup(false)}
              leftIcon={<Download className="h-4 w-4" />}
            >
              Unduh File Backup (.bms)
            </Button>
            <Button
              variant="outline"
              fullWidth
              loading={sharingBackup}
              onClick={() => handleBackup(true)}
              leftIcon={<Share2 className="h-4 w-4" />}
            >
              Bagikan (Drive / WA / Email)
            </Button>
          </div>
        </Card>

        {/* Restore Action */}
        <Card className="space-y-3">
          <div className="flex items-center gap-2.5">
            <Upload className="h-5 w-5 text-brand-600" />
            <div>
              <h2 className="text-base font-bold text-brand-900">Pulihkan Data dari Backup</h2>
              <p className="text-xs text-muted">
                File divalidasi checksum-nya terlebih dahulu. Snapshot otomatis dibuat sebelum data
                diganti.
              </p>
            </div>
          </div>

          <label className="flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/40 px-4 py-3 text-sm font-semibold text-brand-800 transition hover:bg-brand-50">
            <Upload className="h-4 w-4" />
            <span>Pilih File Backup (.bms)</span>
            <input
              type="file"
              accept=".bms,application/json"
              className="hidden"
              onChange={handlePickFile}
            />
          </label>
        </Card>

        {/* Export CSV */}
        <Card className="space-y-3">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="h-5 w-5 text-brand-600" />
            <div>
              <h2 className="text-base font-bold text-brand-900">Ekspor Data Transaksi (CSV)</h2>
              <p className="text-xs text-muted">
                Format UTF-8 BOM agar kolom dan angka Rupiah terbuka rapi di Microsoft Excel.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Input
              label="Dari Tanggal (Opsional)"
              type="date"
              value={csvFrom}
              onChange={(e) => setCsvFrom(e.target.value)}
            />
            <Input
              label="Sampai Tanggal (Opsional)"
              type="date"
              value={csvTo}
              onChange={(e) => setCsvTo(e.target.value)}
            />
          </div>

          <Button
            variant="outline"
            fullWidth
            loading={exportingCsv}
            onClick={handleExportCsv}
            leftIcon={<FileSpreadsheet className="h-4 w-4" />}
          >
            Ekspor Transaksi ke CSV
          </Button>
        </Card>

        {/* Local Auto Snapshots */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-brand-600" />
              <div>
                <h2 className="text-base font-bold text-brand-900">Snapshot Otomatis Lokal</h2>
                <p className="text-xs text-muted">Jaring pengaman internal (maks. 5 terbaru)</p>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={handleCreateLocalSnapshot}>
              Buat Snapshot
            </Button>
          </div>

          {snapshots.length === 0 ? (
            <p className="text-xs text-muted">
              Belum ada snapshot internal. Snapshot otomatis dibuat saat aplikasi melewati jadwal
              backup atau sebelum restore.
            </p>
          ) : (
            <div className="divide-y divide-stone-100">
              {snapshots.map((snap) => (
                <div key={snap.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={snap.reason === 'pre-restore' ? 'warning' : 'neutral'}>
                        {snap.reason === 'pre-restore' ? 'Pre-Restore' : 'Otomatis'}
                      </Badge>
                      <span className="text-xs font-semibold text-brand-900">
                        {formatDateTimeId(snap.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {snap.trxCount} transaksi · {snap.customerCount} pelanggan
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePickAutoSnapshot(snap)}
                  >
                    Pulihkan
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Restore Confirmation Modal */}
      <Modal
        open={Boolean(pendingBackup)}
        onClose={() => setPendingBackup(null)}
        title="Konfirmasi Pulihkan Database"
      >
        {pendingBackup && (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
              <p>
                <strong>Peringatan:</strong> Seluruh data saat ini akan diganti dengan isi file
                backup di bawah. Snapshot keamanan <em>pre-restore</em> akan disimpan otomatis.
              </p>
            </div>

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
              <p>
                <span className="text-muted">Layanan & Barber:</span>{' '}
                <strong>
                  {pendingBackup.meta.counts.services} layanan · {pendingBackup.meta.counts.barbers}{' '}
                  barber
                </strong>
              </p>
              <p>
                <span className="text-muted">Versi Skema:</span>{' '}
                <strong>v{pendingBackup.meta.schemaVersion}</strong>
              </p>
            </div>

            <Input
              label='Ketik "PULIHKAN" untuk mengonfirmasi'
              placeholder="PULIHKAN"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />

            <div className="flex gap-2">
              <Button variant="outline" fullWidth onClick={() => setPendingBackup(null)}>
                Batal
              </Button>
              <Button
                variant="danger"
                fullWidth
                loading={restoring}
                disabled={confirmText.trim().toUpperCase() !== 'PULIHKAN'}
                onClick={handleConfirmRestore}
              >
                Pulihkan Data
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}

