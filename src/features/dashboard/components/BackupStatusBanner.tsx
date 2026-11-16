import { AlertTriangle, DatabaseBackup } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { getBackupReminderStatus } from '@/features/backup/backupService';
import { useSettingsStore } from '@/stores/settingsStore';

export function BackupStatusBanner() {
  const settings = useSettingsStore((s) => s.settings);
  const navigate = useNavigate();
  const status = getBackupReminderStatus(settings);

  if (!status.isOverdue) return null;

  const isCritical = status.isCritical;

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
        isCritical
          ? 'border-red-300 bg-red-50 text-red-950'
          : 'border-amber-300 bg-brand-50 text-amber-950'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            isCritical ? 'bg-red-100 text-danger' : 'bg-amber-100 text-brand-700'
          }`}
        >
          {isCritical ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <DatabaseBackup className="h-5 w-5" />
          )}
        </div>
        <div>
          <p className="text-sm font-bold">
            {status.hasNeverBackedUp
              ? 'Anda belum pernah membuat backup data'
              : `Backup terakhir ${status.daysSinceLastBackup} hari lalu`}
          </p>
          <p className="text-xs opacity-85">
            {isCritical
              ? 'Sudah melewati 2× jadwal pengingat! Segera cadangkan database agar data tidak hilang.'
              : 'Data tersimpan lokal di perangkat. Buat cadangan berkala agar transaksi tetap aman.'}
          </p>
        </div>
      </div>

      <Button
        size="sm"
        variant={isCritical ? 'danger' : 'primary'}
        onClick={() => navigate('/backup')}
        className="shrink-0"
      >
        Backup Sekarang
      </Button>
    </div>
  );
}

