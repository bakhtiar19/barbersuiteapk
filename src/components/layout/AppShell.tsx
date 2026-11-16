import type { ReactNode } from 'react';
import {
  BarChart3,
  DatabaseBackup,
  Home,
  Plus,
  Receipt,
  Scissors,
  Settings,
  UserCheck,
  Users,
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/layout/BottomNav';
import { useSettingsStore } from '@/stores/settingsStore';

const DESKTOP_NAV = [
  { to: '/', label: 'Beranda', icon: Home, end: true },
  { to: '/transactions', label: 'Transaksi', icon: Receipt },
  { to: '/customers', label: 'Pelanggan', icon: Users },
  { to: '/reports', label: 'Laporan', icon: BarChart3 },
  { to: '/services', label: 'Layanan', icon: Scissors },
  { to: '/barbers', label: 'Barber', icon: UserCheck },
  { to: '/backup', label: 'Backup & Restore', icon: DatabaseBackup },
  { to: '/settings', label: 'Pengaturan', icon: Settings },
];

export function AppShell({
  children,
  hideBottomNav,
}: {
  children: ReactNode;
  hideBottomNav?: boolean;
}) {
  const shopName = useSettingsStore((s) => s.settings.shop_name);
  const shopLogo = useSettingsStore((s) => s.settings.shop_logo);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const shouldHideBottom = hideBottomNav ?? pathname.startsWith('/pos');

  return (
    <div className="min-h-screen bg-canvas lg:flex">
      {/* Desktop sidebar (>= 1024px) */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col lg:bg-brand-900 lg:text-white">
        <div className="barber-stripe h-1" />
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black">
            <img
              src={shopLogo || '/icons/icon-192.png'}
              alt="Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="font-display truncate text-base font-bold">{shopName}</p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-stone-400">
              Barber Suite · Kriakarya
            </p>
          </div>
        </div>

        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={() => navigate('/pos')}
            className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Transaksi Baru</span>
          </button>
        </div>

        <nav aria-label="Menu desktop" className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {DESKTOP_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-[42px] items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-white/10 text-amber-400'
                      : 'text-stone-300 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-5 py-3.5">
          <p className="text-xs font-semibold text-stone-300">Barber Suite v4.2.0</p>
          <p className="text-[11px] text-stone-500">by Kriakarya 2026</p>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-64">
        <main className={`flex-1 ${shouldHideBottom ? 'pb-6' : 'pb-24 lg:pb-8'}`}>{children}</main>
      </div>

      {!shouldHideBottom && <BottomNav />}
    </div>
  );
}
