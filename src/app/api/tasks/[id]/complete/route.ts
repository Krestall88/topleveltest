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

// POST /api/tasks/[id]/complete - Отметить задачу как выполненную
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    // Только менеджеры могут отмечать задачи
    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    const body = await req.json();
    const { status, notes, photoUrl, comment, photos } = body;

    // Получаем задачу с полной информацией
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        checklist: {
          include: {
            object: { 
              select: { 
                name: true, 
                managerId: true,
                requirePhotoForCompletion: true,
                requireCommentForCompletion: true,
                completionRequirements: true
              } 
            },
            room: { select: { name: true } }
          }
        }
      }
    });

    if (!task || !task.checklist) {
      return NextResponse.json({ message: 'Задача не найдена' }, { status: 404 });
    }

    // Проверяем, что менеджер может работать с этим объектом
    if (user.role === 'MANAGER' && task.checklist.object.managerId !== user.id) {
      return NextResponse.json({ 
        message: 'Вы можете работать только со своими объектами' 
      }, { status: 403 });
    }

    // Проверяем требования к завершению
    const requirements = task.checklist.object.completionRequirements as any || {
      photo: task.checklist.object.requirePhotoForCompletion || false,
      comment: task.checklist.object.requireCommentForCompletion || false,
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
    const completedAt = status === 'COMPLETED' || status === 'CLOSED_WITH_PHOTO' ? new Date() : null;

    // Обновляем задачу
    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: {
        status,
        notes,
        photoUrl,
        completedAt,
        completedById: completedAt ? user.id : null
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
        action: 'TASK_STATUS_CHANGED',
        entityType: 'TASK',
        entityId: task.id,
        userId: user.id,
        details: {
          taskTitle: task.title,
          objectName: task.checklist.object.name,
          roomName: task.checklist.room?.name,
          checklistDate: task.checklist.date.toISOString().split('T')[0],
          previousStatus,
          newStatus: status,
          notes,
          hasPhoto: !!photoUrl,
          completedAt: completedAt?.toISOString(),
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

    // Если все задачи выполнены, обновляем статус чек-листа
    if (allCompleted) {
      await prisma.checklist.update({
        where: { id: task.checklistId },
        data: { status: 'COMPLETED' }
      });

      // Логируем завершение чек-листа
      await prisma.auditLog.create({
        data: {
          action: 'CHECKLIST_COMPLETED',
          entityType: 'CHECKLIST',
          entityId: task.checklistId,
          userId: user.id,
          details: {
            objectName: task.checklist.object.name,
            roomName: task.checklist.room?.name,
            checklistDate: task.checklist.date.toISOString().split('T')[0],
            totalTasks: checklistTasks.length,
            completedBy: user.name,
            completedAt: new Date().toISOString()
          }
        }
      });
    }

    return NextResponse.json({
      task: updatedTask,
      checklistCompleted: allCompleted,
      message: 'Задача успешно обновлена'
    });

  } catch (error) {
    console.error('Ошибка обновления задачи:', error);
    return NextResponse.json(
      { message: 'Ошибка при обновлении задачи' },
      { status: 500 }
    );
  }
}
