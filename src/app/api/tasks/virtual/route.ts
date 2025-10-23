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

// GET /api/tasks/virtual - Получение виртуальных задач
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const daysParam = searchParams.get('days') || '1';
    const managerIdParam = searchParams.get('managerId');
    const objectIdParam = searchParams.get('objectId');

    // Определяем дату
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const days = parseInt(daysParam);
    
    // Диапазон дат
    const dateFrom = new Date(targetDate);
    const dateTo = new Date(targetDate);
    dateTo.setDate(dateTo.getDate() + days - 1);

    // Определяем фильтры на основе роли
    let managerId = managerIdParam;
    let objectId = objectIdParam;

    if (user.role === 'MANAGER') {
      // Менеджер видит только свои задачи
      managerId = user.id;
    }

    console.log('🔍 Запрос виртуальных задач:', {
      dateFrom: dateFrom.toISOString().split('T')[0],
      dateTo: dateTo.toISOString().split('T')[0],
      managerId,
      objectId,
      userRole: user.role
    });

    // Получаем виртуальные задачи
    const virtualTasks = await getVirtualTasksWithReal(
      dateFrom,
      dateTo,
      managerId,
      objectId
    );

    console.log(`✅ Найдено виртуальных задач: ${virtualTasks.length}`);

    // Группируем по статусам для статистики
    const stats = {
      total: virtualTasks.length,
      pending: virtualTasks.filter(t => t.status === 'PENDING').length,
      available: virtualTasks.filter(t => t.status === 'AVAILABLE').length,
      overdue: virtualTasks.filter(t => t.status === 'OVERDUE').length,
      completed: virtualTasks.filter(t => t.status === 'COMPLETED').length,
      inProgress: virtualTasks.filter(t => t.status === 'IN_PROGRESS').length
    };

    return NextResponse.json({
      tasks: virtualTasks,
      stats,
      dateRange: {
        from: dateFrom.toISOString().split('T')[0],
        to: dateTo.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('💥 Ошибка получения виртуальных задач:', error);
    return NextResponse.json({ 
      message: 'Ошибка сервера',
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
