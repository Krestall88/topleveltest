import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { materializeTask } from '@/lib/virtual-tasks';

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

// POST /api/tasks/materialize - Материализация виртуальной задачи
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const body = await request.json();
    const { virtualTaskId, action, comment, photos } = body;

    console.log('🔄 Материализация задачи:', {
      virtualTaskId,
      action,
      userId: user.id,
      userRole: user.role
    });

    // Парсим ID виртуальной задачи
    const [techCardId, dateStr] = virtualTaskId.split('-');
    if (!techCardId || !dateStr) {
      return NextResponse.json({ 
        message: 'Неверный формат ID виртуальной задачи' 
      }, { status: 400 });
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ 
        message: 'Неверный формат даты' 
      }, { status: 400 });
    }

    // Материализуем задачу
    const task = await materializeTask(techCardId, date, action);

    // Обновляем задачу в зависимости от действия
    let updatedTask = task;
    
    if (action === 'complete') {
      updatedTask = await prisma.task.update({
        where: { id: task.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          completedById: user.id,
          completionComment: comment || null,
          completionPhotos: photos || []
        }
      });

      // Логируем завершение задачи
      await prisma.auditLog.create({
        data: {
          action: 'COMPLETE_TASK',
          userId: user.id,
          details: `Задача "${task.description}" завершена`,
          metadata: {
            taskId: task.id,
            techCardId,
            comment: comment || null,
            photosCount: photos?.length || 0
          }
        }
      });

      console.log(`✅ Задача завершена: ${task.id}`);
    }

    if (action === 'comment') {
      // Создаем комментарий админа к материализованной задаче
      await prisma.taskAdminComment.create({
        data: {
          taskId: task.id,
          adminId: user.id,
          content: comment,
          type: 'admin_note'
        }
      });

      console.log(`💬 Добавлен комментарий к задаче: ${task.id}`);
    }

    return NextResponse.json({
      success: true,
      task: updatedTask,
      message: `Задача ${action === 'complete' ? 'завершена' : 'обновлена'}`
    });

  } catch (error) {
    console.error('💥 Ошибка материализации задачи:', error);
    return NextResponse.json({ 
      message: 'Ошибка сервера',
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
