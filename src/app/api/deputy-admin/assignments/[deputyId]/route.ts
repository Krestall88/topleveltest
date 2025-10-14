import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface Params {
  params: {
    deputyId: string;
  };
}

// DELETE /api/deputy-admin/assignments/[deputyId] - Удалить все назначения заместителя администратора
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await getAuthSession();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Доступ запрещен. Только главный администратор может удалять назначения.' },
        { status: 403 }
      );
    }

    const { deputyId } = params;

    // Проверить, что заместитель администратора существует
    const deputyAdmin = await prisma.user.findUnique({
      where: { id: deputyId },
    });

    if (!deputyAdmin) {
      return NextResponse.json(
        { error: 'Заместитель администратора не найден' },
        { status: 404 }
      );
    }

    if (deputyAdmin.role !== 'DEPUTY_ADMIN') {
      return NextResponse.json(
        { error: 'Пользователь не является заместителем администратора' },
        { status: 400 }
      );
    }

    // Удалить все назначения
    const result = await prisma.deputyAdminAssignment.deleteMany({
      where: { deputyAdminId: deputyId }
    });

    return NextResponse.json({
      message: 'Назначения успешно удалены',
      count: result.count
    });

  } catch (error) {
    console.error('Ошибка при удалении назначений:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// GET /api/deputy-admin/assignments/[deputyId] - Получить назначения конкретного заместителя администратора
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getAuthSession();
    
    if (!session || !['ADMIN', 'DEPUTY_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    const { deputyId } = params;

    // Если это не главный админ, проверить, что запрашивает свои назначения
    if (session.user.role === 'DEPUTY_ADMIN' && session.user.id !== deputyId) {
      return NextResponse.json(
        { error: 'Доступ запрещен. Можно просматривать только свои назначения.' },
        { status: 403 }
      );
    }

    const assignments = await prisma.deputyAdminAssignment.findMany({
      where: { deputyAdminId: deputyId },
      include: {
        object: {
          select: {
            id: true,
            name: true,
            address: true,
            manager: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      assignments: assignments.map(a => a.object)
    });

  } catch (error) {
    console.error('Ошибка при получении назначений:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
