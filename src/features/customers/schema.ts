import { z } from 'zod';
import { isValidPhoneInput } from '@/lib/phone';

export const customerFormSchema = z.object({
  name: z.string().trim().min(2, 'Nama pelanggan minimal 2 karakter').max(80, 'Maksimal 80 karakter'),
  phone: z
    .string()
    .trim()
    .refine(isValidPhoneInput, 'Nomor WhatsApp tidak valid (contoh: 08123456789)')
    .optional()
    .default(''),
  notes: z.string().max(300, 'Catatan maksimal 300 karakter').optional().default(''),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

