import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken, getManagerObjectsFilter } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 API дашборда: начало запроса');
    const user = await getUserFromToken(req);
    
    if (!user) {
      console.log('❌ API дашборда: пользователь не авторизован');
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }
    
    console.log('✅ API дашборда: пользователь найден:', user.id, user.role);

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role') || user.role;
    const userId = searchParams.get('userId') || user.id;

    // Фильтр для менеджеров - только свои объекты
    const objectsFilter = getManagerObjectsFilter(user);

    // Получаем основные данные
    const [
      totalObjects,
      totalManagers,
      totalTasks,
      completedTasks,
      activeTasks,
      overdueTasks,
      newRequests,
      recentPhotos,
      totalInventory
    ] = await Promise.all([
      // Общее количество объектов
      prisma.cleaningObject.count({
        where: objectsFilter
      }),
      
      // Общее количество менеджеров
      user.role === 'MANAGER' ? 1 : prisma.user.count({
        where: { role: 'MANAGER' }
      }),
      
      // Общее количество задач
      prisma.task.count(),
      
      // Выполненные задачи
      prisma.task.count({
        where: {
          status: 'COMPLETED'
        }
      }),
      
      // Активные задачи (в работе)
      prisma.task.count({
        where: {
          status: { in: ['NEW', 'AVAILABLE', 'IN_PROGRESS'] }
        }
      }),
      
      // Просроченные задачи
      prisma.task.count({
        where: {
          status: 'OVERDUE'
        }
      }),
      
      // Новые дополнительные заявки (пока 0, так как модель может не существовать)
      0,
      
      // Фото за сегодня
      prisma.photoReport.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      
      // Общий инвентарь
      prisma.inventoryLimit.count()
    ]);

    // Рассчитываем процент выполнения
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Получаем данные за прошлый месяц для трендов
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const [
      lastMonthObjects,
      lastMonthTasks,
      lastMonthCompleted
    ] = await Promise.all([
      prisma.cleaningObject.count({
        where: {
          ...objectsFilter,
          createdAt: { lt: lastMonth }
        }
      }),
      
      prisma.task.count({
        where: {
          createdAt: { lt: lastMonth }
        }
      }),
      
      prisma.task.count({
        where: {
          status: 'COMPLETED',
          createdAt: { lt: lastMonth }
        }
      })
    ]);

    // Рассчитываем тренды
    const objectsChange = lastMonthObjects > 0 ? 
      Math.round(((totalObjects - lastMonthObjects) / lastMonthObjects) * 100) : 0;
    
    const tasksChange = lastMonthTasks > 0 ? 
      Math.round(((totalTasks - lastMonthTasks) / lastMonthTasks) * 100) : 0;
    
    const lastMonthCompletionRate = lastMonthTasks > 0 ? 
      Math.round((lastMonthCompleted / lastMonthTasks) * 100) : 0;
    
    const completionChange = completionRate - lastMonthCompletionRate;

    // Топ менеджеры (только для админов и заместителей)
    let topManagers: Array<{
      id: string;
      name: string;
      completionRate: number;
      objectsCount: number;
    }> = [];
    if (user.role === 'ADMIN' || user.role === 'DEPUTY') {
      const managersData = await prisma.user.findMany({
        where: { role: 'MANAGER' },
        select: {
          id: true,
          name: true,
          managedObjects: {
            select: { id: true }
          },
          completedTasks: {
            where: {
              status: 'COMPLETED',
              createdAt: {
                gte: new Date(new Date().setDate(new Date().getDate() - 30))
              }
            },
            select: { id: true }
          }
        }
      });

      topManagers = managersData
        .map(manager => {
          const objectsCount = manager.managedObjects.length;
          const completedTasksCount = manager.completedTasks.length;
          // Простая формула рейтинга: количество выполненных задач + бонус за объекты
          const completionRate = Math.min(100, completedTasksCount * 10 + objectsCount * 5);
          
          return {
            id: manager.id,
            name: manager.name || 'Без имени',
            completionRate,
            objectsCount
          };
        })
        .sort((a, b) => b.completionRate - a.completionRate)
        .slice(0, 5);
    }

    // Топ объекты
    const objectsData = await prisma.cleaningObject.findMany({
      where: objectsFilter,
      select: {
        id: true,
        name: true,
        checklists: {
          select: {
            tasks: {
              where: {
                createdAt: {
                  gte: new Date(new Date().setDate(new Date().getDate() - 30))
                }
              },
              select: {
                id: true,
                status: true
              }
            }
          }
        }
      },
      take: 5
    });

    const topObjects = objectsData
      .map(object => {
        const allTasks = object.checklists.flatMap(checklist => checklist.tasks);
        const completedTasks = allTasks.filter(task => task.status === 'COMPLETED');
        const completionRate = allTasks.length > 0 ? 
          Math.round((completedTasks.length / allTasks.length) * 100) : 0;
        
        return {
          id: object.id,
          name: object.name,
          completionRate,
          tasksCount: allTasks.length
        };
      })
      .sort((a, b) => b.completionRate - a.completionRate);

    // Быстрая статистика
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayTasks, weekTasks, monthTasks] = await Promise.all([
      prisma.task.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      
      prisma.task.count({
        where: {
          createdAt: { gte: startOfWeek }
        }
      }),
      
      prisma.task.count({
        where: {
          createdAt: { gte: startOfMonth }
        }
      })
    ]);

    const dashboardData = {
      overview: {
        totalObjects,
        totalManagers,
        totalTasks,
        completionRate,
        trendsData: {
          objectsChange,
          managersChange: 0, // Менеджеры редко меняются
          tasksChange,
          completionChange
        }
      },
      realtime: {
        activeTasks,
        overdueTasks,
        newRequests,
        recentPhotos
      },
      performance: {
        topManagers,
        topObjects
      },
      quickStats: {
        todayTasks,
        weekTasks,
        monthTasks,
        totalInventory
      }
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Ошибка получения данных дашборда:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
