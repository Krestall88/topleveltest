import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import crypto from 'crypto';

async function getUserFromToken(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, role: true, name: true, email: true }
    });
    return user;
  } catch (error) {
    console.error('Failed to verify token', error);
    return null;
  }
}

// POST /api/user/telegram/bind - Генерация кода для привязки Telegram
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 401 });
    }

    // Удаляем старый код если есть
    await prisma.telegramBindingCode.deleteMany({
      where: { userId: user.id }
    });

    // Генерируем уникальный код привязки
    const bindingCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // Код действителен 15 минут
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Сохраняем код в базе данных
    await prisma.telegramBindingCode.create({
      data: {
        code: bindingCode,
        userId: user.id,
        expiresAt
      }
    });
    
    console.log(`🔑 Код привязки для ${user.email}: ${bindingCode} (действителен до ${expiresAt.toLocaleString('ru-RU')})`);

    return NextResponse.json({
      bindingCode,
      expiresAt: expiresAt.toISOString(),
      botUsername: process.env.TELEGRAM_BOT_USERNAME || 'your_bot',
      instructions: `Отправьте боту команду: /bind ${bindingCode}`
    });
  } catch (error: any) {
    console.error('Error generating binding code:', error);
    return NextResponse.json(
      { message: 'Ошибка при генерации кода', error: error.message },
      { status: 500 }
    );
  }
}

// GET /api/user/telegram/bind - Проверка статуса привязки
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 401 });
    }

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        telegramId: true,
        telegramUsername: true,
        telegramFirstName: true,
        telegramLastName: true,
      }
    });

    return NextResponse.json({
      isBound: !!userData?.telegramId,
      telegram: userData?.telegramId ? {
        username: userData.telegramUsername,
        firstName: userData.telegramFirstName,
        lastName: userData.telegramLastName,
      } : null
    });
  } catch (error: any) {
    console.error('Error checking binding status:', error);
    return NextResponse.json(
      { message: 'Ошибка при проверке статуса', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/user/telegram/bind - Отвязка Telegram аккаунта
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        telegramId: null,
        telegramUsername: null,
        telegramFirstName: null,
        telegramLastName: null,
      }
    });

    return NextResponse.json({ message: 'Telegram аккаунт отвязан' });
  } catch (error: any) {
    console.error('Error unbinding Telegram:', error);
    return NextResponse.json(
      { message: 'Ошибка при отвязке', error: error.message },
      { status: 500 }
    );
  }
}
