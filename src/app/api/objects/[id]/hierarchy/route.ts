import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Params {
  params: { id: string };
}

// GET /api/objects/[id]/hierarchy - Получить иерархию объекта (упрощенная версия)
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    
    // Получаем объект с базовой информацией
    const object = await prisma.cleaningObject.findUnique({
      where: { id },
      include: {
        manager: { 
          select: { id: true, name: true, email: true } 
        },
        creator: { 
          select: { id: true, name: true } 
        }
      }
    });

    if (!object) {
      return NextResponse.json({ message: 'Объект не найден' }, { status: 404 });
    }

    // Получаем техкарты напрямую к объекту
    const directTechCards = await prisma.techCard.findMany({
      where: { 
        objectId: id,
        roomId: null
      },
      orderBy: { name: 'asc' }
    });

    // Получаем помещения с техкартами
    const directRooms = await prisma.room.findMany({
      where: { 
        objectId: id
      },
      include: {
        techCards: true
      },
      orderBy: { name: 'asc' }
    });

    // Пока возвращаем пустые массивы для участков (пока не исправим Prisma)
    const sites: any[] = [];

    const hierarchyData = {
      ...object,
      sites,
      directRooms,
      directTechCards
    };

    return NextResponse.json(hierarchyData);
  } catch (error) {
    console.error('Ошибка получения иерархии объекта:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
