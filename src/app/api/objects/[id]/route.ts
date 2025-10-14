import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateObjectSchema } from '@/lib/validators/object';

interface Params {
  params: { id: string };
}

// GET /api/objects/[id] - Получить объект по ID с полной информацией
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const object = await prisma.cleaningObject.findUnique({
      where: { id },
      include: {
        manager: { 
          select: { id: true, name: true, email: true } 
        },
        creator: { 
          select: { id: true, name: true } 
        },
        rooms: {
          include: {
            techCards: true
          },
          orderBy: { name: 'asc' }
        },
        _count: {
          select: {
            rooms: true,
            techCards: true,
            checklists: true,
            requests: true
          }
        }
      },
    });

    if (!object) {
      return NextResponse.json({ message: 'Объект не найден' }, { status: 404 });
    }

    return NextResponse.json(object);
  } catch (error) {
    console.error('Ошибка получения объекта:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// PATCH /api/objects/[id] - Обновить объект
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { managerId, ...otherData } = body;

    const updatedObject = await prisma.cleaningObject.update({
      where: { id },
      data: {
        managerId: managerId || null,
        ...otherData,
      },
      include: {
        manager: { 
          select: { id: true, name: true, email: true } 
        },
        creator: { 
          select: { id: true, name: true } 
        },
        rooms: {
          include: {
            techCards: true
          },
          orderBy: { name: 'asc' }
        },
        _count: {
          select: {
            rooms: true,
            techCards: true,
            checklists: true,
            requests: true
          }
        }
      },
    });

    return NextResponse.json(updatedObject);
  } catch (error) {
    console.error('Ошибка обновления объекта:', error);
    return NextResponse.json({ message: 'Не удалось обновить объект' }, { status: 500 });
  }
}

// DELETE /api/objects/[id] - Удалить объект
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await prisma.cleaningObject.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 }); // No Content
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Не удалось удалить объект' }, { status: 500 });
  }
}
