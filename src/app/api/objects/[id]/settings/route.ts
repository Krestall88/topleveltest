import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canModifyObjectSettings } from '@/lib/permissions';
import { z } from 'zod';

interface Params {
  params: {
    id: string;
  };
}

// Схема для обновления настроек объекта
const objectSettingsSchema = z.object({
  requirePhotoForCompletion: z.boolean(),
  requireCommentForCompletion: z.boolean(),
  completionRequirements: z.object({
    photo: z.boolean(),
    comment: z.boolean(),
    minPhotos: z.number().min(0).max(10).optional(),
    photoDescription: z.string().optional(),
    commentDescription: z.string().optional(),
  }).optional(),
  workingHours: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/, 'Неверный формат времени'),
    end: z.string().regex(/^\d{2}:\d{2}$/, 'Неверный формат времени'),
  }).optional(),
  workingDays: z.array(z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])).optional(),
  autoChecklistEnabled: z.boolean().optional(),
});

// GET /api/objects/[id]/settings - Получить настройки объекта
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getAuthSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Проверить права доступа к объекту
    const canModify = await canModifyObjectSettings(
      session.user.id, 
      session.user.role as any, 
      id
    );

    if (!canModify) {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    // Получить объект с настройками
    const object = await prisma.cleaningObject.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        requirePhotoForCompletion: true,
        requireCommentForCompletion: true,
        completionRequirements: true,
        workingHours: true,
        workingDays: true,
        autoChecklistEnabled: true,
        timezone: true,
      }
    });

    if (!object) {
      return NextResponse.json(
        { error: 'Объект не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json({ object });

  } catch (error) {
    console.error('Ошибка при получении настроек объекта:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// PATCH /api/objects/[id]/settings - Обновить настройки объекта
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getAuthSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await req.json();
    const settings = objectSettingsSchema.parse(body);

    // Проверить права доступа к объекту
    const canModify = await canModifyObjectSettings(
      session.user.id, 
      session.user.role as any, 
      id
    );

    if (!canModify) {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    // Проверить, что объект существует
    const existingObject = await prisma.cleaningObject.findUnique({
      where: { id },
      select: { id: true, name: true }
    });

    if (!existingObject) {
      return NextResponse.json(
        { error: 'Объект не найден' },
        { status: 404 }
      );
    }

    // Обновить настройки объекта
    const updatedObject = await prisma.cleaningObject.update({
      where: { id },
      data: {
        requirePhotoForCompletion: settings.requirePhotoForCompletion,
        requireCommentForCompletion: settings.requireCommentForCompletion,
        completionRequirements: settings.completionRequirements,
        workingHours: settings.workingHours,
        workingDays: settings.workingDays,
        autoChecklistEnabled: settings.autoChecklistEnabled,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        requirePhotoForCompletion: true,
        requireCommentForCompletion: true,
        completionRequirements: true,
        workingHours: true,
        workingDays: true,
        autoChecklistEnabled: true,
        timezone: true,
      }
    });

    // Создать запись в аудит логе
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_OBJECT_SETTINGS',
        entity: 'CleaningObject',
        entityId: id,
        details: {
          objectName: existingObject.name,
          changes: settings,
          updatedBy: session.user.role,
        },
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      object: updatedObject,
      message: 'Настройки объекта успешно обновлены'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Ошибка при обновлении настроек объекта:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
