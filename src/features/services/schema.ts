import { z } from 'zod';

export const serviceFormSchema = z.object({
  name: z.string().trim().min(2, 'Nama layanan minimal 2 karakter').max(60, 'Maksimal 60 karakter'),
  price: z.coerce.number().int().min(0, 'Harga tidak boleh negatif'),
  duration_minutes: z
    .union([z.coerce.number().int().positive('Durasi harus > 0 menit'), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v === '' || v === undefined || v === null ? null : Number(v))),
  is_active: z.boolean().default(true),
});

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;

