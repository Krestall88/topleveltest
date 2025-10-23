import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

async function getUserFromToken(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) return null;
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, role: true, name: true, email: true }
    });
    
    return user;
  } catch (error) {
    return null;
  }
}

// POST /api/tasks/[id]/complete-simple - Простое завершение задачи
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: taskId } = await params;
    console.log('🔍 Complete simple task API called for task:', taskId);
    
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

    // Получаем задачу
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 });
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
      }
    });

    console.log('✅ Задача завершена:', {
      taskId,
      previousStatus,
      newStatus: 'COMPLETED',
      completedBy: user.name
    });

    // Создаем запись в аудит логе
    try {
      await prisma.auditLog.create({
        data: {
          action: 'TASK_COMPLETED',
          entity: 'Task',
          entityId: taskId,
          userId: user.id,
          details: {
            taskId,
            taskDescription: task.description,
            objectName: task.objectName,
            roomName: task.roomName,
            previousStatus,
            newStatus: 'COMPLETED',
            completedBy: user.name,
            completedAt: completedAt.toISOString(),
            comment: comment?.trim() || null,
            photosCount: photos?.length || 0
          }
        }
      });
    } catch (auditError) {
      console.error('Ошибка записи в аудит лог:', auditError);
      // Не прерываем выполнение, задача уже завершена
    }

    return NextResponse.json({
      success: true,
      message: 'Задача успешно завершена',
      task: updatedTask
    });

  } catch (error) {
    console.error('💥 Ошибка завершения задачи:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка сервера при завершении задачи' 
    }, { status: 500 });
  }
}
