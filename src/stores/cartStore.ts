import { create } from 'zustand';
import type { DiscountType, PaymentMethod } from '@/types/domain';

interface CartState {
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  barberId: string;
  selectedServiceIds: string[];
  serviceQty: Record<string, number>;
  discountType: DiscountType;
  discountValueInput: string;
  paymentMethod: PaymentMethod;
  notes: string;
  setCustomer: (id: string | null, name: string, phone?: string) => void;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  setBarberId: (id: string) => void;
  toggleService: (serviceId: string) => void;
  setServiceQty: (serviceId: string, qty: number) => void;
  setDiscountType: (type: DiscountType) => void;
  setDiscountValueInput: (val: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setNotes: (notes: string) => void;
  resetCart: (keepLastBarberId?: string) => void;
}

export const useCartStore = create<CartState>((set) => ({
  customerId: null,
  customerName: '',
  customerPhone: '',
  barberId: '',
  selectedServiceIds: [],
  serviceQty: {},
  discountType: 'amount',
  discountValueInput: '',
  paymentMethod: 'cash',
  notes: '',

  setCustomer: (customerId, customerName, customerPhone = '') =>
    set({ customerId, customerName, customerPhone }),
  setCustomerName: (customerName) => set({ customerName, customerId: null }),
  setCustomerPhone: (customerPhone) => set({ customerPhone }),
  setBarberId: (barberId) => set({ barberId }),

  toggleService: (serviceId) =>
    set((state) => {
      const exists = state.selectedServiceIds.includes(serviceId);
      if (exists) {
        const nextIds = state.selectedServiceIds.filter((id) => id !== serviceId);
        const nextQty = { ...state.serviceQty };
        delete nextQty[serviceId];
        return { selectedServiceIds: nextIds, serviceQty: nextQty };
      }
      return {
        selectedServiceIds: [...state.selectedServiceIds, serviceId],
        serviceQty: { ...state.serviceQty, [serviceId]: 1 },
      };
    }),

  setServiceQty: (serviceId, qty) =>
    set((state) => {
      if (qty <= 0) {
        const nextIds = state.selectedServiceIds.filter((id) => id !== serviceId);
        const nextQty = { ...state.serviceQty };
        delete nextQty[serviceId];
        return { selectedServiceIds: nextIds, serviceQty: nextQty };
      }
      const nextIds = state.selectedServiceIds.includes(serviceId)
        ? state.selectedServiceIds
        : [...state.selectedServiceIds, serviceId];
      return {
        selectedServiceIds: nextIds,
        serviceQty: { ...state.serviceQty, [serviceId]: qty },
      };
    }),

  setDiscountType: (discountType) => set({ discountType, discountValueInput: '' }),
  setDiscountValueInput: (discountValueInput) => set({ discountValueInput }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setNotes: (notes) => set({ notes }),

  resetCart: (keepLastBarberId) =>
    set((state) => ({
      customerId: null,
      customerName: '',
      customerPhone: '',
      barberId: keepLastBarberId ?? state.barberId,
      selectedServiceIds: [],
      serviceQty: {},
      discountType: 'amount',
      discountValueInput: '',
      paymentMethod: 'cash',
      notes: '',
    })),
}));

