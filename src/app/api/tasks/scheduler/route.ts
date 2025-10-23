import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { addDays, startOfDay, format } from 'date-fns';
import { 
  detectTimezoneByAddress,
  calculateNextTaskDate,
  isWorkingDay,
  convertToObjectTimezone 
} from '@/lib/timezone-calendar-utils';

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

// POST /api/tasks/scheduler - Запуск планировщика задач
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'DEPUTY')) {
      return NextResponse.json({ message: 'Нет доступа' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      action = 'generate', 
      days = 7, 
      objectIds = [], 
      force = false 
    } = body;

    let result = { generated: 0, updated: 0, errors: [] as string[] };

    if (action === 'generate') {
      // Автогенерация задач
      result = await generateTasksForPeriod(days, objectIds, force);
    } else if (action === 'cleanup') {
      // Очистка старых задач
      result = await cleanupOldTasks(days);
    } else if (action === 'update-timezones') {
      // Обновление часовых поясов
      result = await updateObjectTimezones();
    }

    return NextResponse.json({
      message: 'Планировщик выполнен',
      result
    });

  } catch (error) {
    console.error('Ошибка планировщика:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// GET /api/tasks/scheduler - Получение статуса планировщика
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    // Статистика по объектам с автогенерацией
    const objects = await prisma.cleaningObject.findMany({
      where: {
        autoChecklistEnabled: true
      },
      select: {
        id: true,
        name: true,
        timezone: true,
        workingDays: true,
        workingHours: true,
        autoChecklistEnabled: true,
        lastChecklistDate: true,
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

    // Статистика по задачам (используем Task вместо TaskExecution)
    const taskStats = await prisma.task.groupBy({
      by: ['status'],
      _count: {
        id: true
      },
      where: {
        createdAt: {
          gte: startOfDay(new Date())
        }
      }
    });

    const stats = taskStats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      objects: objects.map(obj => ({
        id: obj.id,
        name: obj.name,
        timezone: obj.timezone,
        workingDays: obj.workingDays,
        activeTechCards: obj._count.techCards,
        autoGenerate: obj.autoChecklistEnabled,
        lastGenerated: obj.lastChecklistDate
      })),
      stats: {
        totalTasks: Object.values(stats).reduce((sum, count) => sum + count, 0),
        completedTasks: stats.COMPLETED || 0,
        pendingTasks: stats.NEW || 0,
        ...stats
      },
      schedulerStatus: {
        lastRun: new Date().toISOString(),
        nextRun: addDays(new Date(), 1).toISOString(),
        enabled: true
      }
    });

  } catch (error) {
    console.error('Ошибка получения статуса планировщика:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// Функция генерации задач на период
async function generateTasksForPeriod(days: number, objectIds: string[], force: boolean) {
  const result = { generated: 0, updated: 0, errors: [] as string[] };
  
  try {
    // Получаем объекты для генерации
    const whereClause: any = {
      autoChecklistEnabled: true
    };
    
    if (objectIds.length > 0) {
      whereClause.id = { in: objectIds };
    }

    const objects = await prisma.cleaningObject.findMany({
      where: whereClause,
      include: {
        techCards: {
          where: {
            isActive: true,
            autoGenerate: true
          }
        }
      }
    });

    for (const object of objects) {
      try {
        const timezone = object.timezone || await detectTimezoneByAddress(object.address);
        const workingDays = object.workingDays || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
        const workingHours = object.workingHours as any || { start: '09:00', end: '18:00' };

        for (const techCard of object.techCards) {
          // Определяем периодичность
          let frequencyDays = 1;
          if (techCard.frequencyDays) {
            frequencyDays = techCard.frequencyDays;
          } else if (techCard.frequency) {
            const freq = techCard.frequency.toLowerCase();
            if (freq.includes('еженедельно') || freq.includes('неделю')) {
              frequencyDays = 7;
            } else if (freq.includes('ежемесячно') || freq.includes('месяц')) {
              frequencyDays = 30;
            }
          }

          // Генерируем задачи на указанный период
          for (let i = 0; i < days; i++) {
            const taskDate = addDays(new Date(), i);
            
            // Проверяем, нужно ли создавать задачу в этот день
            if (i % frequencyDays === 0 && isWorkingDay(taskDate, workingDays)) {
              
              // Проверяем, не существует ли уже задача на этот день
              const existingTask = await prisma.task.findFirst({
                where: {
                  description: techCard.name,
                  objectName: object.name,
                  createdAt: {
                    gte: startOfDay(taskDate),
                    lte: addDays(startOfDay(taskDate), 1)
                  }
                }
              });

              if (!existingTask || force) {
                // Создаем задачу
                await prisma.task.create({
                  data: {
                    description: techCard.name,
                    status: 'NEW',
                    objectName: object.name,
                    roomName: techCard.room?.name || 'Общее',
                    scheduledStart: taskDate,
                    scheduledEnd: addDays(taskDate, 0)
                  }
                });
                
                result.generated++;
              }
            }
          }
        }

        // Обновляем дату последней генерации
        await prisma.cleaningObject.update({
          where: { id: object.id },
          data: { lastChecklistDate: new Date() }
        });
        
        result.updated++;

      } catch (error) {
        result.errors.push(`Объект ${object.name}: ${error}`);
      }
    }

  } catch (error) {
    result.errors.push(`Общая ошибка: ${error}`);
  }

  return result;
}

// Функция очистки старых задач
async function cleanupOldTasks(daysOld: number) {
  const result = { generated: 0, updated: 0, errors: [] as string[] };
  
  try {
    const cutoffDate = addDays(new Date(), -daysOld);
    
    const deletedTasks = await prisma.task.deleteMany({
      where: {
        status: 'NEW',
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    result.updated = deletedTasks.count;

  } catch (error) {
    result.errors.push(`Ошибка очистки: ${error}`);
  }

  return result;
}

// Функция обновления часовых поясов
async function updateObjectTimezones() {
  const result = { generated: 0, updated: 0, errors: [] as string[] };
  
  try {
    const objects = await prisma.cleaningObject.findMany({
      where: {
        timezone: null
      }
    });

    for (const object of objects) {
      try {
        const timezone = await detectTimezoneByAddress(object.address);
        
        await prisma.cleaningObject.update({
          where: { id: object.id },
          data: { timezone }
        });
        
        result.updated++;

      } catch (error) {
        result.errors.push(`Объект ${object.name}: ${error}`);
      }
    }

  } catch (error) {
    result.errors.push(`Ошибка обновления часовых поясов: ${error}`);
  }

  return result;
}
