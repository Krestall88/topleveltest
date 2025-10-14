import { NextRequest, NextResponse } from 'next/server';
import { initializeScheduler, getSchedulerStatus } from '@/lib/scheduler';
import { jwtVerify } from 'jose';

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

// GET /api/scheduler - Получить статус планировщика
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    
    // Только админы могут просматривать статус планировщика
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    const status = getSchedulerStatus();
    
    return NextResponse.json({
      ...status,
      serverTime: new Date().toISOString(),
      timezone: 'Europe/Moscow',
      nextRun: {
        checklists: 'Каждый будний день в 9:00 МСК',
        cleanup: 'Каждое воскресенье в 2:00 МСК'
      }
    });

  } catch (error) {
    console.error('Ошибка получения статуса планировщика:', error);
    return NextResponse.json(
      { message: 'Ошибка получения статуса планировщика' },
      { status: 500 }
    );
  }
}

// POST /api/scheduler - Инициализировать планировщик
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    
    // Только админы могут управлять планировщиком
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'initialize') {
      initializeScheduler();
      
      return NextResponse.json({
        message: 'Планировщик успешно инициализирован',
        status: getSchedulerStatus()
      });
    }

    if (action === 'test-autogenerate') {
      // Тестовый запуск автогенерации
      const response = await fetch(`${req.nextUrl.origin}/api/checklists/auto-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        return NextResponse.json({
          message: 'Тестовый запуск автогенерации выполнен',
          result
        });
      } else {
        throw new Error('Ошибка тестового запуска');
      }
    }

    if (action === 'test-cleanup') {
      // Тестовый запуск очистки
      const response = await fetch(`${req.nextUrl.origin}/api/checklists/cleanup`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        return NextResponse.json({
          message: 'Тестовый запуск очистки выполнен',
          result
        });
      } else {
        throw new Error('Ошибка тестового запуска очистки');
      }
    }

    return NextResponse.json(
      { message: 'Неизвестное действие' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Ошибка управления планировщиком:', error);
    return NextResponse.json(
      { 
        message: 'Ошибка управления планировщиком',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
