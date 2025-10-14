import { z } from 'zod';

const techCardStepSchema = z.object({
  title: z.string().min(1, 'Название шага обязательно'),
  description: z.string().optional(),
  equipment: z.string().optional(),
  chemicals: z.string().optional(),
});

export const createTechCardSchema = z.object({
  objectId: z.string().cuid('Неверный ID объекта'),
  content: z.object({
    steps: z.array(techCardStepSchema),
  }),
});

export const updateTechCardSchema = createTechCardSchema.partial().omit({ objectId: true });

export type CreateTechCardDto = z.infer<typeof createTechCardSchema>;
export type UpdateTechCardDto = z.infer<typeof updateTechCardSchema>;
