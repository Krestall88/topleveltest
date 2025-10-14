import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

async function getUserFromToken(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, role: true, name: true, email: true }
    });
    return user;
  } catch (error) {
    console.error('Failed to verify token', error);
    return null;
  }
}

// GET /api/managers/[id] - получить детальную информацию о менеджере
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERVISOR')) {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    const managerId = params.id;

    // Получаем информацию о менеджере
    const manager = await prisma.user.findUnique({
      where: { 
        id: managerId,
        role: 'MANAGER'
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      }
    });

    if (!manager) {
      return NextResponse.json({ message: 'Менеджер не найден' }, { status: 404 });
    }

    // Получаем объекты менеджера
    const objects = await prisma.cleaningObject.findMany({
      where: { managerId: managerId },
      include: {
        rooms: {
          select: { id: true, name: true }
        },
        _count: {
          select: {
            checklists: true,
            requests: true,
            rooms: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Получаем чек-листы по объектам менеджера
    const checklists = await prisma.checklist.findMany({
      where: { 
        objectId: { in: objects.map(obj => obj.id) }
      },
      include: {
        object: { select: { name: true } },
        room: { select: { name: true } },
        _count: {
          select: { tasks: true }
        }
      },
      orderBy: { date: 'desc' },
      take: 10 // Последние 10 чек-листов
    });

    // Получаем заявки по объектам менеджера
    const requests = await prisma.request.findMany({
      where: { 
        objectId: { in: objects.map(obj => obj.id) }
      },
      include: {
        object: { select: { name: true } },
        creator: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10 // Последние 10 заявок
    });

    // Получаем расходы по задачам объектов менеджера
    const expenses = await prisma.expense.findMany({
      where: {
        task: {
          checklist: {
            objectId: { in: objects.map(obj => obj.id) }
          }
        }
      },
      include: {
        item: { select: { name: true, unit: true } },
        user: { select: { name: true } },
        task: {
          include: {
            checklist: {
              include: {
                object: { select: { name: true } },
                room: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20 // Последние 20 расходов
    });

    // Получаем фотоотчеты по объектам менеджера
    const photoReports = await prisma.photoReport.findMany({
      where: { 
        objectId: { in: objects.map(obj => obj.id) }
      },
      include: {
        object: { select: { name: true } },
        uploader: { select: { name: true } },
        task: {
          include: {
            checklist: {
              include: {
                room: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10 // Последние 10 фотоотчетов
    });

    // Вычисляем статистику
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalTasks = await prisma.task.count({
      where: {
        checklist: {
          objectId: { in: objects.map(obj => obj.id) }
        }
      }
    });

    const completedTasks = await prisma.task.count({
      where: {
        checklist: {
          objectId: { in: objects.map(obj => obj.id) }
        },
        status: { in: ['COMPLETED', 'CLOSED_WITH_PHOTO'] }
      }
    });

    const stats = {
      objects: objects.length,
      checklists: checklists.length,
      requests: requests.length,
      totalTasks,
      completedTasks,
      totalExpenses,
      photoReports: photoReports.length,
      totalRooms: objects.reduce((sum, obj) => sum + obj._count.rooms, 0),
    };

    return NextResponse.json({
      manager,
      objects,
      checklists,
      requests,
      expenses,
      photoReports,
      stats
    });

  } catch (error) {
    console.error('Error fetching manager details:', error);
    return NextResponse.json(
      { message: 'Ошибка при получении информации о менеджере' },
      { status: 500 }
    );
  }
}

// DELETE /api/managers/[id] - удалить менеджера
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERVISOR')) {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    const managerId = params.id;

    // Проверяем, существует ли менеджер
    const manager = await prisma.user.findUnique({
      where: { 
        id: managerId,
        role: 'MANAGER'
      }
    });

    if (!manager) {
      return NextResponse.json({ message: 'Менеджер не найден' }, { status: 404 });
    }

    // Проверяем, есть ли у менеджера объекты
    const objectsCount = await prisma.cleaningObject.count({
      where: { managerId: managerId }
    });

    if (objectsCount > 0) {
      return NextResponse.json(
        { message: 'Нельзя удалить менеджера, у которого есть объекты' },
        { status: 400 }
      );
    }

    // Удаляем менеджера
    await prisma.user.delete({
      where: { id: managerId }
    });

    return NextResponse.json({ message: 'Менеджер успешно удален' });

  } catch (error) {
    console.error('Error deleting manager:', error);
    return NextResponse.json(
      { message: 'Ошибка при удалении менеджера' },
      { status: 500 }
    );
  }
}
