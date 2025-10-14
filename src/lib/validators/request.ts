import { z } from 'zod';

export const createRequestSchema = z.object({
  title: z.string().min(1, 'Заголовок обязателен'),
  description: z.string().min(1, 'Описание обязательно'),
  objectId: z.string().cuid('Неверный формат ID объекта'),
  creatorId: z.string().cuid('Неверный формат ID создателя'),
  source: z.string().optional(),
});

export const updateRequestSchema = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'DONE', 'REJECTED']),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
});

export type CreateRequestDto = z.infer<typeof createRequestSchema>;
export type UpdateRequestDto = z.infer<typeof updateRequestSchema>;
