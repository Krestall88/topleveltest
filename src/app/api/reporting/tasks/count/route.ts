import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

// GET - получить количество новых задач отчетности для текущего пользователя
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    // Подсчитываем задачи, назначенные пользователю и не завершенные
    const count = await prisma.reportingTask.count({
      where: {
        assignedToId: user.id,
        status: {
          in: ['NEW', 'IN_PROGRESS']
        }
      }
    });

    return NextResponse.json({ count });

  } catch (error) {
    console.error('Ошибка получения количества задач отчетности:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
