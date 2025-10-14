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

// GET /api/additional-tasks - Получить список дополнительных заданий
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const objectId = url.searchParams.get('objectId');
    const myTasks = url.searchParams.get('myTasks') === 'true';

    // Строим условия фильтрации
    let whereClause: any = {};

    // Фильтр по ролям
    if (user.role === 'MANAGER') {
      // Менеджер видит только свои задания
      whereClause.assignedToId = user.userId;
    } else if (user.role === 'DEPUTY') {
      // Заместитель видит задания только своих объектов
      whereClause.object = {
        managerId: user.userId
      };
    }
    // ADMIN видит все

    // Дополнительные фильтры
    if (status) {
      whereClause.status = status;
    }

    if (objectId) {
      whereClause.objectId = objectId;
    }

    if (myTasks && user.role !== 'MANAGER') {
      whereClause.assignedToId = user.userId;
    }

    const tasks = await prisma.additionalTask.findMany({
      where: whereClause,
      include: {
        object: {
          select: { id: true, name: true, address: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        completedBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: [
        { status: 'asc' }, // NEW первые
        { receivedAt: 'desc' }
      ]
    });

    return NextResponse.json(tasks);

  } catch (error) {
    console.error('Ошибка получения дополнительных заданий:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/additional-tasks - Создать дополнительное задание (ручное создание)
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    // Только админы и заместители могут создавать задания вручную
    if (!['ADMIN', 'DEPUTY'].includes(user.role as string)) {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    const { title, content, objectId, source = 'MANUAL', attachments = [] } = await req.json();

    if (!title || !content || !objectId) {
      return NextResponse.json({ 
        message: 'Обязательные поля: title, content, objectId' 
      }, { status: 400 });
    }

    // Проверяем существование объекта и получаем менеджера
    const object = await prisma.cleaningObject.findUnique({
      where: { id: objectId },
      include: { manager: true }
    });

    if (!object) {
      return NextResponse.json({ message: 'Объект не найден' }, { status: 404 });
    }

    if (!object.managerId) {
      return NextResponse.json({ 
        message: 'У объекта не назначен менеджер' 
      }, { status: 400 });
    }

    // Создаем задание
    const task = await prisma.additionalTask.create({
      data: {
        title: title.substring(0, 100), // Ограничиваем длину
        content,
        source,
        sourceDetails: {
          createdBy: user.userId,
          createdManually: true
        },
        attachments,
        objectId,
        assignedToId: object.managerId,
        receivedAt: new Date()
      },
      include: {
        object: {
          select: { id: true, name: true, address: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Логируем создание
    await prisma.auditLog.create({
      data: {
        action: 'ADDITIONAL_TASK_CREATED',
        entity: 'ADDITIONAL_TASK',
        entityId: task.id,
        details: {
          objectName: object.name,
          assignedTo: object.manager?.name,
          source,
          createdManually: true
        },
        userId: user.userId as string
      }
    });

    console.log('✅ Дополнительное задание создано:', task.id);

    return NextResponse.json(task, { status: 201 });

  } catch (error) {
    console.error('Ошибка создания дополнительного задания:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
