import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { getVirtualTasksWithReal } from '@/lib/virtual-tasks';

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

// GET /api/tasks/calendar-virtual - Календарь виртуальных задач
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const daysParam = searchParams.get('days') || '7';

    // Определяем дату и диапазон
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const days = parseInt(daysParam);
    
    const dateFrom = new Date(targetDate);
    const dateTo = new Date(targetDate);
    dateTo.setDate(dateTo.getDate() + days - 1);

    // Определяем фильтры на основе роли
    let managerId: string | undefined;
    if (user.role === 'MANAGER') {
      managerId = user.id;
    }

    console.log('📅 Запрос календаря виртуальных задач:', {
      dateFrom: dateFrom.toISOString().split('T')[0],
      dateTo: dateTo.toISOString().split('T')[0],
      managerId,
      userRole: user.role
    });

    // Получаем виртуальные задачи
    const virtualTasks = await getVirtualTasksWithReal(
      dateFrom,
      dateTo,
      managerId
    );

    // Группируем задачи по менеджерам и частоте
    const managerGroups = new Map();
    
    for (const task of virtualTasks) {
      const managerId = task.techCard.object.managerId || 'unassigned';
      
      if (!managerGroups.has(managerId)) {
        // Получаем информацию о менеджере
        let managerInfo = null;
        if (managerId !== 'unassigned') {
          managerInfo = await prisma.user.findUnique({
            where: { id: managerId },
            select: { id: true, name: true, email: true }
          });
        }
        
        managerGroups.set(managerId, {
          managerId,
          managerName: managerInfo?.name || 'Не назначен',
          managerEmail: managerInfo?.email || null,
          frequencyGroups: new Map()
        });
      }
      
      const managerGroup = managerGroups.get(managerId);
      const frequency = task.techCard.frequency || 'ежедневно';
      
      if (!managerGroup.frequencyGroups.has(frequency)) {
        managerGroup.frequencyGroups.set(frequency, {
          frequency,
          tasks: [],
          stats: {
            total: 0,
            pending: 0,
            available: 0,
            overdue: 0,
            completed: 0,
            inProgress: 0
          }
        });
      }
      
      const frequencyGroup = managerGroup.frequencyGroups.get(frequency);
      frequencyGroup.tasks.push(task);
      frequencyGroup.stats.total++;
      frequencyGroup.stats[task.status.toLowerCase()]++;
    }

    // Преобразуем в массив для ответа
    const result = Array.from(managerGroups.values()).map(manager => ({
      ...manager,
      frequencyGroups: Array.from(manager.frequencyGroups.values())
    }));

    // Общая статистика
    const totalStats = {
      total: virtualTasks.length,
      pending: virtualTasks.filter(t => t.status === 'PENDING').length,
      available: virtualTasks.filter(t => t.status === 'AVAILABLE').length,
      overdue: virtualTasks.filter(t => t.status === 'OVERDUE').length,
      completed: virtualTasks.filter(t => t.status === 'COMPLETED').length,
      inProgress: virtualTasks.filter(t => t.status === 'IN_PROGRESS').length
    };

    console.log(`✅ Календарь готов: ${result.length} менеджеров, ${virtualTasks.length} задач`);

    return NextResponse.json({
      managerGroups: result,
      totalStats,
      dateRange: {
        from: dateFrom.toISOString().split('T')[0],
        to: dateTo.toISOString().split('T')[0]
      },
      userRole: user.role
    });

  } catch (error) {
    console.error('💥 Ошибка календаря виртуальных задач:', error);
    return NextResponse.json({ 
      message: 'Ошибка сервера',
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
