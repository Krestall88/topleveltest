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

// PATCH /api/cleaning-object-items/[id] - Обновить объект уборки
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description } = body;

    const cleaningObjectItem = await prisma.cleaningObjectItem.update({
      where: { id },
      data: {
        name,
        description,
      },
      include: {
        techCards: true,
      },
    });

    console.log('✅ Обновлен объект уборки:', cleaningObjectItem.name);
    return NextResponse.json(cleaningObjectItem);
  } catch (error) {
    console.error('❌ Ошибка обновления объекта уборки:', error);
    return NextResponse.json(
      { message: 'Не удалось обновить объект уборки' },
      { status: 500 }
    );
  }
}

// DELETE /api/cleaning-object-items/[id] - Удалить объект уборки
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.cleaningObjectItem.delete({
      where: { id },
    });

    console.log('✅ Удален объект уборки:', id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('❌ Ошибка удаления объекта уборки:', error);
    return NextResponse.json(
      { message: 'Не удалось удалить объект уборки' },
      { status: 500 }
    );
  }
}
