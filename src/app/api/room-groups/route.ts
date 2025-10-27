import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

async function getUserFromToken(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    return payload;
  } catch (error) {
    return null;
  }
}

// POST /api/room-groups - Создать группу помещений
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, area, zoneId } = body;

    if (!name || !zoneId) {
      return NextResponse.json(
        { message: 'Название и ID зоны обязательны' },
        { status: 400 }
      );
    }

    const roomGroup = await prisma.roomGroup.create({
      data: {
        name,
        description,
        area: area ? parseFloat(area) : null,
        zoneId,
      },
      include: {
        rooms: true,
      },
    });

    console.log('✅ Создана группа помещений:', roomGroup.name);
    return NextResponse.json(roomGroup);
  } catch (error) {
    console.error('❌ Ошибка создания группы помещений:', error);
    return NextResponse.json(
      { message: 'Не удалось создать группу помещений' },
      { status: 500 }
    );
  }
}
