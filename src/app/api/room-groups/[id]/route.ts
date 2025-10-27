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

// PATCH /api/room-groups/[id] - Обновить группу помещений
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, area } = body;

    const roomGroup = await prisma.roomGroup.update({
      where: { id },
      data: {
        name,
        description,
        area: area ? parseFloat(area) : null,
      },
      include: {
        rooms: true,
      },
    });

    console.log('✅ Обновлена группа помещений:', roomGroup.name);
    return NextResponse.json(roomGroup);
  } catch (error) {
    console.error('❌ Ошибка обновления группы помещений:', error);
    return NextResponse.json(
      { message: 'Не удалось обновить группу помещений' },
      { status: 500 }
    );
  }
}

// DELETE /api/room-groups/[id] - Удалить группу помещений
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.roomGroup.delete({
      where: { id },
    });

    console.log('✅ Удалена группа помещений:', id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('❌ Ошибка удаления группы помещений:', error);
    return NextResponse.json(
      { message: 'Не удалось удалить группу помещений' },
      { status: 500 }
    );
  }
}
