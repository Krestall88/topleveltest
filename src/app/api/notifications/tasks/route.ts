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

// GET /api/notifications/tasks - Получить уведомления по задачам
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const userId = searchParams.get('userId') || user.id;

    // Генерируем уведомления на основе задач
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Получаем задачи пользователя с расписанием
    let taskFilter: any = {
      OR: [
        { completedById: userId },
        { 
          checklist: {
            object: { managerId: userId }
          }
        }
      ],
      status: {
        notIn: ['COMPLETED', 'CLOSED_WITH_PHOTO']
      }
    };

    // Для админов показываем все задачи
    if (user.role === 'ADMIN' || user.role === 'DEPUTY') {
      taskFilter = {
        status: {
          notIn: ['COMPLETED', 'CLOSED_WITH_PHOTO']
        }
      };
    }

    const tasks = await prisma.task.findMany({
      where: taskFilter,
      include: {
        checklist: {
          include: {
            object: { select: { name: true, managerId: true } },
            room: { select: { name: true } }
          }
        }
      },
      orderBy: { scheduledEnd: 'asc' }
    });

    const notifications = [];

    for (const task of tasks) {
      if (!task.checklist) continue;

      const objectName = task.checklist.object.name;
      const roomName = task.checklist.room?.name;
      
      // Просроченные задачи
      if (task.scheduledEnd && new Date(task.scheduledEnd) < now) {
        const overdueDays = Math.floor((now.getTime() - new Date(task.scheduledEnd).getTime()) / (1000 * 60 * 60 * 24));
        notifications.push({
          id: `overdue-${task.id}`,
          taskId: task.id,
          taskDescription: task.description,
          type: 'OVERDUE',
          priority: overdueDays > 3 ? 'URGENT' : overdueDays > 1 ? 'HIGH' : 'MEDIUM',
          scheduledFor: task.scheduledEnd,
          objectName,
          roomName,
          message: `Задача просрочена на ${overdueDays} дн. Требуется немедленное выполнение.`,
          isRead: false,
          createdAt: task.scheduledEnd
        });
      }
      
      // Задачи на сегодня
      else if (task.scheduledEnd && new Date(task.scheduledEnd) <= tomorrow) {
        const hoursLeft = Math.floor((new Date(task.scheduledEnd).getTime() - now.getTime()) / (1000 * 60 * 60));
        notifications.push({
          id: `today-${task.id}`,
          taskId: task.id,
          taskDescription: task.description,
          type: 'UPCOMING',
          priority: hoursLeft < 2 ? 'HIGH' : hoursLeft < 6 ? 'MEDIUM' : 'LOW',
          scheduledFor: task.scheduledEnd,
          objectName,
          roomName,
          message: hoursLeft < 1 
            ? 'Задача должна быть выполнена в течение часа!'
            : `Задача должна быть выполнена через ${hoursLeft} ч.`,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }
      
      // Задачи на эту неделю
      else if (task.scheduledEnd && new Date(task.scheduledEnd) <= nextWeek) {
        const daysLeft = Math.floor((new Date(task.scheduledEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        notifications.push({
          id: `week-${task.id}`,
          taskId: task.id,
          taskDescription: task.description,
          type: 'REMINDER',
          priority: 'LOW',
          scheduledFor: task.scheduledEnd,
          objectName,
          roomName,
          message: `Предстоящая задача через ${daysLeft} дн.`,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }

      // Ежедневные задачи (если не выполнены сегодня)
      if (task.description.toLowerCase().includes('ежедневно') || 
          task.description.toLowerCase().includes('каждый день')) {
        const today = new Date().toDateString();
        const lastCompleted = task.completedAt ? new Date(task.completedAt).toDateString() : null;
        
        if (lastCompleted !== today) {
          notifications.push({
            id: `daily-${task.id}`,
            taskId: task.id,
            taskDescription: task.description,
            type: 'DAILY',
            priority: 'MEDIUM',
            scheduledFor: new Date().toISOString(),
            objectName,
            roomName,
            message: 'Ежедневная задача еще не выполнена сегодня.',
            isRead: false,
            createdAt: new Date().toISOString()
          });
        }
      }

      // Еженедельные задачи
      if (task.description.toLowerCase().includes('еженедельно') || 
          task.description.toLowerCase().includes('раз в неделю')) {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const lastCompleted = task.completedAt ? new Date(task.completedAt) : null;
        
        if (!lastCompleted || lastCompleted < weekAgo) {
          notifications.push({
            id: `weekly-${task.id}`,
            taskId: task.id,
            taskDescription: task.description,
            type: 'WEEKLY',
            priority: 'MEDIUM',
            scheduledFor: new Date().toISOString(),
            objectName,
            roomName,
            message: 'Еженедельная задача требует выполнения.',
            isRead: false,
            createdAt: new Date().toISOString()
          });
        }
      }
    }

    // Сортируем по приоритету и времени
    const priorityOrder: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    notifications.sort((a, b) => {
      const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (priorityDiff !== 0) return priorityDiff;
      
      return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
    });

    const limitedNotifications = notifications.slice(0, limit);
    const unreadCount = notifications.filter(n => !n.isRead).length;

    return NextResponse.json({
      notifications: limitedNotifications,
      unreadCount,
      total: notifications.length
    });

  } catch (error) {
    console.error('Ошибка получения уведомлений:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении уведомлений' },
      { status: 500 }
    );
  }
}
