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

// POST /api/checklists/test-create - Создать тестовый чек-лист
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { 
      objectId, 
      roomId, 
      date, 
      scheduledStart, 
      scheduledEnd, 
      timezone, 
      testMode, 
      overdueTesting 
    } = await req.json();

    console.log('🧪 Создание тестового чек-листа:', {
      objectId,
      roomId,
      date,
      scheduledStart,
      scheduledEnd,
      timezone,
      testMode,
      overdueTesting,
      userId: user.userId
    });

    // Проверяем существование объекта
    const object = await prisma.cleaningObject.findUnique({
      where: { id: objectId },
      include: {
        rooms: true,
        manager: { select: { name: true, email: true } }
      }
    });

    if (!object) {
      return NextResponse.json({ message: 'Объект не найден' }, { status: 404 });
    }

    // Создаем чек-лист в транзакции
    const newChecklist = await prisma.$transaction(async (tx) => {
      // Создаем чек-лист
      const checklist = await tx.checklist.create({
        data: {
          date: new Date(date),
          objectId,
          roomId: roomId || null,
          creatorId: user.userId as string,
        }
      });

      // Определяем условие для поиска техкарт
      const whereClause = roomId 
        ? { roomId: roomId }
        : { objectId: objectId };

      // Получаем техкарты
      const techCards = await tx.techCard.findMany({
        where: whereClause,
        include: {
          room: { select: { name: true } }
        }
      });

      console.log('📝 Найдено техкарт для тестового чек-листа:', techCards.length);

      if (techCards.length === 0) {
        throw new Error('Невозможно создать тестовый чек-лист: не найдено техкарт для данного объекта/помещения. Сначала создайте техкарты.');
      }

      let taskCount = 0;

      // Создаем задачи на основе техкарт
      for (const techCard of techCards) {
        const descriptions = (techCard.description || '')
          .split('\n')
          .filter(line => line.trim())
          .map(line => line.trim());

        for (const description of descriptions) {
          if (description) {
            // Определяем статус задачи в зависимости от режима тестирования
            let taskStatus = 'NEW';
            let taskScheduledStart = new Date(scheduledStart);
            let taskScheduledEnd = new Date(scheduledEnd);

            if (overdueTesting) {
              // Для тестирования просрочек создаем задачи в прошлом
              taskStatus = 'OVERDUE';
              taskScheduledStart = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 часа назад
              taskScheduledEnd = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 час назад
            } else if (testMode) {
              // В тестовом режиме делаем задачи доступными
              taskStatus = 'AVAILABLE';
            }

            await tx.task.create({
              data: {
                description: `${techCard.name}: ${description}`,
                checklistId: checklist.id,
                roomId: techCard.roomId,
                status: taskStatus as any,
              }
            });
            
            taskCount++;
          }
        }
      }

      return { ...checklist, tasksCount: taskCount };
    });

    // Логируем создание тестового чек-листа
    await prisma.auditLog.create({
      data: {
        action: 'TEST_CHECKLIST_CREATED',
        entity: 'CHECKLIST',
        entityId: newChecklist.id,
        details: {
          objectName: object.name,
          roomId: roomId || null,
          date: date,
          scheduledStart,
          scheduledEnd,
          timezone,
          testMode,
          overdueTesting,
          tasksCount: newChecklist.tasksCount,
          createdBy: user.userId as string
        },
        userId: user.userId as string
      }
    });

    console.log('✅ Тестовый чек-лист создан:', {
      id: newChecklist.id,
      tasksCount: newChecklist.tasksCount,
      overdueTesting
    });

    return NextResponse.json({
      id: newChecklist.id,
      tasksCount: newChecklist.tasksCount,
      message: `Тестовый чек-лист создан с ${newChecklist.tasksCount} задачами${overdueTesting ? ' (режим просрочек)' : ''}`
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Ошибка создания тестового чек-листа:', error);
    return NextResponse.json({ 
      message: error instanceof Error ? error.message : 'Не удалось создать тестовый чек-лист' 
    }, { status: 500 });
  }
}
