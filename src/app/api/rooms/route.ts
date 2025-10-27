import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createRoomSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional(),
  area: z.number().optional(),
  objectId: z.string().min(1, 'ID объекта обязателен'),
  roomGroupId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const objectId = searchParams.get('objectId');

    if (objectId) {
      // Получить помещения конкретного объекта
      const rooms = await prisma.room.findMany({
        where: { objectId },
        orderBy: { name: 'asc' },
        include: {
          object: {
            select: { name: true }
          },
          _count: {
            select: {
              checklists: true,
              tasks: true
            }
          }
        }
      });
      return NextResponse.json(rooms);
    } else {
      // Получить все помещения
      const rooms = await prisma.room.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          object: {
            select: { name: true, address: true }
          },
          _count: {
            select: {
              checklists: true,
              tasks: true
            }
          }
        }
      });
      return NextResponse.json(rooms);
    }
  } catch (error) {
    console.error('Ошибка при получении помещений:', error);
    return NextResponse.json(
      { error: 'Не удалось загрузить помещения' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createRoomSchema.parse(body);

    const room = await prisma.room.create({
      data: validatedData,
      include: {
        object: {
          select: { name: true }
        }
      }
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Ошибка при создании помещения:', error);
    return NextResponse.json(
      { error: 'Не удалось создать помещение' },
      { status: 500 }
    );
  }
}
