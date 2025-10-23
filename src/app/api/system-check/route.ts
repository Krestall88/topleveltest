import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const status = {
    database: false,
    telegram: false,
    auth: false,
    environment: process.env.NODE_ENV || 'development'
  };

  try {
    // Проверка базы данных
    await prisma.$connect();
    const userCount = await prisma.user.count();
    status.database = true;
    
    // Проверка Telegram бота
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    if (telegramToken) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${telegramToken}/getMe`);
        const result = await response.json();
        status.telegram = result.ok;
      } catch (error) {
        status.telegram = false;
      }
    }
    
    // Проверка JWT секрета
    status.auth = !!process.env.JWT_SECRET;
    
    return NextResponse.json({
      ...status,
      details: {
        userCount,
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasTelegramToken: !!telegramToken,
        databaseUrl: process.env.DATABASE_URL ? 'Настроен' : 'Не настроен'
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      ...status,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
