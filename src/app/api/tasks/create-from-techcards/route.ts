import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

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

// POST /api/tasks/create-from-techcards - Создание реальных задач из техкарт
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    // Проверяем права администратора
    if (!['ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ 
        message: 'Недостаточно прав' 
      }, { status: 403 });
    }

    const { date } = await req.json();
    const targetDate = date ? new Date(date) : new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    console.log('🔍 Создаем задачи из техкарт для даты:', dateStr);

    // Получаем все техкарты
    const techCards = await prisma.techCard.findMany({
      include: {
        object: {
          include: {
            manager: {
              select: { id: true, name: true, phone: true }
            }
          }
        },
        room: {
          include: {
            roomGroup: {
              include: {
                zone: {
                  include: {
                    site: true
                  }
                }
              }
            }
          }
        },
        cleaningObjectItem: true
      }
    });

    console.log(`📋 Найдено техкарт: ${techCards.length}`);

    let createdTasks = 0;
    const errors = [];

    // Создаем задачи для каждой техкарты
    for (const techCard of techCards) {
      try {
        const taskId = `${techCard.id}-${dateStr}`;
        
        // Проверяем, не существует ли уже такая задача
        const existingTask = await prisma.task.findUnique({
          where: { id: taskId }
        });

        if (existingTask) {
          continue; // Пропускаем, если задача уже существует
        }

        // Создаем задачу
        await prisma.task.create({
          data: {
            id: taskId,
            description: techCard.description || techCard.name,
            status: 'NEW',
            objectName: techCard.object?.name || 'Неизвестный объект',
            roomName: techCard.room?.name || 'Неизвестное помещение',
            scheduledStart: targetDate,
            scheduledEnd: new Date(targetDate.getTime() + 8 * 60 * 60 * 1000), // +8 часов
            roomId: techCard.roomId,
            // Создаем связь с виртуальным чек-листом
            checklist: {
              create: {
                id: `checklist-${techCard.objectId}-${dateStr}`,
                date: targetDate,
                status: 'IN_PROGRESS',
                objectId: techCard.objectId,
                creatorId: techCard.object?.managerId || user.id,
                notes: `Автоматически созданный чек-лист для ${techCard.object?.name}`
              }
            }
          }
        });

        createdTasks++;
      } catch (error) {
        console.error(`Ошибка создания задачи для техкарты ${techCard.id}:`, error);
        errors.push(`Техкарта ${techCard.name}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      }
    }

    console.log(`✅ Создано задач: ${createdTasks}`);
    if (errors.length > 0) {
      console.log(`❌ Ошибок: ${errors.length}`);
    }

    return NextResponse.json({
      success: true,
      message: `Создано ${createdTasks} задач из ${techCards.length} техкарт`,
      createdTasks,
      totalTechCards: techCards.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Ошибка создания задач:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка сервера' 
    }, { status: 500 });
  }
}
