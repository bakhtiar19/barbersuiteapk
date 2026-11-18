import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

export interface LicenseStatusInfo {
  isTrial: boolean;
  daysLeft: number;
  clientName?: string;
  expiresAt?: string | null;
}

interface UiState {
  toasts: ToastItem[];
  isPinLocked: boolean;
  isAppReady: boolean;
  dbError: string | null;
  storagePersisted: boolean | null;
  isLicenseModalOpen: boolean;
  licenseStatus: LicenseStatusInfo;
  showToast: (message: string, variant?: ToastVariant) => void;
  dismissToast: (id: string) => void;
  setPinLocked: (locked: boolean) => void;
  setAppReady: (ready: boolean) => void;
  setDbError: (err: string | null) => void;
  setStoragePersisted: (persisted: boolean | null) => void;
  setLicenseModalOpen: (open: boolean) => void;
  setLicenseStatus: (status: LicenseStatusInfo) => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  isPinLocked: false,
  isAppReady: false,
  dbError: null,
  storagePersisted: null,
  isLicenseModalOpen: false,
  licenseStatus: {
    isTrial: false,
    daysLeft: 14,
  },

  showToast: (message, variant = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, variant }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3200);
  },

  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  setPinLocked: (isPinLocked) => set({ isPinLocked }),
  setAppReady: (isAppReady) => set({ isAppReady }),
  setDbError: (dbError) => set({ dbError }),
  setStoragePersisted: (storagePersisted) => set({ storagePersisted }),
  setLicenseModalOpen: (isLicenseModalOpen) => set({ isLicenseModalOpen }),
  setLicenseStatus: (licenseStatus) => set({ licenseStatus }),
}));
