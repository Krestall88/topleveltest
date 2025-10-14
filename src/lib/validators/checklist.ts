import { z } from 'zod';

export const createChecklistSchema = z.object({
  objectId: z.string().cuid('Неверный формат ID объекта'),
  date: z.string().datetime('Неверный формат даты'),
  creatorId: z.string().cuid('Неверный формат ID создателя'),
});

export const updateTaskSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED']),
  photoUrl: z.string().url().optional(),
});

export type CreateChecklistDto = z.infer<typeof createChecklistSchema>;
export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
