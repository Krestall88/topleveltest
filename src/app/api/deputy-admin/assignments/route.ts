import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Схема для создания назначения
const assignmentSchema = z.object({
  deputyAdminId: z.string().min(1, 'ID заместителя администратора обязателен'),
  objectIds: z.array(z.string()).min(1, 'Необходимо выбрать хотя бы один объект'),
});

// GET /api/deputy-admin/assignments - Получить все назначения
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Доступ запрещен. Только главный администратор может просматривать назначения.' },
        { status: 403 }
      );
    }

    const assignments = await prisma.deputyAdminAssignment.findMany({
      include: {
        deputyAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        object: {
          select: {
            id: true,
            name: true,
            address: true,
          }
        },
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Группировка по заместителям администраторов
    const groupedAssignments = assignments.reduce((acc, assignment) => {
      const deputyId = assignment.deputyAdmin.id;
      if (!acc[deputyId]) {
        acc[deputyId] = {
          deputyAdmin: assignment.deputyAdmin,
          objects: [],
          assignedBy: assignment.assignedBy,
          createdAt: assignment.createdAt,
        };
      }
      acc[deputyId].objects.push(assignment.object);
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      assignments: Object.values(groupedAssignments)
    });

  } catch (error) {
    console.error('Ошибка при получении назначений:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST /api/deputy-admin/assignments - Создать назначения
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Доступ запрещен. Только главный администратор может создавать назначения.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { deputyAdminId, objectIds } = assignmentSchema.parse(body);

    // Проверить, что пользователь существует и имеет роль DEPUTY_ADMIN
    const deputyAdmin = await prisma.user.findUnique({
      where: { id: deputyAdminId },
    });

    if (!deputyAdmin) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    if (deputyAdmin.role !== 'DEPUTY_ADMIN') {
      return NextResponse.json(
        { error: 'Пользователь должен иметь роль DEPUTY_ADMIN' },
        { status: 400 }
      );
    }

    // Проверить, что все объекты существуют
    const objects = await prisma.cleaningObject.findMany({
      where: {
        id: { in: objectIds }
      }
    });

    if (objects.length !== objectIds.length) {
      return NextResponse.json(
        { error: 'Один или несколько объектов не найдены' },
        { status: 404 }
      );
    }

    // Удалить существующие назначения для этого заместителя администратора
    await prisma.deputyAdminAssignment.deleteMany({
      where: { deputyAdminId }
    });

    // Создать новые назначения
    const assignments = await prisma.deputyAdminAssignment.createMany({
      data: objectIds.map(objectId => ({
        deputyAdminId,
        objectId,
        assignedById: session.user.id,
      }))
    });

    return NextResponse.json({
      message: 'Назначения успешно созданы',
      count: assignments.count
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Ошибка при создании назначений:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
