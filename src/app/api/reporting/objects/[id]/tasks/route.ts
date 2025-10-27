import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('🔍 GET /api/reporting/objects/[id]/tasks - начало');
    
    const user = await getUserFromToken(req);
    console.log('👤 Пользователь:', user ? `${user.name} (${user.role})` : 'не авторизован');
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const objectId = params.id;
    console.log('🏢 ID объекта:', objectId);

    // Проверяем существование объекта и права доступа
    const object = await prisma.cleaningObject.findUnique({
      where: { id: objectId },
      select: { id: true, managerId: true }
    });

    if (!object) {
      return NextResponse.json({ message: 'Объект не найден' }, { status: 404 });
    }

    // Проверяем что объект исключен из автоматических задач
    let isExcluded = false;
    try {
      const excludedCheck = await prisma.$queryRaw<{objectId: string}[]>`
        SELECT "objectId" FROM "ExcludedObject" WHERE "objectId" = ${objectId}
      `;
      isExcluded = excludedCheck.length > 0;
    } catch (error) {
      console.log('⚠️ Таблица ExcludedObject недоступна');
    }

    if (!isExcluded) {
      return NextResponse.json({ message: 'Объект не настроен для отчетности' }, { status: 400 });
    }

    // Проверяем права доступа для менеджеров
    if (user.role === 'MANAGER' && object.managerId !== user.id) {
      return NextResponse.json({ message: 'Нет доступа' }, { status: 403 });
    }

    // Получаем реальные задачи отчетности
    console.log('🔍 Загружаем задачи отчетности...');
    const tasks = await prisma.reportingTask.findMany({
      where: {
        objectId: objectId
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        createdAt: true,
        dueDate: true,
        completedAt: true,
        createdBy: {
          select: {
            name: true
          }
        },
        assignedTo: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('📋 Найдено задач:', tasks.length);

    return NextResponse.json({
      tasks
    });

  } catch (error) {
    console.error('Ошибка получения задач объекта:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    // Только админы и заместители могут создавать задачи
    if (user.role !== 'ADMIN' && user.role !== 'DEPUTY') {
      return NextResponse.json({ message: 'Нет доступа' }, { status: 403 });
    }

    const objectId = params.id;
    const { title, description, assignedToId, priority = 'MEDIUM', dueDate } = await req.json();

    if (!title || !assignedToId) {
      return NextResponse.json({ message: 'Не указаны обязательные поля' }, { status: 400 });
    }

    // Проверяем существование объекта
    const object = await prisma.cleaningObject.findUnique({
      where: { id: objectId },
      select: { id: true }
    });

    if (!object) {
      return NextResponse.json({ message: 'Объект не найден' }, { status: 404 });
    }

    // Проверяем что объект исключен из автоматических задач
    let isExcluded = false;
    try {
      const excludedCheck = await prisma.$queryRaw<{objectId: string}[]>`
        SELECT "objectId" FROM "ExcludedObject" WHERE "objectId" = ${objectId}
      `;
      isExcluded = excludedCheck.length > 0;
    } catch (error) {
      console.log('⚠️ Таблица ExcludedObject недоступна');
    }

    if (!isExcluded) {
      return NextResponse.json({ message: 'Объект не настроен для отчетности' }, { status: 400 });
    }

    // Проверяем существование исполнителя
    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedToId },
      select: { id: true }
    });

    if (!assignedUser) {
      return NextResponse.json({ message: 'Исполнитель не найден' }, { status: 404 });
    }

    // Создаем реальную задачу в базе данных
    const task = await prisma.reportingTask.create({
      data: {
        title,
        description: description || '',
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        objectId,
        createdById: user.id,
        assignedToId
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        createdAt: true,
        dueDate: true,
        createdBy: {
          select: {
            name: true
          }
        },
        assignedTo: {
          select: {
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      task,
      message: 'Задача создана успешно'
    });

  } catch (error) {
    console.error('Ошибка создания задачи:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
