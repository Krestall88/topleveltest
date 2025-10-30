import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { startOfDay } from 'date-fns';

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

export async function POST(req: NextRequest) {
  console.log('🔄 RESET OVERDUE: Запрос на сброс просроченных задач');
  
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role !== 'ADMIN') {
      console.log('❌ RESET OVERDUE: Доступ запрещен - только для админов');
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    const today = startOfDay(new Date());
    console.log('🔄 RESET OVERDUE: Начинаем сброс просроченных задач на дату:', today.toISOString().split('T')[0]);

    // Находим все просроченные задачи (задачи с датой до сегодня, которые не выполнены)
    const overdueTasks = await prisma.task.findMany({
      where: {
        scheduledStart: {
          lt: today // Дата меньше сегодняшней
        },
        status: {
          notIn: ['COMPLETED', 'CLOSED_WITH_PHOTO'] // Не выполненные
        }
      },
      select: {
        id: true,
        description: true,
        objectName: true,
        scheduledStart: true,
        status: true,
        createdAt: true
      }
    });

    console.log('📊 RESET OVERDUE: Найдено просроченных задач:', {
      total: overdueTasks.length,
      oldestDate: overdueTasks.length > 0 ? 
        Math.min(...overdueTasks.map(t => t.scheduledStart?.getTime() || 0)) : null
    });

    if (overdueTasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Просроченных задач не найдено',
        data: { resetCount: 0 }
      });
    }

    // БЕЗОПАСНЫЙ СБРОС: Обновляем статус просроченных задач
    const resetResult = await prisma.task.updateMany({
      where: {
        id: {
          in: overdueTasks.map(task => task.id)
        }
      },
      data: {
        // Помечаем как "сброшенные" - меняем статус на FAILED
        status: 'FAILED' // Просроченные задачи помечаем как неудачные
      }
    });

    console.log('✅ RESET OVERDUE: Сброшено задач:', resetResult.count);

    // Логируем детали для отчета
    const resetDetails = overdueTasks.map(task => ({
      id: task.id,
      description: task.description,
      objectName: task.objectName,
      scheduledDate: task.scheduledStart?.toISOString().split('T')[0],
      status: task.status
    }));

    return NextResponse.json({
      success: true,
      message: `Сброшено ${resetResult.count} просроченных задач. Новая точка отсчета: ${today.toISOString().split('T')[0]}`,
      data: {
        resetCount: resetResult.count,
        newStartDate: today.toISOString().split('T')[0],
        resetTasks: resetDetails.slice(0, 10) // Показываем первые 10 для проверки
      }
    });

  } catch (error) {
    console.error('❌ RESET OVERDUE: Ошибка при сбросе:', error);
    return NextResponse.json(
      { 
        message: 'Ошибка при сбросе просроченных задач', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
