import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/client-bindings - Получить список объектов для выбора клиентом
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const telegramId = url.searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json({ 
        message: 'Требуется telegramId' 
      }, { status: 400 });
    }

    // Получаем все объекты для выбора
    const objects = await prisma.cleaningObject.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        manager: {
          select: { name: true, email: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Проверяем, есть ли уже привязка
    const existingBinding = await prisma.clientBinding.findFirst({
      where: { telegramId },
      include: {
        object: {
          select: { id: true, name: true, address: true }
        }
      }
    });

    return NextResponse.json({
      objects,
      existingBinding,
      hasBinding: !!existingBinding
    });

  } catch (error) {
    console.error('Ошибка получения объектов:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/client-bindings - Создать привязку клиента к объекту
export async function POST(req: NextRequest) {
  try {
    const { telegramId, objectId } = await req.json();

    if (!objectId) {
      return NextResponse.json({ 
        message: 'Требуется objectId' 
      }, { status: 400 });
    }

    if (!telegramId) {
      return NextResponse.json({ 
        message: 'Требуется telegramId' 
      }, { status: 400 });
    }

    // Проверяем существование объекта
    const object = await prisma.cleaningObject.findUnique({
      where: { id: objectId },
      select: { id: true, name: true, address: true }
    });

    if (!object) {
      return NextResponse.json({ message: 'Объект не найден' }, { status: 404 });
    }

    // Создаем или обновляем привязку
    const bindingData = { 
      objectId,
      telegramId 
    };

    const binding = await prisma.clientBinding.upsert({
      where: { telegramId_objectId: { telegramId, objectId } },
      update: bindingData,
      create: bindingData,
      include: {
        object: {
          select: { id: true, name: true, address: true }
        }
      }
    });

    console.log('✅ Клиент привязан к объекту:', {
      telegramId,
      objectName: object.name
    });

    return NextResponse.json({
      success: true,
      binding,
      message: `Вы успешно привязаны к объекту "${object.name}"`
    });

  } catch (error) {
    console.error('Ошибка создания привязки:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
