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

// GET /api/techcards - Получить техкарты (с фильтрацией по помещению)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const objectId = searchParams.get('objectId');

    const whereClause: any = {};
    if (roomId) whereClause.roomId = roomId;
    if (objectId) whereClause.objectId = objectId;

    const techCards = await prisma.techCard.findMany({
      where: whereClause,
      include: {
        room: { select: { name: true } },
        object: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(techCards);
  } catch (error) {
    console.error('Ошибка получения техкарт:', error);
    return NextResponse.json(
      { message: 'Ошибка получения техкарт' },
      { status: 500 }
    );
  }
}

// POST /api/techcards - Создать новую техкарту
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const body = await req.json();
    const { name, workType, frequency, description, roomId, objectId } = body;

    if (!name || !workType || !frequency || !description || !roomId || !objectId) {
      return NextResponse.json(
        { message: 'Все поля обязательны для заполнения' },
        { status: 400 }
      );
    }

    const techCard = await prisma.techCard.create({
      data: {
        name,
        workType,
        frequency,
        description,
        roomId,
        objectId,
      },
      include: {
        room: { select: { name: true } },
        object: { select: { name: true } }
      }
    });

    console.log('✅ Создана техкарта:', techCard.name);

    return NextResponse.json(techCard, { status: 201 });
  } catch (error) {
    console.error('❌ Ошибка создания техкарты:', error);
    return NextResponse.json(
      { message: 'Не удалось создать техкарту' },
      { status: 500 }
    );
  }
}
