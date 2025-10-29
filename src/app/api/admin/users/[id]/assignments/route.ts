import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth-middleware';

// GET /api/admin/users/[id]/assignments - Получить назначения заместителя
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    const { id: userId } = await params;

    const assignments = await prisma.deputyAdminAssignment.findMany({
      where: { deputyAdminId: userId },
      include: {
        object: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Ошибка получения назначений:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// PUT /api/admin/users/[id]/assignments - Обновить назначения заместителя
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    const { id: userId } = await params;
    const body = await req.json();
    const { objectIds } = body;

    // Проверяем, что пользователь существует и является заместителем
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return NextResponse.json({ message: 'Пользователь не найден' }, { status: 404 });
    }

    if (targetUser.role !== 'DEPUTY_ADMIN') {
      return NextResponse.json({ 
        message: 'Можно назначать объекты только заместителям администратора' 
      }, { status: 400 });
    }

    // Удаляем все существующие назначения
    await prisma.deputyAdminAssignment.deleteMany({
      where: { deputyAdminId: userId }
    });

    // Создаем новые назначения
    if (objectIds && objectIds.length > 0) {
      const assignments = objectIds.map((objectId: string) => ({
        deputyAdminId: userId,
        objectId,
        assignedById: user.id
      }));

      await prisma.deputyAdminAssignment.createMany({
        data: assignments
      });
    }

    // Возвращаем обновленные назначения
    const updatedAssignments = await prisma.deputyAdminAssignment.findMany({
      where: { deputyAdminId: userId },
      include: {
        object: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      }
    });

    return NextResponse.json({ 
      assignments: updatedAssignments,
      message: 'Назначения успешно обновлены'
    });

  } catch (error) {
    console.error('Ошибка обновления назначений:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
