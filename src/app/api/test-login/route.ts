import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    console.log('🧪 Тестовый эндпоинт для проверки логина');

    // Проверяем пользователя
    const user = await prisma.user.findUnique({
      where: { email: 'admin@cleaning.com' }
    });

    if (!user) {
      return NextResponse.json({ 
        error: 'Пользователь не найден',
        email: 'admin@cleaning.com'
      }, { status: 404 });
    }

    // Проверяем пароль
    const passwordValid = await bcrypt.compare('admin123', user.password);

    // Проверяем JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET;

    return NextResponse.json({
      message: 'Тест логина',
      user: {
        email: user.email,
        name: user.name,
        role: user.role
      },
      passwordValid,
      jwtSecretExists: !!jwtSecret,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка в тестовом эндпоинте:', error);
    return NextResponse.json({
      error: 'Ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
