import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken, requireRole, logUserAction } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
});

// POST /api/managers/[id]/reset-password - сброс пароля менеджера
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверяем права доступа (только ADMIN и DEPUTY)
    const authCheck = await requireRole('DEPUTY')(req);
    if (authCheck) return authCheck;

    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const managerId = params.id;
    const body = await req.json();
    const { newPassword } = resetPasswordSchema.parse(body);

    // Проверяем, что пользователь существует и является менеджером
    const manager = await prisma.user.findUnique({
      where: { id: managerId },
      select: { id: true, name: true, email: true, role: true }
    });

    if (!manager) {
      return NextResponse.json(
        { message: 'Менеджер не найден' },
        { status: 404 }
      );
    }

    if (manager.role !== 'MANAGER') {
      return NextResponse.json(
        { message: 'Пользователь не является менеджером' },
        { status: 400 }
      );
    }

    // Хешируем новый пароль
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Обновляем пароль
    await prisma.user.update({
      where: { id: managerId },
      data: { password: hashedPassword }
    });

    // Логируем действие
    await logUserAction(
      user.id,
      'RESET_MANAGER_PASSWORD',
      {
        targetManagerId: managerId,
        targetManagerName: manager.name,
        targetManagerEmail: manager.email
      },
      managerId,
      'User'
    );

    return NextResponse.json({
      message: 'Пароль успешно изменен',
      manager: {
        id: manager.id,
        name: manager.name,
        email: manager.email
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Ошибка валидации', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Ошибка сброса пароля:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
