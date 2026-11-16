import { create } from 'zustand';
import type { AppSettings } from '@/types/domain';

export const DEFAULT_SETTINGS: AppSettings = {
  shop_name: 'Barbershop Saya',
  shop_address: '',
  shop_phone: '',
  shop_logo: '',
  receipt_footer: 'Terima kasih, sampai jumpa lagi! ✂️',
  followup_template:
    'Halo {nama}, sudah {minggu} minggu sejak kunjungan terakhir. Yuk potong lagi di {toko}!',
  backup_interval_days: 7,
  last_backup_at: null,
  week_start: 1,
  pin_hash: '',
  pin_salt: '',
  currency: 'IDR',
  onboarding_completed: false,
  auto_backup_last_at: null,
};

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  lastBarberId: string;
  setSettings: (settings: AppSettings) => void;
  patchSettings: (partial: Partial<AppSettings>) => void;
  setLastBarberId: (id: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  lastBarberId: '',
  setSettings: (settings) => set({ settings, loaded: true }),
  patchSettings: (partial) =>
    set((state) => ({ settings: { ...state.settings, ...partial } })),
  setLastBarberId: (lastBarberId) => set({ lastBarberId }),
}));

