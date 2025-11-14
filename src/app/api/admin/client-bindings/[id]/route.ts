import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth-middleware';

// DELETE /api/admin/client-bindings/[id] - Удалить привязку
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { id } = await params;

    // Проверяем права доступа
    const binding = await prisma.clientBinding.findUnique({
      where: { id },
      include: {
        object: {
          select: { managerId: true }
        }
      }
    });

    if (!binding) {
      return NextResponse.json({ error: 'Привязка не найдена' }, { status: 404 });
    }

    // Менеджеры могут удалять только привязки своих объектов
    if (user.role === 'MANAGER' && binding.object.managerId !== user.id) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    await prisma.clientBinding.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Ошибка удаления привязки:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления привязки' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/client-bindings/[id] - Изменить объект привязки
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { id } = await params;
    const { objectId, telegramUsername, firstName, lastName } = await req.json();

    // Проверяем права доступа к старому объекту
    const existingBinding = await prisma.clientBinding.findUnique({
      where: { id },
      include: {
        object: {
          select: { managerId: true }
        }
      }
    });

    if (!existingBinding) {
      return NextResponse.json({ error: 'Привязка не найдена' }, { status: 404 });
    }

    if (user.role === 'MANAGER' && existingBinding.object.managerId !== user.id) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    // Проверяем права доступа к новому объекту
    if (objectId) {
      const newObject = await prisma.cleaningObject.findUnique({
        where: { id: objectId },
        select: { managerId: true }
      });

      if (!newObject) {
        return NextResponse.json({ error: 'Новый объект не найден' }, { status: 404 });
      }

      if (user.role === 'MANAGER' && newObject.managerId !== user.id) {
        return NextResponse.json({ error: 'Нет доступа к новому объекту' }, { status: 403 });
      }
    }

    const binding = await prisma.clientBinding.update({
      where: { id },
      data: {
        objectId,
        telegramUsername,
        firstName,
        lastName
      },
      include: {
        object: {
          include: {
            manager: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    return NextResponse.json(binding);
  } catch (error) {
    console.error('❌ Ошибка обновления привязки:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления привязки' },
      { status: 500 }
    );
  }
}
