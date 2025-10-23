import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const commentSchema = z.object({
  content: z.string().min(1, 'Комментарий не может быть пустым').max(1000, 'Комментарий слишком длинный'),
  type: z.enum(['admin_note', 'completion_reason', 'feedback'], {
    errorMap: () => ({ message: 'Неверный тип комментария' })
  })
});

// POST /api/tasks/[id]/admin-comment - Добавление комментария администратора к задаче
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    // Проверяем права администратора
    if (!['ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    const taskId = params.id;
    const body = await request.json();
    
    // Валидация данных
    const validationResult = commentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        message: 'Ошибка валидации', 
        errors: validationResult.error.errors 
      }, { status: 400 });
    }

    const { content, type } = validationResult.data;

    // Проверяем существование задачи
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        checklist: {
          include: {
            object: {
              select: {
                id: true,
                name: true,
                managerId: true
              }
            }
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ message: 'Задача не найдена' }, { status: 404 });
    }

    // Для DEPUTY_ADMIN проверяем доступ к объекту
    if (user.role === 'DEPUTY_ADMIN') {
      const hasAccess = await prisma.deputyAdminAssignment.findFirst({
        where: {
          deputyAdminId: user.id,
          objectId: task.checklist?.object?.id
        }
      });

      if (!hasAccess) {
        return NextResponse.json({ message: 'Нет доступа к этому объекту' }, { status: 403 });
      }
    }

    // Создаем комментарий в транзакции
    const result = await prisma.$transaction(async (tx) => {
      // Добавляем комментарий
      const comment = await tx.taskComment.create({
        data: {
          taskId: taskId,
          content: content,
          type: type,
          createdById: user.id
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        }
      });

      // Создаем уведомление для менеджера объекта
      if (task.checklist?.object?.managerId) {
        const notificationMessage = getNotificationMessage(type, user.name, content);
        
        await tx.notification.create({
          data: {
            userId: task.checklist.object.managerId,
            type: 'task_commented',
            title: 'Комментарий к задаче',
            message: notificationMessage,
            relatedTaskId: taskId,
            isRead: false
          }
        });
      }

      // Логируем действие
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'TASK_COMMENTED',
          details: {
            taskId: taskId,
            commentType: type,
            objectId: task.checklist?.object?.id,
            objectName: task.checklist?.object?.name
          }
        }
      });

      return comment;
    });

    return NextResponse.json({
      message: 'Комментарий добавлен',
      comment: result
    });

  } catch (error) {
    console.error('Ошибка добавления комментария:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// GET /api/tasks/[id]/admin-comment - Получение комментариев к задаче
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const taskId = params.id;

    // Получаем комментарии к задаче
    const comments = await prisma.taskComment.findMany({
      where: { taskId: taskId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ comments });

  } catch (error) {
    console.error('Ошибка получения комментариев:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// Функция для формирования сообщения уведомления
function getNotificationMessage(type: string, adminName: string, content: string): string {
  switch (type) {
    case 'admin_note':
      return `${adminName} добавил заметку к вашей задаче: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`;
    case 'completion_reason':
      return `${adminName} прокомментировал причину невыполнения задачи: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`;
    case 'feedback':
      return `${adminName} оставил отзыв о выполнении задачи: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`;
    default:
      return `${adminName} добавил комментарий к вашей задаче`;
  }
}
