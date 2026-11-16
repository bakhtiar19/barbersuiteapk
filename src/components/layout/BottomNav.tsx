import { BarChart3, Home, Menu, Plus, Users } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

const MORE_ROUTES = ['/more', '/services', '/barbers', '/backup', '/settings', '/transactions'];

const itemClass = (active: boolean) =>
  `flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition ${
    active ? 'text-amber-400' : 'text-stone-400 hover:text-stone-200'
  }`;

export function BottomNav() {
  const { pathname } = useLocation();
  const isMoreActive = MORE_ROUTES.some((r) => pathname.startsWith(r));

  return (
    <nav
      aria-label="Navigasi utama"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 bg-brand-900 shadow-[0_-4px_16px_rgba(0,0,0,0.12)] lg:hidden"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center px-1">
        <NavLink to="/" end className={({ isActive }) => itemClass(isActive)}>
          <Home className="h-5 w-5" />
          <span>Beranda</span>
        </NavLink>

        <NavLink to="/customers" className={({ isActive }) => itemClass(isActive)}>
          <Users className="h-5 w-5" />
          <span>Pelanggan</span>
        </NavLink>

        <NavLink
          to="/pos"
          aria-label="Kasir Transaksi Baru"
          className="flex flex-col items-center justify-center"
        >
          <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-black/30 ring-4 ring-brand-900 transition active:scale-95">
            <Plus className="h-6 w-6 stroke-[2.5]" />
          </span>
          <span className="mt-0.5 text-[11px] font-semibold text-amber-400">Kasir</span>
        </NavLink>

        <NavLink to="/reports" className={({ isActive }) => itemClass(isActive)}>
          <BarChart3 className="h-5 w-5" />
          <span>Laporan</span>
        </NavLink>

        <NavLink to="/more" className={() => itemClass(isMoreActive)}>
          <Menu className="h-5 w-5" />
          <span>Lainnya</span>
        </NavLink>
      </div>
    </nav>
  );
}
