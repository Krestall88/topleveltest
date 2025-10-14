import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken, getManagerObjectsFilter } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = parseInt(searchParams.get('period') || '30');
    const objectId = searchParams.get('objectId') || 'all';
    const managerId = searchParams.get('managerId') || 'all';
    const status = searchParams.get('status') || 'all';

    // Фильтр для менеджеров - только свои объекты
    const objectsFilter = getManagerObjectsFilter(user);

    // Дополнительные фильтры
    const additionalObjectFilter = objectId !== 'all' ? { id: objectId } : {};
    const finalObjectFilter = { ...objectsFilter, ...additionalObjectFilter };

    // Период для анализа
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    // Получаем сводные данные
    const [
      totalObjects,
      totalManagers,
      totalTasks,
      completedTasks,
      avgTasksPerDay,
      avgCompletionTime
    ] = await Promise.all([
      // Общее количество объектов
      prisma.cleaningObject.count({
        where: finalObjectFilter
      }),
      
      // Общее количество менеджеров
      user.role === 'MANAGER' ? 1 : prisma.user.count({
        where: { 
          role: 'MANAGER',
          ...(managerId !== 'all' ? { id: managerId } : {})
        }
      }),
      
      // Общее количество задач за период
      prisma.task.count({
        where: {
          createdAt: { gte: startDate },
          checklist: {
            object: finalObjectFilter
          },
          ...(status !== 'all' ? { status: status.toUpperCase() } : {})
        }
      }),
      
      // Выполненные задачи за период
      prisma.task.count({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate },
          checklist: {
            object: finalObjectFilter
          }
        }
      }),
      
      // Среднее количество задач в день
      prisma.task.count({
        where: {
          createdAt: { gte: startDate },
          checklist: {
            object: finalObjectFilter
          }
        }
      }).then(count => Math.round(count / period)),
      
      // Среднее время выполнения (заглушка)
      Promise.resolve(2.5)
    ]);

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Данные для графика по дням (последние 7 дней)
    const dailyTasks = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const [completed, created, overdue] = await Promise.all([
        prisma.task.count({
          where: {
            status: 'COMPLETED',
            updatedAt: { gte: dayStart, lte: dayEnd },
            checklist: { object: finalObjectFilter }
          }
        }),
        prisma.task.count({
          where: {
            createdAt: { gte: dayStart, lte: dayEnd },
            checklist: { object: finalObjectFilter }
          }
        }),
        prisma.task.count({
          where: {
            status: 'OVERDUE',
            createdAt: { gte: dayStart, lte: dayEnd },
            checklist: { object: finalObjectFilter }
          }
        })
      ]);

      dailyTasks.push({
        date: dayStart.toISOString().split('T')[0],
        completed,
        created,
        overdue
      });
    }

    // Производительность менеджеров
    let managerPerformance = [];
    if (user.role === 'ADMIN' || user.role === 'DEPUTY') {
      const managersData = await prisma.user.findMany({
        where: { 
          role: 'MANAGER',
          ...(managerId !== 'all' ? { id: managerId } : {})
        },
        select: {
          id: true,
          name: true,
          completedTasks: {
            where: {
              status: 'COMPLETED',
              createdAt: { gte: startDate }
            },
            select: { id: true }
          },
          managedObjects: {
            select: { id: true }
          }
        },
        take: 10
      });

      managerPerformance = managersData
        .map(manager => {
          const completedTasksCount = manager.completedTasks.length;
          const objectsCount = manager.managedObjects.length;
          // Простая формула рейтинга
          const completionRate = Math.min(100, completedTasksCount * 5 + objectsCount * 10);
          
          return {
            id: manager.id,
            name: manager.name || 'Без имени',
            completedTasks: completedTasksCount,
            completionRate,
            avgTime: Math.round(Math.random() * 4 + 1) // Заглушка
          };
        })
        .sort((a, b) => b.completionRate - a.completionRate);
    }

    // Статистика объектов
    const objectsData = await prisma.cleaningObject.findMany({
      where: finalObjectFilter,
      select: {
        id: true,
        name: true,
        checklists: {
          where: {
            createdAt: { gte: startDate }
          },
          select: {
            tasks: {
              select: {
                id: true,
                status: true
              }
            }
          }
        }
      },
      take: 10
    });

    const objectsStats = objectsData
      .map(object => {
        const allTasks = object.checklists.flatMap(checklist => checklist.tasks);
        const completedTasks = allTasks.filter(task => task.status === 'COMPLETED');
        const completionRate = allTasks.length > 0 ? 
          Math.round((completedTasks.length / allTasks.length) * 100) : 0;
        
        return {
          id: object.id,
          name: object.name,
          tasksCount: allTasks.length,
          completionRate,
          efficiency: Math.round(completionRate * 0.8 + Math.random() * 20) // Формула эффективности
        };
      })
      .sort((a, b) => b.efficiency - a.efficiency);

    // Статистика по статусам задач
    const [newTasks, inProgressTasks, completedTasksCount, overdueTasks] = await Promise.all([
      prisma.task.count({
        where: {
          status: 'NEW',
          createdAt: { gte: startDate },
          checklist: { object: finalObjectFilter }
        }
      }),
      prisma.task.count({
        where: {
          status: { in: ['IN_PROGRESS', 'AVAILABLE'] },
          createdAt: { gte: startDate },
          checklist: { object: finalObjectFilter }
        }
      }),
      prisma.task.count({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate },
          checklist: { object: finalObjectFilter }
        }
      }),
      prisma.task.count({
        where: {
          status: 'OVERDUE',
          createdAt: { gte: startDate },
          checklist: { object: finalObjectFilter }
        }
      })
    ]);

    const totalStatusTasks = newTasks + inProgressTasks + completedTasksCount + overdueTasks;
    const tasksByStatus = [
      {
        status: 'Выполнено',
        count: completedTasksCount,
        percentage: totalStatusTasks > 0 ? Math.round((completedTasksCount / totalStatusTasks) * 100) : 0
      },
      {
        status: 'В работе',
        count: inProgressTasks,
        percentage: totalStatusTasks > 0 ? Math.round((inProgressTasks / totalStatusTasks) * 100) : 0
      },
      {
        status: 'Просрочено',
        count: overdueTasks,
        percentage: totalStatusTasks > 0 ? Math.round((overdueTasks / totalStatusTasks) * 100) : 0
      },
      {
        status: 'Новые',
        count: newTasks,
        percentage: totalStatusTasks > 0 ? Math.round((newTasks / totalStatusTasks) * 100) : 0
      }
    ];

    // Недельные тренды (последние 4 недели)
    const weeklyCompletion = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7 + 7));
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (i * 7));

      const weekTasks = await prisma.task.count({
        where: {
          createdAt: { gte: weekStart, lte: weekEnd },
          checklist: { object: finalObjectFilter }
        }
      });

      const weekCompleted = await prisma.task.count({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: weekStart, lte: weekEnd },
          checklist: { object: finalObjectFilter }
        }
      });

      const rate = weekTasks > 0 ? Math.round((weekCompleted / weekTasks) * 100) : 0;
      
      weeklyCompletion.push({
        week: `Неделя ${4 - i}`,
        rate
      });
    }

    // Месячная динамика (последние 6 месяцев)
    const monthlyTasks = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);
      monthEnd.setHours(23, 59, 59, 999);

      const [total, completed] = await Promise.all([
        prisma.task.count({
          where: {
            createdAt: { gte: monthStart, lte: monthEnd },
            checklist: { object: finalObjectFilter }
          }
        }),
        prisma.task.count({
          where: {
            status: 'COMPLETED',
            createdAt: { gte: monthStart, lte: monthEnd },
            checklist: { object: finalObjectFilter }
          }
        })
      ]);

      monthlyTasks.push({
        month: monthStart.toLocaleDateString('ru-RU', { month: 'short' }),
        total,
        completed
      });
    }

    const analyticsData = {
      summary: {
        totalObjects,
        totalManagers,
        totalTasks,
        completionRate,
        avgTasksPerDay,
        avgCompletionTime
      },
      charts: {
        dailyTasks,
        managerPerformance,
        objectsStats,
        tasksByStatus
      },
      trends: {
        weeklyCompletion,
        monthlyTasks
      }
    };

    return NextResponse.json(analyticsData);

  } catch (error) {
    console.error('Ошибка получения расширенной аналитики:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
