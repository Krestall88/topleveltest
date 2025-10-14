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

// POST /api/notifications/tasks/mark-all-read - Отметить все уведомления как прочитанные
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const body = await req.json();
    const { userId } = body;

    // В реальной системе здесь бы была таблица уведомлений
    // Пока просто возвращаем успех
    return NextResponse.json({ 
      success: true,
      message: 'Все уведомления отмечены как прочитанные' 
    });

  } catch (error) {
    console.error('Ошибка отметки всех уведомлений:', error);
    return NextResponse.json(
      { error: 'Ошибка при отметке уведомлений' },
      { status: 500 }
    );
  }
}
