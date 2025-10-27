import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Схема для создания комментария
const createCommentSchema = z.object({
  content: z.string().min(1, 'Комментарий не может быть пустым')
});

// GET - получить комментарии к задаче
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('🔍 GET /api/reporting/tasks/[id]/comments - получение комментариев для задачи:', params.id);
    
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    // Проверяем существование задачи и права доступа
    const task = await prisma.reportingTask.findUnique({
      where: { id: params.id },
      select: {
        id: true,
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

    if (!task) {
      return NextResponse.json({ message: 'Задача не найдена' }, { status: 404 });
    }

    // Проверяем права доступа
    const canView = user.role === 'ADMIN' || 
                   user.role === 'DEPUTY' || 
                   (user.role === 'MANAGER' && task.object.managerId === user.id) ||
                   task.assignedTo.id === user.id ||
                   task.createdBy.id === user.id;

    if (!canView) {
      return NextResponse.json({ message: 'Нет доступа к задаче' }, { status: 403 });
    }

    // Получаем комментарии
    const comments = await prisma.reportingTaskComment.findMany({
      where: {
        taskId: params.id
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`✅ Найдено комментариев: ${comments.length}`);
    return NextResponse.json({ comments });

  } catch (error) {
    console.error('❌ Ошибка получения комментариев:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST - добавить комментарий к задаче
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('💬 POST /api/reporting/tasks/[id]/comments - добавление комментария к задаче:', params.id);
    
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const body = await req.json();
    const { content } = createCommentSchema.parse(body);

    // Проверяем существование задачи и права доступа
    const task = await prisma.reportingTask.findUnique({
      where: { id: params.id },
      select: {
        id: true,
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

    if (!task) {
      return NextResponse.json({ message: 'Задача не найдена' }, { status: 404 });
    }

    // Проверяем права на добавление комментариев
    const canComment = user.role === 'ADMIN' || 
                      user.role === 'DEPUTY' || 
                      (user.role === 'MANAGER' && task.object.managerId === user.id) ||
                      task.assignedTo.id === user.id ||
                      task.createdBy.id === user.id;

    if (!canComment) {
      return NextResponse.json({ message: 'Нет прав на добавление комментариев' }, { status: 403 });
    }

    // Создаем комментарий
    const comment = await prisma.reportingTaskComment.create({
      data: {
        content,
        taskId: params.id,
        authorId: user.id
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    console.log('✅ Комментарий добавлен');
    return NextResponse.json({
      comment,
      message: 'Комментарий успешно добавлен'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Ошибка валидации', errors: error.errors },
        { status: 400 }
      );
    }
    
    console.error('❌ Ошибка добавления комментария:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
