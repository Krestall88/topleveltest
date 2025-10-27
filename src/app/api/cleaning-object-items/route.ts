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

// POST /api/cleaning-object-items - Создать объект уборки
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, roomId } = body;

    if (!name || !roomId) {
      return NextResponse.json(
        { message: 'Название и ID помещения обязательны' },
        { status: 400 }
      );
    }

    const cleaningObjectItem = await prisma.cleaningObjectItem.create({
      data: {
        name,
        description,
        roomId,
      },
      include: {
        techCards: true,
      },
    });

    console.log('✅ Создан объект уборки:', cleaningObjectItem.name);
    return NextResponse.json(cleaningObjectItem);
  } catch (error) {
    console.error('❌ Ошибка создания объекта уборки:', error);
    return NextResponse.json(
      { message: 'Не удалось создать объект уборки' },
      { status: 500 }
    );
  }
}
