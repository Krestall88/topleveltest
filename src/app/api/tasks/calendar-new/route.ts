import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { cookies } from 'next/headers';
import { startOfDay, endOfDay, addDays } from 'date-fns';

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

// GET /api/tasks/calendar-new - Получение календаря задач из TaskExecution
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
    let startDate = startOfDay(baseDate);
    let endDate = endOfDay(baseDate);

    if (view === 'week') {
      endDate = endOfDay(addDays(baseDate, 7));
    } else if (view === 'month') {
      endDate = endOfDay(addDays(baseDate, 30));
    }

    // Строим условия для поиска задач
    const whereClause: any = {
      scheduledStart: {
        gte: startDate,
        lte: endDate
      }
    };

    // Права доступа
    if (user.role === 'MANAGER') {
      whereClause.checklist = {
        object: {
          managerId: user.id
        }
      };
    } else if (objectId) {
      whereClause.checklist = {
        objectId: objectId
      };
    }

    // Получаем задачи из TaskExecution (новая система)
    const taskWhereClause: any = {
      scheduledFor: {
        gte: startDate,
        lte: endDate
      }
    };

    // Права доступа для TaskExecution
    if (user.role === 'MANAGER') {
      taskWhereClause.object = {
        managerId: user.id
      };
    } else if (objectId) {
      taskWhereClause.objectId = objectId;
    }

    // Попробуем использовать TaskExecution с fallback на Task
    let taskData: any[] = [];
    
    try {
      // Попробуем TaskExecution
      taskData = await prisma.$queryRaw`
        SELECT 
          te.id,
          te.status,
          te."scheduledFor",
          te.comment,
          te.photos,
          te."managerId",
          tc.name as "techCardName",
          tc.description as "techCardDescription",
          tc.frequency as "techCardFrequency",
          co.id as "objectId",
          co.name as "objectName",
          co.address as "objectAddress",
          u.name as "managerName",
          u.phone as "managerPhone",
          s.name as "siteName",
          z.name as "zoneName",
          r.name as "roomName",
          r.area as "roomArea"
        FROM "TaskExecution" te
        LEFT JOIN "TechCard" tc ON te."techCardId" = tc.id
        LEFT JOIN "CleaningObject" co ON te."objectId" = co.id
        LEFT JOIN "User" u ON te."managerId" = u.id
        LEFT JOIN "Site" s ON tc."siteId" = s.id
        LEFT JOIN "Zone" z ON tc."zoneId" = z.id
        LEFT JOIN "Room" r ON tc."roomId" = r.id
        WHERE te."scheduledFor" >= ${startDate}
          AND te."scheduledFor" <= ${endDate}
          ${user.role === 'MANAGER' ? Prisma.sql`AND te."managerId" = ${user.id}` : Prisma.empty}
        ORDER BY te."scheduledFor" DESC
        LIMIT 100
      ` as any[];
      
      console.log('✅ TaskExecution запрос успешен');
      
    } catch (taskExecError) {
      console.log('❌ TaskExecution не работает, пробуем Task:', taskExecError);
      
      try {
        // Fallback на Task через Checklist
        taskData = await prisma.$queryRaw`
          SELECT 
            t.id,
            t.status,
            t."scheduledStart" as "scheduledFor",
            t.comment,
            t.photos,
            cl."userId" as "managerId",
            tc.name as "techCardName",
            tc.description as "techCardDescription",
            tc.frequency as "techCardFrequency",
            co.id as "objectId",
            co.name as "objectName",
            co.address as "objectAddress",
            u.name as "managerName",
            u.phone as "managerPhone",
            s.name as "siteName",
            z.name as "zoneName",
            r.name as "roomName",
            r.area as "roomArea"
          FROM "Task" t
          LEFT JOIN "Checklist" cl ON t."checklistId" = cl.id
          LEFT JOIN "TechCard" tc ON cl."techCardId" = tc.id
          LEFT JOIN "CleaningObject" co ON cl."objectId" = co.id
          LEFT JOIN "User" u ON cl."userId" = u.id
          LEFT JOIN "Site" s ON tc."siteId" = s.id
          LEFT JOIN "Zone" z ON tc."zoneId" = z.id
          LEFT JOIN "Room" r ON tc."roomId" = r.id
          WHERE t."scheduledStart" >= ${startDate}
            AND t."scheduledStart" <= ${endDate}
            ${user.role === 'MANAGER' ? Prisma.sql`AND cl."userId" = ${user.id}` : Prisma.empty}
          ORDER BY t."scheduledStart" DESC
          LIMIT 100
        ` as any[];
        
        console.log('✅ Task fallback успешен');
        
      } catch (taskError) {
        console.log('❌ И Task не работает:', taskError);
        taskData = [];
      }
    }

    // Отладка: проверяем первую запись
    if ((taskData as any[]).length > 0) {
      console.log('🔍 Первая запись из SQL:', (taskData as any[])[0]);
      console.log('🔍 Всего записей из SQL:', (taskData as any[]).length);
    }

    // Преобразуем результат в нужный формат
    const tasks = (taskData as any[]).map((execution: any) => ({
      id: execution.id,
      description: execution.techCardName || execution.techCardDescription || 'Техзадание',
      status: execution.status,
      scheduledStart: execution.scheduledFor,
      scheduledEnd: execution.scheduledFor,
      scheduledFor: execution.scheduledFor,
      executedAt: null,
      checklist: {
        object: {
          id: execution.objectId,
          name: execution.objectName,
          address: execution.objectAddress,
          manager: {
            id: execution.managerId,
            name: execution.managerName,
            phone: execution.managerPhone
          }
        },
        roomName: null,
      },
      techCard: {
        id: execution.techCardId,
        name: execution.techCardName,
        description: execution.techCardDescription,
        frequency: execution.techCardFrequency
      }
    }));
    
    console.log(`📊 Найдено TaskExecution: ${tasks.length}`);
    console.log('🔍 Пример задачи:', tasks[0] ? {
      id: tasks[0].id,
      description: tasks[0].description,
      objectName: tasks[0].objectName,
      techCardName: tasks[0].techCard?.name
    } : 'Нет задач');

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    // Группируем по статусам
    const overdue = tasks.filter(task => {
      return task.status === 'OVERDUE' || (task.status === 'NEW' && task.scheduledEnd && task.scheduledEnd < now);
    });

    const today = tasks.filter(task => {
      const taskDate = task.scheduledStart || task.scheduledFor;
      return taskDate >= todayStart && taskDate <= todayEnd && task.status !== 'COMPLETED';
    });

    const upcoming = tasks.filter(task => {
      const taskDate = task.scheduledStart || task.scheduledFor;
      return taskDate > todayEnd && task.status !== 'COMPLETED';
    });

    const completed = tasks.filter(task => 
      task.status === 'COMPLETED'
    );

    // Группируем по менеджерам для администратора
    let byManager = {};
    let byObject = {};
    
    if (user.role === 'ADMIN' || user.role === 'DEPUTY') {
      // Группируем по менеджерам для администратора
      byManager = tasks.reduce((acc: any, task: any) => {
        const managerId = task.checklist?.object?.manager?.id;
        const managerName = task.checklist?.object?.manager?.name;
        const managerPhone = task.checklist?.object?.manager?.phone;
        const objectName = task.checklist?.object?.name;
        const objectId = task.checklist?.object?.id;
        
        // Отладка: проверяем данные менеджера для первой задачи
        if (Object.keys(acc).length === 0) {
          console.log('🔍 Первая задача - данные менеджера:', {
            managerId,
            managerName,
            managerPhone,
            objectName,
            objectId,
            fullTask: task
          });
        }
        
        if (!managerId) return acc;
        
        if (!acc[managerId]) {
          acc[managerId] = {
            manager: { 
              id: managerId, 
              name: managerName,
              phone: managerPhone 
            },
            objects: new Set(),
            tasks: [],
            stats: { total: 0, completed: 0, overdue: 0, today: 0 },
            byPeriodicity: {}
          };
        }
        
        // Добавляем объект к менеджеру
        if (objectId && objectName) {
          acc[managerId].objects.add(`${objectId}:${objectName}`);
        }
        
        acc[managerId].tasks.push(task);
        acc[managerId].stats.total++;
        
        if (task.status === 'COMPLETED') acc[managerId].stats.completed++;
        else if (overdue.includes(task)) acc[managerId].stats.overdue++;
        else if (today.includes(task)) acc[managerId].stats.today++;
        
        // Группировка по периодичности для менеджера
        const frequency = task.techCard?.frequency || 'unknown';
        if (!acc[managerId].byPeriodicity[frequency]) {
          acc[managerId].byPeriodicity[frequency] = {
            frequency: frequency,
            tasks: [],
            count: 0
          };
        }
        acc[managerId].byPeriodicity[frequency].tasks.push(task);
        acc[managerId].byPeriodicity[frequency].count++;
        
        return acc;
      }, {});

      // Группировка по объектам
      byObject = tasks.reduce((acc: any, task: any) => {
        const objectId = task.checklist?.object?.id;
        const objectName = task.checklist?.object?.name;
        
        if (!acc[objectId]) {
          acc[objectId] = {
            object: { id: objectId, name: objectName },
            tasks: [],
            stats: { total: 0, completed: 0, overdue: 0, today: 0 }
          };
        }
        
        acc[objectId].tasks.push(task);
        acc[objectId].stats.total++;
        
        if (task.status === 'COMPLETED') acc[objectId].stats.completed++;
        else if (overdue.includes(task)) acc[objectId].stats.overdue++;
        else if (today.includes(task)) acc[objectId].stats.today++;
        
        return acc;
      }, {});
    }

    // Группировка по периодичности
    const byPeriodicity = tasks.reduce((acc: any, task: any) => {
      const frequency = task.techCard?.frequency || 'unknown';
      
      if (!acc[frequency]) {
        acc[frequency] = {
          frequency: frequency,
          tasks: [],
          count: 0
        };
      }
      
      acc[frequency].tasks.push(task);
      acc[frequency].count++;
      
      return acc;
    }, {});

    // Преобразуем Set объектов в массив для каждого менеджера
    const processedByManager = Object.values(byManager).map((manager: any) => ({
      ...manager,
      objects: Array.from(manager.objects).map((obj: any) => {
        const [id, name] = String(obj).split(':');
        return { id, name };
      }),
      byPeriodicity: Object.values(manager.byPeriodicity)
    }));

    console.log('🔍 Обработанные данные менеджеров:', JSON.stringify(processedByManager, null, 2));
    
    // Временная отладка: добавляем отладочную информацию в ответ
    const debugInfo = {
      totalTasks: tasks.length,
      firstTask: tasks[0] ? {
        id: tasks[0].id,
        managerData: tasks[0].checklist?.object?.manager
      } : null,
      managersCount: processedByManager.length
    };

    return NextResponse.json({
      overdue: overdue.sort((a: any, b: any) => a.scheduledFor.getTime() - b.scheduledFor.getTime()),
      today: today.sort((a: any, b: any) => a.scheduledFor.getTime() - b.scheduledFor.getTime()),
      upcoming: upcoming.sort((a: any, b: any) => a.scheduledFor.getTime() - b.scheduledFor.getTime()),
      completed: completed.sort((a: any, b: any) => b.executedAt?.getTime() - a.executedAt?.getTime()),
      byManager: processedByManager,
      byObject: Object.values(byObject),
      byPeriodicity: Object.values(byPeriodicity),
      total: tasks.length,
      userRole: user.role,
      debug: debugInfo
    });

  } catch (error) {
    console.error('Ошибка получения календаря задач:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
