import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

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

/**
 * GET /api/notifications/unread
 * 
 * Возвращает количество непрочитанных событий для пользователя
 * Легковесный запрос - только счетчики, без полных данных
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const userId = user.userId as string;

    // Получаем timestamp последней проверки из query параметра
    const { searchParams } = new URL(req.url);
    const lastCheckParam = searchParams.get('lastCheck');
    const lastCheck = lastCheckParam ? new Date(lastCheckParam) : new Date(Date.now() - 60000); // По умолчанию - последняя минута

    // Считаем новые задания (только для менеджеров)
    const newTasksCount = await prisma.additionalTask.count({
      where: {
        assignedToId: userId,
        status: 'NEW',
        createdAt: {
          gt: lastCheck
        }
      }
    });

    // Считаем новые комментарии к задачам пользователя
    const newCommentsCount = await prisma.additionalTaskComment.count({
      where: {
        task: {
          assignedToId: userId
        },
        userId: {
          not: userId // Не считаем свои комментарии
        },
        createdAt: {
          gt: lastCheck
        }
      }
    });

    // Получаем последние события для показа
    const recentEvents: any[] = [];

    // Последние новые задания (максимум 3)
    if (newTasksCount > 0) {
      const recentTasks = await prisma.additionalTask.findMany({
        where: {
          assignedToId: userId,
          status: 'NEW',
          createdAt: {
            gt: lastCheck
          }
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          object: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 3
      });

      recentEvents.push(...recentTasks.map(task => ({
        type: 'new_task',
        id: task.id,
        title: task.title,
        objectName: task.object.name,
        createdAt: task.createdAt
      })));
    }

    // Последние комментарии (максимум 3)
    if (newCommentsCount > 0) {
      const recentComments = await prisma.additionalTaskComment.findMany({
        where: {
          task: {
            assignedToId: userId
          },
          userId: {
            not: userId
          },
          createdAt: {
            gt: lastCheck
          }
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: {
            select: { name: true, email: true }
          },
          task: {
            select: { id: true, title: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 3
      });

      recentEvents.push(...recentComments.map(comment => ({
        type: 'new_comment',
        id: comment.id,
        taskId: comment.task.id,
        taskTitle: comment.task.title,
        authorName: comment.user.name || comment.user.email,
        comment: comment.content.substring(0, 100),
        createdAt: comment.createdAt
      })));
    }

    // Сортируем по времени
    recentEvents.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      totalCount: newTasksCount + newCommentsCount,
      newTasksCount,
      newCommentsCount,
      events: recentEvents.slice(0, 5), // Максимум 5 последних событий
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка получения уведомлений:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
