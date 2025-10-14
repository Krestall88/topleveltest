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

// Схема для завершения чек-листа
const completeChecklistSchema = z.object({
  comment: z.string().optional(),
  photos: z.array(z.string().url()).optional(),
  forceComplete: z.boolean().default(false), // Принудительное завершение (для админов)
});

// POST /api/checklists/[id]/complete - Завершить чек-лист с комментарием и фото
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
    const { comment, photos = [], forceComplete } = completeChecklistSchema.parse(body);

    // Найти чек-лист
    const checklist = await prisma.checklist.findUnique({
      where: { id },
      include: {
        object: {
          select: {
            id: true,
            name: true,
            requirePhotoForCompletion: true,
          }
        },
        tasks: {
          select: {
            id: true,
            status: true,
            description: true,
          }
        }
      }
    });

    if (!checklist) {
      return NextResponse.json(
        { error: 'Чек-лист не найден' },
        { status: 404 }
      );
    }

    // Проверить права доступа к объекту
    const hasAccess = await hasObjectAccess(
      session.user.id, 
      session.user.role as any, 
      checklist.object.id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    // Проверить, что чек-лист еще не завершен
    if (checklist.completedAt) {
      return NextResponse.json(
        { error: 'Чек-лист уже завершен' },
        { status: 400 }
      );
    }

    // Проверить, все ли задачи завершены (если не принудительное завершение)
    if (!forceComplete) {
      const incompleteTasks = checklist.tasks.filter(task => 
        task.status !== 'COMPLETED' && task.status !== 'CLOSED_WITH_PHOTO'
      );

      if (incompleteTasks.length > 0) {
        return NextResponse.json(
          { 
            error: 'Не все задачи завершены', 
            incompleteTasks: incompleteTasks.map(t => ({
              id: t.id,
              description: t.description,
              status: t.status
            }))
          },
          { status: 400 }
        );
      }
    }

    // Проверить требования к завершению для объекта
    const requirements = (checklist.object as any).completionRequirements || {
      photo: checklist.object.requirePhotoForCompletion || false,
      comment: (checklist.object as any).requireCommentForCompletion || false,
    };

    // Проверка требований к фото
    if (requirements.photo && !forceComplete) {
      const minPhotos = requirements.minPhotos || 1;
      
      if (photos.length < minPhotos) {
        // Проверить, есть ли достаточно фото в задачах
        const allTasks = await prisma.task.findMany({
          where: {
            checklistId: id,
          },
          select: { 
            id: true,
            completionPhotos: true
          }
        });

        const totalPhotos = photos.length + allTasks.reduce((sum, task) => 
          sum + (task.completionPhotos?.length || 0), 0
        );

        if (totalPhotos < minPhotos) {
          return NextResponse.json(
            { error: `Для завершения чек-листа требуется минимум ${minPhotos} фото` },
            { status: 400 }
          );
        }
      }
    }

    // Проверка требований к комментарию
    if (requirements.comment && !comment?.trim() && !forceComplete) {
      return NextResponse.json(
        { error: 'Для завершения чек-листа требуется комментарий' },
        { status: 400 }
      );
    }

    // Завершить чек-лист
    const updatedChecklist = await prisma.checklist.update({
      where: { id },
      data: {
        completionComment: comment,
        completionPhotos: photos,
        completedAt: new Date(),
        completedById: session.user.id,
      },
      include: {
        completedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        object: {
          select: {
            id: true,
            name: true,
          }
        },
        tasks: {
          select: {
            id: true,
            status: true,
            description: true,
          }
        }
      }
    });

    // Подсчитать статистику
    const completedTasks = updatedChecklist.tasks.filter(task => 
      task.status === 'COMPLETED' || task.status === 'CLOSED_WITH_PHOTO'
    ).length;

    // Создать запись в аудит логе
    await prisma.auditLog.create({
      data: {
        action: 'COMPLETE_CHECKLIST_WITH_REPORT',
        entity: 'Checklist',
        entityId: checklist.id,
        details: {
          objectName: checklist.object.name,
          totalTasks: checklist.tasks.length,
          completedTasks: completedTasks,
          comment: comment,
          photosCount: photos.length,
          forceComplete: forceComplete,
        },
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      checklist: updatedChecklist,
      stats: {
        totalTasks: checklist.tasks.length,
        completedTasks: completedTasks,
        photosCount: photos.length,
      },
      message: 'Чек-лист успешно завершен'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Ошибка при завершении чек-листа:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
