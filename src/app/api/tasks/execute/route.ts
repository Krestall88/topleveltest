import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';

// Схема валидации для выполнения задачи
const executeTaskSchema = z.object({
  techCardId: z.string().min(1, 'ID техкарты обязателен'),
  objectId: z.string().min(1, 'ID объекта обязателен'),
  scheduledFor: z.string().datetime('Неверный формат даты'),
  status: z.enum(['COMPLETED', 'SKIPPED'], {
    errorMap: () => ({ message: 'Статус должен быть COMPLETED или SKIPPED' })
  }),
  comment: z.string().optional(),
  photos: z.array(z.string().url('Неверный URL фотографии')).optional()
});

// POST /api/tasks/execute - Выполнение задачи
export async function POST(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = executeTaskSchema.parse(body);

    const { techCardId, objectId, scheduledFor, status, comment, photos } = validatedData;

    // Проверяем права доступа к объекту
    const object = await prisma.cleaningObject.findUnique({
      where: { id: objectId },
      select: { 
        id: true, 
        name: true, 
        managerId: true 
      }
    });

    if (!object) {
      return NextResponse.json({ message: 'Объект не найден' }, { status: 404 });
    }

    // Проверяем права доступа
    if (user.role === 'MANAGER' && object.managerId !== user.id) {
      return NextResponse.json({ message: 'Нет доступа к этому объекту' }, { status: 403 });
    }

    // Проверяем существование техкарты
    const techCard = await prisma.techCard.findUnique({
      where: { id: techCardId },
      select: { 
        id: true, 
        name: true, 
        objectId: true,
        maxDelayHours: true 
      }
    });

    if (!techCard) {
      return NextResponse.json({ message: 'Техкарта не найдена' }, { status: 404 });
    }

    if (techCard.objectId !== objectId) {
      return NextResponse.json({ message: 'Техкарта не принадлежит указанному объекту' }, { status: 400 });
    }

    // Проверяем, не выполнена ли уже эта задача
    const existingExecution = await prisma.taskExecution.findFirst({
      where: {
        techCardId,
        scheduledFor: new Date(scheduledFor),
        status: { in: ['COMPLETED', 'SKIPPED'] }
      }
    });

    if (existingExecution) {
      return NextResponse.json({ message: 'Задача уже выполнена' }, { status: 400 });
    }

    // Валидация для пропущенных задач
    if (status === 'SKIPPED' && !comment) {
      return NextResponse.json({ 
        message: 'Комментарий обязателен при пропуске задачи' 
      }, { status: 400 });
    }

    // Рассчитываем крайний срок выполнения
    const scheduledDate = new Date(scheduledFor);
    const dueDate = new Date(scheduledDate);
    dueDate.setHours(dueDate.getHours() + (techCard.maxDelayHours || 24));

    // Создаем запись о выполнении
    const taskExecution = await prisma.taskExecution.create({
      data: {
        techCardId,
        objectId,
        managerId: user.id,
        scheduledFor: scheduledDate,
        dueDate,
        executedAt: new Date(),
        status,
        comment,
        photos: photos || []
      },
      include: {
        techCard: {
          select: { name: true, workType: true }
        },
        object: {
          select: { name: true }
        },
        manager: {
          select: { name: true }
        }
      }
    });

    // Логируем действие в аудит
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: status === 'COMPLETED' ? 'COMPLETE_TASK' : 'SKIP_TASK',
        entity: 'TASK_EXECUTION',
        entityId: taskExecution.id,
        details: `${status === 'COMPLETED' ? 'Выполнена' : 'Пропущена'} задача: ${techCard.name} для объекта ${object.name}${comment ? `. Комментарий: ${comment}` : ''}`
      }
    });

    return NextResponse.json({
      success: true,
      execution: taskExecution,
      message: status === 'COMPLETED' ? 'Задача выполнена' : 'Задача пропущена'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        message: 'Ошибка валидации',
        errors: error.errors
      }, { status: 400 });
    }

    console.error('Ошибка выполнения задачи:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// GET /api/tasks/execute - Получение истории выполнения задач
export async function GET(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const managerId = searchParams.get('managerId');
    const objectId = searchParams.get('objectId');
    const techCardId = searchParams.get('techCardId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Строим условия фильтрации
    const whereClause: any = {};

    if (user.role === 'MANAGER') {
      whereClause.managerId = user.id;
    } else if (managerId) {
      whereClause.managerId = managerId;
    }

    if (objectId) {
      whereClause.objectId = objectId;
    }

    if (techCardId) {
      whereClause.techCardId = techCardId;
    }

    if (status) {
      whereClause.status = status;
    }

    // Получаем историю выполнения
    const executions = await prisma.taskExecution.findMany({
      where: whereClause,
      include: {
        techCard: {
          select: { 
            name: true, 
            workType: true, 
            frequency: true,
            description: true 
          }
        },
        object: {
          select: { name: true }
        },
        manager: {
          select: { name: true }
        }
      },
      orderBy: { executedAt: 'desc' },
      take: limit,
      skip: offset
    });

    // Получаем общее количество для пагинации
    const total = await prisma.taskExecution.count({
      where: whereClause
    });

    return NextResponse.json({
      executions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Ошибка получения истории выполнения:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
