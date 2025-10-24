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

// POST /api/tasks/execute-simple - Выполнение задачи с поддержкой фотоотчетов
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      techCardId, 
      objectId, 
      description, 
      comment, 
      completionType = 'simple',
      photos = [] 
    } = body;

    if (!techCardId || !objectId) {
      return NextResponse.json({ message: 'Не указаны обязательные поля' }, { status: 400 });
    }

    // Получаем информацию о техкарте и объекте
    const techCard = await prisma.techCard.findUnique({
      where: { id: techCardId },
      include: {
        object: {
          select: {
            id: true,
            name: true,
            managerId: true
          }
        }
      }
    });

    if (!techCard) {
      return NextResponse.json({ message: 'Техкарта не найдена' }, { status: 404 });
    }

    // Проверяем права доступа
    if (user.role === 'MANAGER' && techCard.object.managerId !== user.id) {
      return NextResponse.json({ message: 'Нет доступа к этому объекту' }, { status: 403 });
    }

    // Создаем запись о выполнении задачи
    const task = await prisma.task.create({
      data: {
        description: description || techCard.name,
        status: 'COMPLETED',
        completedById: user.id,
        completedAt: new Date(),
        completionComment: comment,
        objectName: techCard.object.name,
        roomName: 'Общее',
        completionPhotos: photos || []
      }
    });

    // Логируем действие
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'TASK_COMPLETED',
        entity: 'Task',
        entityId: task.id,
        details: {
          taskId: task.id,
          techCardName: techCard.name,
          objectName: techCard.object.name,
          comment: comment,
          completionType: completionType,
          photosCount: photos?.length || 0
        }
      }
    });

    return NextResponse.json({
      message: 'Задача выполнена',
      task: task
    });

  } catch (error) {
    console.error('Ошибка выполнения задачи:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
