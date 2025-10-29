import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

export async function POST(req: NextRequest) {
  console.log('🔄 RESET: Запрос на сброс счетчиков задач');
  
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role !== 'ADMIN') {
      console.log('❌ RESET: Доступ запрещен - только для админов');
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    console.log('🔄 RESET: Начинаем безопасный сброс счетчиков...');

    // НЕ удаляем данные, только логируем текущее состояние
    const totalTasks = await prisma.task.count();
    const completedTasks = await prisma.task.count({
      where: { status: { in: ['COMPLETED', 'CLOSED_WITH_PHOTO'] }}
    });

    console.log('📊 RESET: Текущее состояние БД:', {
      totalTasks,
      completedTasks,
      pendingTasks: totalTasks - completedTasks
    });

    // Получаем задачи за последние 7 дней для анализа
    const recentTasks = await prisma.task.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 дней назад
        }
      },
      select: {
        id: true,
        description: true,
        status: true,
        objectName: true,
        scheduledStart: true,
        completedAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('📊 RESET: Задачи за последние 7 дней:', {
      total: recentTasks.length,
      byStatus: {
        completed: recentTasks.filter(t => ['COMPLETED', 'CLOSED_WITH_PHOTO'].includes(t.status)).length,
        pending: recentTasks.filter(t => !['COMPLETED', 'CLOSED_WITH_PHOTO'].includes(t.status)).length
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Анализ счетчиков выполнен',
      data: {
        totalTasks,
        completedTasks,
        recentTasksCount: recentTasks.length,
        analysis: 'Данные не изменены, только проанализированы'
      }
    });

  } catch (error) {
    console.error('❌ RESET: Ошибка при анализе:', error);
    return NextResponse.json(
      { message: 'Ошибка при анализе счетчиков', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
