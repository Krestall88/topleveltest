import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

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

// POST /api/tasks/[id]/fail - Отметить задачу как невыполненную с причиной
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { failureReason } = await req.json();

    if (!failureReason || !failureReason.trim()) {
      return NextResponse.json({ 
        message: 'Причина невыполнения обязательна' 
      }, { status: 400 });
    }

    console.log('❌ Отметка задачи как невыполненной:', {
      taskId: id,
      userId: user.userId,
      reason: failureReason
    });

    // Получаем задачу
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        checklist: {
          include: {
            object: true,
            room: true
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ message: 'Задача не найдена' }, { status: 404 });
    }

    // Обновляем задачу
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: 'FAILED',
        failureReason: failureReason.trim(),
        completedById: user.userId as string,
        completedAt: new Date()
      },
      include: {
        checklist: {
          include: {
            object: true,
            room: true
          }
        },
        completedBy: {
          select: { name: true, email: true }
        }
      }
    });

    // Логируем действие
    await prisma.auditLog.create({
      data: {
        action: 'TASK_FAILED',
        entity: 'TASK',
        entityId: task.id,
        details: {
          taskDescription: task.description,
          objectName: task.checklist?.object?.name || 'Unknown',
          roomName: task.checklist?.room?.name || null,
          failureReason: failureReason.trim(),
          previousStatus: task.status
        },
        userId: user.userId as string
      }
    });

    console.log('✅ Задача отмечена как невыполненная:', updatedTask.id);

    return NextResponse.json({
      success: true,
      task: updatedTask,
      message: 'Задача отмечена как невыполненная'
    });

  } catch (error) {
    console.error('❌ Ошибка отметки задачи как невыполненной:', error);
    return NextResponse.json(
      { message: 'Ошибка при отметке задачи' },
      { status: 500 }
    );
  }
}
