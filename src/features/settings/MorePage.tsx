import { useEffect, useState } from 'react';
import {
  ChevronRight,
  DatabaseBackup,
  Receipt,
  Scissors,
  Settings,
  ShieldCheck,
  Smartphone,
  UserCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { HomeScreenInstallGuideSheet } from '@/components/pwa/HomeScreenInstallGuideSheet';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getBackupReminderStatus } from '@/features/backup/backupService';
import {
  hasDeferredInstallPrompt,
  isAppInstalled,
  subscribePwaInstall,
  triggerPwaInstall,
} from '@/platform/pwaInstall';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';

export function MorePage() {
  const settings = useSettingsStore((s) => s.settings);
  const backupStatus = getBackupReminderStatus(settings);
  const licenseStatus = useUiStore((s) => s.licenseStatus);
  const setLicenseModalOpen = useUiStore((s) => s.setLicenseModalOpen);
  const showToast = useUiStore((s) => s.showToast);

  const [installed, setInstalled] = useState(() => isAppInstalled());
  const [canPrompt, setCanPrompt] = useState(() => hasDeferredInstallPrompt());
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const syncInstallState = () => {
      setInstalled(isAppInstalled());
      setCanPrompt(hasDeferredInstallPrompt());
    };

    syncInstallState();
    return subscribePwaInstall(syncInstallState);
  }, []);

  const handleInstallClick = async () => {
    if (canPrompt) {
      const outcome = await triggerPwaInstall();
      if (outcome === 'accepted') {
        setInstalled(true);
        showToast('Barber Suite ditambahkan ke layar utama.', 'success');
        return;
      }
      if (outcome === 'dismissed') return;
    }
    setGuideOpen(true);
  };

  const groups = [
    {
      title: 'Operasional',
      items: [
        { to: '/transactions', title: 'Riwayat Transaksi', desc: 'Struk, cari, & void', icon: Receipt },
        { to: '/services', title: 'Layanan', desc: 'Harga & durasi', icon: Scissors },
        { to: '/barbers', title: 'Barber', desc: 'Tim & performa', icon: UserCheck },
      ],
    },
    {
      title: 'Data & Sistem',
      items: [
        {
          to: '/backup',
          title: 'Backup & Restore',
          desc: 'Amankan data .bms & ekspor CSV',
          icon: DatabaseBackup,
          badge: backupStatus.isOverdue ? (
            <Badge variant={backupStatus.isCritical ? 'danger' : 'warning'}>Perlu backup</Badge>
          ) : null,
        },
        {
          onClick: () => setLicenseModalOpen(true),
          title: 'Lisensi Aplikasi',
          desc: licenseStatus.isTrial
            ? `Masa uji coba aktif (Sisa ${licenseStatus.daysLeft} hari)`
            : 'Lisensi Resmi Aktif',
          icon: ShieldCheck,
          badge: licenseStatus.isTrial ? (
            <Badge variant={licenseStatus.daysLeft <= 3 ? 'danger' : 'warning'}>
              {licenseStatus.daysLeft <= 3 ? `${licenseStatus.daysLeft} hari lagi` : 'Uji Coba'}
            </Badge>
          ) : (
            <Badge variant="success">Resmi</Badge>
          ),
        },
        { to: '/settings', title: 'Pengaturan', desc: 'Toko, struk, WA, & PIN', icon: Settings },
      ],
    },
  ];

  return (
    <AppShell>
      <PageHeader title="Lainnya" subtitle={settings.shop_name} />

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-4">
        {groups.map((group) => (
          <section key={group.title} className="space-y-2">
            <h2 className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted">
              {group.title}
            </h2>
            <div className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200/80 bg-white">
              {group.items.map((item) => {
                const Icon = item.icon;
                if ('onClick' in item && item.onClick) {
                  return (
                    <button
                      key={item.title}
                      onClick={item.onClick}
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-stone-50 active:bg-stone-100"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-900 text-amber-400">
                        <Icon className="h-[18px] w-[18px]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-brand-900">{item.title}</p>
                          {'badge' in item && item.badge}
                        </div>
                        <p className="truncate text-xs text-muted">{item.desc}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-stone-400" />
                    </button>
                  );
                }
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-stone-50 active:bg-stone-100"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-900 text-amber-400">
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-brand-900">{item.title}</p>
                        {'badge' in item && item.badge}
                      </div>
                      <p className="truncate text-xs text-muted">{item.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-stone-400" />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        {!installed && (
          <Button
            variant="secondary"
            fullWidth
            size="md"
            leftIcon={<Smartphone className="h-[18px] w-[18px] text-amber-400" />}
            onClick={() => void handleInstallClick()}
          >
            Pasang Aplikasi di Layar Utama
          </Button>
        )}

        <div className="pt-1 text-center">
          <p className="text-xs font-semibold text-stone-500">Barber Suite v4.2.0</p>
          <p className="text-[11px] text-stone-400">by Kriakarya 2026</p>
        </div>
      </div>

      <HomeScreenInstallGuideSheet open={guideOpen} onClose={() => setGuideOpen(false)} />
    </AppShell>
  );
}
