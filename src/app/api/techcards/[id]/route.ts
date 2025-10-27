import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

interface Params {
  params: { id: string };
}

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

// GET /api/techcards/[id] - Получить техкарту по ID
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const techCard = await prisma.techCard.findUnique({
      where: { id },
      include: {
        room: { select: { name: true } },
        object: { select: { name: true } }
      }
    });

    if (!techCard) {
      return NextResponse.json({ message: 'Техкарта не найдена' }, { status: 404 });
    }

    return NextResponse.json(techCard);
  } catch (error) {
    console.error('Ошибка получения техкарты:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// PATCH /api/techcards/[id] - Обновить техкарту
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, workType, frequency, description, siteId, zoneId, roomGroupId, roomId } = body;

    console.log('🔄 Обновление техкарты:', { id, name, workType, frequency });

    const updatedTechCard = await prisma.techCard.update({
      where: { id },
      data: {
        name,
        workType,
        frequency,
        description,
        ...(siteId !== undefined && { siteId: siteId || null }),
        ...(zoneId !== undefined && { zoneId: zoneId || null }),
        ...(roomGroupId !== undefined && { roomGroupId: roomGroupId || null }),
        ...(roomId !== undefined && { roomId: roomId || null }),
      },
      include: {
        room: { select: { name: true } },
        object: { select: { name: true } }
      }
    });

    console.log('✅ Обновлена техкарта:', updatedTechCard.name);

    return NextResponse.json(updatedTechCard);
  } catch (error) {
    console.error('❌ Ошибка обновления техкарты:', error);
    return NextResponse.json(
      { message: 'Не удалось обновить техкарту' },
      { status: 500 }
    );
  }
}

// DELETE /api/techcards/[id] - Удалить техкарту
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.techCard.delete({
      where: { id },
    });

    console.log('✅ Удалена техкарта:', id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('❌ Ошибка удаления техкарты:', error);
    return NextResponse.json(
      { message: 'Не удалось удалить техкарту' },
      { status: 500 }
    );
  }
}
