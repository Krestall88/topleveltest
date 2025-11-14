import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth-middleware';

// GET /api/admin/client-bindings - Получить все привязки
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Для менеджеров показываем только привязки их объектов
    const whereClause: any = {};
    if (user.role === 'MANAGER') {
      whereClause.object = {
        managerId: user.id
      };
    }

    const bindings = await prisma.clientBinding.findMany({
      where: whereClause,
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
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { telegramId, telegramUsername, firstName, lastName, objectId } = await req.json();

    if (!telegramId || !objectId) {
      return NextResponse.json(
        { error: 'telegramId и objectId обязательны' },
        { status: 400 }
      );
    }

    // Проверяем права доступа к объекту
    const object = await prisma.cleaningObject.findUnique({
      where: { id: objectId },
      select: { id: true, managerId: true }
    });

    if (!object) {
      return NextResponse.json(
        { error: 'Объект не найден' },
        { status: 404 }
      );
    }

    // Менеджеры могут создавать привязки только для своих объектов
    if (user.role === 'MANAGER' && object.managerId !== user.id) {
      return NextResponse.json(
        { error: 'Нет доступа к этому объекту' },
        { status: 403 }
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
