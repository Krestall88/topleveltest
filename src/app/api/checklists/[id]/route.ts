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

// GET /api/checklists/[id] - Получить чек-лист с задачами
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const checklist = await prisma.checklist.findUnique({
      where: { id },
      include: {
        tasks: { orderBy: { createdAt: 'asc' } },
        object: { select: { name: true } },
      },
    });

    if (!checklist) {
      return NextResponse.json({ message: 'Чек-лист не найден' }, { status: 404 });
    }

    return NextResponse.json(checklist);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE /api/checklists/[id] - Удалить чек-лист
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    // Получаем параметр принудительного удаления
    const url = new URL(req.url);
    const forceDelete = url.searchParams.get('force') === 'true';

    console.log('🗑️ Удаление чек-листа:', {
      checklistId: id,
      userId: user.userId,
      forceDelete
    });

    // Получаем чек-лист с информацией об объекте
    const checklist = await prisma.checklist.findUnique({
      where: { id },
      include: {
        object: {
          select: { id: true, name: true }
        },
        room: {
          select: { id: true, name: true }
        },
        tasks: {
          select: { id: true, status: true, description: true }
        }
      }
    });

    if (!checklist) {
      return NextResponse.json({ message: 'Чек-лист не найден' }, { status: 404 });
    }

    // Проверяем, есть ли активные задачи
    const activeTasks = checklist.tasks.filter(task => 
      ['IN_PROGRESS', 'AVAILABLE'].includes(task.status)
    );

    // Если есть активные задачи и не принудительное удаление - возвращаем предупреждение
    if (activeTasks.length > 0 && !forceDelete) {
      return NextResponse.json({ 
        hasActiveTasks: true,
        activeTasksCount: activeTasks.length,
        activeTasks: activeTasks.map(task => ({
          id: task.id,
          description: task.description,
          status: task.status
        })),
        message: `В чек-листе есть ${activeTasks.length} активных задач. Вы уверены, что хотите удалить чек-лист?`
      }, { status: 409 }); // 409 Conflict
    }

    // Удаляем чек-лист (задачи удалятся каскадно)
    await prisma.checklist.delete({
      where: { id }
    });

    // Логируем действие
    await prisma.auditLog.create({
      data: {
        action: 'CHECKLIST_DELETED',
        entity: 'CHECKLIST',
        entityId: id,
        details: {
          objectName: checklist.object?.name || 'Unknown',
          roomName: checklist.room?.name || null,
          date: checklist.date.toISOString(),
          tasksCount: checklist.tasks.length,
          activeTasksCount: activeTasks.length,
          forceDelete: forceDelete,
          deletedBy: user.userId as string
        },
        userId: user.userId as string
      }
    });

    console.log('✅ Чек-лист удален:', id);

    return NextResponse.json({
      success: true,
      message: 'Чек-лист успешно удален'
    });

  } catch (error) {
    console.error('❌ Ошибка удаления чек-листа:', error);
    return NextResponse.json(
      { message: 'Ошибка при удалении чек-листа' },
      { status: 500 }
    );
  }
}
