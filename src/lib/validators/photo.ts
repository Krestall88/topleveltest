import { z } from 'zod';

export const createPhotoReportSchema = z.object({
  url: z.string().url('Неверный формат URL'),
  comment: z.string().optional(),
  uploaderId: z.string().cuid('Неверный формат ID загрузчика'),
  objectId: z.string().cuid().optional(),
  checklistId: z.string().cuid().optional(),
  requestId: z.string().cuid().optional(),
}).refine(
  (data) => data.objectId || data.checklistId || data.requestId,
  {
    message: "Должен быть указан хотя бы один из: objectId, checklistId, requestId",
    path: ["objectId"],
  }
);

export const uploadPhotoSchema = z.object({
  file: z.any(),
  comment: z.string().optional(),
  objectId: z.string().cuid().optional(),
  checklistId: z.string().cuid().optional(),
  requestId: z.string().cuid().optional(),
});

export type CreatePhotoReportDto = z.infer<typeof createPhotoReportSchema>;
export type UploadPhotoDto = z.infer<typeof uploadPhotoSchema>;
