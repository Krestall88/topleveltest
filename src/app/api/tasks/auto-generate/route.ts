import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { addDays, startOfDay, endOfDay, parseISO, format } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

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

// Функция для расчета следующей даты выполнения
function calculateNextDueDate(
  techCard: any,
  lastExecution: any,
  objectTimezone: string,
  workingDays: string[]
): Date {
  const now = new Date();
  const objectNow = toZonedTime(now, objectTimezone);
  
  let nextDate: Date;
  
  if (lastExecution) {
    // Если есть последнее выполнение, добавляем периодичность
    const lastExecutionDate = toZonedTime(lastExecution.executedAt, objectTimezone);
    nextDate = addDays(lastExecutionDate, techCard.frequencyDays || 1);
  } else {
    // Если нет выполнений, начинаем с сегодня
    nextDate = objectNow;
  }
  
  // Проверяем рабочие дни
  while (workingDays.length > 0 && !workingDays.includes(format(nextDate, 'EEEE').toUpperCase())) {
    nextDate = addDays(nextDate, 1);
  }
  
  // Устанавливаем предпочтительное время
  if (techCard.preferredTime) {
    const [hours, minutes] = techCard.preferredTime.split(':').map(Number);
    nextDate.setHours(hours, minutes, 0, 0);
  }
  
  // Конвертируем обратно в UTC
  return fromZonedTime(nextDate, objectTimezone);
}

// POST /api/tasks/auto-generate - Автоматическая генерация задач
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'DEPUTY')) {
      return NextResponse.json({ message: 'Нет доступа' }, { status: 403 });
    }

    const body = await req.json();
    const { objectId, days = 7 } = body; // Генерируем задачи на N дней вперед

    // Получаем объекты для генерации
    const whereClause: any = {};
    if (objectId) {
      whereClause.id = objectId;
    }

    const objects = await prisma.cleaningObject.findMany({
      where: {
        ...whereClause,
        autoChecklistEnabled: true // Только для объектов с включенной автогенерацией
      },
      include: {
        techCards: {
          where: {
            isActive: true,
            autoGenerate: true
          }
        }
      }
    });

    let generatedCount = 0;
    const errors: string[] = [];

    for (const object of objects) {
      try {
        const timezone = object.timezone || 'Europe/Moscow';
        const workingDays = object.workingDays || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
        
        for (const techCard of object.techCards) {
          // Находим последнее выполнение
          const lastExecution = await prisma.taskExecution.findFirst({
            where: {
              techCardId: techCard.id
            },
            orderBy: {
              executedAt: 'desc'
            }
          });

          // Рассчитываем следующую дату выполнения
          const nextDueDate = calculateNextDueDate(
            techCard,
            lastExecution,
            timezone,
            workingDays
          );

          // Проверяем, не создана ли уже задача на эту дату
          const existingTask = await prisma.taskExecution.findFirst({
            where: {
              techCardId: techCard.id,
              scheduledFor: {
                gte: startOfDay(nextDueDate),
                lte: endOfDay(nextDueDate)
              }
            }
          });

          if (!existingTask && nextDueDate <= addDays(new Date(), days)) {
            // Создаем новую задачу
            await prisma.taskExecution.create({
              data: {
                techCardId: techCard.id,
                objectId: object.id,
                scheduledFor: nextDueDate,
                dueDate: addDays(nextDueDate, 0), // Можно настроить задержку
                status: 'PENDING'
              }
            });

            generatedCount++;
          }
        }
      } catch (error) {
        console.error(`Ошибка генерации задач для объекта ${object.name}:`, error);
        errors.push(`Объект ${object.name}: ${error}`);
      }
    }

    return NextResponse.json({
      message: 'Генерация задач завершена',
      generated: generatedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Ошибка автогенерации задач:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// GET /api/tasks/auto-generate - Получение статистики автогенерации
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    // Статистика по объектам
    const objects = await prisma.cleaningObject.findMany({
      where: {
        autoChecklistEnabled: true
      },
      include: {
        techCards: {
          where: {
            isActive: true,
            autoGenerate: true
          }
        },
        _count: {
          select: {
            techCards: {
              where: {
                isActive: true,
                autoGenerate: true
              }
            }
          }
        }
      }
    });

    // Статистика по задачам
    const totalTasks = await prisma.taskExecution.count();
    const pendingTasks = await prisma.taskExecution.count({
      where: { status: 'PENDING' }
    });
    const completedTasks = await prisma.taskExecution.count({
      where: { status: 'COMPLETED' }
    });
    const overdueTasks = await prisma.taskExecution.count({
      where: {
        status: 'PENDING',
        dueDate: {
          lt: new Date()
        }
      }
    });

    return NextResponse.json({
      objects: objects.map(obj => ({
        id: obj.id,
        name: obj.name,
        timezone: obj.timezone,
        workingDays: obj.workingDays,
        activeTechCards: obj._count.techCards,
        autoGenerate: obj.autoChecklistEnabled
      })),
      stats: {
        totalTasks,
        pendingTasks,
        completedTasks,
        overdueTasks
      }
    });

  } catch (error) {
    console.error('Ошибка получения статистики автогенерации:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
