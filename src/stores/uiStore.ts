import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface UiState {
  toasts: ToastItem[];
  isPinLocked: boolean;
  isAppReady: boolean;
  dbError: string | null;
  storagePersisted: boolean | null;
  showToast: (message: string, variant?: ToastVariant) => void;
  dismissToast: (id: string) => void;
  setPinLocked: (locked: boolean) => void;
  setAppReady: (ready: boolean) => void;
  setDbError: (err: string | null) => void;
  setStoragePersisted: (persisted: boolean | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  isPinLocked: false,
  isAppReady: false,
  dbError: null,
  storagePersisted: null,

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
}));

