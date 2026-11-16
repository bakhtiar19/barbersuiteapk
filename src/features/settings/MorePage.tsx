import {
  ChevronRight,
  DatabaseBackup,
  Receipt,
  Scissors,
  Settings,
  Smartphone,
  UserCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { getBackupReminderStatus } from '@/features/backup/backupService';
import { useSettingsStore } from '@/stores/settingsStore';

export function MorePage() {
  const settings = useSettingsStore((s) => s.settings);
  const backupStatus = getBackupReminderStatus(settings);

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

        <div className="flex gap-3 rounded-2xl bg-stone-200/50 p-4">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
          <p className="text-xs leading-relaxed text-ink/80">
            <strong className="text-brand-900">Pasang di layar utama.</strong> Android: menu ⋮ →
            Tambahkan ke layar utama. iPhone: Bagikan → Add to Home Screen.
          </p>
        </div>

        <div className="pt-1 text-center">
          <p className="text-xs font-semibold text-stone-500">Barber Suite v4.2.0</p>
          <p className="text-[11px] text-stone-400">by Kriakarya 2026</p>
        </div>
      </div>
    </AppShell>
  );
}
