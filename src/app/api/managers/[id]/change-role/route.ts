import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth-middleware';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'DEPUTY_ADMIN')) {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    const { id: managerId } = await params;
    const body = await req.json();
    const { role } = body;

    // Проверяем валидность роли
    if (!['MANAGER', 'SENIOR_MANAGER', 'ACCOUNTANT'].includes(role)) {
      return NextResponse.json(
        { message: 'Недопустимая роль' },
        { status: 400 }
      );
    }

    // Обновляем роль пользователя
    const updatedUser = await prisma.user.update({
      where: { id: managerId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    return NextResponse.json({
      message: 'Роль успешно изменена',
      user: updatedUser
    });

  } catch (error) {
    console.error('Error changing role:', error);
    return NextResponse.json(
      { message: 'Ошибка при изменении роли' },
      { status: 500 }
    );
  }
}
