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
    const techCard = await prisma.techCard.findUnique({
      where: { id: params.id },
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

    const body = await req.json();
    const { name, workType, frequency, description } = body;

    const updatedTechCard = await prisma.techCard.update({
      where: { id: params.id },
      data: {
        name,
        workType,
        frequency,
        description,
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

    await prisma.techCard.delete({
      where: { id: params.id },
    });

    console.log('✅ Удалена техкарта:', params.id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('❌ Ошибка удаления техкарты:', error);
    return NextResponse.json(
      { message: 'Не удалось удалить техкарту' },
      { status: 500 }
    );
  }
}
