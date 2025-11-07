import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

// Функция для автоматического создания задач из техкарты
async function createTasksFromTechCard(techCard: any) {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  
  // Создаем уникальный ID задачи
  const taskId = `${techCard.id}-${dateStr}`;
  
  // Проверяем, не существует ли уже такая задача
  const existingTask = await prisma.task.findUnique({
    where: { id: taskId }
  });

  if (existingTask) {
    console.log(`⏭️ Задача ${taskId} уже существует`);
    return;
  }

  // Создаем или получаем чек-лист для объекта
  const checklistId = `checklist-${techCard.objectId}-${dateStr}`;
  let checklist = await prisma.checklist.findUnique({
    where: { id: checklistId }
  });

  if (!checklist) {
    checklist = await prisma.checklist.create({
      data: {
        id: checklistId,
        date: today,
        objectId: techCard.objectId,
        creatorId: techCard.object?.managerId || 'admin',
        name: `Чек-лист для ${techCard.object?.name || 'объекта'}`
      }
    });
    console.log(`✅ Создан чек-лист: ${checklistId}`);
  }

  // Определяем статус задачи
  const currentHour = today.getHours();
  let taskStatus: 'NEW' | 'AVAILABLE' = 'NEW';
  if (currentHour >= 8 && currentHour < 20) {
    taskStatus = 'AVAILABLE';
  }

  // Создаем задачу
  const task = await prisma.task.create({
    data: {
      id: taskId,
      description: techCard.description || techCard.name,
      status: taskStatus,
      objectName: techCard.object?.name || 'Неизвестный объект',
      roomName: techCard.room?.name || 'Неизвестное помещение',
      scheduledStart: today,
      scheduledEnd: new Date(today.getTime() + 8 * 60 * 60 * 1000), // +8 часов
      checklistId: checklist.id,
      roomId: techCard.roomId
    }
  });

  console.log(`🚀 Автоматически создана задача: ${taskId} для техкарты "${techCard.name}"`);
  return task;
}

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

// GET /api/techcards - Получить техкарты (с фильтрацией по помещению)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const objectId = searchParams.get('objectId');

    const whereClause: any = {};
    if (roomId) whereClause.roomId = roomId;
    if (objectId) whereClause.objectId = objectId;

    const techCards = await prisma.techCard.findMany({
      where: whereClause,
      include: {
        room: { select: { name: true } },
        object: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(techCards);
  } catch (error) {
    console.error('Ошибка получения техкарт:', error);
    return NextResponse.json(
      { message: 'Ошибка получения техкарт' },
      { status: 500 }
    );
  }
}

// POST /api/techcards - Создать новую техкарту
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const body = await req.json();
    console.log('📥 Получены данные для создания техкарты:', body);
    const { name, workType, frequency, description, roomId, objectId } = body;

    if (!name || !workType || !frequency || !objectId) {
      return NextResponse.json(
        { message: 'Название, тип работ, частота и объект обязательны' },
        { status: 400 }
      );
    }

    const techCard = await prisma.techCard.create({
      data: {
        name,
        workType,
        frequency,
        ...(description && { description }),
        objectId,
        ...(roomId && { roomId }),
      },
      include: {
        room: { 
          select: { 
            name: true,
            roomGroup: {
              select: {
                name: true,
                zone: {
                  select: {
                    name: true,
                    site: {
                      select: { name: true }
                    }
                  }
                }
              }
            }
          }
        },
        object: { 
          select: { 
            name: true,
            managerId: true,
            manager: {
              select: { name: true }
            }
          }
        }
      }
    });

    console.log('✅ Создана техкарта:', techCard.name);

    // 🚀 АВТОМАТИЧЕСКИ СОЗДАЕМ ЗАДАЧИ ИЗ НОВОЙ ТЕХКАРТЫ
    try {
      await createTasksFromTechCard(techCard);
    } catch (error) {
      console.error('⚠️ Ошибка создания задач из техкарты:', error);
      // Не прерываем выполнение, техкарта уже создана
    }

    return NextResponse.json(techCard, { status: 201 });
  } catch (error: any) {
    console.error('❌ Ошибка создания техкарты:', error);
    console.error('❌ Детали ошибки:', error.message);
    console.error('❌ Stack trace:', error.stack);
    return NextResponse.json(
      { 
        message: 'Не удалось создать техкарту',
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
