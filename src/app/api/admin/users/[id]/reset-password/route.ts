import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth-middleware';
import bcrypt from 'bcryptjs';

// POST /api/admin/users/[id]/reset-password - Сбросить пароль пользователя
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    const userId = params.id;
    const body = await req.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ 
        message: 'Пароль должен содержать минимум 6 символов' 
      }, { status: 400 });
    }

    // Проверяем, что пользователь существует
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return NextResponse.json({ message: 'Пользователь не найден' }, { status: 404 });
    }

    // Хешируем новый пароль
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Обновляем пароль
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    return NextResponse.json({ 
      message: 'Пароль успешно изменен'
    });

  } catch (error) {
    console.error('Ошибка сброса пароля:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
