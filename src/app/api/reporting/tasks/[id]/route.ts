import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Схема для обновления задачи
const updateTaskSchema = z.object({
  title: z.string().min(1, 'Название обязательно').optional(),
  description: z.string().optional(),
  status: z.enum(['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assignedToId: z.string().optional(),
  completionComment: z.string().optional()
});

// GET - получить детальную информацию о задаче
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('🔍 GET /api/reporting/tasks/[id] - получение задачи:', params.id);
    
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const task = await prisma.reportingTask.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        dueDate: true,
        completedAt: true,
        completionComment: true,
        object: {
          select: {
            id: true,
            name: true,
            managerId: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
      }
    });

    if (!task) {
      return NextResponse.json({ message: 'Задача не найдена' }, { status: 404 });
    }

    // Проверяем права доступа
    const canView = user.role === 'ADMIN' || 
                   user.role === 'DEPUTY_ADMIN' || 
                   (user.role === 'MANAGER' && task.object.managerId === user.id) ||
                   task.assignedTo.id === user.id ||
                   task.createdBy.id === user.id;

    if (!canView) {
      return NextResponse.json({ message: 'Нет доступа к задаче' }, { status: 403 });
    }

    console.log('✅ Задача найдена и доступна пользователю');
    return NextResponse.json({ task });

  } catch (error) {
    console.error('❌ Ошибка получения задачи:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// PUT - обновить задачу
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('🔄 PUT /api/reporting/tasks/[id] - обновление задачи:', params.id);
    
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = updateTaskSchema.parse(body);

    // Получаем текущую задачу для проверки прав
    const currentTask = await prisma.reportingTask.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        object: {
          select: {
            managerId: true
          }
        },
        createdBy: {
          select: {
            id: true
          }
        },
        assignedTo: {
          select: {
            id: true
          }
        }
      }
    });

    if (!currentTask) {
      return NextResponse.json({ message: 'Задача не найдена' }, { status: 404 });
    }

    // Проверяем права на редактирование
    const canEdit = user.role === 'ADMIN' || 
                   user.role === 'DEPUTY_ADMIN' || 
                   (user.role === 'MANAGER' && currentTask.object.managerId === user.id);

    // Менеджеры могут только изменять статус на COMPLETED и добавлять комментарий завершения
    const isManagerStatusUpdate = user.role === 'MANAGER' && 
                                 currentTask.assignedTo.id === user.id &&
                                 validatedData.status === 'COMPLETED' &&
                                 Object.keys(validatedData).every(key => 
                                   ['status', 'completionComment'].includes(key)
                                 );

    if (!canEdit && !isManagerStatusUpdate) {
      return NextResponse.json({ message: 'Нет прав на редактирование задачи' }, { status: 403 });
    }

    // Подготавливаем данные для обновления
    const updateData: any = {};
    
    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.priority !== undefined) updateData.priority = validatedData.priority;
    if (validatedData.dueDate !== undefined) {
      updateData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null;
    }
    if (validatedData.assignedToId !== undefined) updateData.assignedToId = validatedData.assignedToId;
    if (validatedData.completionComment !== undefined) updateData.completionComment = validatedData.completionComment;
    
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
      if (validatedData.status === 'COMPLETED') {
        updateData.completedAt = new Date();
      } else if (currentTask.status === 'COMPLETED' && validatedData.status !== 'COMPLETED') {
        updateData.completedAt = null;
      }
    }

    // Проверяем существование назначенного пользователя
    if (validatedData.assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: validatedData.assignedToId },
        select: { id: true }
      });
      
      if (!assignedUser) {
        return NextResponse.json({ message: 'Назначенный пользователь не найден' }, { status: 404 });
      }
    }

    // Обновляем задачу
    const updatedTask = await prisma.reportingTask.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        updatedAt: true,
        dueDate: true,
        completedAt: true,
        completionComment: true,
        createdBy: {
          select: {
            name: true
          }
        },
        assignedTo: {
          select: {
            name: true
          }
        }
      }
    });

    console.log('✅ Задача обновлена');
    return NextResponse.json({
      task: updatedTask,
      message: 'Задача успешно обновлена'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Ошибка валидации', errors: error.errors },
        { status: 400 }
      );
    }
    
    console.error('❌ Ошибка обновления задачи:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// DELETE - удалить задачу
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('🗑️ DELETE /api/reporting/tasks/[id] - удаление задачи:', params.id);
    
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    // Только админы и заместители могут удалять задачи
    if (user.role !== 'ADMIN' && user.role !== 'DEPUTY_ADMIN') {
      return NextResponse.json({ message: 'Нет прав на удаление задач' }, { status: 403 });
    }

    // Проверяем существование задачи
    const task = await prisma.reportingTask.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true
      }
    });

    if (!task) {
      return NextResponse.json({ message: 'Задача не найдена' }, { status: 404 });
    }

    // Удаляем задачу (комментарии и вложения удалятся автоматически благодаря onDelete: Cascade)
    await prisma.reportingTask.delete({
      where: { id: params.id }
    });

    console.log('✅ Задача удалена');
    return NextResponse.json({
      message: `Задача "${task.title}" успешно удалена`
    });

  } catch (error) {
    console.error('❌ Ошибка удаления задачи:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
