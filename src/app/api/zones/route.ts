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

// POST /api/zones - Создать зону
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, area, siteId } = body;

    if (!name || !siteId) {
      return NextResponse.json(
        { message: 'Название и ID участка обязательны' },
        { status: 400 }
      );
    }

    const zone = await prisma.zone.create({
      data: {
        name,
        description,
        area: area ? parseFloat(area) : null,
        siteId,
      },
      include: {
        roomGroups: true,
      },
    });

    console.log('✅ Создана зона:', zone.name);
    return NextResponse.json(zone);
  } catch (error) {
    console.error('❌ Ошибка создания зоны:', error);
    return NextResponse.json(
      { message: 'Не удалось создать зону' },
      { status: 500 }
    );
  }
}
