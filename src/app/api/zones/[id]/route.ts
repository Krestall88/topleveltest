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

// PATCH /api/zones/[id] - Обновить зону
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, area } = body;

    const zone = await prisma.zone.update({
      where: { id },
      data: {
        name,
        description,
        area: area ? parseFloat(area) : null,
      },
      include: {
        roomGroups: true,
      },
    });

    console.log('✅ Обновлена зона:', zone.name);
    return NextResponse.json(zone);
  } catch (error) {
    console.error('❌ Ошибка обновления зоны:', error);
    return NextResponse.json(
      { message: 'Не удалось обновить зону' },
      { status: 500 }
    );
  }
}

// DELETE /api/zones/[id] - Удалить зону
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.zone.delete({
      where: { id },
    });

    console.log('✅ Удалена зона:', id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('❌ Ошибка удаления зоны:', error);
    return NextResponse.json(
      { message: 'Не удалось удалить зону' },
      { status: 500 }
    );
  }
}
