import { z } from 'zod';
import { isValidPhoneInput } from '@/lib/phone';

export const barberFormSchema = z.object({
  name: z.string().trim().min(2, 'Nama barber minimal 2 karakter').max(60, 'Maksimal 60 karakter'),
  phone: z
    .string()
    .trim()
    .refine(isValidPhoneInput, 'Nomor HP tidak valid (contoh: 08123456789)')
    .optional()
    .default(''),
  is_active: z.boolean().default(true),
});

export type BarberFormValues = z.infer<typeof barberFormSchema>;

