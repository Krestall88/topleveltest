import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { 
  calculateNextTaskDate,
  getTaskStatus,
  convertToObjectTimezone,
  formatTimeInTimezone
} from '@/lib/timezone-calendar-utils';
import { addDays, startOfDay, endOfDay, subDays } from 'date-fns';

// GET /api/tasks/calendar - Получение календаря задач
export async function GET(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const managerId = searchParams.get('managerId');
    const objectId = searchParams.get('objectId');
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const view = searchParams.get('view') || 'day';

    // Проверяем права доступа
    if (user.role === 'MANAGER' && managerId && managerId !== user.id) {
      return NextResponse.json({ message: 'Нет доступа' }, { status: 403 });
    }

    // Определяем диапазон дат
    const baseDate = new Date(dateStr);
    let startDate = startOfDay(baseDate);
    let endDate = endOfDay(baseDate);

    if (view === 'week') {
      endDate = endOfDay(addDays(baseDate, 7));
    } else if (view === 'month') {
      endDate = endOfDay(addDays(baseDate, 30));
    }

    // Получаем техкарты с учетом фильтров
    const whereClause: any = {};
    
    if (managerId) {
      whereClause.object = {
        managerId: managerId
      };
    } else if (user.role === 'MANAGER') {
      whereClause.object = {
        managerId: user.id
      };
    }

    if (objectId) {
      whereClause.objectId = objectId;
    }

    const techCards = await prisma.techCard.findMany({
      where: whereClause,
      include: {
        object: {
          select: {
            id: true,
            name: true,
            workingHours: true,
            workingDays: true,
            managerId: true
          }
        },
        executions: {
          orderBy: { executedAt: 'desc' },
          take: 1
        }
      }
    });

    // Генерируем календарь задач
    const calendarTasks: CalendarTask[] = [];

    for (const techCard of techCards) {
      // Парсим периодичность
      const frequencyDays = techCard.frequencyDays || parseFrequencyDays(techCard.frequency);
      
      // Находим последнее выполнение
      const lastExecution = techCard.executions[0];
      
      // Рассчитываем следующую дату выполнения
      const scheduledFor = calculateNextDueDate(
        {
          id: techCard.id,
          name: techCard.name,
          workType: techCard.workType,
          frequency: techCard.frequency,
          frequencyDays: frequencyDays,
          preferredTime: techCard.preferredTime,
          maxDelayHours: techCard.maxDelayHours
        },
        lastExecution ? { executedAt: lastExecution.executedAt! } : undefined,
        techCard.object.workingDays as string[]
      );

      // Проверяем, попадает ли задача в запрашиваемый период
      if (scheduledFor >= startDate && scheduledFor <= endDate) {
        const dueDate = new Date(scheduledFor);
        if (techCard.maxDelayHours) {
          dueDate.setHours(dueDate.getHours() + techCard.maxDelayHours);
        } else {
          dueDate.setHours(dueDate.getHours() + 24); // По умолчанию 24 часа
        }

        const status = getTaskStatus(
          scheduledFor,
          techCard.maxDelayHours || 24,
          lastExecution?.executedAt || undefined
        );

        // Пропускаем уже выполненные задачи, если они не в сегодняшнем дне
        if (status === 'COMPLETED' && startOfDay(scheduledFor).getTime() !== startOfDay(baseDate).getTime()) {
          continue;
        }

        calendarTasks.push({
          id: `${techCard.id}-${scheduledFor.toISOString()}`,
          techCard: {
            id: techCard.id,
            name: techCard.name,
            workType: techCard.workType,
            frequency: techCard.frequency,
            description: techCard.description,
            frequencyDays: frequencyDays,
            preferredTime: techCard.preferredTime,
            maxDelayHours: techCard.maxDelayHours
          },
          object: {
            id: techCard.object.id,
            name: techCard.object.name,
            workingHours: techCard.object.workingHours as any,
            workingDays: techCard.object.workingDays as string[]
          },
          scheduledFor,
          dueDate,
          status: status as any,
          lastExecution: lastExecution ? {
            executedAt: lastExecution.executedAt!,
            status: lastExecution.status
          } : undefined
        });
      }

      // Для просроченных задач - проверяем предыдущие периоды
      if (view === 'day' || view === 'week') {
        const checkDate = subDays(scheduledFor, frequencyDays);
        if (checkDate < startDate) {
          // Проверяем, была ли выполнена задача в предыдущем периоде
          const prevExecution = await prisma.taskExecution.findFirst({
            where: {
              techCardId: techCard.id,
              scheduledFor: {
                gte: subDays(checkDate, 1),
                lte: addDays(checkDate, 1)
              }
            }
          });

          if (!prevExecution) {
            // Задача просрочена
            const dueDate = new Date(checkDate);
            dueDate.setHours(dueDate.getHours() + (techCard.maxDelayHours || 24));

            calendarTasks.push({
              id: `${techCard.id}-${checkDate.toISOString()}-overdue`,
              techCard: {
                id: techCard.id,
                name: techCard.name,
                workType: techCard.workType,
                frequency: techCard.frequency,
                description: techCard.description,
                frequencyDays: frequencyDays,
                preferredTime: techCard.preferredTime,
                maxDelayHours: techCard.maxDelayHours
              },
              object: {
                id: techCard.object.id,
                name: techCard.object.name,
                workingHours: techCard.object.workingHours as any,
                workingDays: techCard.object.workingDays as string[]
              },
              scheduledFor: checkDate,
              dueDate,
              status: 'OVERDUE',
              lastExecution: undefined
            });
          }
        }
      }
    }

    // Группируем задачи по статусам
    const overdue = calendarTasks.filter(task => task.status === 'OVERDUE');
    const today = calendarTasks.filter(task => 
      task.status === 'PENDING' && 
      startOfDay(task.scheduledFor).getTime() === startOfDay(baseDate).getTime()
    );
    const upcoming = calendarTasks.filter(task => 
      task.status === 'UPCOMING' || 
      (task.status === 'PENDING' && startOfDay(task.scheduledFor).getTime() > startOfDay(baseDate).getTime())
    );
    const completed = calendarTasks.filter(task => task.status === 'COMPLETED');

    // Группируем по периодичности для недельного/месячного вида
    const weekly = calendarTasks.filter(task => {
      const frequencyDays = task.techCard.frequencyDays || parseFrequencyDays(task.techCard.frequency);
      return frequencyDays === 7;
    });
    
    const monthly = calendarTasks.filter(task => {
      const frequencyDays = task.techCard.frequencyDays || parseFrequencyDays(task.techCard.frequency);
      return frequencyDays === 30;
    });

    return NextResponse.json({
      overdue: overdue.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime()),
      today: today.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime()),
      upcoming: upcoming.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime()),
      completed: completed.sort((a, b) => b.scheduledFor.getTime() - a.scheduledFor.getTime()),
      weekly: weekly.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime()),
      monthly: monthly.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime()),
      total: calendarTasks.length
    });

  } catch (error) {
    console.error('Ошибка получения календаря задач:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
