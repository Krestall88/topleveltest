import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { startOfDay, endOfDay, addDays, subDays } from 'date-fns';

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

// Функция для генерации задач на основе техкарт
function generateTasksFromTechCards(techCards: any[], baseDate: Date) {
  const tasks: any[] = [];
  const now = new Date();
  
  for (const techCard of techCards) {
    // Определяем периодичность
    let frequencyDays = 1; // По умолчанию ежедневно
    
    if (techCard.frequency) {
      const freq = techCard.frequency.toLowerCase();
      if (freq.includes('еженедельно') || freq.includes('неделю')) {
        frequencyDays = 7;
      } else if (freq.includes('ежемесячно') || freq.includes('месяц')) {
        frequencyDays = 30;
      }
    }
    
    // Генерируем задачи на несколько дней
    for (let i = -2; i <= 7; i++) {
      const taskDate = addDays(baseDate, i);
      
      // Проверяем, нужно ли создавать задачу в этот день
      const daysSinceBase = Math.abs(i);
      if (daysSinceBase % frequencyDays === 0) {
        
        // Определяем статус задачи
        let status = 'PENDING';
        let scheduledFor = taskDate;
        
        if (taskDate < startOfDay(now)) {
          status = 'OVERDUE';
        } else if (taskDate >= startOfDay(now) && taskDate <= endOfDay(now)) {
          status = 'AVAILABLE';
        } else {
          status = 'PENDING';
        }
        
        // НЕ создаем случайно выполненные задачи - они должны быть виртуальными!
        
        tasks.push({
          id: `${techCard.id}-${taskDate.toISOString().split('T')[0]}`,
          description: techCard.description || techCard.name,
          objectName: techCard.object?.name,
          roomName: techCard.room?.name,
          techCard: {
            id: techCard.id,
            name: techCard.name,
            description: techCard.description,
            workType: techCard.workType,
            frequency: techCard.frequency
          },
          object: techCard.object,
          room: techCard.room,
          site: techCard.room?.roomGroup?.zone?.site,
          zone: techCard.room?.roomGroup?.zone,
          roomGroup: techCard.room?.roomGroup,
          cleaningObjectItem: techCard.cleaningObjectItem,
          checklist: {
            object: techCard.object,
            room: techCard.room
          },
          scheduledFor: scheduledFor,
          status: status,
          frequency: techCard.frequency,
          frequencyDays: frequencyDays
        });
      }
    }
  }
  
  return tasks;
}

