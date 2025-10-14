import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateRoomSchema = z.object({
  name: z.string().min(1, 'Название обязательно').optional(),
  description: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const room = await prisma.room.findUnique({
      where: { id: params.id },
      include: {
        object: {
          select: { name: true, address: true }
        },
        checklists: {
          orderBy: { date: 'desc' },
          take: 5,
          include: {
            tasks: {
              select: { id: true, status: true }
            }
          }
        },
        tasks: {
          where: { checklistId: null }, // Отдельные задания
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!room) {
      return NextResponse.json(
        { error: 'Помещение не найдено' },
        { status: 404 }
      );
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error('Ошибка при получении помещения:', error);
    return NextResponse.json(
      { error: 'Не удалось загрузить помещение' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validatedData = updateRoomSchema.parse(body);

    const room = await prisma.room.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        object: {
          select: { name: true }
        }
      }
    });

    return NextResponse.json(room);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Ошибка при обновлении помещения:', error);
    return NextResponse.json(
      { error: 'Не удалось обновить помещение' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.room.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Помещение удалено' });
  } catch (error) {
    console.error('Ошибка при удалении помещения:', error);
    return NextResponse.json(
      { error: 'Не удалось удалить помещение' },
      { status: 500 }
    );
  }
}
