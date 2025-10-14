import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasObjectAccess } from '@/lib/permissions';
import { z } from 'zod';

interface Params {
  params: {
    id: string;
  };
}

// Схема для завершения задачи с отчетом
const completeTaskSchema = z.object({
  comment: z.string().optional(),
  photos: z.array(z.string().url()).optional(),
  requirePhoto: z.boolean().default(false),
});

// POST /api/tasks/[id]/complete-with-report - Завершить задачу с комментарием и фото
export async function POST(req: NextRequest, { params }: Params) {
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
    const { comment, photos = [], requirePhoto } = completeTaskSchema.parse(body);

    // Найти задачу
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        checklist: {
          include: {
            object: {
              select: {
                id: true,
                name: true,
                requirePhotoForCompletion: true,
              }
            }
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Задача не найдена' },
        { status: 404 }
      );
    }

    if (!task.checklist?.object) {
      return NextResponse.json(
        { error: 'Объект задачи не найден' },
        { status: 404 }
      );
    }

    // Проверить права доступа к объекту
    const hasAccess = await hasObjectAccess(
      session.user.id, 
      session.user.role as any, 
      task.checklist.object.id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    // Проверить, что задача еще не завершена
    if (task.status === 'COMPLETED' || task.status === 'CLOSED_WITH_PHOTO') {
      return NextResponse.json(
        { error: 'Задача уже завершена' },
        { status: 400 }
      );
    }

    // Проверить обязательность фото
    const photoRequired = task.checklist.object.requirePhotoForCompletion || requirePhoto;
    if (photoRequired && photos.length === 0) {
      return NextResponse.json(
        { error: 'Для завершения этой задачи требуется фото' },
        { status: 400 }
      );
    }

    // Определить новый статус
    const newStatus = photos.length > 0 ? 'CLOSED_WITH_PHOTO' : 'COMPLETED';

    // Обновить задачу
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: newStatus,
        completionComment: comment,
        completionPhotos: photos,
        completedById: session.user.id,
        completedAt: new Date(),
      },
      include: {
        completedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        checklist: {
          include: {
            object: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      }
    });

    // Создать запись в аудит логе
    await prisma.auditLog.create({
      data: {
        action: 'COMPLETE_TASK_WITH_REPORT',
        entity: 'Task',
        entityId: task.id,
        details: {
          taskDescription: task.description,
          objectName: task.checklist.object.name,
          status: newStatus,
          comment: comment,
          photosCount: photos.length,
          requirePhoto: photoRequired,
        },
        userId: session.user.id,
      },
    });

    // Проверить, все ли задачи в чек-листе завершены
    if (task.checklistId) {
      const checklistTasks = await prisma.task.findMany({
        where: { checklistId: task.checklistId },
        select: { id: true, status: true }
      });

      const allCompleted = checklistTasks.every(t => 
        t.status === 'COMPLETED' || t.status === 'CLOSED_WITH_PHOTO'
      );

      if (allCompleted) {
        // Завершить чек-лист
        await prisma.checklist.update({
          where: { id: task.checklistId },
          data: {
            completedAt: new Date(),
            completedById: session.user.id,
          }
        });

        // Создать запись в аудит логе о завершении чек-листа
        await prisma.auditLog.create({
          data: {
            action: 'COMPLETE_CHECKLIST',
            entity: 'Checklist',
            entityId: task.checklistId,
            details: {
              objectName: task.checklist.object.name,
              tasksCount: checklistTasks.length,
              autoCompleted: true,
            },
            userId: session.user.id,
          },
        });
      }
    }

    return NextResponse.json({
      task: updatedTask,
      message: 'Задача успешно завершена'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Ошибка при завершении задачи:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
