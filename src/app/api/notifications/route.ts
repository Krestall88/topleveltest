import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

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

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    const whereClause = {
      userId: user.id,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    // Получаем уведомления из AuditLog (временное решение)
    // В будущем можно создать отдельную модель Notification
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        details: {
          path: ['managerId'],
          equals: user.id
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Преобразуем в формат уведомлений
    const notifications = auditLogs.map(log => ({
      id: log.id,
      type: log.action,
      title: getNotificationTitle(log.action),
      message: getNotificationMessage(log.action, log.user?.name || 'Администратор', log.details),
      isRead: false, // Пока все уведомления считаем непрочитанными
      createdAt: log.createdAt,
      relatedTaskId: log.details?.taskId || null
    }));

    const unreadCount = notifications.length;

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Ошибка при получении уведомлений:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении уведомлений' },
      { status: 500 }
    );
  }
}

// Функции для формирования уведомлений
function getNotificationTitle(action: string): string {
  switch (action) {
    case 'TASK_COMMENTED':
      return 'Комментарий к задаче';
    case 'TASK_COMPLETED':
      return 'Задача выполнена';
    case 'TASK_FAILED':
      return 'Задача не выполнена';
    default:
      return 'Уведомление';
  }
}

function getNotificationMessage(action: string, userName: string, details: any): string {
  switch (action) {
    case 'TASK_COMMENTED':
      return `${userName} добавил комментарий к вашей задаче`;
    case 'TASK_COMPLETED':
      return `${userName} выполнил задачу на объекте ${details?.objectName || ''}`;
    case 'TASK_FAILED':
      return `${userName} отметил задачу как невыполненную на объекте ${details?.objectName || ''}`;
    default:
      return `${userName} выполнил действие: ${action}`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, title, message, data, priority = 'MEDIUM' } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Обязательные поля: userId, type, title, message' },
        { status: 400 }
      );
    }

    // Временно возвращаем заглушку, так как модель Notification не существует
    const notification = {
      id: 'temp-notification-id',
      userId,
      type,
      title,
      message,
      data: data || {},
      priority,
      isRead: false,
      createdAt: new Date(),
      user: { id: userId, name: 'Пользователь', email: 'user@example.com' }
    };
    
    // TODO: Добавить модель Notification в schema.prisma
    // const notification = await prisma.notification.create({
    //   data: {
    //     userId,
    //     type,
    //     title,
    //     message,
    //     data: data || {},
    //     priority,
    //     isRead: false,
    //   },
    //   include: {
    //     user: {
    //       select: {
    //         id: true,
    //         name: true,
    //         email: true,
    //       },
    //     },
    //   },
    // });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error('Ошибка при создании уведомления:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании уведомления' },
      { status: 500 }
    );
  }
}
