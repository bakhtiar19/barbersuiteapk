import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Scissors, Search, ShoppingBag, UserCheck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { listBarbers } from '@/db/repositories/barberRepo';
import { listServicesWithUsage, type ServiceWithUsage } from '@/db/repositories/serviceRepo';
import { createTransactionAtomic, previewNextTrxNumber } from '@/db/repositories/transactionRepo';
import { CartPanel, type CartLine } from '@/features/pos/components/CartPanel';
import { BarberChips } from '@/features/pos/components/PosInputs';
import { ServiceGrid } from '@/features/pos/components/ServiceGrid';
import { calculateDiscountAmount, formatRupiah, parseDigitsToInt } from '@/lib/money';
import { isValidPhoneInput } from '@/lib/phone';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { useCartStore } from '@/stores/cartStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import type { Barber } from '@/types/domain';

type SortMode = 'popular' | 'az' | 'price';

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: 'popular', label: 'Terlaris' },
  { value: 'az', label: 'A–Z' },
  { value: 'price', label: 'Harga' },
];

export function PosPage() {
  const navigate = useNavigate();
  const showToast = useUiStore((s) => s.showToast);
  const lastBarberId = useSettingsStore((s) => s.lastBarberId);
  const setLastBarberId = useSettingsStore((s) => s.setLastBarberId);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const {
    customerId,
    customerName,
    customerPhone,
    barberId,
    selectedServiceIds,
    serviceQty,
    discountType,
    discountValueInput,
    paymentMethod,
    notes,
    setBarberId,
    setServiceQty,
    resetCart,
  } = useCartStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<ServiceWithUsage[]>([]);
  const [nextTrxNumber, setNextTrxNumber] = useState('');
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('popular');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const searchRef = useRef<HTMLInputElement>(null);

  // Load master data once
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [activeBarbers, activeServices, previewNo] = await Promise.all([
          listBarbers({ activeOnly: true }),
          listServicesWithUsage(),
          previewNextTrxNumber(),
        ]);
        if (!active) return;
        setBarbers(activeBarbers);
        setServices(activeServices);
        setNextTrxNumber(previewNo);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Gagal memuat data kasir.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  // Default to last used barber
  useEffect(() => {
    if (barbers.length === 0) return;
    if (!barbers.some((b) => b.id === barberId)) {
      const preferred = barbers.find((b) => b.id === lastBarberId) ?? barbers[0];
      setBarberId(preferred.id);
    }
  }, [barbers, barberId, lastBarberId, setBarberId]);

  const serviceMap = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);

  const topIds = useMemo(
    () =>
      new Set(
        services
          .filter((s) => s.usage_count > 0)
          .slice(0, 3)
          .map((s) => s.id),
      ),
    [services],
  );

  const visibleServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? services.filter((s) => s.name.toLowerCase().includes(q)) : services;
    const sorted = [...filtered];
    if (sortMode === 'az') sorted.sort((a, b) => a.name.localeCompare(b.name, 'id'));
    else if (sortMode === 'price') sorted.sort((a, b) => a.price - b.price);
    return sorted;
  }, [services, search, sortMode]);

  const lines: CartLine[] = useMemo(
    () =>
      selectedServiceIds
        .map((id) => ({ service: serviceMap.get(id), qty: serviceQty[id] ?? 1 }))
        .filter((l): l is CartLine => Boolean(l.service)),
    [selectedServiceIds, serviceMap, serviceQty],
  );

  const itemCount = lines.reduce((acc, l) => acc + l.qty, 0);
  const subtotal = lines.reduce((acc, l) => acc + l.service.price * l.qty, 0);
  const discountValue = parseDigitsToInt(discountValueInput);
  const discountAmount = calculateDiscountAmount(subtotal, discountType, discountValue);
  const total = Math.max(0, subtotal - discountAmount);

  useEffect(() => {
    if (itemCount === 0) setCheckoutOpen(false);
  }, [itemCount]);

  const addService = (id: string) => setServiceQty(id, (serviceQty[id] ?? 0) + 1);
  const removeService = (id: string) => setServiceQty(id, (serviceQty[id] ?? 0) - 1);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && visibleServices.length > 0) {
      e.preventDefault();
      addService(visibleServices[0].id);
      setSearch('');
    } else if (e.key === 'Escape') {
      setSearch('');
    }
  };

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!customerName.trim()) errs.customerName = 'Nama pelanggan wajib diisi.';
    if (customerPhone.trim() && !isValidPhoneInput(customerPhone)) {
      errs.customerPhone = 'Format nomor WhatsApp tidak valid (mis. 08123456789).';
    }
    if (!barberId) errs.barberId = 'Pilih barber terlebih dahulu.';
    if (lines.length === 0) errs.services = 'Pilih minimal satu layanan.';
    if (discountType === 'percent' && discountValue > 100) {
      errs.discount = 'Diskon persen maksimal 100%.';
    } else if (discountType === 'amount' && discountValue > subtotal) {
      errs.discount = 'Diskon tidak boleh melebihi subtotal.';
    }

    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      if (errs.barberId) showToast(errs.barberId, 'error');
      return;
    }

    setSaving(true);
    try {
      const created = await createTransactionAtomic({
        customerId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || null,
        barberId,
        items: lines.map((l) => ({ serviceId: l.service.id, qty: l.qty })),
        discountType: discountValue > 0 ? discountType : null,
        discountValue,
        paymentMethod,
        notes: notes.trim() || null,
      });
      setLastBarberId(barberId);
      resetCart(barberId);
      navigate(`/pos/success/${created.id}`, { replace: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan transaksi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const cartPanel = (
    <CartPanel
      lines={lines}
      subtotal={subtotal}
      discountAmount={discountAmount}
      total={total}
      fieldErrors={fieldErrors}
      saving={saving}
      onAdd={addService}
      onRemove={removeService}
      onSubmit={handleSubmit}
    />
  );

  const ready = !loading && !error && barbers.length > 0 && services.length > 0;

  return (
    <AppShell hideBottomNav>
      <PageHeader
        title="Kasir"
        subtitle={nextTrxNumber || 'Memuat…'}
        backTo="/"
        rightSlot={
          itemCount > 0 && (
            <button
              type="button"
              onClick={() => {
                resetCart(barberId);
                setFieldErrors({});
              }}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-muted hover:bg-stone-200/60 hover:text-ink"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )
        }
      />

      {loading && (
        <div className="mx-auto max-w-6xl space-y-3 px-4 py-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-11 w-full" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[88px] rounded-2xl" />
            ))}
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="mx-auto max-w-3xl px-4 py-4">
          <ErrorState message={error} />
        </div>
      )}

      {!loading && !error && barbers.length === 0 && (
        <div className="mx-auto max-w-3xl px-4 py-4">
          <EmptyState
            icon={<UserCheck className="h-6 w-6" />}
            title="Belum ada barber aktif"
            description="Tambahkan atau aktifkan barber sebelum mencatat transaksi."
            action={<Button onClick={() => navigate('/barbers')}>Kelola Barber</Button>}
          />
        </div>
      )}

      {!loading && !error && barbers.length > 0 && services.length === 0 && (
        <div className="mx-auto max-w-3xl px-4 py-4">
          <EmptyState
            icon={<Scissors className="h-6 w-6" />}
            title="Belum ada layanan aktif"
            description="Tambahkan atau aktifkan layanan terlebih dahulu."
            action={<Button onClick={() => navigate('/services')}>Kelola Layanan</Button>}
          />
        </div>
      )}

      {ready && (
        <div className="mx-auto max-w-6xl px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
          <section className="min-w-0 pb-28 pt-3 lg:pb-8">
            <BarberChips
              barbers={barbers}
              selectedBarberId={barberId}
              onSelect={setBarberId}
              error={fieldErrors.barberId}
            />

            {/* Sticky search + sort */}
            <div className="sticky top-[56px] z-20 -mx-4 mt-3 space-y-2 bg-canvas/95 px-4 pb-2 pt-1 backdrop-blur">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  ref={searchRef}
                  type="search"
                  aria-label="Cari layanan"
                  placeholder={`Cari dari ${services.length} layanan… (Enter = tambah)`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="min-h-[44px] w-full rounded-xl border border-stone-200 bg-white pl-10 pr-10 text-sm placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Hapus pencarian"
                    onClick={() => {
                      setSearch('');
                      searchRef.current?.focus();
                    }}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-stone-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex rounded-lg bg-stone-200/60 p-0.5">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSortMode(opt.value)}
                      className={`min-h-[30px] rounded-md px-3 text-xs font-semibold transition ${
                        sortMode === opt.value
                          ? 'bg-white text-brand-900 shadow-sm'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-muted">{visibleServices.length} layanan</span>
              </div>
            </div>

            {visibleServices.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white py-10 text-center">
                <p className="text-sm font-semibold text-brand-900">Layanan tidak ditemukan</p>
                <p className="mt-1 text-xs text-muted">Coba kata kunci lain.</p>
              </div>
            ) : (
              <div className="mt-1">
                <ServiceGrid
                  services={visibleServices}
                  serviceQty={serviceQty}
                  topIds={topIds}
                  onAdd={addService}
                  onRemove={removeService}
                />
              </div>
            )}
          </section>

          {/* Desktop/tablet: persistent cart panel */}
          {isDesktop && (
            <aside className="pt-3">
              <Card className="sticky top-[72px] max-h-[calc(100vh-88px)] overflow-y-auto">
                {cartPanel}
              </Card>
            </aside>
          )}
        </div>
      )}

      {/* Mobile: sticky checkout bar */}
      {ready && !isDesktop && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-canvas/95 backdrop-blur-md">
          <div className="mx-auto max-w-3xl px-4 py-2.5">
            <button
              type="button"
              aria-label="Lanjut Bayar"
              disabled={itemCount === 0}
              onClick={() => setCheckoutOpen(true)}
              className="flex min-h-[54px] w-full items-center justify-between gap-3 rounded-2xl bg-brand-900 px-3 text-white shadow-lg shadow-black/10 transition active:scale-[0.98] disabled:bg-stone-300 disabled:shadow-none"
            >
              <span className="flex items-center gap-2.5">
                <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
                  <ShoppingBag className="h-4 w-4" />
                  {itemCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-brand-900">
                      {itemCount}
                    </span>
                  )}
                </span>
                <span className="text-sm font-semibold">
                  {itemCount > 0 ? 'Lanjut Bayar' : 'Pilih layanan'}
                </span>
              </span>
              <span className="tabular-nums text-lg font-extrabold">{formatRupiah(total)}</span>
            </button>
          </div>
        </div>
      )}

      {!isDesktop && (
        <BottomSheet open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Checkout">
          {cartPanel}
        </BottomSheet>
      )}
    </AppShell>
  );
}
