import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/client-bindings - Получить все привязки
export async function GET(req: NextRequest) {
  try {
    const bindings = await prisma.clientBinding.findMany({
      include: {
        object: {
          include: {
            manager: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(bindings);
  } catch (error) {
    console.error('❌ Ошибка получения привязок:', error);
    return NextResponse.json(
      { error: 'Ошибка получения привязок' },
      { status: 500 }
    );
  }
}

// POST /api/admin/client-bindings - Создать новую привязку
export async function POST(req: NextRequest) {
  try {
    const { telegramId, telegramUsername, firstName, lastName, objectId } = await req.json();

    if (!telegramId || !objectId) {
      return NextResponse.json(
        { error: 'telegramId и objectId обязательны' },
        { status: 400 }
      );
    }

    // Проверяем, нет ли уже привязки для этого telegramId
    const existing = await prisma.clientBinding.findFirst({
      where: { telegramId }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Пользователь уже привязан к объекту' },
        { status: 400 }
      );
    }

    // Создаем привязку
    const binding = await prisma.clientBinding.create({
      data: {
        telegramId,
        telegramUsername,
        firstName,
        lastName,
        objectId
      },
      include: {
        object: {
          include: {
            manager: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    return NextResponse.json(binding);
  } catch (error) {
    console.error('❌ Ошибка создания привязки:', error);
    return NextResponse.json(
      { error: 'Ошибка создания привязки' },
      { status: 500 }
    );
  }
}
