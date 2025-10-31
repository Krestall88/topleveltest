import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

interface Params {
  params: { id: string };
}

async function getUserFromToken(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    return payload;
  } catch (error) {
    return null;
  }
}

// GET /api/additional-tasks/[id] - Получить детали задания
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const task = await prisma.additionalTask.findUnique({
      where: { id },
      include: {
        object: {
          select: { id: true, name: true, address: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        completedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ message: 'Задание не найдено' }, { status: 404 });
    }

    // Проверка прав доступа
    if (user.role === 'MANAGER' && task.assignedToId !== user.userId) {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    return NextResponse.json(task);

  } catch (error) {
    console.error('Ошибка получения задания:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// PATCH /api/additional-tasks/[id] - Обновить задание
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { action, completionNote, completionPhotos } = await req.json();

    // Получаем текущее задание
    const task = await prisma.additionalTask.findUnique({
      where: { id },
      include: {
        object: { select: { name: true } },
        assignedTo: { select: { name: true } }
      }
    });

    if (!task) {
      return NextResponse.json({ message: 'Задание не найдено' }, { status: 404 });
    }

    // Проверка прав: только назначенный менеджер может менять статус
    if (task.assignedToId !== user.userId && !['ADMIN', 'DEPUTY'].includes(user.role as string)) {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    let updateData: Record<string, unknown> = {};
    let auditAction = '';

    switch (action) {
      case 'take':
        if (task.status !== 'NEW') {
          return NextResponse.json({ 
            message: 'Задание уже взято в работу или выполнено' 
          }, { status: 400 });
        }
        updateData = {
          status: 'IN_PROGRESS',
          takenAt: new Date()
        };
        auditAction = 'ADDITIONAL_TASK_TAKEN';
        break;

      case 'complete':
        if (task.status === 'COMPLETED') {
          return NextResponse.json({ 
            message: 'Задание уже выполнено' 
          }, { status: 400 });
        }
        updateData = {
          status: 'COMPLETED',
          completedAt: new Date(),
          completedById: user.userId,
          completionNote: completionNote || null,
          completionPhotos: completionPhotos || []
        };
        auditAction = 'ADDITIONAL_TASK_COMPLETED';
        break;

      default:
        return NextResponse.json({ 
          message: 'Неизвестное действие. Доступны: take, complete' 
        }, { status: 400 });
    }

    // Обновляем задание
    const updatedTask = await prisma.additionalTask.update({
      where: { id },
      data: updateData,
      include: {
        object: {
          select: { id: true, name: true, address: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        completedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Логируем действие
    await prisma.auditLog.create({
      data: {
        action: auditAction,
        entity: 'ADDITIONAL_TASK',
        entityId: task.id,
        details: {
          objectName: task.object?.name,
          assignedTo: task.assignedTo?.name,
          previousStatus: task.status,
          newStatus: updateData.status,
          completionNote: completionNote || null
        },
        userId: user.userId as string
      }
    });

    console.log(`✅ Задание ${action}:`, updatedTask.id);

    return NextResponse.json(updatedTask);

  } catch (error) {
    console.error('Ошибка обновления задания:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE /api/additional-tasks/[id] - Удалить задание (только админы)
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    // Только админы могут удалять задания
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    const task = await prisma.additionalTask.findUnique({
      where: { id },
      include: {
        object: { select: { name: true } }
      }
    });

    if (!task) {
      return NextResponse.json({ message: 'Задание не найдено' }, { status: 404 });
    }

    await prisma.additionalTask.delete({
      where: { id }
    });

    // Логируем удаление
    await prisma.auditLog.create({
      data: {
        action: 'ADDITIONAL_TASK_DELETED',
        entity: 'ADDITIONAL_TASK',
        entityId: id,
        details: {
          objectName: task.object?.name,
          status: task.status,
          deletedBy: user.userId
        },
        userId: user.userId as string
      }
    });

    console.log('✅ Задание удалено:', id);

    return NextResponse.json({ message: 'Задание удалено' });

  } catch (error) {
    console.error('Ошибка удаления задания:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
