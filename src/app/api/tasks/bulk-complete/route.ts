import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { materializeVirtualTask } from '@/lib/unified-task-system';

async function getUserFromToken(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) return null;
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, role: true, name: true }
    });
    
    return user;
  } catch (error) {
    return null;
  }
}

// POST /api/tasks/bulk-complete - Массовое закрытие задач
export async function POST(req: NextRequest) {
  console.log('🔍 BULK COMPLETE: Начало массового закрытия задач');
  
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const body = await req.json();
    const { taskIds, skipValidation = false } = body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ 
        message: 'Не указаны задачи для закрытия' 
      }, { status: 400 });
    }

    console.log('🔍 BULK COMPLETE: Закрытие задач:', {
      userId: user.id,
      userName: user.name,
      taskCount: taskIds.length,
      taskIds: taskIds.slice(0, 5), // Первые 5 ID для отладки
      skipValidation
    });

    // Получаем информацию об объектах для проверки требований
    // ID задачи имеет формат: techCardId-YYYY-MM-DD
    const techCardIds = taskIds.map((id: string) => id.split('-').slice(0, -3).join('-'));
    
    const techCards = await prisma.techCard.findMany({
      where: { id: { in: techCardIds } },
      include: {
        object: {
          select: {
            id: true,
            name: true,
            requirePhotoForCompletion: true,
            requireCommentForCompletion: true
          }
        }
      }
    });

    console.log('🔍 BULK COMPLETE: Проверка требований объектов:', {
      techCardsFound: techCards.length,
      uniqueObjects: new Set(techCards.map(tc => tc.object.name)).size
    });

    // Проверяем требования объектов
    const objectsWithRequirements = techCards.filter(tc => 
      tc.object.requirePhotoForCompletion || tc.object.requireCommentForCompletion
    );

    if (objectsWithRequirements.length > 0) {
      const requirements = objectsWithRequirements.map(tc => {
        const reqs = [];
        if (tc.object.requirePhotoForCompletion) reqs.push('фото');
        if (tc.object.requireCommentForCompletion) reqs.push('комментарий');
        return `${tc.object.name}: ${reqs.join(' и ')}`;
      });

      return NextResponse.json({ 
        message: 'Массовое закрытие недоступно. Некоторые объекты требуют дополнительные данные при завершении задач',
        requirements: requirements,
        objectsWithRequirements: objectsWithRequirements.length
      }, { status: 400 });
    }

    // Сначала материализуем все виртуальные задачи
    console.log('🔍 BULK COMPLETE: Материализация виртуальных задач...');
    const materializedTasks = await Promise.all(
      taskIds.map(async (taskId: string) => {
        try {
          // Материализуем задачу со статусом COMPLETED
          const task = await materializeVirtualTask(taskId, user.id, 'COMPLETED');
          return task;
        } catch (error) {
          console.error(`❌ BULK COMPLETE: Ошибка материализации задачи ${taskId}:`, error);
          return null;
        }
      })
    );

    // Фильтруем успешно материализованные задачи
    const validTasks = materializedTasks.filter(t => t !== null);
    console.log('🔍 BULK COMPLETE: Материализовано задач:', validTasks.length);

    if (validTasks.length === 0) {
      return NextResponse.json({ 
        message: 'Не удалось материализовать задачи',
        completed: 0,
        skipped: taskIds.length
      }, { status: 400 });
    }

    // Задачи уже материализованы со статусом COMPLETED
    // Подсчитываем успешные и пропущенные
    const completedCount = validTasks.length;
    const skippedCount = taskIds.length - completedCount;

    console.log('✅ BULK COMPLETE: Задачи закрыты:', {
      completed: completedCount,
      skipped: skippedCount
    });

    return NextResponse.json({
      success: true,
      completed: completedCount,
      skipped: skippedCount,
      message: `Закрыто задач: ${completedCount}${skippedCount > 0 ? `, пропущено: ${skippedCount}` : ''}`
    });

  } catch (error) {
    console.error('❌ BULK COMPLETE: Ошибка:', error);
    return NextResponse.json({ 
      message: 'Ошибка при закрытии задач',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
