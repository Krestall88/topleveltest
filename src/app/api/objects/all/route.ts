import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    // Только админы и заместители могут видеть все объекты
    if (user.role !== 'ADMIN' && user.role !== 'DEPUTY') {
      return NextResponse.json({ message: 'Нет доступа' }, { status: 403 });
    }

    // Получаем все объекты (пока без поля excludeFromTasks)
    const objects = await prisma.cleaningObject.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        managerId: true,
        manager: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Временно: получаем список исключенных объектов через прямой SQL запрос
    let excludedIds = new Set<string>();
    
    try {
      const excludedObjectIds = await prisma.$queryRaw<{objectId: string}[]>`
        SELECT "objectId" FROM "ExcludedObject"
      `;
      excludedIds = new Set(excludedObjectIds.map(e => e.objectId));
      console.log('🔍 Исключенные объекты из БД:', Array.from(excludedIds));
    } catch (error) {
      console.log('⚠️ Таблица ExcludedObject еще не доступна, используем пустой список');
    }

    // Добавляем поле excludeFromTasks на основе реальных данных
    const objectsWithExcludeFlag = objects.map(obj => ({
      ...obj,
      excludeFromTasks: excludedIds.has(obj.id)
    }));

    return NextResponse.json({
      objects: objectsWithExcludeFlag
    });

  } catch (error) {
    console.error('Ошибка получения всех объектов:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
