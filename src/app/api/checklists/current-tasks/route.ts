import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, addDays } from 'date-fns';
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

// GET /api/checklists/current-tasks - Получение текущих задач из чек-листов
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

    // Строим условия для поиска чек-листов
    const whereClause: any = {
      date: {
        gte: startDate,
        lte: endDate
      }
    };

    // Права доступа
    if (user.role === 'MANAGER') {
      whereClause.object = {
        managerId: user.id
      };
    } else if (objectId) {
      whereClause.objectId = objectId;
    }

    // Получаем чек-листы с задачами
    const checklists = await prisma.checklist.findMany({
      where: whereClause,
      include: {
        object: {
          select: {
            id: true,
            name: true,
            manager: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        room: {
          select: {
            id: true,
            name: true
          }
        },
        tasks: true
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Группируем задачи по статусам
    const allTasks = checklists.flatMap(checklist => 
      checklist.tasks.map(task => ({
        ...task,
        techCard: {
          name: task.description, // Используем description как название техкарты
          workType: 'Уборка',
          frequency: 'Ежедневно'
        },
        checklist: {
          id: checklist.id,
          date: checklist.date,
          status: checklist.status
        },
        object: checklist.object,
        room: checklist.room
      }))
    );

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    // Группируем по статусам
    const overdue = allTasks.filter(task => {
      const taskDate = new Date(task.checklist.date);
      return task.status === 'NEW' && taskDate < todayStart;
    });

    const today = allTasks.filter(task => {
      const taskDate = new Date(task.checklist.date);
      return taskDate >= todayStart && taskDate <= todayEnd;
    });

    const upcoming = allTasks.filter(task => {
      const taskDate = new Date(task.checklist.date);
      return taskDate > todayEnd;
    });

    const completed = allTasks.filter(task => 
      task.status === 'COMPLETED'
    );

    // Группируем по менеджерам для администратора
    let byManager = {};
    let byObject = {};
    
    if (user.role === 'ADMIN' || user.role === 'DEPUTY') {
      // Группировка по менеджерам
      byManager = allTasks.reduce((acc: any, task: any) => {
        const managerId = task.object.manager?.id || 'unassigned';
        const managerName = task.object.manager?.name || 'Не назначен';
        
        if (!acc[managerId]) {
          acc[managerId] = {
            manager: { id: managerId, name: managerName },
            tasks: [],
            stats: { total: 0, completed: 0, overdue: 0, today: 0 }
          };
        }
        
        acc[managerId].tasks.push(task);
        acc[managerId].stats.total++;
        
        if (task.status === 'COMPLETED') acc[managerId].stats.completed++;
        else if (overdue.includes(task)) acc[managerId].stats.overdue++;
        else if (today.includes(task)) acc[managerId].stats.today++;
        
        return acc;
      }, {});

      // Группировка по объектам
      byObject = allTasks.reduce((acc: any, task: any) => {
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
        
        if (task.status === 'COMPLETED') acc[objectId].stats.completed++;
        else if (overdue.includes(task)) acc[objectId].stats.overdue++;
        else if (today.includes(task)) acc[objectId].stats.today++;
        
        return acc;
      }, {});
    }

    return NextResponse.json({
      overdue: overdue.sort((a: any, b: any) => new Date(a.checklist.date).getTime() - new Date(b.checklist.date).getTime()),
      today: today.sort((a: any, b: any) => new Date(a.checklist.date).getTime() - new Date(b.checklist.date).getTime()),
      upcoming: upcoming.sort((a: any, b: any) => new Date(a.checklist.date).getTime() - new Date(b.checklist.date).getTime()),
      completed: completed.sort((a: any, b: any) => new Date(b.checklist.date).getTime() - new Date(a.checklist.date).getTime()),
      byManager: Object.values(byManager),
      byObject: Object.values(byObject),
      total: allTasks.length,
      userRole: user.role
    });

  } catch (error) {
    console.error('Ошибка получения текущих задач:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
