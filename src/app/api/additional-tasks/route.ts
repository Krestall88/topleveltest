import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { notifyNewTask } from '@/lib/telegram-notifications';

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
    const since = url.searchParams.get('since'); // Для polling - получить задания после определенного времени

    // Строим условия фильтрации
    const whereClause: Record<string, unknown> = {};

    // Фильтр по времени создания (для polling)
    if (since) {
      whereClause.createdAt = {
        gte: new Date(since)
      };
    }

    // Фильтр по ролям
    if (user.role === 'MANAGER') {
      // Менеджер видит только свои задания
      whereClause.assignedToId = user.userId;
    } else if (user.role === 'DEPUTY') {
      // Заместитель видит задания только своих объектов
      whereClause.object = {
        managerId: user.userId
      };
    } else if (user.role === 'DEPUTY_ADMIN') {
      // Второй админ видит задания только назначенных объектов
      const assignments = await prisma.deputyAdminAssignment.findMany({
        where: { deputyAdminId: user.userId as string },
        select: { objectId: true }
      });
      
      if (assignments.length > 0) {
        whereClause.objectId = {
          in: assignments.map(a => a.objectId)
        };
      } else {
        // Если нет назначенных объектов, не показываем ничего
        whereClause.id = 'non-existent';
      }
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

    // Только админы, заместители и вторые админы могут создавать задания вручную
    if (!['ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(user.role as string)) {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    const { title, content, objectId, source = 'ADMIN', attachments = [] } = await req.json();

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
          createdBy: user.userId as string,
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
          select: { id: true, name: true, email: true, telegramId: true }
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

    // Отправляем уведомление менеджеру в Telegram (если привязан)
    if (task.assignedTo.telegramId) {
      try {
        await notifyNewTask(task.assignedTo.telegramId, {
          title: task.title,
          objectName: task.object.name,
          description: content.substring(0, 200),
          taskId: task.id
        });
        console.log('📱 Уведомление отправлено менеджеру:', task.assignedTo.name);
      } catch (error) {
        console.error('❌ Ошибка отправки уведомления:', error);
      }
    } else {
      console.log('ℹ️ Менеджер не привязал Telegram, уведомление не отправлено');
    }

    console.log('✅ Дополнительное задание создано:', task.id);

    return NextResponse.json(task, { status: 201 });

  } catch (error) {
    console.error('Ошибка создания дополнительного задания:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE /api/additional-tasks?id=taskId - Удалить дополнительное задание
export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    // Только админы и вторые админы могут удалять задания
    if (!['ADMIN', 'DEPUTY_ADMIN'].includes(user.role as string)) {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    const url = new URL(req.url);
    const taskId = url.searchParams.get('id');

    if (!taskId) {
      return NextResponse.json({ message: 'Требуется ID задания' }, { status: 400 });
    }

    // Получаем задание для проверки прав
    const task = await prisma.additionalTask.findUnique({
      where: { id: taskId },
      include: {
        object: {
          select: { id: true, name: true }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ message: 'Задание не найдено' }, { status: 404 });
    }

    // Для DEPUTY_ADMIN проверяем доступ к объекту
    if (user.role === 'DEPUTY_ADMIN') {
      const hasAccess = await prisma.deputyAdminAssignment.findFirst({
        where: {
          deputyAdminId: user.userId as string,
          objectId: task.objectId
        }
      });

      if (!hasAccess) {
        return NextResponse.json({ message: 'Нет доступа к этому объекту' }, { status: 403 });
      }
    }

    // Удаляем задание
    await prisma.additionalTask.delete({
      where: { id: taskId }
    });

    // Логируем удаление
    await prisma.auditLog.create({
      data: {
        action: 'ADDITIONAL_TASK_DELETED',
        entity: 'ADDITIONAL_TASK',
        entityId: taskId,
        details: {
          objectName: task.object.name,
          title: task.title,
          source: task.source
        },
        userId: user.userId as string
      }
    });

    console.log('✅ Дополнительное задание удалено:', taskId);

    return NextResponse.json({ message: 'Задание успешно удалено' });

  } catch (error) {
    console.error('Ошибка удаления дополнительного задания:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
