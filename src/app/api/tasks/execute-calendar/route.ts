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

// POST /api/tasks/execute-calendar - Выполнение задачи из календаря
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, status, comment, photos } = body;

    if (!taskId || !status) {
      return NextResponse.json({ message: 'Не указаны обязательные поля' }, { status: 400 });
    }

    // Находим задачу
    const task = await prisma.taskExecution.findUnique({
      where: { id: taskId },
      include: {
        object: {
          select: {
            id: true,
            name: true,
            managerId: true
          }
        },
        techCard: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ message: 'Задача не найдена' }, { status: 404 });
    }

    // Проверяем права доступа
    if (user.role === 'MANAGER' && task.object.managerId !== user.id) {
      return NextResponse.json({ message: 'Нет доступа к этой задаче' }, { status: 403 });
    }

    // Обновляем задачу
    const updatedTask = await prisma.taskExecution.update({
      where: { id: taskId },
      data: {
        status: status,
        executedAt: status === 'COMPLETED' ? new Date() : null,
        executedById: user.id,
        comment: comment || null,
        photos: photos || []
      },
      include: {
        object: true,
        techCard: true,
        executedBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Логируем действие
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: `TASK_${status}`,
        entityType: 'TaskExecution',
        entityId: taskId,
        details: {
          taskName: task.techCard?.name,
          objectName: task.object.name,
          status: status,
          comment: comment,
          photosCount: photos?.length || 0
        }
      }
    });

    return NextResponse.json({
      message: 'Задача обновлена',
      task: updatedTask
    });

  } catch (error) {
    console.error('Ошибка выполнения задачи:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// GET /api/tasks/execute-calendar/[id] - Получение детальной информации о задаче
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const url = new URL(req.url);
    const taskId = url.pathname.split('/').pop();

    if (!taskId) {
      return NextResponse.json({ message: 'ID задачи не указан' }, { status: 400 });
    }

    const task = await prisma.taskExecution.findUnique({
      where: { id: taskId },
      include: {
        object: {
          select: {
            id: true,
            name: true,
            address: true,
            managerId: true,
            timezone: true,
            workingHours: true,
            workingDays: true
          }
        },
        techCard: {
          select: {
            id: true,
            name: true,
            description: true,
            workType: true,
            frequency: true,
            frequencyDays: true,
            preferredTime: true,
            maxDelayHours: true,
            timeSlots: true
          }
        },
        executedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ message: 'Задача не найдена' }, { status: 404 });
    }

    // Проверяем права доступа
    if (user.role === 'MANAGER' && task.object.managerId !== user.id) {
      return NextResponse.json({ message: 'Нет доступа к этой задаче' }, { status: 403 });
    }

    return NextResponse.json({ task });

  } catch (error) {
    console.error('Ошибка получения задачи:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
