import { z } from 'zod';

export const createExpenseSchema = z.object({
  quantity: z.number().positive('Количество должно быть положительным числом'),
  amount: z.number().positive('Сумма должна быть положительным числом').optional(),
  checkPhotoUrl: z.string().url('Некорректный URL фото чека').optional(),
  itemId: z.string().cuid('Некорректный ID товара'),
});

export const updateExpenseSchema = z.object({
  quantity: z.number().positive('Количество должно быть положительным числом').optional(),
  amount: z.number().positive('Сумма должна быть положительным числом').optional(),
  checkPhotoUrl: z.string().url('Некорректный URL фото чека').optional(),
});

export type CreateExpensePayload = z.infer<typeof createExpenseSchema>;
export type UpdateExpensePayload = z.infer<typeof updateExpenseSchema>;
