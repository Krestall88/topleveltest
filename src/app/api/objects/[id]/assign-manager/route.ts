import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { z } from 'zod';

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

const assignManagerSchema = z.object({
  managerId: z.string().min(1, 'ID менеджера обязателен'),
});

// POST /api/objects/[id]/assign-manager - назначить менеджера на объект
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
    const body = await req.json();
    const validatedData = assignManagerSchema.parse(body);

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

    // Проверяем, существует ли менеджер
    const manager = await prisma.user.findUnique({
      where: { 
        id: validatedData.managerId,
        role: 'MANAGER'
      },
      select: { id: true, name: true, email: true }
    });

    if (!manager) {
      return NextResponse.json({ message: 'Менеджер не найден' }, { status: 404 });
    }

    // Обновляем объект
    const updatedObject = await prisma.cleaningObject.update({
      where: { id: objectId },
      data: { managerId: validatedData.managerId },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } }
      }
    });

    // Логируем действие
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ASSIGN_MANAGER',
        entityType: 'OBJECT',
        entityId: objectId,
        details: {
          objectName: object.name,
          previousManager: object.manager ? {
            id: object.manager.id,
            name: object.manager.name,
            email: object.manager.email
          } : null,
          newManager: {
            id: manager.id,
            name: manager.name,
            email: manager.email
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Менеджер успешно назначен на объект',
      object: updatedObject
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Ошибка валидации', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Error assigning manager:', error);
    return NextResponse.json(
      { message: 'Ошибка при назначении менеджера' },
      { status: 500 }
    );
  }
}
