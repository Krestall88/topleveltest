import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import {
  getUnifiedTasks,
  groupTasksByStatus,
  groupTasksByManager,
  groupTasksByObject,
  CalendarResponse
} from '@/lib/unified-task-system';

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

// GET /api/tasks/calendar-unified - Единый API для календаря задач
export async function GET(req: NextRequest) {
  console.log('🔍 UNIFIED API: Начало запроса к calendar-unified');
  
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      console.log('❌ UNIFIED API: Пользователь не авторизован');
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    console.log('🔍 UNIFIED API: Пользователь найден:', { id: user.id, role: user.role });

    const { searchParams } = new URL(req.url);
    const objectId = searchParams.get('objectId');
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];

    console.log('🔍 UNIFIED API: Параметры запроса:', { dateStr, objectId });

    console.log('🔍 UNIFIED API: Запрос календаря:', {
      userId: user.id,
      userRole: user.role,
      objectId,
      date: dateStr
    });

    // Определяем базовую дату
    const baseDate = new Date(dateStr);

    // Получаем все задачи (виртуальные + материализованные)
    const allTasks = await getUnifiedTasks(
      baseDate,
      user.role,
      user.id,
      objectId || undefined
    );

    console.log('🔍 UNIFIED API: Получено задач:', {
      total: allTasks.length,
      virtual: allTasks.filter(t => t.type === 'VIRTUAL').length,
      materialized: allTasks.filter(t => t.type === 'MATERIALIZED').length
    });

    // Группируем задачи по статусам с учетом конкретного дня
    const statusGroups = groupTasksByStatus(allTasks, baseDate);

    // Подготавливаем ответ
    const response: CalendarResponse = {
      overdue: statusGroups.overdue.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime()),
      today: statusGroups.today.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime()),
      upcoming: statusGroups.upcoming.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime()),
      completed: statusGroups.completed.sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0)),
      byManager: [],
      byObject: [],
      total: allTasks.length,
      userRole: user.role
    };

    // Для админов, заместителей и менеджеров добавляем группировки
    if (user.role === 'ADMIN' || user.role === 'DEPUTY_ADMIN' || user.role === 'MANAGER') {
      console.log('🔍 UNIFIED API: Группируем задачи для админа...');
      response.byManager = groupTasksByManager(allTasks);
      response.byObject = groupTasksByObject(allTasks);
      
      console.log('🔍 UNIFIED API: Группировка завершена:', {
        managersCount: response.byManager.length,
        objectsCount: response.byObject.length
      });

      // Логируем статистику по менеджерам
      response.byManager.forEach((manager, index) => {
        console.log(`🔍 UNIFIED API: Менеджер ${index + 1}:`, {
          id: manager.manager.id,
          name: manager.manager.name,
          totalTasks: manager.stats.total,
          completedTasks: manager.stats.completed,
          overdueTask: manager.stats.overdue,
          todayTasks: manager.stats.today
        });
      });

      console.log('🔍 UNIFIED API: Группировки для админа:', {
        managersCount: response.byManager.length,
        objectsCount: response.byObject.length
      });
    }

    console.log('🔍 UNIFIED API: Итоговая статистика:', {
      overdue: response.overdue.length,
      today: response.today.length,
      upcoming: response.upcoming.length,
      completed: response.completed.length,
      total: response.total
    });

    // Логируем первые несколько завершенных задач для отладки
    if (response.completed.length > 0) {
      console.log('🔍 UNIFIED API: Первые завершенные задачи:', 
        response.completed.slice(0, 5).map(t => ({
          id: t.id,
          techCardId: t.techCardId,
          description: t.description,
          completedAt: t.completedAt,
          status: t.status,
          type: t.type,
          frequency: t.frequency,
          objectName: t.objectName,
          managerName: t.object?.manager?.name || 'НЕТ'
        }))
      );
    } else {
      console.log('⚠️ UNIFIED API: Нет завершенных задач в ответе');
    }
    
    // Логируем группы по менеджерам с завершенными задачами
    if (response.byManager && response.byManager.length > 0) {
      response.byManager.forEach(managerGroup => {
        const completedInGroup = managerGroup.tasks.filter(t => t.status === 'COMPLETED');
        if (completedInGroup.length > 0) {
          console.log(`🔍 UNIFIED API: Менеджер "${managerGroup.manager.name}" - завершенные задачи:`, {
            managerId: managerGroup.manager.id,
            completedCount: completedInGroup.length,
            tasks: completedInGroup.slice(0, 3).map(t => ({
              id: t.id,
              techCardId: t.techCardId,
              description: t.description,
              frequency: t.frequency
            }))
          });
        }
      });
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ UNIFIED API: Ошибка получения календаря:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
