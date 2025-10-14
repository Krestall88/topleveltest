import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

async function getUserIdFromToken(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload.userId as string;
  } catch (error) {
    console.error('Failed to verify token', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const creatorId = await getUserIdFromToken(req);
    if (!creatorId) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const body = await req.json();
    const { name, address, rooms, managerId } = body;

    console.log('🏗️ Создание объекта с техкартами:', { name, roomsCount: rooms?.length });

    // Создаем объект
    const newObject = await prisma.cleaningObject.create({
      data: {
        name,
        address,
        creatorId,
        managerId: managerId || null,
        documents: {
          template: true,
          createdAt: new Date().toISOString()
        }
      },
    });

    console.log('✅ Создан объект:', newObject.id);

    // Создаем помещения и техкарты
    if (rooms && rooms.length > 0) {
      for (const roomData of rooms) {
        // Создаем помещение
        const room = await prisma.room.create({
          data: {
            name: roomData.name,
            description: roomData.description,
            area: roomData.area || null,
            objectId: newObject.id,
          },
        });

        console.log('✅ Создано помещение:', room.name);

        // Создаем техкарты для помещения
        if (roomData.techCards && roomData.techCards.length > 0) {
          for (const techCardData of roomData.techCards) {
            const techCard = await prisma.techCard.create({
              data: {
                name: techCardData.name,
                workType: techCardData.workType,
                frequency: techCardData.frequency,
                description: techCardData.description,
                objectId: newObject.id,
                roomId: room.id,
              },
            });

            console.log('✅ Создана техкарта:', techCard.name);
          }
        }
      }
    }

    // Возвращаем созданный объект с полной информацией
    const fullObject = await prisma.cleaningObject.findUnique({
      where: { id: newObject.id },
      include: {
        manager: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        rooms: {
          include: {
            techCards: true
          }
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

    return NextResponse.json(fullObject, { status: 201 });

  } catch (error) {
    console.error('❌ Ошибка при создании объекта с техкартами:', error);
    return NextResponse.json(
      { message: 'Не удалось создать объект', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Получаем все объекты-шаблоны с полной информацией
    const templates = await prisma.cleaningObject.findMany({
      include: {
        manager: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        rooms: {
          include: {
            techCards: true
          }
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(templates);

  } catch (error) {
    console.error('❌ Ошибка при получении шаблонов объектов:', error);
    return NextResponse.json(
      { message: 'Не удалось получить шаблоны объектов' },
      { status: 500 }
    );
  }
}
