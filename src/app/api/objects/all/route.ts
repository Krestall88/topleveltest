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
    if (user.role !== 'ADMIN' && user.role !== 'DEPUTY_ADMIN') {
      return NextResponse.json({ message: 'Нет доступа' }, { status: 403 });
    }

    // Для заместителя админа получаем только назначенные объекты
    let objectFilter: any = {};
    
    if (user.role === 'DEPUTY_ADMIN') {
      // Получаем ID объектов, назначенных заместителю
      const assignments = await prisma.deputyAdminAssignment.findMany({
        where: {
          deputyAdminId: user.id
        },
        select: {
          objectId: true
        }
      });
      
      const assignedObjectIds = assignments.map(a => a.objectId);
      console.log('🔍 Объекты, назначенные заместителю:', assignedObjectIds);
      
      if (assignedObjectIds.length === 0) {
        // Если нет назначений, возвращаем пустой список
        return NextResponse.json({ objects: [] });
      }
      
      objectFilter = {
        id: {
          in: assignedObjectIds
        }
      };
    }

    // Получаем объекты с учетом фильтра
    const objects = await prisma.cleaningObject.findMany({
      where: objectFilter,
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
