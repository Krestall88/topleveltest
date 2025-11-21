import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    // Только админы и заместители могут останавливать задачи
    if (user.role !== 'ADMIN' && user.role !== 'DEPUTY_ADMIN') {
      return NextResponse.json({ message: 'Нет доступа' }, { status: 403 });
    }

    const { id: taskId } = await params;

    // Проверяем существование задачи
    const task = await prisma.reportingTask.findUnique({
      where: { id: taskId },
      select: { 
        id: true, 
        isRecurring: true,
        stoppedAt: true
      }
    });

    if (!task) {
      return NextResponse.json({ message: 'Задача не найдена' }, { status: 404 });
    }

    if (!task.isRecurring) {
      return NextResponse.json({ message: 'Задача не является повторяющейся' }, { status: 400 });
    }

    if (task.stoppedAt) {
      return NextResponse.json({ message: 'Задача уже остановлена' }, { status: 400 });
    }

    // Останавливаем повторение
    const updatedTask = await prisma.reportingTask.update({
      where: { id: taskId },
      data: {
        stoppedAt: new Date()
      }
    });

    console.log('🛑 Повторяющаяся задача остановлена:', {
      taskId,
      stoppedBy: user.name,
      stoppedAt: updatedTask.stoppedAt
    });

    return NextResponse.json({
      message: 'Повторение задачи остановлено',
      task: updatedTask
    });

  } catch (error) {
    console.error('Ошибка остановки задачи:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
