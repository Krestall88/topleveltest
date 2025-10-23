import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

async function getUserFromToken(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, name: true, email: true, role: true }
    });

    return user;
  } catch (error) {
    return null;
  }
}

interface Params {
  params: { id: string };
}

// POST /api/tasks/[id]/complete-task - Завершить отдельную задачу
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: taskId } = await params;
    console.log(' Complete task API called for task:', taskId);
    
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    // Проверяем права доступа
    if (!['MANAGER', 'ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    const body = await req.json();
    const { comment, photos } = body;

    // Получаем задачу с полной информацией
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        checklist: {
          include: {
            object: { 
              select: { 
                id: true,
                name: true, 
                managerId: true,
                requirePhotoForCompletion: true,
                requireCommentForCompletion: true,
                completionRequirements: true
              } 
            },
            room: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 });
    }

    // Если нет checklist, получаем объект напрямую по objectName
    let objectInfo = null;
    if (task.checklist) {
      objectInfo = task.checklist.object;
    } else {
      // Ищем объект по имени из задачи
      const foundObject = await prisma.cleaningObject.findFirst({
        where: { name: task.objectName || undefined },
        select: { 
          id: true,
          name: true, 
          managerId: true,
          requirePhotoForCompletion: true,
          requireCommentForCompletion: true,
          completionRequirements: true
        }
      });
      objectInfo = foundObject;
    }

    // Проверяем права доступа к объекту
    if (user.role === 'MANAGER' && objectInfo && objectInfo.managerId !== user.id) {
      return NextResponse.json({ 
        error: 'Вы можете работать только со своими объектами' 
      }, { status: 403 });
    }

    // Проверяем требования к завершению
    const requirements = (objectInfo?.completionRequirements as any) || {
      photo: objectInfo?.requirePhotoForCompletion || false,
      comment: objectInfo?.requireCommentForCompletion || false,
    };

    // Валидация требований к фото
    if (requirements.photo && (!photos || photos.length === 0)) {
      const minPhotos = requirements.minPhotos || 1;
      return NextResponse.json({ 
        error: `Для завершения задачи требуется минимум ${minPhotos} фото` 
      }, { status: 400 });
    }

    if (requirements.photo && requirements.minPhotos && photos && photos.length < requirements.minPhotos) {
      return NextResponse.json({ 
        error: `Требуется минимум ${requirements.minPhotos} фото для завершения задачи` 
      }, { status: 400 });
    }

    // Валидация требований к комментарию
    if (requirements.comment && (!comment || !comment.trim())) {
      return NextResponse.json({ 
        error: 'Для завершения задачи требуется комментарий' 
      }, { status: 400 });
    }

    // Сохраняем предыдущий статус для логирования
    const previousStatus = task.status;
    const completedAt = new Date();

    // Обновляем задачу
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completionComment: comment?.trim() || null,
        completionPhotos: photos || [],
        completedAt,
        completedById: user.id
      },
      include: {
        completedBy: { select: { name: true, email: true } },
        checklist: {
          include: {
            object: { select: { name: true } },
            room: { select: { name: true } }
          }
        }
      }
    });

    // Создаем лог действия
    await prisma.auditLog.create({
      data: {
        action: 'TASK_COMPLETED',
        userId: user.id,
        details: {
          taskId: task.id,
          taskDescription: task.description,
          objectName: task.checklist.object.name,
          roomName: task.checklist.room?.name,
          checklistDate: task.checklist.date.toISOString().split('T')[0],
          previousStatus,
          newStatus: 'COMPLETED',
          hasComment: !!comment?.trim(),
          photoCount: photos?.length || 0,
          completedAt: completedAt.toISOString(),
          managerName: user.name,
          managerEmail: user.email
        }
      }
    });

    // Проверяем, все ли задачи в чек-листе выполнены
    const checklistTasks = await prisma.task.findMany({
      where: { checklistId: task.checklistId },
      select: { status: true }
    });

    const allCompleted = checklistTasks.every(t => 
      t.status === 'COMPLETED' || t.status === 'CLOSED_WITH_PHOTO'
    );

    // Если все задачи выполнены, отмечаем чек-лист как завершенный
    if (allCompleted && task.checklistId) {
      await prisma.checklist.update({
        where: { id: task.checklistId },
        data: { 
          completedAt: completedAt,
          completedById: user.id
        }
      });

      // Логируем завершение чек-листа
      await prisma.auditLog.create({
        data: {
          action: 'CHECKLIST_AUTO_COMPLETED',
          userId: user.id,
          details: {
            checklistId: task.checklistId,
            objectName: task.checklist.object.name,
            roomName: task.checklist.room?.name,
            checklistDate: task.checklist.date.toISOString().split('T')[0],
            totalTasks: checklistTasks.length,
            completedBy: user.name,
            completedAt: completedAt.toISOString(),
            trigger: 'All tasks completed'
          }
        }
      });
    }

    return NextResponse.json({
      task: updatedTask,
      checklistCompleted: allCompleted,
      message: 'Задача успешно завершена'
    });

  } catch (error) {
    console.error('Ошибка завершения задачи:', error);
    return NextResponse.json(
      { error: 'Ошибка при завершении задачи' },
      { status: 500 }
    );
  }
}
