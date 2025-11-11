import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { notifyTaskComment } from '@/lib/telegram-notifications';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/additional-tasks/[id]/comments - Получить комментарии к заданию
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const comments = await prisma.additionalTaskComment.findMany({
      where: { taskId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST /api/additional-tasks/[id]/comments - Добавить комментарий
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const { content } = await request.json();

    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    // Проверяем, является ли пользователь администратором
    const isAdmin = ['ADMIN', 'DEPUTY_ADMIN'].includes(user.role);

    // Получаем информацию о задании и менеджере
    const task = await prisma.additionalTask.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, name: true, telegramId: true }
        },
        object: {
          select: { name: true }
        }
      }
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const comment = await prisma.additionalTaskComment.create({
      data: {
        taskId: id,
        userId: user.id,
        content: content.trim(),
        isAdmin
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Отправляем уведомление менеджеру (если комментарий оставил не он сам)
    if (task.assignedTo.telegramId && task.assignedTo.id !== user.id) {
      try {
        await notifyTaskComment(task.assignedTo.telegramId, {
          taskTitle: task.title,
          authorName: user.name || user.email,
          comment: content.trim().substring(0, 200)
        });
        console.log('📱 Уведомление о комментарии отправлено менеджеру:', task.assignedTo.name);
      } catch (error) {
        console.error('❌ Ошибка отправки уведомления о комментарии:', error);
      }
    }

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
