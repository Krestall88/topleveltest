import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { getCurrentTimeInTimezone } from '@/lib/timezone-utils';

async function getUserFromToken(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    return payload;
  } catch (error) {
    return null;
  }
}

// GET /api/tasks/my-current - Получить текущие задачи для менеджера
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    console.log('📋 Получение текущих задач для пользователя:', user.userId);

    // Получаем объекты, которыми управляет менеджер
    const managedObjects = await prisma.cleaningObject.findMany({
      where: {
        managerId: user.userId as string
      },
      select: {
        id: true,
        name: true,
        timezone: true,
        workingHours: true,
        workingDays: true
      }
    });

    if (managedObjects.length === 0) {
      return NextResponse.json({
        tasks: [],
        message: 'У вас нет назначенных объектов'
      });
    }

    const objectIds = managedObjects.map(obj => obj.id);
    const now = new Date();

    // Получаем задачи для объектов менеджера
    const tasks = await prisma.task.findMany({
      where: {
        checklist: {
          objectId: {
            in: objectIds
          }
        },
        status: {
          in: ['NEW', 'AVAILABLE', 'IN_PROGRESS', 'OVERDUE']
        }
      },
      include: {
        checklist: {
          include: {
            object: {
              select: { 
                id: true, 
                name: true, 
                timezone: true,
                workingHours: true,
                workingDays: true
              }
            },
            room: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: [
        { scheduledStart: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    // Обновляем статусы задач на основе времени
    const updatedTasks = [];
    
    for (const task of tasks) {
      let newStatus = task.status;
      const object = task.checklist?.object;
      
      if (object && task.scheduledStart && task.scheduledEnd) {
        const objectTime = getCurrentTimeInTimezone(object.timezone || 'Europe/Moscow');
        
        // Проверяем, доступна ли задача для выполнения
        if (objectTime >= task.scheduledStart && objectTime <= task.scheduledEnd) {
          if (task.status === 'NEW') {
            newStatus = 'AVAILABLE';
          }
        }
        // Проверяем, просрочена ли задача
        else if (objectTime > task.scheduledEnd && task.status !== 'OVERDUE') {
          newStatus = 'OVERDUE';
        }
      }

      // Обновляем статус в базе, если он изменился
      if (newStatus !== task.status) {
        await prisma.task.update({
          where: { id: task.id },
          data: { status: newStatus }
        });
      }

      updatedTasks.push({
        ...task,
        status: newStatus,
        timeWindow: task.scheduledStart && task.scheduledEnd ? {
          start: task.scheduledStart,
          end: task.scheduledEnd,
          isActive: newStatus === 'AVAILABLE',
          isOverdue: newStatus === 'OVERDUE'
        } : null
      });
    }

    // Группируем задачи по статусам
    const groupedTasks = {
      available: updatedTasks.filter(t => t.status === 'AVAILABLE'),
      upcoming: updatedTasks.filter(t => t.status === 'NEW'),
      inProgress: updatedTasks.filter(t => t.status === 'IN_PROGRESS'),
      overdue: updatedTasks.filter(t => t.status === 'OVERDUE')
    };

    console.log('✅ Найдено задач:', {
      available: groupedTasks.available.length,
      upcoming: groupedTasks.upcoming.length,
      inProgress: groupedTasks.inProgress.length,
      overdue: groupedTasks.overdue.length
    });

    return NextResponse.json({
      tasks: groupedTasks,
      totalTasks: updatedTasks.length,
      managedObjects: managedObjects.length,
      currentTime: now.toISOString()
    });

  } catch (error) {
    console.error('❌ Ошибка получения текущих задач:', error);
    return NextResponse.json(
      { message: 'Ошибка при получении задач' },
      { status: 500 }
    );
  }
}
