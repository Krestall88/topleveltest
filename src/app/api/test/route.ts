import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    console.log('Тестируем подключение к базе данных...');

    // Проверяем подключение к базе
    const userCount = await prisma.user.count();
    console.log(`Пользователей в базе: ${userCount}`);

    // Если нет пользователей, создаем админа
    if (userCount === 0) {
      console.log('Создаем администратора...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const admin = await prisma.user.create({
        data: {
          name: 'Администратор',
          email: 'admin@cleaning.com',
          password: hashedPassword,
          role: 'ADMIN',
        },
      });
      
      console.log('Администратор создан:', admin.email);
    }

    // Получаем всех пользователей
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    });

    return NextResponse.json({
      message: 'Подключение к базе данных работает',
      userCount: users.length,
      users: users,
      jwtSecret: process.env.JWT_SECRET ? 'настроен' : 'не настроен'
    });

  } catch (error) {
    console.error('Ошибка тестирования:', error);
    return NextResponse.json(
      { 
        message: 'Ошибка подключения к базе данных', 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      },
      { status: 500 }
    );
  }
}
