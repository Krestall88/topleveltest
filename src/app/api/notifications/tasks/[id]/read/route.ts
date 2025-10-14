import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

async function getUserFromToken(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, name: true, email: true, role: true }
    });

    return user;
  } catch (error) {
    return null;
  }
}

interface Params {
  params: { id: string };
}

// POST /api/notifications/tasks/[id]/read - Отметить уведомление как прочитанное
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    // В реальной системе здесь бы была таблица уведомлений
    // Пока просто возвращаем успех
    return NextResponse.json({ 
      success: true,
      message: 'Уведомление отмечено как прочитанное' 
    });

  } catch (error) {
    console.error('Ошибка отметки уведомления:', error);
    return NextResponse.json(
      { error: 'Ошибка при отметке уведомления' },
      { status: 500 }
    );
  }
}
