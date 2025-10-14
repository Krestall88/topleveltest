import { z } from 'zod';

export const createObjectSchema = z.object({
  name: z.string().min(3, 'Название должно быть не менее 3 символов'),
  address: z.string().min(5, 'Адрес должен быть не менее 5 символов'),
  managerId: z.string().cuid().optional(),
});

export const updateObjectSchema = createObjectSchema.partial();

export type CreateObjectDto = z.infer<typeof createObjectSchema>;
export type UpdateObjectDto = z.infer<typeof updateObjectSchema>;
