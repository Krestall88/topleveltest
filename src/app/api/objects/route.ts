import { NextRequest, NextResponse } from 'next/server';
import { createObjectSchema } from '@/lib/validators/object';
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

export async function GET(req: NextRequest) {
  try {
    const objects = await prisma.cleaningObject.findMany({
      include: {
        manager: { select: { id: true, name: true } },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(objects);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Не удалось получить список объектов' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const creatorId = await getUserIdFromToken(req);
    if (!creatorId) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const body = await req.json();
    const { name, address, managerId, rooms, workingHours, workingDays, timezone } = body;

    if (!name || !address) {
      return NextResponse.json({ message: 'Название и адрес обязательны' }, { status: 400 });
    }

    console.log('🏗️ Создание объекта:', { 
      name, 
      address, 
      managerId, 
      roomsCount: rooms?.length,
      workingHours,
      workingDays,
      timezone
    });

    // Определяем часовой пояс, если не передан
    let objectTimezone = timezone;
    if (!objectTimezone) {
      try {
        const timezoneResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/objects/timezone`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address })
        });
        const timezoneData = await timezoneResponse.json();
        objectTimezone = timezoneData.timezone || 'Europe/Moscow';
        console.log('🌍 Определен часовой пояс:', objectTimezone);
      } catch (error) {
        console.warn('⚠️ Не удалось определить часовой пояс, используем Moscow:', error);
        objectTimezone = 'Europe/Moscow';
      }
    }

    // Создаем объект
    const newObject = await prisma.cleaningObject.create({
      data: {
        name,
        address,
        creatorId,
        managerId: managerId || null,
        timezone: objectTimezone,
        workingHours: workingHours || { start: "08:00", end: "20:00" },
        workingDays: workingDays || ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
        autoChecklistEnabled: true,
      },
    });

    console.log('✅ Создан объект:', newObject.id);

    // Создаем помещения, если они есть
    if (rooms && rooms.length > 0) {
      for (const roomData of rooms) {
        if (roomData.name.trim()) { // Создаем только если есть название
          const room = await prisma.room.create({
            data: {
              name: roomData.name,
              description: roomData.description || '',
              area: roomData.area || null,
              objectId: newObject.id,
            },
          });
          console.log('✅ Создано помещение:', room.name);
        }
      }
    }

    // Возвращаем объект с полной информацией
    const fullObject = await prisma.cleaningObject.findUnique({
      where: { id: newObject.id },
      include: {
        manager: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        rooms: true,
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
    console.error('❌ Ошибка при создании объекта:', error);
    return NextResponse.json(
      { message: 'Не удалось создать объект' },
      { status: 500 }
    );
  }
}
