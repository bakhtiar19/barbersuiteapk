import { z } from 'zod';

export const shopSettingsSchema = z.object({
  shop_name: z.string().trim().min(2, 'Nama barbershop minimal 2 karakter').max(80),
  shop_address: z.string().trim().max(160).optional().default(''),
  shop_phone: z.string().trim().max(30).optional().default(''),
  receipt_footer: z.string().trim().min(2, 'Footer struk wajib diisi').max(160),
  followup_template: z.string().trim().min(5, 'Template pesan minimal 5 karakter').max(400),
  backup_interval_days: z.coerce.number().int().min(1).max(30),
  week_start: z.coerce.number().int().refine((v) => v === 0 || v === 1),
});

export type ShopSettingsFormValues = z.infer<typeof shopSettingsSchema>;

