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

// POST /api/objects/[id]/remove-manager - удалить менеджера с объекта
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'DEPUTY_ADMIN')) {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    const objectId = params.id;

    // Проверяем, существует ли объект
    const object = await prisma.cleaningObject.findUnique({
      where: { id: objectId },
      include: {
        manager: { select: { id: true, name: true, email: true } }
      }
    });

    if (!object) {
      return NextResponse.json({ message: 'Объект не найден' }, { status: 404 });
    }

    if (!object.manager) {
      return NextResponse.json({ message: 'У объекта нет назначенного менеджера' }, { status: 400 });
    }

    // Удаляем менеджера с объекта
    const updatedObject = await prisma.cleaningObject.update({
      where: { id: objectId },
      data: { managerId: null },
      include: {
        creator: { select: { id: true, name: true } }
      }
    });

    // Логируем действие
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REMOVE_MANAGER',
        entity: 'OBJECT',
        entityId: objectId,
        details: {
          objectName: object.name,
          removedManager: {
            id: object.manager.id,
            name: object.manager.name,
            email: object.manager.email
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Менеджер успешно удален с объекта',
      object: updatedObject
    });

  } catch (error) {
    console.error('Error removing manager:', error);
    return NextResponse.json(
      { message: 'Ошибка при удалении менеджера' },
      { status: 500 }
    );
  }
}