// GET /api/tasks/calendar-simple - Получение календаря задач на основе техкарт
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const objectId = searchParams.get('objectId');
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const view = searchParams.get('view') || 'day';

    // Определяем диапазон дат
    const baseDate = new Date(dateStr);

    // Строим условия для поиска техкарт
    const whereClause: any = {};

    // Права доступа
    if (user.role === 'MANAGER') {
      whereClause.object = {
        managerId: user.id
      };
    } else if (objectId) {
      whereClause.objectId = objectId;
    }

    // Получаем техкарты
    const techCards = await prisma.techCard.findMany({
      where: whereClause,
      include: {
        object: {
          select: {
            id: true,
            name: true,
            timezone: true,
            workingHours: true,
            workingDays: true,
            manager: {
              select: {
                id: true,
                name: true,
                phone: true
              }
            }
          }
        },
        room: {
          select: {
            id: true,
            name: true,
            roomGroup: {
              select: {
                id: true,
                name: true,
                zone: {
                  select: {
                    id: true,
                    name: true,
                    site: {
                      select: {
                        id: true,
                        name: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        cleaningObjectItem: {
          select: {
            id: true,
            name: true,
            room: {
              select: {
                id: true,
                name: true,
                roomGroup: {
                  select: {
                    id: true,
                    name: true,
                    zone: {
                      select: {
                        id: true,
                        name: true,
                        site: {
                          select: {
                            id: true,
                            name: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    // Генерируем задачи на основе техкарт
    const allTasks = generateTasksFromTechCards(techCards, baseDate);
    
    console.log('🔍 Техкарт загружено:', techCards.length);
    console.log('🔍 Задач сгенерировано:', allTasks.length);

    // Группируем по статусам
    const overdue = allTasks.filter(task => task.status === 'OVERDUE');
    const today = allTasks.filter(task => task.status === 'AVAILABLE');
    const upcoming = allTasks.filter(task => task.status === 'PENDING');

    // Загружаем реальные завершенные задачи из БД за текущую дату
    const startOfDay = new Date(baseDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(baseDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Строим условия для поиска завершенных задач
    const taskWhereClause: any = {
      OR: [
        { status: 'COMPLETED' },
        { status: 'CLOSED_WITH_PHOTO' }
      ],
      completedAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    };

    // Добавляем фильтр по правам доступа для задач
    if (user.role === 'MANAGER') {
      // Для менеджера - задачи объектов, которыми он управляет
      const managerObjects = await prisma.cleaningObject.findMany({
        where: { managerId: user.id },
        select: { name: true }
      });
      const objectNames = managerObjects.map(obj => obj.name);
      
      if (objectNames.length > 0) {
        taskWhereClause.objectName = { in: objectNames };
      } else {
        // Если у менеджера нет объектов, не показываем задачи
        taskWhereClause.objectName = { in: [] };
      }
    } else if (objectId) {
      // Для админа с выбранным объектом
      const selectedObject = await prisma.cleaningObject.findUnique({
        where: { id: objectId },
        select: { name: true }
      });
      if (selectedObject) {
        taskWhereClause.objectName = selectedObject.name;
      }
    }

    console.log('🔍 ОТЛАДКА: Ищем завершенные задачи с условием:', JSON.stringify(taskWhereClause, null, 2));
    
    const completedTasks = await prisma.task.findMany({
      where: taskWhereClause,
      include: {
        completedBy: { select: { name: true } },
        checklist: {
          include: {
            object: { select: { name: true } },
            room: { select: { name: true } }
          }
        }
      },
      orderBy: { completedAt: 'desc' }
    });
    
    console.log('🔍 ОТЛАДКА: Найдено завершенных задач:', completedTasks.length);
    completedTasks.forEach(task => {
      console.log('🔍 ЗАДАЧА:', {
        id: task.id,
        status: task.status,
        objectName: task.objectName,
        checklistId: task.checklistId,
        completedAt: task.completedAt
      });
    });

    // Преобразуем завершенные задачи в нужный формат
    const completed = completedTasks.map(task => ({
      id: task.id,
      description: task.description,
      status: task.status,
      completedAt: task.completedAt,
      completedBy: task.completedBy?.name,
      objectName: task.checklist?.object?.name || task.objectName,
      roomName: task.checklist?.room?.name || task.roomName,
      completionComment: task.completionComment,
      completionPhotos: task.completionPhotos
    }));

    // Группируем по менеджерам для администратора
    let byManager = {};
    let byObject = {};
    
    if (user.role === 'ADMIN' || user.role === 'DEPUTY') {
      // 🔥 ОБЪЕДИНЯЕМ виртуальные задачи и завершенные для правильной группировки
      const allTasksWithCompleted = [...allTasks, ...completed];
      
      // Группировка по менеджерам
      byManager = allTasksWithCompleted.reduce((acc: any, task: any) => {
        const managerId = task.object.manager?.id || 'unassigned';
        const managerName = task.object.manager?.name || 'Не назначен';
        const managerPhone = task.object.manager?.phone || null;
        
        if (!acc[managerId]) {
          acc[managerId] = {
            manager: { 
              id: managerId, 
              name: managerName, 
              phone: managerPhone 
            },
            tasks: [],
            stats: { total: 0, completed: 0, overdue: 0, today: 0 },
            objects: [],
            byPeriodicity: []
          };
        }
        
        acc[managerId].tasks.push(task);
        acc[managerId].stats.total++;
        
        if (task.status === 'OVERDUE') acc[managerId].stats.overdue++;
        else if (task.status === 'AVAILABLE') acc[managerId].stats.today++;
        
        // Добавляем объект в список (если еще нет)
        const objectExists = acc[managerId].objects.find((obj: any) => obj.id === task.object.id);
        if (!objectExists) {
          acc[managerId].objects.push({
            id: task.object.id,
            name: task.object.name
          });
        }
        
        // Добавляем периодичность в список (если еще нет)
        if (task.frequency) {
          const periodicityExists = acc[managerId].byPeriodicity.find((p: any) => p.frequency === task.frequency);
          if (!periodicityExists) {
            acc[managerId].byPeriodicity.push({
              frequency: task.frequency,
              count: 1,
              tasks: [task]
            });
          } else {
            periodicityExists.count++;
            periodicityExists.tasks.push(task);
          }
        }
        
        return acc;
      }, {});

      // Группировка по объектам
      byObject = allTasksWithCompleted.reduce((acc: any, task: any) => {
        const objectId = task.object.id;
        const objectName = task.object.name;
        
        if (!acc[objectId]) {
          acc[objectId] = {
            object: { id: objectId, name: objectName },
            tasks: [],
            stats: { total: 0, completed: 0, overdue: 0, today: 0 }
          };
        }
        
        acc[objectId].tasks.push(task);
        acc[objectId].stats.total++;
        
        if (task.status === 'OVERDUE') acc[objectId].stats.overdue++;
        else if (task.status === 'AVAILABLE') acc[objectId].stats.today++;
        
        return acc;
      }, {});
    }

    return NextResponse.json({
      overdue: overdue.sort((a: any, b: any) => a.scheduledFor.getTime() - b.scheduledFor.getTime()),
      today: today.sort((a: any, b: any) => a.scheduledFor.getTime() - b.scheduledFor.getTime()),
      upcoming: upcoming.sort((a: any, b: any) => a.scheduledFor.getTime() - b.scheduledFor.getTime()),
      completed: completed, // Реальные завершенные задачи из БД
      byManager: Object.values(byManager),
      byObject: Object.values(byObject),
      total: allTasks.length,
      userRole: user.role
    });

  } catch (error) {
    console.error('Ошибка получения календаря задач:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
